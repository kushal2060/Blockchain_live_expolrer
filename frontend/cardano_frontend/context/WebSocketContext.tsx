'use client';
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

type Msg = any;

type WSContext = {
  isConnected: boolean;
  lastMessage: Msg | null;
  latestBlock: number | null;
  blockCount: number;
  txCount: number;
  send: (data: any) => void;
};

const WebsocketContext = createContext<WSContext | null>(null);

export function WebsocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<Msg | null>(null);
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [blockCount, setBlockCount] = useState<number>(0);
  const [txCount, setTxCount] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const url = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws');

  useEffect(() => {
    if (wsRef.current) return; // already connected

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (ev) => {
      let parsed: any = null;
      try {
        parsed = JSON.parse(ev.data);
        setLastMessage(parsed);
      } catch {
        setLastMessage(ev.data);
      }

      // Maintain session stats here so they persist across page navigation
      if (parsed && parsed.type === 'update') {
        if (parsed.blocks && parsed.blocks.length > 0) {
          const n = Number(parsed.blocks[0]?.number ?? parsed.blocks[0]?.block_no ?? parsed.blocks[0]?.block_number);
          if (Number.isFinite(n)) setLatestBlock(n);
          setBlockCount((prev) => prev + (parsed.blocks?.length || 0));
        }
        if (parsed.transactions && parsed.transactions.length > 0) {
          setTxCount((prev) => prev + parsed.transactions.length);
        }
      }
    };
    ws.onerror = (e) => console.error('WebSocket error', e);
    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      // simple reconnect after delay
      setTimeout(() => {
        if (!wsRef.current) {
          const reconnect = new WebSocket(url);
          wsRef.current = reconnect;
        }
      }, 3000);
    };

    return () => {
      try { ws.close(); } catch {}
      wsRef.current = null;
    };
  }, [url]);

  const send = (data: any) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      console.warn('WebSocket not open, drop send');
    }
  };

  return (
    <WebsocketContext.Provider value={{ isConnected, lastMessage, latestBlock, blockCount, txCount, send }}>
      {children}
    </WebsocketContext.Provider>
  );
}

export const useWebsocketContext = () => {
  const ctx = useContext(WebsocketContext);
  if (!ctx) throw new Error('useWebsocketContext must be used within WebsocketProvider');
  return ctx;
};