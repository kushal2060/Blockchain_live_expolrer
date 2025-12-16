//filter garne user ko transactions using Blockfrost API

use actix_web::{get, web, HttpRequest, HttpResponse, Responder};


use crate::auth::middleware::get_claims;

// Blockfrost API configuration
const BLOCKFROST_API_URL: &str = "https://cardano-preprod.blockfrost.io/api/v0";

async fn fetch_address_transactions(address: &str, blockfrost_key: &str) -> Result<Vec<serde_json::Value>, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/addresses/{}/transactions", BLOCKFROST_API_URL, address);
    
    log::info!("Fetching transactions for address: {}", address);
    
    let response = client
        .get(&url)
        .header("project_id", blockfrost_key)
        .send()
        .await
        .map_err(|e| format!("Blockfrost request failed: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Blockfrost API error: {} {}", status, body));
    }
    
    let transactions = response
        .json::<Vec<serde_json::Value>>()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    Ok(transactions)
}

async fn fetch_transaction_details(tx_hash: &str, blockfrost_key: &str) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/txs/{}", BLOCKFROST_API_URL, tx_hash);
    
    let response = client
        .get(&url)
        .header("project_id", blockfrost_key)
        .send()
        .await
        .map_err(|e| format!("Blockfrost request failed: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Blockfrost API error: {}", response.status()));
    }
    
    let tx_details = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    Ok(tx_details)
}

#[get("/transactions")]
pub async fn get_user_transactions(
    req: HttpRequest,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    // Get authenticated user for security check
    let claims = match get_claims(&req) {
        Some(c) => c,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Authentication required"
            }));
        }
    };

    let limit = query
        .get("limit")
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(50)
        .min(100);

    // Get addresses from query parameter (comma-separated Bech32 addresses from frontend)
    let user_addresses: Vec<String> = if let Some(addresses_param) = query.get("addresses") {
        addresses_param.split(',').map(|s| s.trim().to_string()).collect()
    } else {
        // Fallback to JWT claims if no addresses provided (backward compatibility)
        claims.addresses.clone()
    };

    log::info!("Fetching transactions for addresses: {:?}", user_addresses);

    // Get Blockfrost API key from environment
    let blockfrost_key = match std::env::var("BLOCKFROST_API_KEY") {
        Ok(key) => key,
        Err(_) => {
            log::error!("BLOCKFROST_API_KEY not set in environment");
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Blockfrost API not configured"
            }));
        }
    };

    let mut all_tx_hashes = std::collections::HashSet::new();
    
    // Fetch transactions for each user address
    for address in &user_addresses {
        match fetch_address_transactions(address, &blockfrost_key).await {
            Ok(txs) => {
                log::info!("Found {} transactions for {}", txs.len(), address);
                for tx in txs.iter().take(limit) {
                    if let Some(tx_hash) = tx.get("tx_hash").and_then(|h| h.as_str()) {
                        all_tx_hashes.insert(tx_hash.to_string());
                    }
                }
            }
            Err(e) => {
                log::warn!("Failed to fetch transactions for {}: {}", address, e);
            }
        }
    }

    // Fetch details for unique transactions
    let mut transactions = Vec::new();
    for tx_hash in all_tx_hashes.iter().take(limit) {
        match fetch_transaction_details(tx_hash, &blockfrost_key).await {
            Ok(tx_detail) => {
                // Transform Blockfrost format to our format
                let formatted_tx = serde_json::json!({
                    "hash": tx_hash,
                    "block_number": tx_detail.get("block_height").and_then(|v| v.as_u64()),
                    "block_time": tx_detail.get("block_time").and_then(|v| v.as_u64()),
                    "fee": tx_detail.get("fees").and_then(|v| v.as_str()).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0),
                    "inputs": [],
                    "outputs": [],
                    "input_count": 0,
                    "output_count": 0,
                });
                transactions.push(formatted_tx);
            }
            Err(e) => {
                log::warn!("Failed to fetch details for {}: {}", tx_hash, e);
            }
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "transactions": transactions,
        "count": transactions.len(),
        "user_addresses": user_addresses,
    }))
}

// GET /api/user/balance

#[get("/balance")]
pub async fn get_user_balance(
    req: HttpRequest,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let claims = match get_claims(&req) {
        Some(c) => c,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Authentication required"
            }));
        }
    };

    // Get addresses from query parameter or fallback to JWT claims
    let user_addresses: Vec<String> = if let Some(addresses_param) = query.get("addresses") {
        addresses_param.split(',').map(|s| s.trim().to_string()).collect()
    } else {
        claims.addresses.clone()
    };

    log::info!("Fetching balance for addresses: {:?}", user_addresses);

    // Get Blockfrost API key from environment
    let blockfrost_key = match std::env::var("BLOCKFROST_API_KEY") {
        Ok(key) => key,
        Err(_) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Blockfrost API not configured"
            }));
        }
    };

    let mut total_balance: u64 = 0;
    let mut per_address_balances = Vec::new();

    for address in &user_addresses {
        let client = reqwest::Client::new();
        let url = format!("{}/addresses/{}", BLOCKFROST_API_URL, address);
        
        match client
            .get(&url)
            .header("project_id", &blockfrost_key)
            .send()
            .await
        {
            Ok(response) if response.status().is_success() => {
                if let Ok(addr_info) = response.json::<serde_json::Value>().await {
                    let amount = addr_info
                        .get("amount")
                        .and_then(|amounts| amounts.as_array())
                        .and_then(|arr| arr.first())
                        .and_then(|first| first.get("quantity"))
                        .and_then(|q| q.as_str())
                        .and_then(|s| s.parse::<u64>().ok())
                        .unwrap_or(0);
                    
                    total_balance += amount;
                    
                    per_address_balances.push(serde_json::json!({
                        "address": address,
                        "ada_balance": amount,
                        "tokens": []
                    }));
                }
            }
            _ => {
                log::warn!("Failed to fetch balance for {}", address);
                per_address_balances.push(serde_json::json!({
                    "address": address,
                    "ada_balance": "0",
                    "tokens": []
                }));
            }
        }
    }
    
    HttpResponse::Ok().json(serde_json::json!({
        "addresses": user_addresses,
        "balances": {
            "total_ada": total_balance,
            "per_address": per_address_balances
        }
    }))
}

// GET /api/user/wallets
// Get all connected wallets for the user (PROTECTED)

#[get("/wallets")]
pub async fn get_user_wallets(req: HttpRequest) -> impl Responder {
    let claims = match get_claims(&req) {
        Some(c) => c,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Authentication required"
            }));
        }
    };

    HttpResponse::Ok().json(serde_json::json!({
        "primary_address": claims.sub,
        "all_addresses": claims.addresses,
        "wallet_count": claims.addresses.len()
    }))
}