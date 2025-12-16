

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useWallet } from './WalletContext';
import { User } from '@/types/auth';

interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { connectedWallet, signMessageWithWallet } = useWallet();

  const isAuthenticated = !!user && apiClient.isAuthenticated();

  // Try to restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      if (apiClient.isAuthenticated()) {
        const userData = await apiClient.getCurrentUser();
        setUser(userData);
        console.log(' Session restored:', userData.address);
      }
    } catch (err: any) {
      console.warn('Failed to restore session:', err.message);
      
      // Try to refresh token
      try {
        await apiClient.refreshToken();
        const userData = await apiClient.getCurrentUser();
        setUser(userData);
        console.log(' Session refreshed:', userData.address);
      } catch (refreshErr) {
        // Session expired, clear tokens
        apiClient.clearTokens();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    if (!connectedWallet) {
      throw new Error('Please connect your wallet first');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting authentication...');

      // Step 1: Get challenge from backend
      const { message } = await apiClient.getChallenge(connectedWallet.address);
      console.log('Challenge received');

      // Step 2: Sign message with wallet
      const signedData = await signMessageWithWallet(message);
      console.log('Message signed');

      // Step 3: Send signature to backend
      const authResponse = await apiClient.login({
        address: connectedWallet.address,
        message,
        signature: signedData.signature,
        public_key: signedData.key,
      });

      setUser(authResponse.user);
      console.log(' Authentication successful!');

      // Redirect to dashboard
      router.push('/');
    } catch (err: any) {
      console.error('Authentication failed:', err);
      setError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      router.push('/');
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Failed to refresh user:', err);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}