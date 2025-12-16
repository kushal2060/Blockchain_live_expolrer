// src/components/wallet/WalletConnectButton.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import WalletModal from './WalletModal';
import { Blocks, LogIn, LogOut, Plug, Wallet } from 'lucide-react';

export default function WalletConnectButton() {
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { connectedWallet, disconnectWallet } = useWallet();
  const { user, login, logout, isAuthenticated, isLoading } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = () => {
    setShowModal(true);
  };

  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    disconnectWallet();
    setShowDropdown(false);
  };

  // Authenticated user - show profile dropdown
  if (isAuthenticated && user) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 px-4 py-2 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all"
        >
          {connectedWallet?.icon && (
            <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center p-1">
              <img
                src={connectedWallet.icon}
                alt={connectedWallet.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="text-left hidden md:block">
            <div className="text-xs text-gray-500 font-medium">
              {connectedWallet?.name}
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {user.address.slice(0, 8)}...{user.address.slice(-6)}
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${
              showDropdown ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Connected Wallet</div>
              <div className="font-semibold text-gray-900">{connectedWallet?.name}</div>
        
              <div className="text-xs font-mono text-gray-600 mt-1 break-all">
                {user.address}
              </div>
            </div>

            <div className="py-2">
  
              <a
                href="/my-transactions"
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <Blocks className='w-5 h-5'/>
                <span className="text-sm font-medium text-gray-700">My Transactions</span>
              </a>
              <a
                href="/my-wallets"
                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                <Wallet className='w-5 h-5'/>
                <span className="text-sm font-medium text-gray-700">My Wallets</span>
              </a>
            </div>

            <div className="border-t border-gray-200 pt-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors w-full text-left"
              >
                <LogOut></LogOut>
                <span className="text-sm font-medium text-red-600">Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Wallet connected but not authenticated
  if (connectedWallet) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white border-2 border-gray-200 rounded-xl">
          {connectedWallet.icon && (
            <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center p-1">
              <img 
                src={connectedWallet.icon} 
                alt="" 
                className="w-full h-full object-contain" 
              />
            </div>
          )}
          <div className="text-left">
            <div className="text-xs text-gray-500 font-medium">Connected</div>
            <div className="text-sm font-semibold text-gray-900">
              {connectedWallet.name}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="px-6 py-3 bg-linear-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Signing...</span>
            </>
          ) : (
            <>
              <LogIn />
              <span>Sign In</span>
            </>
          )}
        </button>
        
        <button
          onClick={disconnectWallet}
          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // No wallet connected
  return (
    <>
      <button
        onClick={handleConnect}
        className="px-6 py-3 bg-linear-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all flex items-center gap-2"
      >
        <Plug className='' />
        <span>Connect Wallet</span>
      </button>
      <WalletModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}