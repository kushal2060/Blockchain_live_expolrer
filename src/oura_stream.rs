use  std::{ sync::Arc};

use tokio::sync::RwLock;
use crate::models::{Block,Transaction};

//common state
pub struct BlockChainState {
    pub blocks: Arc<RwLock<Vec<Block>>>, //many reader tara one writer Arc for the sharing same state for multiple thread.
    pub transactions: Arc<RwLock<Vec<Transaction>>>,
}

impl BlockChainState {
    pub fn new() -> Self {
        Self { blocks: Arc::new(RwLock::new(Vec::new())), 
            transactions: Arc::new(RwLock::new(Vec::new())) }
    }
    pub async fn add_block(&self,block:Block){
        let mut blocks = self.blocks.write().await;
        blocks.insert(0, block);

        //only last 100 blocks 
        if blocks.len() >100 {
            blocks.truncate(100);
        }
    }

    pub async fn add_transactions(&self,tx:Transaction){
        let mut transactions = self.transactions.write().await;
        transactions.insert(0,tx); 

        //only 500
        if transactions.len() > 500 {
            transactions.truncate(500);
        }
    }

    pub async fn get_blocks(&self,limit: usize) -> Vec<Block> {
        let blocks = self.blocks.read().await;
        blocks.iter().take(limit).cloned().collect()
    }

    pub async fn get_transactions(&self,limit: usize) -> Vec<Transaction> {
        let transactions =self.transactions.read().await;
        transactions.iter().take(limit).cloned().collect() //return the owned blocks not references
    }
}

//spwan oura as subprocess and parse stdout

pub async fn start_oura(state: Arc<BlockChainState>){
    use std::process::{Command,Stdio};
    use std::io::{BufRead,BufReader};

    tokio::spawn(async move {
        log::info!("Starting out oura stream");

        let mut child = Command::new("oura") 
        .args(&["daemon", "--config", "./daemon.toml"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn().expect("Failed to start Oura");
   
        let stdout = child.stdout.take().expect("Failed to stdout");
        let stderr = child.stderr.take().expect("Failed to stderr");

        // Log stderr in separate task
        tokio::task::spawn_blocking(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line_str) = line {
                    log::error!("OURA STDERR: {}", line_str);
                }
            }
        });

        // Use spawn_blocking for sync IO
        tokio::task::spawn_blocking(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(line_str) => {
                        log::debug!("OURA: {}", &line_str[..line_str.len().min(100)]);
                        if let Ok(event) = serde_json::from_str::<serde_json::Value>(&line_str) {
                            // Send to async task via channel or use block_on
                            let state_clone = state.clone();
                            tokio::runtime::Handle::current().block_on(async move {
                                process_event(event, state_clone).await;
                            });
                        }
                    }
                    Err(e) => log::error!("Error reading Oura output: {}", e),
                }
            }
            log::warn!("Oura stream ended");
        });
    });

}

// async fn process_event(event:serde_json::Value,state: Arc<BlockChainState>){
//     //eveent type
//     if let Some(event_obj) = event.get("event") {
//         if let Some(block_data) = event_obj.get("block") {
//             let context = event.get("context").unwrap();

//             let block = Block::new (
//                 context.get("block_hash").and_then(|v| v.as_str()).unwrap_or("").to_string(),
//                 context.get("block_number").and_then(|v| v.as_u64()).unwrap_or(0),
//                 context.get("slot").and_then(|v| v.as_u64()).unwrap_or(0),
//                 context.get("epoch").and_then(|v| v.as_u64()).unwrap_or(0),
//                 context.get("timestamp").and_then(|v| v.as_u64()).unwrap_or(0),
//                 block_data.get("tx_count").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
//                 block_data.get("size").and_then(|v| v.as_u64()).unwrap_or(0),
//             );
//             log::info!("New block: #{} - {}",block.number,&block.hash[..16]);
//             state.add_block(block).await;
//         }

//         if let Some(tx_data) = event_obj.get("transaction"){
//             //now tranaction
//             let context = event.get("context").unwrap();
            
//             let tx = Transaction::new(
//                 tx_data.get("hash").and_then(|v| v.as_str()).unwrap_or("").to_string(),
//                 context.get("block_number").and_then(|v| v.as_u64()).unwrap_or(0),
//                 context.get("timestamp").and_then(|v| v.as_u64()).unwrap_or(0),
//                 tx_data.get("fee").and_then(|v| v.as_u64()).unwrap_or(0),
//                 tx_data.get("input_count").and_then(|v| v.as_array()).map(|arr| arr.len() as u32).unwrap_or(0),
//                 tx_data.get("output_count").and_then(|v| v.as_array()).map(|arr| arr.len() as u32).unwrap_or(0),
//                 tx_data.get("total_output").and_then(|v| v.as_u64()).unwrap_or(0), 
//             );

//             log::debug!("New transaction : {}",&tx.hash[..16]);
//             state.add_transactions(tx).await;

//     }
//     }
// }

async fn process_event(event: serde_json::Value, state: Arc<BlockChainState>) {
    if event.get("event").and_then(|v| v.as_str()) != Some("apply") {
        return;
    }

    let point = match event.get("point") {
        Some(p) => p,
        None => return,
    };

    let record = match event.get("record") {
        Some(r) => r,
        None => return,
    };

    let block_hash = point.get("hash").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let slot = point.get("slot").and_then(|v| v.as_u64()).unwrap_or(0);

    // This is a transaction from SplitBlock
    if let Some(tx_hash_val) = record.get("hash") {
        let tx_hash = tx_hash_val.as_str().unwrap_or("").to_string();
        
        let fee = record.get("fee")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);
        
        let inputs = record.get("inputs")
            .and_then(|v| v.as_array())
            .map(|a| a.len() as u32)
            .unwrap_or(0);
        
        let outputs_array = record.get("outputs").and_then(|v| v.as_array());
        let outputs = outputs_array.as_ref().map(|a| a.len() as u32).unwrap_or(0);
        
        let total_output = outputs_array
            .map(|arr| {
                arr.iter()
                    .filter_map(|o| {
                        o.get("coin")
                            .and_then(|c| c.as_str())
                            .and_then(|s| s.parse::<u64>().ok())
                    })
                    .sum::<u64>()
            })
            .unwrap_or(0);

        // Add transaction
        let tx = Transaction::new(
            tx_hash.clone(),
            0,
            0,
            fee,
            inputs,
            outputs,
            total_output,
        );

        log::info!(
            "New transaction: {} (slot: {}, fee: {}, in: {}, out: {})", 
            &tx.hash[..16.min(tx.hash.len())], 
            slot,
            fee, 
            inputs, 
            outputs
        );
        state.add_transactions(tx).await;

        // create/update a block entry based on this transaction
        // Check if  already have this block
        let blocks = state.blocks.read().await;
        let existing_block = blocks.iter().find(|b| b.hash == block_hash && b.slot == slot);
        
        if existing_block.is_none() {
            drop(blocks); // Release read lock
            
            // Create new block entry
            let block = Block::new(
                block_hash,
                0,
                slot,
                0,
                0,
                1, 
                0,
            );
            
            log::info!("New block: {} (slot: {})", &block.hash[..16], slot);
            state.add_block(block).await;
        }
    }
}