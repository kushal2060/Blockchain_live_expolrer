'use client';

import { Transactions } from '@/types/transaction';
import Link from 'next/link';

interface TransactionCardProps {
  transaction: Transactions;
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  const date = new Date(transaction.timestamp * 1000);
  const feeAda = transaction.fee / 1_000_000; //  to ADA

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">Transaction Hash</div>
          <Link href={`https://preprod.cardanoscan.io/transaction/${transaction.hash}`} target="_blank">
          <code className="text-xs font-mono text-blue-600 break-all">
            {transaction.hash.substring(0, 40)}...
          </code></Link> 
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <div className="text-xs text-black">Block</div>
          <div className="text-black font-black">#{transaction.block_number}</div>
        </div>
        <div>
          <div className="text-xs text-black">Fee</div>
          <div className="text-black font-black">{feeAda.toFixed(3)} ₳</div>
        </div>
        <div>
          <div className="text-xs text-black">I/O</div>
          <div className="text-black font-black">
            {transaction.input_count}/{transaction.output_count}
          </div>
        </div>
      </div>

      <div className="text-xs text-black">
         {date.toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })}
      </div>
    </div>
  );
}