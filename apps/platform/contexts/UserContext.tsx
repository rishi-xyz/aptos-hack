"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { walletApi } from '@/lib/api';

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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved user address on mount and connect to fetch whales
  useEffect(() => {
    const initializeUser = async () => {
      const savedAddress = localStorage.getItem('userAddress');
      if (savedAddress) {
        try {
          // Connect to backend to fetch user's whale subscriptions
          const response = await walletApi.connect(savedAddress);
          setUser({ 
            address: savedAddress, 
            isConnected: true, 
            whales: response.whales 
          });
          console.log('🔗 Reconnected user with whale subscriptions:', response.whales);
        } catch (error) {
          console.error('Failed to reconnect user:', error);
          // Still set the user but without whales
          setUser({ address: savedAddress, isConnected: true });
        }
      }
      setIsLoading(false);
    };

    initializeUser();
  }, []);

  const connect = async (address: string) => {
    try {
      setIsLoading(true);
      console.log('🔗 Connecting wallet:', address);
      
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
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    console.log('🔌 Disconnecting wallet');
    setUser(null);
    localStorage.removeItem('userAddress');
  };

  const refreshWhales = async () => {
    if (!user?.address) return;
    
    try {
      const response = await walletApi.connect(user.address);
      setUser(prev => prev ? { ...prev, whales: response.whales } : null);
      console.log('🔄 Refreshed whale subscriptions:', response.whales);
    } catch (error) {
      console.error('❌ Failed to refresh whales:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, connect, disconnect, isLoading, refreshWhales }}>
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
