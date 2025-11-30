"use client"

import { useState, useEffect, useCallback } from 'react';
import { whaleApi, whaleStream, Whale, BalanceChangeEvent, calculateBalanceChanges, formatAptAmount } from '@/lib/api';

export interface WhaleWithStatus extends Whale {
  address: string;
  isActive: boolean;
  lastActivity?: Date;
  recentEvents: BalanceChangeEvent[];
}

export function useWhales() {
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
    try {
      setLoading(true);
      const data = await whaleApi.getWhales();
      
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
  }, []);

  // Add a new whale
  const addWhale = useCallback(async (address: string) => {
    try {
      await whaleApi.addWhale(address);
      await fetchWhales(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add whale');
      return false;
    }
  }, [fetchWhales]);

  // Remove a whale
  const removeWhale = useCallback(async (address: string) => {
    try {
      await whaleApi.removeWhale(address);
      await fetchWhales(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove whale');
      return false;
    }
  }, [fetchWhales]);

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
    fetchWhales();
    
    // Subscribe to real-time updates
    whaleStream.subscribe(handleBalanceChange);
    
    return () => {
      // Cleanup SSE connection
      whaleStream.unsubscribe(handleBalanceChange);
    };
  }, [fetchWhales, handleBalanceChange]);

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
