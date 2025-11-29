import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { ActivityEvent, ActivityType, StreamHandler, StreamOptions, StreamSubscription } from './types';
import WebSocket, { WebSocketServer } from 'ws';

export class AptosActivityStream {
  private aptos: Aptos;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private nodeUrl: string;
  private reconnect: boolean;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private pollingInterval: NodeJS.Timeout | null = null;
  private watchedAddresses: Set<string> = new Set();
  private lastProcessedTx: { [key: string]: string } = {};

  constructor(options: StreamOptions = {}) {
    this.nodeUrl = options.nodeUrl || 'https://fullnode.mainnet.aptoslabs.com';
    this.reconnect = options.reconnect ?? true;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;

    const config = new AptosConfig({
      network: this.nodeUrl.includes('testnet') ? Network.TESTNET : 
              this.nodeUrl.includes('devnet') ? Network.DEVNET : 
              Network.MAINNET,
      fullnode: this.nodeUrl,
    });
    
    this.aptos = new Aptos(config);
  }

  /**
   * Start the WebSocket server
   * @param port Port to start the server on
   * @returns Promise that resolves when server is started
   */
  public async start(port: number = 8080): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port });
        
        this.wss.on('connection', (ws: WebSocket) => {
          this.clients.add(ws);
          console.log(`New client connected. Total clients: ${this.clients.size}`);

          ws.on('close', () => {
            this.clients.delete(ws);
            console.log(`Client disconnected. Remaining clients: ${this.clients.size}`);
          });

          ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.clients.delete(ws);
          });
        });

        this.wss.on('listening', () => {
          console.log(`WebSocket server started on ws://localhost:${port}`);
          this.startPolling();
          resolve();
        });

        this.wss.on('error', (error) => {
          console.error('WebSocket server error:', error);
          if (this.reconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.start(port), this.reconnectInterval);
          } else {
            reject(error);
          }
        });
      } catch (error) {
        console.error('Failed to start WebSocket server:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  public async stop(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.wss) {
      // Close all client connections
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
      this.clients.clear();

      // Close the server
      return new Promise((resolve, reject) => {
        if (!this.wss) return resolve();
        
        this.wss.close((error) => {
          if (error) {
            console.error('Error closing WebSocket server:', error);
            reject(error);
          } else {
            console.log('WebSocket server stopped');
            this.wss = null;
            resolve();
          }
        });
      });
    }
  }

  /**
   * Start polling for address activities
   */
  private startPolling(interval: number = 10000): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkAddressActivities();
      } catch (error) {
        console.error('Error checking address activities:', error);
      }
    }, interval);
  }

  /**
   * Check for new activities on watched addresses
   */
  private async checkAddressActivities(): Promise<void> {
    if (this.watchedAddresses.size === 0) return;

    for (const address of this.watchedAddresses) {
      try {
        // Get latest transactions for the address
        const txs = await this.aptos.getAccountTransactions({
          accountAddress: address,
          options: {
            limit: 10
          },
        });

        if (txs.length > 0) {
          const latestTx = txs[0];
          const txHash = 'hash' in latestTx ? latestTx.hash : String(latestTx);
          
          if (this.lastProcessedTx[address] !== txHash) {
            this.lastProcessedTx[address] = txHash;
            
            // Create activity event
            const activityEvent: ActivityEvent = {
              type: 'transactions',
              address,
              timestamp: Date.now(),
              data: latestTx,
              txHash,
              blockHeight: 'version' in latestTx ? Number(latestTx.version) : 0
            };

            // Broadcast to all clients
            this.broadcast(activityEvent);
          }
        }
      } catch (error) {
        console.error(`Error checking activities for address ${address}:`, error);
      }
    }
  }

  /**
   * Broadcast activity to all connected clients
   */
  private broadcast(event: ActivityEvent): void {
    const message = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message, (error) => {
          if (error) {
            console.error('Error sending message to client:', error);
          }
        });
      }
    }
  }

  /**
   * Watch an address for activities
   * @param address The address to watch
   * @param type Type of activities to watch for
   * @param handler Callback function for activities
   * @returns Subscription object with unsubscribe method
   */
  public watchAddress(
    address: string,
    type: ActivityType = 'all',
    handler?: StreamHandler
  ): StreamSubscription {
    this.watchedAddresses.add(address);
    
    // If handler is provided, create a WebSocket client and connect to the server
    if (handler) {
      const ws = new WebSocket(`ws://localhost:8080`);
      
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const event = JSON.parse(data.toString()) as ActivityEvent;
          if ((event.type === type || type === 'all') && event.address === address) {
            handler(event);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
      });

      return {
        unsubscribe: async () => {
          this.watchedAddresses.delete(address);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        },
      };
    }

    // If no handler, just return a subscription that can be used to stop watching
    return {
      unsubscribe: async () => {
        this.watchedAddresses.delete(address);
      },
    };
  }
}
