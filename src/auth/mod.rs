//jwt auth
pub mod jwt;
pub mod middleware;
pub mod verification;
pub mod routes;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

//request response models
#[derive(Debug, Serialize, Deserialize)]
pub struct  AuthReq{
    pub address: String, //wallet address
    pub message: String, //message sign garna
    pub signature: String, //signature wallet le generate gareko
    pub public_key: String, //wallet ko public key
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthRes{
    pub access_token: String, 
    pub refresh_token: String, 
    pub token_type: String,
    pub expires_in: i64,
    pub user: UserInfo, 
}

#[derive(Debug, Serialize, Clone,Deserialize)]
pub struct UserInfo{
    pub address: String,
    pub wallet_addresses: Vec<String>, //sabbai wallet addresses haru
    pub created_at: i64,
}

//jwt claims
#[derive(Debug, Serialize, Deserialize,Clone)]
pub struct Claims {
    pub sub: String,
    pub iat: i64,
    pub exp: i64,
    pub jti: String,
    pub addresses: Vec<String>,
}

//user-seesion store
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

#[derive(Clone)]
pub struct UserSession{
    pub address: String,
    pub wallet_addresses: HashSet<String>,
    pub created_at: i64,
    pub last_active_at: i64,
}

//session state
pub struct  SessionStore {
    sessions: Arc<RwLock<HashMap<String,UserSession>>>,
    revoked_tokens: Arc<RwLock<HashSet<String>>>,
}

impl SessionStore {
    pub fn new() -> Self {
        Self { sessions: Arc::new(RwLock::new(HashMap::new())),
             revoked_tokens: Arc::new(RwLock::new(HashSet::new())) }

    }
    pub async fn create_session(&self,address: String) -> UserSession {
        let now = chrono::Utc::now().timestamp();
        let mut sessions = self.sessions.write().await;

        let session = sessions.entry(address.clone()).or_insert(UserSession
             { address: address.clone(), wallet_addresses: HashSet::new(), created_at: now, last_active_at: now });
        session.wallet_addresses.insert(address.clone());
        session.last_active_at=now;     
        session.clone()
    }

    pub async fn add_wallet(&self,primary_address:&str,new_adress: String)-> Result<(),String>{
        let mut sessions=self.sessions.write().await;

        if let Some(session)= sessions.get_mut(primary_address){
            session.wallet_addresses.insert(new_adress);
            session.last_active_at=chrono::Utc::now().timestamp();
            Ok(())
        }
        else {
            Err("Session not found".to_string())
        }
    }
    pub async fn get_session(&self,address: &str)-> Option<UserSession> {
        let sessions = self.sessions.read().await;
        sessions.get(address).cloned()
    }
    pub async fn revoked_token(&self,jti: String){
        let mut revoked=self.revoked_tokens.write().await;
        revoked.insert(jti);
    }
    pub async fn is_token_revoked(&self,jti:&str)->bool{
        let revoked = self.revoked_tokens.read().await;
        revoked.contains(jti)
    }
    pub async fn cleanup_expired(&self,max_age_sec:i64){
        let now = chrono::Utc::now().timestamp();
        let mut  sessions =self.sessions.write().await;

        sessions.retain(|_,session|{
            now - session.last_active_at < max_age_sec
        });
    }


}

