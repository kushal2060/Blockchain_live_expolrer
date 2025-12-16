// src/components/layout/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletConnectButton from '@/components/wallet/WalletConnectButton';
import { useAuth } from '@/context/AuthContext';
import { Blocks, Search, Wallet,  } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const navLinks = [
    { href: '/', label: 'Explorer', icon: <Search className='w-5 h-5'/> },
    ...(isAuthenticated ? [
  
      { href: '/my-transactions', label: 'My Transactions', icon: <Blocks className='w-5 h-5'/> },
      { href: '/my-wallets', label: 'My Wallets', icon: <Wallet className='w-5 h-5'/> },
    ] : []),
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">₳</span>
            </div>
            <div>
              <div className="font-bold text-gray-900">Cardano Explorer</div>
              <div className="text-xs text-gray-500">PreProd Testnet</div>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet Connect */}
          <WalletConnectButton />
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex gap-2 pb-3 overflow-x-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 bg-gray-50'
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}