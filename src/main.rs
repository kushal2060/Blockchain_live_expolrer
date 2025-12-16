mod models;
mod oura_stream;
mod api;
mod websocket;
mod auth;

use actix_web::{middleware,web,App,HttpResponse,HttpServer};
use actix_cors::Cors;
use std::sync::Arc;
use oura_stream::{BlockChainState,start_oura};
use auth::SessionStore;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    //logger
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    log::info!("Starting the backend");

    //shared state
    let state = Arc::new(BlockChainState::new());
    let session_store=Arc::new(SessionStore::new());
    //oura stream
    start_oura(state.clone()).await;

    log::info!("Oura started");

    //clean expired session
    let session_store_cleanup = session_store.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(3600));
        loop {
            interval.tick().await;
            session_store_cleanup.cleanup_expired(604800).await; // 7 days
            log::info!("Cleaned up expired sessions");
        }
    });


    //server
    log::info!("Starting server on 0.0.0.0:8000");

    HttpServer::new(move || {
        let cors = Cors::default().allow_any_origin().allow_any_method().allow_any_header().supports_credentials();
      
        App::new().app_data(web::Data::new(state.clone())).app_data(web::Data::new(session_store.clone())).wrap(middleware::Logger::default()).wrap(cors)
        .route("/ws", web::get().to(websocket::websocket_route))
        .service(api::blocks::get_blocks)
        .service(api::blocks::get_latest_block).
        service(api::transactions::get_transactions)

        .service(auth::routes::get_challenge)
        .service(auth::routes::login)
        .service(auth::routes::referesh_token)
        //auth routes
        
        .service(auth::routes::test_login)
        
        .service(
            web::scope("/api/auth")
                .wrap(auth::middleware::AuthMiddleWare {
                session_store: session_store.clone(),
                })
                .service(auth::routes::logout)
                .service(auth::routes::get_current_user)
                .service(auth::routes::add_wallet)
               
        )
        //user routes
         .service(
                web::scope("/api/user")
                    .wrap(auth::middleware::AuthMiddleWare {
                        session_store: session_store.clone(),
                    })
                    .service(api::user_transactions::get_user_transactions)
                    .service(api::user_transactions::get_user_balance)
                    .service(api::user_transactions::get_user_wallets)
            )
        .route("/health", web::get().to(|| async {
            HttpResponse::Ok().json(serde_json::json!({
                "status":"healthy",
                "service":"cardano-backend"
            }))
        }))
    })
    .bind(("0.0.0.0",8000))?.run().await


}
