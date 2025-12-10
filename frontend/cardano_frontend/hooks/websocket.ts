//websocket client for communicatiing with rust backend
import { useEffect,useState,useRef,useCallback } from "react";

interface WebSocketMessage {
    type: string;
    blocks?: any[];
    transactions?: any[];
}

export function useWebsocket(url:string){
    const [isConnected,setIsConnected] = useState(false);
    const [lastMessage,setLastMessage] = useState<WebSocketMessage | null>(null);
    const wsRef = useRef<WebSocket | null>(null); //mutable reference to WebSocket instance
    const reconnectInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect =useCallback(()=> { //using useCalback kinaki there is recursion so it nedds stable identity
        try{
            const ws = new WebSocket(url);
            wsRef.current = ws;
            ws.onopen=()=> {
                console.log("WebSocket connected");
                setIsConnected(true);
            };
            ws.onmessage=(event)=> {
                try{
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                }
                catch(error){
                    console.error("Error parsing WebSocket message:",error);
                }
            };
           ws.onerror=(error)=>{
            console.error("WebSocket error:",error);
           };
           
           ws.onclose=()=> {
            console.log("WebSocket disconnected");
            setIsConnected(false);
            //attempt again after 3 seconds
            reconnectInterval.current = setTimeout(() => {
                console.log("Reconnecting WebSocket...");
                connect();
            }, 3000);
        };

    } catch(error){
        console.error("WebSocket connection error:",error);
    }
    },[url]);
    
    useEffect(() => {
        connect();
        return ()=>{
            if(reconnectInterval.current){
                clearTimeout(reconnectInterval.current);
            }
            if(wsRef.current){
                wsRef.current.close();
            }
        };

    },[connect]);

    return { isConnected, lastMessage };
}