
'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Calendar, Copy, AlertTriangle, Globe, ExternalLink, Wallet, Link as LinkIcon } from 'lucide-react';

export default function MyWalletsPage() {
  const { user, refreshUser } = useAuth();
  const { availableWallets, connectedWallet, connectWallet } = useWallet();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddWallet = async (walletId: string) => {
    setIsAdding(true);
    setError(null);

    try {
      await connectWallet(walletId);
      const newWallet = availableWallets.find((w) => w.id === walletId);
      if (!newWallet) throw new Error('Wallet not found');
      alert('Wallet connected! Sign the message to add it to your account.');
      setShowAddModal(false);
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50/30">
        <div className="container mx-auto px-4 py-10">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">My Wallets</h1>
            </div>
            <p className="text-gray-600 ml-15">
              Manage and monitor your connected Cardano wallets
            </p>
          </div>

          {/* Currently Connected */}
          {connectedWallet ? (
            <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg border border-emerald-200/50 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Currently Active Wallet</h2>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-emerald-700">Connected</span>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-white/80">
                <div className="flex items-center gap-5">
                  {connectedWallet?.icon && (
                    <div className="w-14 h-14 bg-slate-200 rounded-xl flex items-center justify-center p-2 shadow-sm shrink-0">
                      <img
                        src={connectedWallet.icon}
                        alt={connectedWallet.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-gray-900 mb-1">
                      {connectedWallet?.name}
                    </div>
                    <div className="font-mono text-sm text-gray-600 truncate">
                      {connectedWallet?.address?.slice(0, 20) ?? '—'}...
                      {connectedWallet?.address ? connectedWallet.address.slice(-8) : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-500 mb-0.5">Network</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {connectedWallet?.networkId === 0 ? 'PreProd' : 'Mainnet'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-8 mb-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Wallet</h2>
              <p className="text-sm text-gray-500 mb-5">Connect a wallet to get started with transactions</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors"
                >
                  Connect Wallet
                </button>
                <button
                  onClick={() => refreshUser()}
                  className="px-6 py-2.5 bg-white border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}

          {/* All Connected Wallets */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                All Connected Wallets
              </h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors"
              >
                + Add Wallet
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(user?.wallet_addresses || []).map((addr, idx) => (
                <div
                  key={addr}
                  className="group p-5 bg-linear-to-br from-gray-50 to-blue-50/50 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Wallet {idx + 1}
                        </div>
                        <div
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            addr === connectedWallet?.address
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {addr === connectedWallet?.address ? '● Active' : 'Connected'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="font-mono text-xs text-gray-700 break-all mb-4 bg-white/50 p-3 rounded-lg">
                    {addr}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(addr)}
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `https://preprod.cardanoscan.io/address/${addr}`,
                          '_blank'
                        )
                      }
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wallet Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <LinkIcon className="w-7 h-7 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {user?.wallet_addresses.length ?? 0}
              </div>
              <div className="text-sm text-gray-600">Connected Wallets</div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {user ? new Date(user.created_at * 1000).toLocaleDateString() : '—'}
              </div>
              <div className="text-sm text-gray-600">Member Since</div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Globe className="w-7 h-7 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">PreProd</div>
              <div className="text-sm text-gray-600">Active Network</div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 mb-1.5">
                  Security Notice
                </h3>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Never share your seed phrase or private keys. Always verify the
                  website URL before signing transactions. This is a testnet
                  explorer — use only test ADA.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Wallet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add Wallet</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {availableWallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleAddWallet(wallet.id)}
                  disabled={isAdding}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-center gap-4 disabled:opacity-50"
                >
                  {wallet.icon && (
                    <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center p-2 shrink-0">
                      <img src={wallet.icon} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="text-left flex-1">
                    <div className="font-semibold text-gray-900">{wallet.name}</div>
                    <div className="text-sm text-gray-500">
                      {wallet.isInstalled ? '✓ Installed' : 'Not installed'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}