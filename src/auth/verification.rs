//core logic signature verification garne


use pallas_crypto::key::ed25519::{PublicKey,Signature};


//wallet ko signature verify garne
pub fn verify_sign(
    message: &str,
    signature_hex: &str,
    public_key_hex: &str,
) -> Result<bool, String> {
    fn read_u16_be(b: &[u8], idx: usize) -> usize {
        ((b[idx] as usize) << 8) | (b[idx + 1] as usize)
    }
    fn read_u32_be(b: &[u8], idx: usize) -> usize {
        ((b[idx] as usize) << 24)
            | ((b[idx + 1] as usize) << 16)
            | ((b[idx + 2] as usize) << 8)
            | (b[idx + 3] as usize)
    }
    fn read_cbor_item(bytes: &[u8], start: usize) -> Result<(usize, Option<Vec<u8>>), String> {
        if start >= bytes.len() { return Err("read past end".to_string()); }
        let hdr = bytes[start];
        let major = hdr >> 5;
        let ai = (hdr & 0x1f) as usize;
        let mut idx = start + 1;
        let length = match ai {
            0..=23 => ai,
            24 => { if idx >= bytes.len() { return Err("EOF len1".to_string()) } let v = bytes[idx] as usize; idx += 1; v }
            25 => { if idx + 1 >= bytes.len() { return Err("EOF len2".to_string()) } let v = read_u16_be(bytes, idx); idx += 2; v }
            26 => { if idx + 3 >= bytes.len() { return Err("EOF len4".to_string()) } let v = read_u32_be(bytes, idx); idx += 4; v }
            27 => return Err("64-bit lengths unsupported".to_string()),
            31 => return Err("indefinite lengths unsupported".to_string()),
            _ => return Err("invalid additional info".to_string()),
        };
        match major {
            2 => { // bstr
                let total = (idx - start) + length;
                if idx + length > bytes.len() { return Err("bstr OOB".to_string()); }
                Ok((total, Some(bytes[idx..idx+length].to_vec())))
            }
            3 => { // tstr
                let total = (idx - start) + length;
                if idx + length > bytes.len() { return Err("tstr OOB".to_string()); }
                Ok((total, None))
            }
            4 => { // array
                let mut cur = idx;
                for _ in 0..length {
                    let (l, _) = read_cbor_item(bytes, cur)?;
                    cur += l;
                }
                Ok((cur - start, None))
            }
            5 => { // map
                let mut cur = idx;
                for _ in 0..length {
                    let (klen, _) = read_cbor_item(bytes, cur)?; cur += klen;
                    let (vlen, _) = read_cbor_item(bytes, cur)?; cur += vlen;
                }
                Ok((cur - start, None))
            }
            6 => { // tag
                let (inner_len, inner_bytes) = read_cbor_item(bytes, idx)?;
                Ok(((idx - start) + inner_len, inner_bytes))
            }
            0 | 1 | 7 => Ok((idx - start, None)),
            _ => Err("unsupported major type".to_string()),
        }
    }
    fn push_cbor_bstr_prefix(out: &mut Vec<u8>, len: usize) {
        if len <= 23 {
            out.push(0x40u8 + (len as u8));
        } else if len <= 0xFF {
            out.push(0x58); out.push(len as u8);
        } else if len <= 0xFFFF {
            out.push(0x59); out.push(((len >> 8) & 0xFF) as u8); out.push((len & 0xFF) as u8);
        } else {
            out.push(0x59); out.push(((len >> 8) & 0xFF) as u8); out.push((len & 0xFF) as u8);
        }
    }
    fn cbor_encode_text(s: &str) -> Vec<u8> {
        let mut out = Vec::new();
        let bytes = s.as_bytes();
        let len = bytes.len();
        if len <= 23 {
            out.push(0x60u8 + (len as u8));
        } else if len <= 0xFF {
            out.push(0x78); out.push(len as u8);
        } else if len <= 0xFFFF {
            out.push(0x79); out.push(((len >> 8) & 0xFF) as u8); out.push((len & 0xFF) as u8);
        } else {
            out.push(0x79); out.push(((len >> 8) & 0xFF) as u8); out.push((len & 0xFF) as u8);
        }
        out.extend_from_slice(bytes);
        out
    }

    let sig_bytes = hex::decode(signature_hex.trim()).map_err(|e| format!("Invalid signature hex: {}", e))?;

    // parse COSE_Sign1 if looks like CBOR array; otherwise treat as raw signature
    let (protected, payload_raw, signature_raw) = if sig_bytes.len() > 64 && (sig_bytes[0] >> 5) == 4 {
        // parse top-level array(4)
        let mut idx = 1usize;
        let ai = (sig_bytes[0] & 0x1f) as usize;
        if ai == 24 { idx += 1 } else if ai == 25 { idx += 2 } else if ai == 26 { idx += 4 } else if ai == 27 { return Err("Array length 64-bit unsupported".to_string()) }
        // protected (bstr)
        let (plen, p_inner_opt) = read_cbor_item(&sig_bytes, idx)?;
        let protected_inner = p_inner_opt.ok_or("protected not bstr")?;
        idx += plen;
        // unprotected (map) skip
        let (ulen, _) = read_cbor_item(&sig_bytes, idx)?;
        idx += ulen;
        // payload
        let (paylen, pay_inner_opt) = read_cbor_item(&sig_bytes, idx)?;
        let payload_inner = pay_inner_opt.unwrap_or_else(|| vec![]);
        idx += paylen;
        // signature
        let (slen, s_inner_opt) = read_cbor_item(&sig_bytes, idx)?;
        let signature_inner = s_inner_opt.ok_or("signature not bstr")?;
        if signature_inner.len() != 64 { return Err(format!("signature not 64 bytes (got {})", signature_inner.len())) }
        (protected_inner, payload_inner, signature_inner)
    } else if sig_bytes.len() == 64 {
        let payload = cbor_encode_text(message);
        (Vec::new(), payload, sig_bytes)
    } else {
        return Err(format!("signature field size unexpected: {}", sig_bytes.len()));
    };

    let public_key_bytes = hex::decode(public_key_hex.trim()).map_err(|e| format!("Invalid public key {}", e))?;
    let public_key = PublicKey::try_from(public_key_bytes.as_slice()).map_err(|_e| "Invalid public key".to_string())?;
    let mut sign_arr = [0u8; 64]; sign_arr.copy_from_slice(&signature_raw);
    let signature = Signature::from(sign_arr);

    // Build Sig_structure: ["Signature1", protected_bytes, bstr'' (external_aad), bstr(payload_raw)]
    let mut sig_struct: Vec<u8> = Vec::new();
    sig_struct.push(0x84); // array(4)
    sig_struct.extend_from_slice(&[0x6A, b'S', b'i', b'g', b'n', b'a', b't', b'u', b'r', b'e', b'1']); // "Signature1"
    push_cbor_bstr_prefix(&mut sig_struct, protected.len());
    sig_struct.extend_from_slice(&protected);
    sig_struct.push(0x40); // external_aad = bstr(0)
    push_cbor_bstr_prefix(&mut sig_struct, payload_raw.len());
    sig_struct.extend_from_slice(&payload_raw);

    // Try verifying
    if public_key.verify(&sig_struct, &signature) {
        return Ok(true);
    }
    if public_key.verify(message.as_bytes(), &signature) {
        return Ok(true);
    }
    let sig_struct_hash = pallas_crypto::hash::Hasher::<256>::hash(&sig_struct);
    if public_key.verify(sig_struct_hash.as_ref(), &signature) {
        return Ok(true);
    }

    log::warn!("Signature verification failed; message len {} sig hex {}", message.len(), hex::encode(&signature_raw));
    Ok(false)
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
    let timestamp:i64 = timestamp_str.trim().parse()
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
