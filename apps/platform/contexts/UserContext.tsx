"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { walletApi, whaleApi } from '@/lib/api';

interface User {
  address: string;
  isConnected: boolean;
  whales?: string[]; // User's subscribed whale addresses
}

interface UserContextType {
  user: User | null;
  connect: (address: string) => Promise<void>;
  disconnect: () => void;
  isLoading: boolean;
  refreshWhales: () => Promise<void>;
  backendStatus: 'online' | 'offline' | 'checking';
  connectionError: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Check backend connectivity
  const checkBackendHealth = useCallback(async (): Promise<'online' | 'offline' | 'checking'> => {
    try {
      setBackendStatus('checking');
      await whaleApi.getHealth();
      setBackendStatus('online');
      setConnectionError(null);
      return 'online';
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendStatus('offline');
      setConnectionError('Backend server is currently unavailable');
      return 'offline';
    }
  }, []);

  // Check for saved user address on mount and connect to fetch whales
  useEffect(() => {
    const initializeUser = async () => {
      const savedAddress = localStorage.getItem('userAddress');
      if (savedAddress) {
        try {
          // First check backend health
          const healthStatus = await checkBackendHealth();
          
          if (healthStatus === 'online') {
            // Connect to backend to fetch user's whale subscriptions
            const response = await walletApi.connect(savedAddress);
            setUser({ 
              address: savedAddress, 
              isConnected: true, 
              whales: response.whales 
            });
            console.log('🔗 Reconnected user with whale subscriptions:', response.whales);
          } else {
            // Backend is offline, set user without whales
            setUser({ address: savedAddress, isConnected: true });
          }
        } catch (error) {
          console.error('Failed to reconnect user:', error);
          setConnectionError('Failed to connect to backend');
          // Still set the user but without whales
          setUser({ address: savedAddress, isConnected: true });
        }
      }
      setIsLoading(false);
    };

    initializeUser();
  }, [checkBackendHealth]);

  // Periodic health check
  useEffect(() => {
    const interval = setInterval(checkBackendHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  const connect = async (address: string) => {
    try {
      setIsLoading(true);
      setConnectionError(null);
      console.log('🔗 Connecting wallet:', address);
      
      // Check backend health first
      const healthStatus = await checkBackendHealth();
      
      if (healthStatus === 'online') {
        // Connect to backend to fetch user's whale subscriptions
        const response = await walletApi.connect(address);
        
        const newUser = { 
          address, 
          isConnected: true, 
          whales: response.whales 
        };
        
        setUser(newUser);
        localStorage.setItem('userAddress', address);
        
        console.log('✅ Wallet connected successfully:', {
          address,
          whales: response.whales,
          total: response.total
        });
      } else {
        // Backend is offline, still connect locally
        const newUser = { 
          address, 
          isConnected: true
        };
        
        setUser(newUser);
        localStorage.setItem('userAddress', address);
        
        console.log('⚠️ Wallet connected locally (backend offline):', address);
      }
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect wallet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    console.log('🔌 Disconnecting wallet');
    setUser(null);
    localStorage.removeItem('userAddress');
    setConnectionError(null);
  };

  const refreshWhales = async () => {
    if (!user?.address) return;
    
    try {
      const healthStatus = await checkBackendHealth();
      
      if (healthStatus === 'online') {
        const response = await walletApi.connect(user.address);
        setUser(prev => prev ? { ...prev, whales: response.whales } : null);
        console.log('🔄 Refreshed whale subscriptions:', response.whales);
      } else {
        console.log('⚠️ Cannot refresh whales: backend offline');
      }
    } catch (error) {
      console.error('❌ Failed to refresh whales:', error);
      setConnectionError('Failed to refresh whale data');
    }
  };

  return (
    <UserContext.Provider value={{ user, connect, disconnect, isLoading, refreshWhales, backendStatus, connectionError }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
