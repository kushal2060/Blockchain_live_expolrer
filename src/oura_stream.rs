use std::sync::Arc;
use tokio::sync::RwLock;
use crate::models::{Block, Transaction};

// Constants for Cardano preprod network
const CARDANO_RELAY: &str = "preprod-node.world.dev.cardano.org:30000";
const CARDANO_MAGIC: &str = "pre-prod"; // Preprod magic number

// Common state
pub struct BlockChainState {
    pub blocks: Arc<RwLock<Vec<Block>>>,
    pub transactions: Arc<RwLock<Vec<Transaction>>>,
}

impl BlockChainState {
    pub fn new() -> Self {
        Self {
            blocks: Arc::new(RwLock::new(Vec::new())),
            transactions: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn add_block(&self, block: Block) {
        let mut blocks = self.blocks.write().await;
        blocks.insert(0, block);

        // Only keep last 100 blocks
        if blocks.len() > 100 {
            blocks.truncate(100);
        }
    }

    pub async fn add_transactions(&self, tx: Transaction) {
        let mut transactions = self.transactions.write().await;
        transactions.insert(0, tx);

        // Only keep 500
        if transactions.len() > 500 {
            transactions.truncate(500);
        }
    }

    pub async fn get_blocks(&self, limit: usize) -> Vec<Block> {
        let blocks = self.blocks.read().await;
        blocks.iter().take(limit).cloned().collect()
    }

    pub async fn get_transactions(&self, limit: usize) -> Vec<Transaction> {
        let transactions = self.transactions.read().await;
        transactions.iter().take(limit).cloned().collect()
    }
}

// Spawn oura as subprocess and parse stdout
pub async fn start_oura(state: Arc<BlockChainState>) {
    use std::io::{BufRead, BufReader};
    use std::process::{Command, Stdio};

    tokio::spawn(async move {
        log::info!("Starting oura dump stream");

        let mut child = Command::new("oura")
            .arg("dump")
            .arg(CARDANO_RELAY)
            .arg("--bearer")
            .arg("tcp")
            .arg("--magic")
            .arg(CARDANO_MAGIC)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("Failed to start Oura");

        let stdout = child.stdout.take().expect("Failed to capture stdout");
        let stderr = child.stderr.take().expect("Failed to capture stderr");

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

async fn process_event(event: serde_json::Value, state: Arc<BlockChainState>) {
    // Only process "apply" events
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

    // Extract basic metadata from point
    let block_hash = point
        .get("hash")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    
    let slot = point
        .get("slot")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);

    // Get context for additional metadata
    let context = record.get("context");
    
    let block_number = context
        .and_then(|c| c.get("block_number"))
        .and_then(|v| v.as_u64())
        .unwrap_or(slot);
    
    let epoch = context
        .and_then(|c| c.get("epoch"))
        .and_then(|v| v.as_u64())
        .unwrap_or(slot / 432000);
    
    let timestamp = context
        .and_then(|c| c.get("timestamp"))
        .and_then(|v| v.as_u64())
        .unwrap_or(1654041600 + slot);

    // Check if this is a Block event
    if let Some(block_obj) = record.get("block") {
        let body_size = block_obj
            .get("body_size")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        
        let tx_count = block_obj
            .get("tx_count")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        let block_number = block_obj
            .get("number")
            .and_then(|v| v.as_u64())
            .unwrap_or(block_number);

        let epoch = block_obj
            .get("epoch")
            .and_then(|v| v.as_u64())
            .unwrap_or(epoch);

        let block = Block::new(
            block_hash.clone(),
            block_number,
            slot,
            epoch,
            timestamp,
            tx_count,
            body_size,
        );

        log::info!(
            "New block: {} (number: {}, epoch: {}, slot: {}, txs: {}, size: {} bytes)",
            &block.hash[..16.min(block.hash.len())],
            block_number,
            epoch,
            slot,
            tx_count,
            body_size
        );
        state.add_block(block).await;
        return;
    }

    // Check if this is a Transaction event
    if let Some(tx_obj) = record.get("transaction") {
        let tx_hash = tx_obj
            .get("hash")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let fee = tx_obj
            .get("fee")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);

        let input_count = tx_obj
            .get("input_count")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        let output_count = tx_obj
            .get("output_count")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        let total_output = tx_obj
            .get("total_output")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);

        let tx = Transaction::new(
            tx_hash.clone(),
            block_number,
            timestamp,
            fee,
            input_count,
            output_count,
            total_output,
        );

        log::info!(
            "New transaction: {} (block: {}, fee: {}, in: {}, out: {})",
            &tx.hash[..16.min(tx.hash.len())],
            block_number,
            fee,
            input_count,
            output_count
        );
        state.add_transactions(tx).await;
    }
}