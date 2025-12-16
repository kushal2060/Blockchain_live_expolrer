// src/app/page.tsx

import BlockList from '@/components/BlockList';
import TransactionList from '@/components/TransactionList';
import Stats from '@/components/Stats';

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-20 h-20 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
              <span className="text-white text-4xl font-bold">₳</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            Cardano <span className="bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">PreProd</span> Explorer
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Real-time blockchain explorer with live transaction monitoring and wallet integration
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">Live</span>
            </div>
            <div className="px-4 py-2 bg-white rounded-full shadow-lg">
              <span className="text-sm font-semibold text-gray-700">PreProd Testnet</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <Stats />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <BlockList />
          <TransactionList />
        </div>

        {/* Features Section */}
        <div className="mt-16 mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Powerful Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center text-3xl mb-4">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Real-Time Updates
              </h3>
              <p className="text-gray-600">
                Watch blocks and transactions as they happen on the blockchain with WebSocket connections
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center text-3xl mb-4">
                👛
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Wallet Integration
              </h3>
              <p className="text-gray-600">
                Connect your Cardano wallet and track your personal transactions securely with Web3 authentication
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center text-3xl mb-4">
                🔍
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Deep Insights
              </h3>
              <p className="text-gray-600">
                Explore detailed block and transaction data with comprehensive analytics and statistics
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Explore?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Connect your wallet to track your transactions and get personalized insights
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://docs.cardano.org/" target='default'
              className="px-8 py-4 bg-white bg-opacity-20 backdrop-blur-sm text-black rounded-xl font-bold hover:bg-opacity-30 transition-all"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}