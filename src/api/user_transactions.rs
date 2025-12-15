//filter garne user ko transactions

use actix_web::{get, web, HttpRequest, HttpResponse, Responder};
use std::sync::Arc;

use crate::oura_stream::BlockChainState;
use crate::auth::middleware::get_claims;

#[get("/api/user/transactions")]
pub async fn get_user_transactions(
    req: HttpRequest,
    state: web::Data<Arc<BlockChainState>>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    // Get authenticated user
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
        .min(200);

    // Get all transactions
    let all_transactions = state.get_transactions(1000).await;

    // Filter transactions by user's wallet addresses
    // In a real implementation, you'd filter by transaction inputs/outputs
    // For now, we'll keep all transactions and note which are user's
    
    let user_addresses = &claims.addresses;
    
    // TODO: Implement actual filtering based on transaction inputs/outputs
    // This requires parsing transaction details and checking if any input/output
    // addresses match the user's wallet addresses
    
    // For demo purposes, return all transactions with user info
    let filtered_transactions: Vec<_> = all_transactions
        .iter()
        .take(limit)
        .cloned()
        .collect();

    HttpResponse::Ok().json(serde_json::json!({
        "transactions": filtered_transactions,
        "count": filtered_transactions.len(),
        "user_addresses": user_addresses,
        "note": "Filtering by address will be implemented when transaction details include full input/output addresses"
    }))
}


// GET /api/user/balance

#[get("/api/user/balance")]
pub async fn get_user_balance(
    req: HttpRequest,
) -> impl Responder {
    let claims = match get_claims(&req) {
        Some(c) => c,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Authentication required"
            }));
        }
    };

    // TODO: Query blockchain for actual balance
    // This would use Blockfrost API or direct node query
    
    HttpResponse::Ok().json(serde_json::json!({
        "addresses": claims.addresses,
        "balances": {
            // Placeholder - implement actual balance queries
            "total_ada": "0",
            "per_address": claims.addresses.iter().map(|addr| {
                serde_json::json!({
                    "address": addr,
                    "ada_balance": "0",
                    "tokens": []
                })
            }).collect::<Vec<_>>()
        },
        "note": "Balance queries require integration with Blockfrost or direct node queries"
    }))
}


// GET /api/user/wallets
// Get all connected wallets for the user (PROTECTED)


#[get("/api/user/wallets")]
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