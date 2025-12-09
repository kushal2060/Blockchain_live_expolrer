mod models;
mod oura_stream;
mod api;
mod websocket;

use actix_web::{middleware,web,App,HttpResponse,HttpServer};
use actix_cors::Cors;
use std::sync::Arc;
use oura_stream::{BlockChainState,start_oura};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    //logger
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    log::info!("Starting the backend");

    //shared state
    let state = Arc::new(BlockChainState::new());
    //oura stream
    start_oura(state.clone()).await;

    log::info!("Oura started");

    //server
    log::info!("Statring server localhost::8080");

    HttpServer::new(move || {
        let cors = Cors::default().allow_any_origin().allow_any_method().allow_any_header();

        App::new().app_data(web::Data::new(state.clone())).wrap(middleware::Logger::default()).wrap(cors)
        .route("/ws", web::get().to(websocket::websocket_route))
        .service(api::blocks::get_blocks)
        .service(api::blocks::get_latest_block).
        service(api::transactions::get_transactions)
        .route("/health", web::get().to(|| async {
            HttpResponse::Ok().json(serde_json::json!({
                "status":"healthy",
                "service":"cardano-backend"
            }))
        }))
    })
    .bind(("127.0.0.1",8000))?.run().await


}
