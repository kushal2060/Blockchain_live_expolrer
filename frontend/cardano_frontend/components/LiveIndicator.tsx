//live indicator component
'use client';
interface LiveIndicatorProps {
    isConnected: boolean;
}

export default function LiveIndicator({isConnected}: LiveIndicatorProps) {
    return (
         <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className="text-sm font-medium">
        {isConnected ? 'Live' : 'Disconnected'}
      </span>
    </div>
    );
}