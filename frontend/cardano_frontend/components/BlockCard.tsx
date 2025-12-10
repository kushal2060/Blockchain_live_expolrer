'use client';

import { Blocks } from "@/types/block";
import Link from "next/dist/client/link";
 interface BlockCardProps {
    block: Blocks;
    isLatest?: boolean;
}

export default function BlockCard({block,isLatest}: BlockCardProps) {
    const date = new Date(block.timestamp * 1000);
    return (
    <div
      className={`p-6 rounded-lg border transition-all duration-300 ${
        isLatest
          ? 'bg-linear-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-lg scale-[1.02]'
          : 'bg-white border-gray-200 hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">#{block.number % 100}</span>
          </div>
          <div>
            <div className="text-sm text-gray-500">Block Height</div>
            <div className="text-xl font-bold text-gray-900">
              #{block.number !=null ? block.number.toLocaleString(): '-'}
            </div>
          </div>
        </div>
        
        {isLatest && (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            Latest
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Transactions</div>
          <div className="text-lg font-semibold text-gray-900">{block.tx_count}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Epoch</div>
          <div className="text-lg font-semibold text-gray-900">{block.epoch}</div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-500">Hash:</span>
          <Link href={`https://preprod.cardanoscan.io/block/${block.number}`} target="_blank">
          <code className="ml-2 text-xs font-mono text-blue-600" >
            {block.hash.substring(0, 20)}...
          </code></Link>
       
        </div>
        <div>
          <span className="text-gray-500">Slot:</span>
          <span className="ml-2 font-black text-black">{block.slot.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-500">Size:</span>
          <span className="ml-2 font-black text-black">{(block.size / 1024).toFixed(2)} KB</span>
        </div>
        <div>
          <span className="text-gray-500">Time:</span>
          <span className="ml-2 font-black text-black">{date.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}