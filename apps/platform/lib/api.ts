const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Whale {
  address: string;
  status: 'active' | 'inactive';
  lastTransaction?: string;
  amount?: string;
  type?: 'Buy' | 'Sell';
}

export interface BalanceChangeEvent {
  type: 'balance_change';
  address: string;
  timestamp: number;
  txHash?: string;
  data: {
    previous: TokenBalance[];
    current: TokenBalance[];
  };
  isLatest?: boolean;
}

export interface TokenBalance {
  coinType: string;
  amount: string;
  symbol?: string;
}

export interface BalanceChange {
  symbol: string;
  amount: string;
  type: 'buy' | 'sell' | 'neutral';
  previousBalance: string;
  newBalance: string;
}

// Utility function to calculate balance changes
export function calculateBalanceChanges(event: BalanceChangeEvent): BalanceChange[] {
  const changes: BalanceChange[] = [];
  const { previous, current } = event.data;
  
  // Create maps for easier comparison
  const previousMap = new Map(previous.map(b => [b.coinType, b.amount]));
  const currentMap = new Map(current.map(b => [b.coinType, b.amount]));
  
  // Check for changes in all tokens
  const allCoinTypes = new Set([...previous.map(b => b.coinType), ...current.map(b => b.coinType)]);
  
  for (const coinType of allCoinTypes) {
    const prevAmount = previousMap.get(coinType) || '0';
    const currAmount = currentMap.get(coinType) || '0';
    
    if (prevAmount !== currAmount) {
      const prev = parseFloat(prevAmount);
      const curr = parseFloat(currAmount);
      const diff = curr - prev;
      
      // Find symbol (default to coinType if not provided)
      const tokenInfo = current.find(b => b.coinType === coinType) || previous.find(b => b.coinType === coinType);
      const symbol = tokenInfo?.symbol || coinType.includes('aptos') ? 'APT' : coinType;
      
      // Convert from octa to APT (1 APT = 100,000,000 octa)
      const aptAmount = symbol === 'APT' ? Math.abs(diff) / 100000000 : Math.abs(diff);
      
      changes.push({
        symbol,
        amount: aptAmount.toString(),
        type: diff > 0 ? 'buy' : diff < 0 ? 'sell' : 'neutral',
        previousBalance: prevAmount,
        newBalance: currAmount
      });
    }
  }
  
  return changes;
}

// Utility function to format APT amount
export function formatAptAmount(amount: string): string {
  const num = parseFloat(amount);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  } else if (num < 0.01) {
    return `${num.toFixed(6)}`;
  } else if (num < 1) {
    return `${num.toFixed(4)}`;
  } else {
    return `${num.toFixed(2)}`;
  }
}

export interface WhaleStats {
  totalWhales: number;
  activeWhales: number;
  totalVolume: string;
  alerts: number;
}

export interface StrategyAllocation {
  aggressive: number;
  moderate: number;
  conservative: number;
  totalBudget: number;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'moderate' | 'high';
  expectedReturn: string;
  minAmount: number;
  color: string;
  icon: string;
  features: string[];
}

// API functions
export const whaleApi = {
  // Add a whale to track
  addWhale: async (whaleAddress: string, userAddress: string): Promise<{ message: string; address: string; userAddress: string; totalTracked: number }> => {
    const response = await fetch(`${API_BASE_URL}/add/whale/${whaleAddress}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userAddress }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add whale');
    }
    
    return response.json();
  },

  // Get user's tracked whales
  getWhales: async (userAddress: string): Promise<{ whales: string[]; total: number; userAddress: string; trackedAddresses: any[] }> => {
    const response = await fetch(`${API_BASE_URL}/whales?userAddress=${userAddress}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch whales');
    }
    
    return response.json();
  },

  // Remove a whale from tracking
  removeWhale: async (whaleAddress: string, userAddress: string): Promise<{ message: string; address: string; userAddress: string; remainingTracked: number }> => {
    const response = await fetch(`${API_BASE_URL}/whale/${whaleAddress}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userAddress }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove whale');
    }
    
    return response.json();
  },

  // Get health/status
  getHealth: async (): Promise<{ status: string; trackedWhales: number; streamPort: number; serverPort: number }> => {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch health status');
    }
    
    return response.json();
  },

  // Strategy allocation functions (using localStorage for now)
  saveStrategyAllocation: async (allocation: StrategyAllocation): Promise<{ success: boolean }> => {
    try {
      localStorage.setItem('strategyAllocation', JSON.stringify(allocation));
      return { success: true };
    } catch (error) {
      throw new Error('Failed to save allocation');
    }
  },

  getStrategyAllocation: async (): Promise<StrategyAllocation | null> => {
    try {
      const stored = localStorage.getItem('strategyAllocation');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  },
};

// Wallet connection API
export const walletApi = {
  connect: async (userAddress: string) => {
    const response = await fetch(`${API_BASE_URL}/wallet/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userAddress }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to connect wallet');
    }
    
    return response.json();
  }
};

// SSE connection for real-time balance changes
export class WhaleStreamService {
  private eventSource: EventSource | null = null;
  private callbacks: Set<(event: BalanceChangeEvent) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    // Only connect if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private connect() {
    try {
      // Check if EventSource is available (browser-only API)
      if (typeof EventSource === 'undefined') {
        console.warn('EventSource is not available. SSE connection disabled.');
        return;
      }
      
      this.eventSource = new EventSource(`${API_BASE_URL}/events`);
      
      this.eventSource.onopen = () => {
        console.log('Connected to whale stream');
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'balance_change') {
            this.callbacks.forEach(callback => callback(data));
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.eventSource?.close();
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`Reconnecting to whale stream (attempt ${this.reconnectAttempts})`);
            this.connect();
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };
    } catch (error) {
      console.error('Failed to connect to whale stream:', error);
    }
  }

  subscribe(callback: (event: BalanceChangeEvent) => void) {
    this.callbacks.add(callback);
  }

  unsubscribe(callback: (event: BalanceChangeEvent) => void) {
    this.callbacks.delete(callback);
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
  }
}

// Singleton instance
export const whaleStream = new WhaleStreamService();
