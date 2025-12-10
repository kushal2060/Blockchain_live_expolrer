
'use client';

import { useEffect, useState } from "react";
import { Blocks } from "@/types/block";
import BlockCard from "./BlockCard";
import { useWebsocket } from "@/hooks/websocket";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://blockchainliveexpolrer-production-b895.up.railway.app/ws';

export default function BlockList() {
  const [blocks, setBlocks] = useState<Blocks[]>([]);
  const { isConnected, lastMessage } = useWebsocket(WS_URL);

  // Fetch blocks from websocket only
  useEffect(() => {
    if (lastMessage?.type === 'update' && lastMessage.blocks) {
      setBlocks((prev) => {
        const newBlocks = [...lastMessage.blocks!, ...prev];
        // Remove duplicates based on hash
        const unique = newBlocks.filter(
          (block, index, self) =>
            index === self.findIndex((b) => b.hash === block.hash)
        );
        return unique.slice(0, 20); // Keep latest 20 blocks
      });
    }
  }, [lastMessage]);

  // Show loading state until first message arrives
  if (!isConnected && blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Connecting to blockchain...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
       <h2 className="text-2xl font-bold text-gray-900">Latest Blocks</h2>
      
      {blocks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Waiting for blocks from the network...</p>
          <p className="text-sm mt-2">New blocks will appear here in real-time</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {/* {blocks.map((block, index) => (
            <BlockCard key={block.hash} block={block} isLatest={index === 0} />
          ))} */}
           {blocks.slice(0, 10).map((block,index) => (
                     <BlockCard key={block.hash} block={block} isLatest={index === 0} />
                    ))}
        </div>
      )}
    </div>
  );
}
