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
  data: any;
  isLatest?: boolean;
}

export interface WhaleStats {
  totalWhales: number;
  activeWhales: number;
  totalVolume: string;
  alerts: number;
}

// API functions
export const whaleApi = {
  // Add a whale to track
  addWhale: async (address: string): Promise<{ message: string; address: string; totalTracked: number }> => {
    const response = await fetch(`${API_BASE_URL}/add/whale/${address}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add whale');
    }
    
    return response.json();
  },

  // Get all tracked whales
  getWhales: async (): Promise<{ whales: string[]; total: number }> => {
    const response = await fetch(`${API_BASE_URL}/whales`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch whales');
    }
    
    return response.json();
  },

  // Remove a whale
  removeWhale: async (address: string): Promise<{ message: string; address: string; remainingTracked: number }> => {
    const response = await fetch(`${API_BASE_URL}/whale/${address}`, {
      method: 'DELETE',
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
};

// SSE connection for real-time balance changes
export class WhaleStreamService {
  private eventSource: EventSource | null = null;
  private callbacks: Set<(event: BalanceChangeEvent) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
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
