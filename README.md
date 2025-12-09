# Cardano PreProd Live Explorer

A real-time blockchain explorer for Cardano's PreProd testnet that streams live blocks and transactions using WebSockets.

## ✨ Features

- 🔴 **Live Data Streaming** - Real-time blocks and transactions via WebSockets
- 🦀 **Rust Backend** - High-performance backend using Oura and Actix-web
- ⚡ **Next.js Frontend** - Modern React UI with TypeScript and Tailwind CSS
- 📡 **Oura Integration** - Direct connection to Cardano node using Oura pipeline


## 🛠️ Tech Stack

**Backend:**
- Rust (Actix-web, Tokio)
- Oura (Cardano blockchain pipeline)
- WebSocket server

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- WebSocket client



### Backend
```bash
cargo install oura
cd backend
cargo run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```


