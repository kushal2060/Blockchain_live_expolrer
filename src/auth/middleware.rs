//middleware 
use actix_web::{
    Error, HttpMessage, HttpResponse, body::BoxBody, dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready}
};
use futures_util::future::LocalBoxFuture;
use std::future::{ready,Ready};
// use std::rc::Rc;
use std::sync::Arc;



use super::{jwt::JwtService,Claims,SessionStore};

//middleware factory

pub struct AuthMiddleWare{
    pub session_store: Arc<SessionStore>,
}

impl<S> Transform<S, ServiceRequest> for AuthMiddleWare
where
    S: Service<ServiceRequest, Response = ServiceResponse<BoxBody>, Error = Error> + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type InitError = ();
    type Transform = AuthMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddlewareService {
            service: Arc::new(service),
            session_store: self.session_store.clone(),
        }))
    }
}

pub struct  AuthMiddlewareService<S> {
    service: Arc<S>,
    session_store: Arc<SessionStore>,
}

impl<S> Service<ServiceRequest> for AuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<BoxBody>, Error = Error> + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();
        let session_store = self.session_store.clone();

        Box::pin(async move {
            // Extract Authorization header
            let auth_header = req
                .headers()
                .get("Authorization")
                .and_then(|h| h.to_str().ok());

            if let Some(auth_header) = auth_header {
                // Extract token
                if let Some(token) = JwtService::extract_token_from_header(auth_header) {
                    // Verify token
                    match JwtService::verify_token(&token) {
                        Ok(claims) => {
                            // Check if token is revoked
                            if session_store.is_token_revoked(&claims.jti).await {
                                return Ok(ServiceResponse::new(
                                    req.into_parts().0,
                                    HttpResponse::Unauthorized().json(serde_json::json!({
                                        "error": "Token has been revoked"
                                    }))
                                ));
                            }

                            // Add claims to request extensions
                            req.extensions_mut().insert(claims);
                            
                            // Continue to the route
                            return service.call(req).await;
                        }
                        Err(e) => {
                            log::warn!("JWT verification failed: {}", e);
                            return Ok(ServiceResponse::new(
                                req.into_parts().0,
                                HttpResponse::Unauthorized().json(serde_json::json!({
                                    "error": "Invalid or expired token"
                                }))
                            ));
                        }
                    }
                }
            }

            // No valid authentication
            Ok(ServiceResponse::new(
                req.into_parts().0,
                HttpResponse::Unauthorized().json(serde_json::json!({
                    "error": "Authentication required"
                }))
            ))
        })
    }
}

//helpers to extract claims from request
pub fn get_claims(req: &actix_web::HttpRequest) -> Option<Claims> {
    req.extensions().get::<Claims>().cloned()
}