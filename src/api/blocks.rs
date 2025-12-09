//block endpoints
use actix_web::{get,web,HttpResponse,Responder};
use std::sync::Arc;
use crate::{ oura_stream::BlockChainState};

#[get("/api/blocks")]
pub async fn get_blocks(
    state: web::Data<Arc<BlockChainState>>,
    query: web::Query<std::collections::HashMap<String,String>>,   
) -> impl Responder {
    let limit = query .get("limit").and_then(|s| s.parse::<usize>().ok()).unwrap_or(20).min(100); //maximumm 100 blocks

    let blocks =state.get_blocks(limit).await;
    HttpResponse::Ok().json(serde_json::json!({
        "blocks":blocks,
        "count": blocks.len(),
    }))
}

#[get("api/blocks/latest")]
pub async fn get_latest_block(state: web::Data<Arc<BlockChainState>>)-> impl Responder{
    let blocks = state.get_blocks(1).await;

    if let Some(block) =blocks.first(){
        HttpResponse::Ok().json(block)
    }
    else {
        HttpResponse::NotFound().json(serde_json::json!({
            "error": "no blocks avilanble"
        }))
    }
}
