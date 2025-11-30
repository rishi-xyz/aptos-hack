"use client"

import { useState, useEffect, useCallback } from 'react';
import { whaleApi, whaleStream, Whale, BalanceChangeEvent, calculateBalanceChanges, formatAptAmount } from '@/lib/api';

export interface WhaleWithStatus extends Whale {
  address: string;
  isActive: boolean;
  lastActivity?: Date;
  recentEvents: BalanceChangeEvent[];
}

export function useWhales(userAddress?: string) {
  const [whales, setWhales] = useState<WhaleWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<BalanceChangeEvent[]>([]);
  const [stats, setStats] = useState({
    totalWhales: 0,
    activeWhales: 0,
    totalVolume: 0, // Store as raw number for calculations
    netVolume: 0,   // Track net volume (buys - sells)
    alerts: 0
  });

  // Fetch initial whale data
  const fetchWhales = useCallback(async () => {
    if (!userAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await whaleApi.getWhales(userAddress);
      
      // Transform whale addresses into WhaleWithStatus objects
      const whalesWithStatus: WhaleWithStatus[] = data.whales.map(address => ({
        address,
        status: 'active' as const,
        isActive: true, // Assume tracked whales are active
        recentEvents: []
      }));

      setWhales(whalesWithStatus);
      setStats(prev => ({
        ...prev,
        totalWhales: data.total,
        activeWhales: data.total
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch whales');
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  // Add a new whale
  const addWhale = useCallback(async (whaleAddress: string) => {
    if (!userAddress) {
      throw new Error('User address is required');
    }

    try {
      const data = await whaleApi.addWhale(whaleAddress, userAddress);
      
      // Update local state
      setWhales(prev => [...prev, {
        address: whaleAddress,
        status: 'active' as const,
        isActive: true,
        recentEvents: []
      }]);
      
      setStats(prev => ({
        ...prev,
        totalWhales: prev.totalWhales + 1,
        activeWhales: prev.activeWhales + 1
      }));
      
      return true;
    } catch (err) {
      throw err;
    }
  }, [userAddress]);

  // Remove a whale
  const removeWhale = useCallback(async (whaleAddress: string) => {
    if (!userAddress) {
      throw new Error('User address is required');
    }

    try {
      const data = await whaleApi.removeWhale(whaleAddress, userAddress);
      
      // Update local state
      setWhales(prev => prev.filter(w => w.address !== whaleAddress));
      setRecentEvents(prev => prev.filter(e => e.address !== whaleAddress));
      
      setStats(prev => ({
        ...prev,
        totalWhales: prev.totalWhales - 1,
        activeWhales: prev.activeWhales - 1
      }));
      
      return true;
    } catch (err) {
      throw err;
    }
  }, [userAddress]);

  // Handle real-time balance change events
  const handleBalanceChange = useCallback((event: BalanceChangeEvent) => {
    console.log('Balance change event:', event);
    
    // Add to recent events (keep last 10)
    setRecentEvents(prev => {
      const updated = [event, ...prev.filter(e => e.txHash !== event.txHash)];
      return updated.slice(0, 10);
    });

    // Update whale's recent events
    setWhales(prev => prev.map(whale => {
      if (whale.address === event.address) {
        return {
          ...whale,
          isActive: true,
          lastActivity: new Date(event.timestamp),
          recentEvents: [event, ...whale.recentEvents.slice(0, 4)]
        };
      }
      return whale;
    }));

    // Calculate volume changes
    const balanceChanges = calculateBalanceChanges(event);
    const aptChange = balanceChanges.find(change => change.symbol === 'APT');
    
    if (aptChange) {
      const amount = parseFloat(aptChange.amount);
      const signedAmount = aptChange.type === 'buy' ? amount : -amount;
      
      setStats(prev => ({
        ...prev,
        totalVolume: prev.totalVolume + amount,
        netVolume: prev.netVolume + signedAmount,
        alerts: prev.alerts + 1
      }));
    } else {
      setStats(prev => ({
        ...prev,
        alerts: prev.alerts + 1
      }));
    }
  }, []);

  // Initialize data and SSE connection
  useEffect(() => {
    if (userAddress) {
      fetchWhales();
      
      // Subscribe to real-time updates
      whaleStream.subscribe(handleBalanceChange);
      
      return () => {
        whaleStream.unsubscribe(handleBalanceChange);
      };
    }
  }, [userAddress, fetchWhales, handleBalanceChange]);

  return {
    whales,
    loading,
    error,
    recentEvents,
    stats,
    addWhale,
    removeWhale,
    refetch: fetchWhales
  };
}
