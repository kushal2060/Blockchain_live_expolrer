'use client';

import { useEffect, useState } from 'react';
import { Transactions } from '@/types/transaction';
import TransactionCard from './TransactionCard';
import { useWebsocket } from '@/hooks/websocket';


const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transactions[]>([]);
  const [loading, setLoading] = useState(true);
    const { isConnected, lastMessage } = useWebsocket(WS_URL);

//   //initial transactions
//   useEffect(() => {
//     fetchTransactions()
//       .then((data) => {
//         setTransactions(data.transactions);
//         setLoading(false);
//       })
//       .catch((error) => {
//         console.error('Error fetching transactions:', error);
//         setLoading(false);
//       });
//   }, []);

  //  transactions from WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'update' && lastMessage.transactions) {
      setTransactions((prev) => {
        const newTxs = [...lastMessage.transactions!, ...prev];
        const unique = newTxs.filter(
          (tx, index, self) =>
            index === self.findIndex((t) => t.hash === tx.hash)
        );
        return unique.slice(0, 50);
      });
    }
  }, [lastMessage]);

  if (!isConnected && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Connecting to blockchain...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Recent Transactions</h2>
      
      {transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No transactions available yet...
        </div>
      ) : (
        <div className="grid gap-3">
          {transactions.slice(0, 10).map((tx) => (
            <TransactionCard key={tx.hash} transaction={tx} />
          ))}
        </div>
      )}
    </div>
  );
}