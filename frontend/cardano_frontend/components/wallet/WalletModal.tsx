'use client';

import { useMemo } from 'react';
import { useWallet } from '@/context/WalletContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: Props) {
  const { availableWallets, connectWallet, isConnecting, error } = useWallet();

  const sorted = useMemo(() => {
    // show installed wallets first
    return [...availableWallets].sort((a, b) => (b.isInstalled ? 1 : 0) - (a.isInstalled ? 1 : 0));
  }, [availableWallets]);

  const handleConnect = async (walletId: string) => {
    try {
      await connectWallet(walletId);
      onClose();
    } catch {
      // handled by context
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Connect Wallet</h2>
            <p className="text-sm text-gray-500 mt-1">Choose your preferred Cardano wallet</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        {availableWallets.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">👛</span>
            </div>
            <p className="text-gray-700 font-medium mb-2">No Cardano wallets detected</p>
            <p className="text-sm text-gray-500 mb-4">
              Install a CIP-30 compatible wallet to get started
            </p>
            <div className="flex gap-2 justify-center text-xs text-gray-400">
              <span>Supported:</span>
              <span>Nami • Eternl • Yoroi • Lace • Typhon</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((wallet) => (
              <div
                key={wallet.id}
                className="group flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
              >
                <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-slate-200 shrink-0 shadow-sm">
                  {wallet.icon ? (
                    <img
                      src={wallet.icon}
                      alt={wallet.name}
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <div className="text-base font-bold text-gray-600">{wallet.name.slice(0,2).toUpperCase()}</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 mb-0.5">{wallet.name}</div>
                  <div className="flex items-center gap-2">
                    {wallet.isInstalled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Installed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Not installed
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {wallet.isInstalled ? (
                    <button
                      onClick={() => handleConnect(wallet.id)}
                      disabled={isConnecting}
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </button>
                  ) : (
                    <a
                      href={wallet.website}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Install
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-center text-xs text-gray-500">
            By connecting, you agree to our terms. We never store your private keys.
          </p>
        </div>
      </div>
    </div>
  );
}