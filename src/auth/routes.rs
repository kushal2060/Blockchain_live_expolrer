use actix_web::{HttpRequest, HttpResponse, Responder, get, post, web::{self, Query}};
use std::{fmt::format, sync::Arc};

use crate::auth::middleware::get_claims;

use super::{
    jwt::JwtService,
    verification::{verify_sign,verify_challenge_timestamp,generate_challenge},
    AuthReq,AuthRes,UserInfo,SessionStore,
};

//challenge message geeneare garne endpoint
#[derive(serde::Deserialize)]
pub struct ChallengeReq{
    address:String,
}

#[get("/api/auth/challenge")]
pub async fn get_challenge(query: web::Query<ChallengeReq>)-> impl Responder {
    let challenge = generate_challenge(&query.address);

    HttpResponse::Ok().json(serde_json::json!({
        "message":challenge,
        "address":query.address
    }))
}

//post sign verify garne endpoint
#[post("/api/auth/login")]
pub async  fn login(
    auth_req: web::Json<AuthReq>,
    session_store: web::Data<Arc<SessionStore>>,
) -> impl  Responder{
    log::info!("lofin attempt for address: {}",auth_req.address);

    //timesatmp verify
    if let Err(e) = verify_challenge_timestamp(&auth_req.message,300){
        log::warn!("Challenge timestamp verification old /failed: {}",e);
        return  HttpResponse::BadRequest().json(serde_json::json!({
            "error":format!("Invlaid challenfe :{}",e)
        }));
    }
    //verify sign
    match verify_sign(&auth_req.message, &auth_req.signature, &auth_req.public_key) {
        Ok(true) => {
            log::info!("Signature verified for : {}",auth_req.address);
        }
        Ok(false)=> {
            log::warn!("Invalid sign for: {}",auth_req.address);
            return  HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "invalid sign"
            }));
        }
        Err(e)=>{
            log::error!("Sign verification error:{}",e);
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Sign verificationfailed:{}",e)
        }));   
        }
        
    }
    //create or update sessions
    let session = session_store.create_session(auth_req.address.clone()).await;
    let address: Vec<String> = session.wallet_addresses.iter().cloned().collect();
    //tokens haru
    let access_token = match JwtService::generate_access_token(&auth_req.address, address.clone()){
        Ok(token)=> token,
        Err(e)=>{
            log::error!("Failed to generate access tokken:{}",e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error":"Failed to generate token"
            }));
        }
    };

    let refresh_token=match  JwtService::generate_refresh_token(&auth_req.address, address.clone()) {
        Ok(token) => token,
        Err(e)=>{
            log::error!("failed to generate referesh token:{}",e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error":"failed to genrate refersh token"
            }));
        }
        
    };
    //return the auth response

    let response = AuthRes{
        access_token, refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: 900,
        user: UserInfo { 
            address: auth_req.address.clone(), wallet_addresses: address, created_at: session.created_at},
    };
    log::info!("Login sucess for: {}",auth_req.address);

    HttpResponse::Ok().json(response)

}

//logout ko lagi
#[post("/logout")]
pub async fn logout(
    req: HttpRequest,
    session_store: web::Data<Arc<SessionStore>>,
) -> impl Responder{
    if let Some(claims) = get_claims(&req){
        session_store.revoked_token(claims.jti).await;

        log::info!("User logged out:{}",claims.sub);

        return HttpResponse::Ok().json(serde_json::json!({
            "message":"loggedout vayo"
        }));
    }
    HttpResponse::Unauthorized().json(serde_json::json!({
        "error":"unauthorized/not auhtenticated"
    }))
}

//referesh access token 
#[derive(serde::Deserialize)]
pub struct RefereshRequest {
    referesh_token:String,
}

#[post("/api/auth/referesh")]
pub async fn referesh_token(req: web::Json<RefereshRequest>) -> impl Responder{
    match JwtService::verify_token(&req.referesh_token) {
        Ok(claims)=>{
            match JwtService::generate_access_token(&claims.sub, claims.addresses.clone()) {
                Ok(new_acess_tpoken)=>{
                    HttpResponse::Ok().json(serde_json::json!({
                        "access_token":new_acess_tpoken,
                        "token_type":"Bearer",
                        "expires_in":900
                    }))
                }
                Err(e)=>{
                    log::error!("Failed to generate new access token:{}",e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error":"failed to generate refersh token"
                    }))
                }
                
            }
        }
        Err(e)=> {
            log::warn!("Invalid referesh tokken {}",e);
            HttpResponse::Unauthorized().json(serde_json::json!({
                "error":"invalid or expired refereh"
            }))
        }
    }
}

//current user info
#[get("/me")]
pub async fn get_current_user(
    req: HttpRequest,
    session_store: web::Data<Arc<SessionStore>>,
) -> impl Responder {
    if let Some(claims) = get_claims(&req) {
        if let Some(session) = session_store.get_session(&claims.sub).await {
            let addresses: Vec<String> = session.wallet_addresses.iter().cloned().collect();
            
            return HttpResponse::Ok().json(UserInfo {
                address: claims.sub,
                wallet_addresses: addresses,
                created_at: session.created_at,
            });
        }
    }

    HttpResponse::Unauthorized().json(serde_json::json!({
        "error": "Not authenticated"
    }))
}

//add additional wallet
#[derive(serde::Deserialize)]
pub struct AddWalletRequest {
    address: String,
    message: String,
    signature: String,
    public_key: String,
}

#[post("/add-wallet")]
pub async fn add_wallet(
    req: HttpRequest,
    add_wallet_req: web::Json<AddWalletRequest>,
    session_store: web::Data<Arc<SessionStore>>,
) -> impl Responder {
    // Get current user
    let claims = match get_claims(&req) {
        Some(c) => c,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Not authenticated"
            }));
        }
    };

    // Verify signature for new wallet
    match verify_sign(
        &add_wallet_req.message,
        &add_wallet_req.signature,
        &add_wallet_req.public_key,
    ) {
        Ok(true) => {
            // Add wallet to session
            if let Err(e) = session_store.add_wallet(&claims.sub, add_wallet_req.address.clone()).await {
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to add wallet: {}", e)
                }));
            }

            log::info!("Added wallet {} to user {}", add_wallet_req.address, claims.sub);

            HttpResponse::Ok().json(serde_json::json!({
                "message": "Wallet added successfully",
                "address": add_wallet_req.address
            }))
        }
        Ok(false) | Err(_) => {
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid signature"
            }))
        }
    }
    
}

// TEST ENDPOINT - REMOVE IN PRODUCTION!
#[cfg(debug_assertions)]
#[post("/api/auth/test-login")]
pub async fn test_login(
    session_store: web::Data<Arc<SessionStore>>,
) -> impl Responder {
    let test_address = "addr_test1qztest123example".to_string();
    
    log::warn!("⚠️ TEST LOGIN - This should only work in debug mode!");
    
    // Create session
    let session = session_store.create_session(test_address.clone()).await;
    let addresses: Vec<String> = session.wallet_addresses.iter().cloned().collect();
    
    // Generate tokens
    let access_token = JwtService::generate_access_token(&test_address, addresses.clone())
        .unwrap();
    let refresh_token = JwtService::generate_refresh_token(&test_address, addresses.clone())
        .unwrap();
    
    HttpResponse::Ok().json(AuthRes {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: 900,
        user: UserInfo {
            address: test_address,
            wallet_addresses: addresses,
            created_at: session.created_at,
        },
    })
}