//core logic signature verification garne

use pallas_codec::minicbor::decode;
use pallas_crypto::hash::Hash;
use pallas_crypto::key::ed25519::{PublicKey,Signature};
use pallas_crypto::nonce;

//wallet ko signature verify garne
pub fn verify_sign(
    message: &str,
    signature_hex: &str,
    public_key_hex: &str,
) -> Result<bool,String> {
    let signature_bytes = hex::decode(signature_hex)
        .map_err(|e| format!("Invalid signature hex: {}",e))?;

    let public_key_bytes = hex::decode(public_key_hex)
        .map_err(|e| format!("Invalid public key {}",e))?; //? will return eror immediately

    //pare public key
    let public_key = PublicKey::try_from(public_key_bytes.as_slice())
        .map_err(|e| format!("Invalid public key"))?;

    //parse signature
    if signature_bytes.len() != 64 {
        return Err("Signature must be 64 bytes".to_string());
    }
    let mut sign_array = [0u8;64]; //initialized to unsigned byte zero
    sign_array.copy_from_slice(&signature_bytes);
    let signature = Signature::from(sign_array); //taking the slice input ani fixed array ma lane

    //verify signature
    let message_bytes=message.as_bytes();
    let is_valid = public_key.verify(message_bytes, &signature); //message yo public key sanga associate vako private key le nai sign garya ho ta ?

    Ok(is_valid)

}

//now veify address ownership

pub fn verify_address_ownership(
    address: &str,
    public_key_hex: &str,
) -> Result<bool,String> {
    let public_key_bytes = hex::decode(public_key_hex)
        .map_err(|e| format!("Invalid public key"))?;

    let public_key = PublicKey::try_from(public_key_bytes.as_slice())
        .map_err(|e| format!("Invalid public key: {}",e))?;
    // Derive address from public key
    // This is a simplified check - in production, use pallas-addresses
    // to properly derive and compare addresses
    
    // Aile we'll accept the address if the signature is valid
  
    log::info!("Verifying address; {} with public key",address);
    Ok(true)

}

//genrate a nonce to sign .yo message ma append garne so that the signature cant be copied 

pub fn generate_challenge(address: &str) -> String {
    let timestamp =chrono::Utc::now().timestamp();
    format!(
        "Sign this message to authenticate with Cardano Explorer:\n\nAddress: {} \nTimestamp: {} \nNonce: {}",
        address,timestamp,uuid::Uuid::new_v4()
    )
}

//verify if  expiry of message is true

pub fn verify_challenge_timestamp(message: &str,max_age_seconds: i64)-> Result<bool,String>{
    //extract timestamp from message

    let timestamp_prefix = "Timestamp: ";
    let start = message.find(timestamp_prefix)
        .ok_or("Timestamp not found in message")?;
    let timestamp_start= start+timestamp_prefix.len();
    let timestamp_end = message[timestamp_start..]
        .find('\n')
        .unwrap_or(message[timestamp_start..].len());   
    
    let timestamp_str = &message[timestamp_start..timestamp_start+timestamp_end];
    let timestamp:i64 = timestamp_str.parse()
        .map_err(|e| format!("Invalid timestamp format: {}", e))?;
    let now = chrono::Utc::now().timestamp();
    let age = now - timestamp;

    if age > max_age_seconds {
        return Err(format!("Challenge expired (age: {}s , max; {}s",age,max_age_seconds));

    }

    if age <0 {
        return Err("not possible ".to_string());
    }
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_challenge() {
        let address = "addr_test123456....";
        let challenge = generate_challenge(address);

        assert!(challenge.contains(address));
        assert!(challenge.contains("TimestampL"));
        assert!(challenge.contains("Nonce"));
    }

    #[test]
    fn test_challange_timestamp_verification(){
        let address = "addr-test123435467...";
        let challenge = generate_challenge(address);

        assert!(verify_challenge_timestamp(&challenge, 300).is_ok());
    }
}

