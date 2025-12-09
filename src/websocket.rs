//websockets


use actix_ws::Message;
use actix_web::{web,Error,HttpRequest,HttpResponse};
use std::sync::Arc;
use std::time::{Duration,Instant};

use crate::oura_stream::BlockChainState;

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

pub async fn websocket_route(
    req:HttpRequest,
    body:web::Payload,
    state: web::Data<Arc<BlockChainState>>,
) -> Result<HttpResponse,Error> {
    let (response, mut session, mut msg_stream)=actix_ws::handle(&req, body)?;

    let state = state.get_ref().clone();
    actix_web::rt::spawn(async move{
        let mut last_heartbeat = Instant::now();
        let mut interval = actix_web::rt::time::interval(HEARTBEAT_INTERVAL);

        loop{
            tokio::select! {
                Some(Ok(msg)) = msg_stream.recv()=>{
                    match  msg {
                        Message::Ping(bytes) => {
                            last_heartbeat=Instant::now();
                            let _ = session.pong(&bytes).await;
                        }
                        Message::Pong(_)=> {
                            last_heartbeat=Instant::now();
                        }
                        Message::Text(text) => {
                            log::debug!("Received {}",text);
                        }
                        Message::Close(reason)=>{
                            log::info!("Webscoket close: {:?}",reason);
                        }
                        _ => {}
                    }
                }
                _ = interval.tick() => {
                    //if client is still alive
                    if Instant::now().duration_since(last_heartbeat)>CLIENT_TIMEOUT {
                         log::warn!("Client timeout, closing connection");
                        let _ = session.close(None).await;
                        break;
                    }

                    if session.ping(b"").await.is_err(){
                        break;
                    }

                    //latest block
                    let blocks = state.get_blocks(5).await;
                      let transactions = state.get_transactions(10).await;
                    
                    let data = serde_json::json!({
                        "type": "update",
                        "blocks": blocks,
                        "transactions": transactions,
                    });
                     if let Ok(json) = serde_json::to_string(&data) {
                        if session.text(json).await.is_err() {
                            break;
                        }
                    }
                }
            }
        }
    });
    Ok(response)

}