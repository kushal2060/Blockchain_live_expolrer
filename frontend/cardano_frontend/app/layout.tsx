// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WalletProvider } from '@/context/WalletContext';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cardano PreProd Explorer | Live Blockchain Data',
  description: 'Real-time blockchain explorer for Cardano PreProd testnet with wallet integration and live transaction monitoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <AuthProvider>
            <Navbar />
            {children}
            <Footer />
          </AuthProvider>
        </WalletProvider>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">₳</span>
              </div>
              <span className="font-bold text-lg">Cardano Explorer</span>
            </div>
            <p className="text-gray-400 text-sm">
              Real-time blockchain explorer for Cardano PreProd testnet
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-4">Explorer</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a></li>
              <li><a href="/my-transactions" className="hover:text-white transition-colors">My Transactions</a></li>
              <li><a href="/my-wallets" className="hover:text-white transition-colors">My Wallets</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="https://docs.cardano.org" target="_blank" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="https://developers.cardano.org" target="_blank" className="hover:text-white transition-colors">Developer Portal</a></li>
              <li><a href="https://preprod.cardanoscan.io" target="_blank" className="hover:text-white transition-colors">CardanoScan</a></li>
              <li><a href="https://github.com/txpipe/oura" target="_blank" className="hover:text-white transition-colors">Oura GitHub</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Network</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">PreProd Testnet</span>
              </div>
              <div className="text-xs text-gray-500">
                This explorer is for the Cardano PreProd testnet only. Do not use real ADA.
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>© 2024 Cardano PreProd Explorer. Built with Rust + Next.js + Oura</p>
          <p className="mt-2">Made with ❤️ for the Cardano community</p>
        </div>
      </div>
    </footer>
  );
}