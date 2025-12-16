'use client';

import LiveIndicator from './LiveIndicator';
import { useWebsocketContext } from '@/context/WebSocketContext';

export default function Stats() {
  const { isConnected, latestBlock, blockCount, txCount } = useWebsocketContext();

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