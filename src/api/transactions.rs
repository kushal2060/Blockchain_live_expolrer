//transactions endpoint

use actix_web::{get,web,Responder,HttpResponse};
use std::sync::Arc;
use crate::{oura_stream::BlockChainState};

#[get("/api/transaction")]
pub async fn get_transactions(
    state: web::Data<Arc<BlockChainState>>,
    query: web::Query<std::collections::HashMap<String,String>>,
) -> impl  Responder {
    let limit = query .get("limit").and_then(|s| s.parse::<usize>().ok()).unwrap_or(50).min(200);

    let transactions = state.get_transactions(limit).await;
    HttpResponse::Ok().json(serde_json::json!({
        "transactions":transactions,
        "count":transactions.len(),
    }))
}