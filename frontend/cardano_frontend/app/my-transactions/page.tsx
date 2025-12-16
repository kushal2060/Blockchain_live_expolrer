'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { RefreshCw, Copy, ExternalLink, Activity, Wallet, CheckCircle, ArrowRightLeft } from 'lucide-react';

function formatAda(lovelace: number | undefined) {
  if (lovelace == null) return '—';
  return `${(lovelace / 1_000_000).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 6})} ₳`;
}

function formatDate(ts?: number) {
  if (!ts) return '—';
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function MyTransactionsPage() {
  const { user } = useAuth();
  const { connectedWallet } = useWallet();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [connectedWallet]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Get Bech32 address from connected wallet
      const addresses = connectedWallet?.address ? [connectedWallet.address] : undefined;
      
      console.log('Fetching transactions for addresses:', addresses);
      const data: any = await apiClient.getUserTransactions(addresses);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 py-10">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">My Transactions</h1>
            </div>
            <p className="text-gray-600 ml-15">Activity overview for your connected wallets</p>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Transaction List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
                    <p className="text-sm text-gray-500 mt-1">Shows transactions from your authenticated wallets</p>
                  </div>
                  <button
                    onClick={loadTransactions}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="animate-pulse p-5 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-gray-200 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-5 bg-gray-100 rounded-full flex items-center justify-center">
                      <ArrowRightLeft className="w-10 h-10 text-gray-400" />
                    </div>
                    <div className="text-lg font-semibold text-gray-700 mb-2">No transactions found</div>
                    <div className="text-sm text-gray-500 mb-4">
                      Connect wallets with transaction history or wait for new activity
                    </div>
                    <button
                      onClick={loadTransactions}
                      className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Try Refreshing
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.hash} className="group bg-linear-to-br from-gray-50 to-blue-50/30 border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="font-mono text-sm text-gray-700 truncate font-medium">
                                {tx.hash.slice(0, 16)}...{tx.hash.slice(-8)}
                              </div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="w-3 h-3" />
                                Confirmed
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                              <span>Block #{tx.block_number ?? '—'}</span>
                              <span>•</span>
                              <span>{formatDate(tx.block_time)}</span>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="bg-white/60 px-3 py-2 rounded-lg">
                                <div className="text-xs text-gray-500 mb-0.5">Fee</div>
                                <div className="text-sm font-semibold text-gray-900">{formatAda(tx.fee)}</div>
                              </div>
                              <div className="bg-white/60 px-3 py-2 rounded-lg">
                                <div className="text-xs text-gray-500 mb-0.5">I/O</div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {(tx.inputs || []).length} / {(tx.outputs || []).length}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <a
                              href={`https://preprod.cardanoscan.io/transaction/${tx.hash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2 rounded-lg bg-white border-2 border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View
                            </a>
                            <button
                              onClick={() => handleCopy(tx.hash)}
                              className="px-4 py-2 rounded-lg bg-white border-2 border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
                              title="Copy transaction hash"
                            >
                              <Copy className="w-4 h-4" />
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Connected Wallets Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Connected Wallets</h3>
                    <p className="text-xs text-gray-500">Your authenticated wallets</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {user?.wallet_addresses?.length ? (
                    user.wallet_addresses.map((addr: string) => (
                      <div key={addr} className="group flex items-center justify-between gap-2 bg-linear-to-br from-slate-50 to-blue-50/30 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all">
                        <div className="text-xs font-mono text-gray-700 truncate flex-1">
                          {addr.slice(0, 12)}...{addr.slice(-8)}
                        </div>
                        <button
                          onClick={() => handleCopy(addr)}
                          className="shrink-0 px-2.5 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-1.5"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-sm text-gray-500 mb-3">No wallets connected</div>
                      <a
                        href="/my-wallets"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Wallet className="w-4 h-4" />
                        Connect Wallet
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-linear-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-200/50 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Transaction Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Shown</span>
                    <span className="text-lg font-bold text-gray-900">{transactions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Wallets Tracked</span>
                    <span className="text-lg font-bold text-gray-900">{user?.wallet_addresses?.length ?? 0}</span>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}