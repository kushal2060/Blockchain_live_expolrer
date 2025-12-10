
'use client';

import { useEffect, useState } from 'react';
import { useWebsocket } from '@/hooks/websocket';
import LiveIndicator from './LiveIndicator';


const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

export default function Stats() {
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [blockCount, setBlockCount] = useState<number>(0);
  const [txCount, setTxCount] = useState<number>(0);
  const { isConnected, lastMessage } = useWebsocket(WS_URL);


  useEffect(() => {
    if (lastMessage?.type === 'update') {
      if (lastMessage.blocks && lastMessage.blocks.length > 0) {
        const n = Number(lastMessage.blocks[0]?.number);
        if (Number.isFinite(n)) {
          setLatestBlock(n);
        }
        setBlockCount((prev) => prev + (lastMessage.blocks?.length || 0));
      }
      if (lastMessage.transactions) {
        setTxCount((prev) => prev + (lastMessage.transactions?.length || 0));
      }
    }
  }, [lastMessage]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-500">Network Status</h3>
          <LiveIndicator isConnected={isConnected} />
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {isConnected ? 'Synced' : 'Offline'}
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Latest Block</h3>
        <p className="text-3xl font-bold text-blue-600">
          #{latestBlock != null ? latestBlock.toLocaleString() : '—'}
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Blocks (Session)</h3>
        <p className="text-3xl font-bold text-green-600">{blockCount}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Transactions (Session)</h3>
        <p className="text-3xl font-bold text-purple-600">{txCount}</p>
      </div>
    </div>
  );
}