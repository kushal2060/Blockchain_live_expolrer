// src/context/WalletContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  KNOWN_WALLETS,
  enableWallet,
  getWalletAddress,
  getNetworkId,
  isCorrectNetwork,
  signMessage,
} from '@/lib/cardano';
import { WalletInfo, WalletAPI, SignedData } from '@/types/wallet';

interface ConnectedWallet {
  id: string;
  name: string;
  icon: string;
  api: WalletAPI;
  address: string;
  networkId: number;
}

interface WalletContextType {
  // State
  availableWallets: WalletInfo[];
  connectedWallet: ConnectedWallet | null;
  isConnecting: boolean;
  error: string | null;

  // Actions
  connectWallet: (walletId: string) => Promise<void>;
  disconnectWallet: () => void;
  signMessageWithWallet: (message: string) => Promise<SignedData>;
  refreshWallets: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect wallets on mount
  useEffect(() => {
    refreshWallets();
    // Re-check wallets periodically in case user installs one
    const interval = setInterval(refreshWallets, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-reconnect on page load if wallet was previously connected
  useEffect(() => {
    const lastWalletId = localStorage.getItem('last_connected_wallet');
    if (lastWalletId && !connectedWallet) {
      connectWallet(lastWalletId).catch((err) => {
        console.warn('Auto-reconnect failed:', err);
        localStorage.removeItem('last_connected_wallet');
      });
    }
  }, [availableWallets]);

  const refreshWallets = () => {
    if (typeof window === 'undefined' || !window.cardano) {
      setAvailableWallets(Object.values(KNOWN_WALLETS));
      return;
    }

    // Check which wallets are actually installed
        const detected = Object.values(KNOWN_WALLETS).map((wallet) => ({
          ...wallet,
          isInstalled: !!window.cardano?.[wallet.id],
        }));

    setAvailableWallets(detected);
  };

  const connectWallet = async (walletId: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log(`Connecting to ${walletId}...`);

      // Enable wallet
      const api = await enableWallet(walletId);

      // Check network
      const onCorrectNetwork = await isCorrectNetwork(api, 'testnet');
      if (!onCorrectNetwork) {
        throw new Error('Please switch to PreProd testnet');
      }

      // Get wallet info
      const address = await getWalletAddress(api);
      const networkId = await getNetworkId(api);

      const walletInfo = availableWallets.find((w) => w.id === walletId);

      const connected: ConnectedWallet = {
        id: walletId,
        name: walletInfo?.name || walletId,
        icon: walletInfo?.icon || '',
        api,
        address,
        networkId,
      };

      setConnectedWallet(connected);
      localStorage.setItem('last_connected_wallet', walletId);

      console.log('✅ Wallet connected:', address);
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setError(err.message || 'Failed to connect wallet');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setConnectedWallet(null);
    localStorage.removeItem('last_connected_wallet');
    console.log('Wallet disconnected');
  };

  const signMessageWithWallet = async (message: string): Promise<SignedData> => {
    if (!connectedWallet) {
      throw new Error('No wallet connected');
    }

    try {
      const signedData = await signMessage(
        connectedWallet.api,
        connectedWallet.address,
        message
      );
      return signedData;
    } catch (err: any) {
      console.error('Failed to sign message:', err);
      throw err;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        availableWallets,
        connectedWallet,
        isConnecting,
        error,
        connectWallet,
        disconnectWallet,
        signMessageWithWallet,
        refreshWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}