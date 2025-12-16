//websocket client for communicating with rust backend
import { useEffect, useState, useRef, useCallback } from "react";

declare global {
  interface Window {
    __GLOBAL_WS?: WebSocket | null;
  }
}

interface WebSocketMessage {
  type: string;
  blocks?: any[];
  transactions?: any[];
}

export function useWebsocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<{ message?: (e: MessageEvent) => void; open?: () => void; close?: () => void }>(
    {}
  );
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    try {
      // If a global socket exists, reuse it and attach listeners
      if (typeof window !== "undefined" && window.__GLOBAL_WS) {
        const existing = window.__GLOBAL_WS!;
        wsRef.current = existing;
        // attach listeners that update this hook's state
        const onmessage = (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data);
            setLastMessage(data);
          } catch {
            // ignore parse errors
          }
        };
        const onopen = () => setIsConnected(true);
        const onclose = () => setIsConnected(false);

        existing.addEventListener("message", onmessage);
        existing.addEventListener("open", onopen);
        existing.addEventListener("close", onclose);

        listenersRef.current = { message: onmessage, open: onopen, close: onclose };

        // reflect current ready state
        if (existing.readyState === WebSocket.OPEN) setIsConnected(true);
        return;
      }

      // create new socket and store globally
      const ws = new WebSocket(url);
      wsRef.current = ws;
      if (typeof window !== "undefined") window.__GLOBAL_WS = ws;
      let createdByThis = true;

      const onopen = () => {
        setIsConnected(true);
      };
      const onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch {
          // ignore bad messages
        }
      };
      const onerror = (evt: Event) => {
        // browser WebSocket error events are opaque; avoid dumping empty object
        console.warn("WebSocket error (event):", (evt && (evt as any).type) || evt);
      };
      const onclose = () => {
        setIsConnected(false);
        // clear global reference only if this instance created it
        if (createdByThis && typeof window !== "undefined" && window.__GLOBAL_WS === ws) {
          window.__GLOBAL_WS = null;
        }
        // schedule reconnect (this hook will try to reattach on next connect)
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.addEventListener("open", onopen);
      ws.addEventListener("message", onmessage);
      ws.addEventListener("error", onerror);
      ws.addEventListener("close", onclose);

      listenersRef.current = { message: onmessage, open: onopen, close: onclose };
    } catch (error) {
      console.warn("WebSocket connection error:", (error as any)?.message || error);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      // remove listeners attached by this hook but do not forcibly close the global socket
      const ws = wsRef.current;
      if (ws && listenersRef.current.message) {
        ws.removeEventListener("message", listenersRef.current.message);
      }
      if (ws && listenersRef.current.open) {
        ws.removeEventListener("open", listenersRef.current.open);
      }
      if (ws && listenersRef.current.close) {
        ws.removeEventListener("close", listenersRef.current.close);
      }
      listenersRef.current = {};
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      // do not call ws.close() here so other pages keep using the socket
    };
  }, [connect]);

  return { isConnected, lastMessage };
}