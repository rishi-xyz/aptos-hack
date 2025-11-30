import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { ActivityEvent, ActivityType, StreamHandler, StreamOptions, StreamSubscription } from './types';
import WebSocket, { WebSocketServer } from 'ws';

interface TokenBalance {
  coinType: string;
  amount: string;
  symbol?: string;
}

interface TransactionAnalysis {
  type: 'buy' | 'sell' | 'transfer' | 'swap' | 'other';
  token?: string;
  amount?: string;
  from?: string;
  to?: string;
}

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
  private tokenBalances: { [key: string]: TokenBalance[] } = {};
  private batchSize: number;
  private pollingIntervalMs: number;
  private requestDelay: number;
  private maxConcurrentRequests: number;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;

  constructor(options: StreamOptions = {}) {
    this.nodeUrl = options.nodeUrl || 'https://fullnode.mainnet.aptoslabs.com';
    this.reconnect = options.reconnect ?? true;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.batchSize = options.batchSize || 3;
    this.pollingIntervalMs = options.pollingInterval || 15000;
    this.requestDelay = options.requestDelay || 1000;
    this.maxConcurrentRequests = options.maxConcurrentRequests || 2;

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
  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkAddressActivitiesBatched();
      } catch (error) {
        console.error('Error checking address activities:', error);
      }
    }, this.pollingIntervalMs);
  }

  /**
   * Check for new activities on watched addresses using batching and rate limiting
   */
  private async checkAddressActivitiesBatched(): Promise<void> {
    console.log(`🔍 checkAddressActivitiesBatched: Starting batched check for ${this.watchedAddresses.size} addresses`);
    if (this.watchedAddresses.size === 0) {
      console.log('🔍 checkAddressActivitiesBatched: No addresses to watch');
      return;
    }

    const addresses = Array.from(this.watchedAddresses);
    const batches = this.createBatches(addresses, this.batchSize);
    
    console.log(`🔍 checkAddressActivitiesBatched: Processing ${batches.length} batches of size ${this.batchSize}`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`🔍 checkAddressActivitiesBatched: Processing batch ${i + 1}/${batches.length} with ${batch.length} addresses`);
      
      // Process batch with concurrency control
      const promises = batch.map(address => 
        this.queueRequest(() => this.processAddress(address))
      );
      
      await Promise.allSettled(promises);
      
      // Add delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        console.log(`🔍 checkAddressActivitiesBatched: Delaying ${this.requestDelay}ms before next batch`);
        await this.delay(this.requestDelay);
      }
    }
    
    console.log(`🔍 checkAddressActivitiesBatched: Completed batched check for all addresses`);
  }

  /**
   * Create batches from array of addresses
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Queue a request to control concurrency
   */
  private async queueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedRequest = async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      this.requestQueue.push(wrappedRequest);
      this.processQueue();
    });
  }

  /**
   * Process the request queue with concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const batch = this.requestQueue.splice(0, this.maxConcurrentRequests);
      await Promise.allSettled(batch.map(request => request()));
      
      // Small delay between concurrent batches
      if (this.requestQueue.length > 0) {
        await this.delay(200);
      }
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process a single address (extracted from original checkAddressActivities)
   */
  private async processAddress(address: string): Promise<void> {
    console.log(`🔍 processAddress: Processing address ${address}`);
    try {
      // Get current token balances first
      console.log(`🔍 processAddress: Getting token balances for ${address}`);
      const currentBalances = await this.getTokenBalances(address);
      console.log(`🔍 processAddress: Got ${currentBalances.length} balances for ${address}`);
      
      // Log initial balance information
      if (!this.tokenBalances[address]) {
        const network = this.nodeUrl.includes('testnet') ? 'testnet' : this.nodeUrl.includes('devnet') ? 'devnet' : 'mainnet';
        console.log(`\n🔍 Address ${address} found on ${network}`);
        console.log(`💰 Current balances: ${currentBalances.map(b => `${b.symbol || b.coinType}: ${b.amount}`).join(', ') || 'No tokens'}`);
        console.log(`📊 Monitoring for transactions and balance changes...\n`);
      }
      
      // Check if balances changed
      const balancesChanged = JSON.stringify(currentBalances) !== JSON.stringify(this.tokenBalances[address]);
      console.log(`🔍 processAddress: Balances changed: ${balancesChanged}`);
      if (balancesChanged && this.tokenBalances[address]) {
        console.log(`🔍 processAddress: Creating balance change event`);
        // Create balance change event
        const balanceEvent: ActivityEvent = {
          type: 'balance_change' as ActivityType,
          address,
          timestamp: Date.now(),
          data: {
            previous: this.tokenBalances[address],
            current: currentBalances
          }
        };
        console.log(`🔍 processAddress: Broadcasting balance change event`);
        this.broadcast(balanceEvent);
      }
      this.tokenBalances[address] = currentBalances;

      // Check for transactions
      console.log(`🔍 processAddress: Getting transactions for ${address}`);
      const txs = await this.aptos.getAccountTransactions({
        accountAddress: address,
        options: {
          limit: 10
        },
      });
      console.log(`🔍 processAddress: Got ${txs.length} transactions for ${address}`);

      if (txs.length > 0) {
        const latestTx = txs[0];
        const txHash = 'hash' in latestTx ? latestTx.hash : String(latestTx);
        console.log(`🔍 processAddress: Latest tx hash: ${txHash}`);
        
        if (this.lastProcessedTx[address] !== txHash) {
          console.log(`🔍 processAddress: New transaction detected`);
          this.lastProcessedTx[address] = txHash;
          
          // Analyze transaction type
          console.log(`🔍 processAddress: Analyzing transaction`);
          const analysis = this.analyzeTransaction(latestTx);
          console.log(`🔍 processAddress: Transaction analysis:`, analysis);
          
          // Create activity event
          const activityEvent: ActivityEvent = {
            type: 'transactions',
            address,
            timestamp: Date.now(),
            data: {
              ...latestTx,
              analysis,
              balances: currentBalances
            },
            txHash,
            blockHeight: 'version' in latestTx ? Number(latestTx.version) : 0
          };
          console.log(`🔍 processAddress: Broadcasting transaction event`);
          // Broadcast to all clients
          this.broadcast(activityEvent);
        } else {
          console.log(`🔍 processAddress: No new transaction (same hash as last processed)`);
        }
      } else {
        // Account exists but has no transactions
        if (!this.lastProcessedTx[address] || this.lastProcessedTx[address] === 'not_found') {
          const network = this.nodeUrl.includes('testnet') ? 'testnet' : this.nodeUrl.includes('devnet') ? 'devnet' : 'mainnet';
          console.log(`ℹ️  Address ${address} exists on ${network} but has no transactions`);
          this.lastProcessedTx[address] = 'no_transactions';
        }
      }
    } catch (error: any) {
      console.error(`🔍 processAddress: Error for address ${address}:`, error.message || error);
      console.error(`🔍 processAddress: Full error:`, error);
      // Handle 404 errors (address not found)
      if (error.status === 404) {
        if (!this.lastProcessedTx[address]) {
          const network = this.nodeUrl.includes('testnet') ? 'testnet' : this.nodeUrl.includes('devnet') ? 'devnet' : 'mainnet';
          console.log(`❌ Address ${address} not found on ${network}`);
          this.lastProcessedTx[address] = 'not_found';
        }
      } else {
        console.error(`❌ Error checking activities for address ${address}:`, error.message || error);
        // Try to get more detailed error information
        if (error.response?.data) {
          console.error(`   Details:`, JSON.stringify(error.response.data, null, 2));
        }
      }
    }
  }

  /**
   * Broadcast activity to all connected clients
   */
  private broadcast(event: ActivityEvent): void {
    console.log(`🔍 broadcast: Broadcasting event type ${event.type} to ${this.clients.size} clients`);
    const message = JSON.stringify(event);
    console.log(`🔍 broadcast: Message size: ${message.length} characters`);
    
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        console.log(`🔍 broadcast: Sending to client`);
        client.send(message, (error) => {
          if (error) {
            console.error('🔍 broadcast: Error sending message to client:', error);
          } else {
            console.log(`🔍 broadcast: Successfully sent to client`);
          }
        });
      } else {
        console.log(`🔍 broadcast: Client not ready (state: ${client.readyState})`);
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
    console.log(`🔍 watchAddress: Adding address ${address} for type ${type}`);
    this.watchedAddresses.add(address);
    console.log(`🔍 watchAddress: Now watching ${this.watchedAddresses.size} addresses`);
    
    // If handler is provided, create a WebSocket client and connect to the server
    if (handler) {
      console.log(`🔍 watchAddress: Creating WebSocket client for handler`);
      const ws = new WebSocket(`ws://localhost:8080`);
      
      ws.on('message', (data: WebSocket.Data) => {
        try {
          console.log(`🔍 watchAddress: Received message from server`);
          const event = JSON.parse(data.toString()) as ActivityEvent;
          console.log(`🔍 watchAddress: Parsed event type: ${event.type}`);
          if ((event.type === type || type === 'all') && event.address === address) {
            console.log(`🔍 watchAddress: Calling handler for event`);
            handler(event);
          } else {
            console.log(`🔍 watchAddress: Event filtered out (type: ${event.type}, address: ${event.address})`);
          }
        } catch (error) {
          console.error('🔍 watchAddress: Error processing message:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('🔍 watchAddress: WebSocket client error:', error);
      });

      return {
        unsubscribe: async () => {
          console.log(`🔍 watchAddress: Unsubscribing address ${address}`);
          this.watchedAddresses.delete(address);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        },
      };
    }

    // If no handler, just return a subscription that can be used to stop watching
    console.log(`🔍 watchAddress: No handler provided, returning simple subscription`);
    return {
      unsubscribe: async () => {
        console.log(`🔍 watchAddress: Unsubscribing address ${address} (no handler)`);
        this.watchedAddresses.delete(address);
      },
    };
  }

  /**
   * Get token balances for an address with optimized API calls
   */
  private async getTokenBalances(address: string): Promise<TokenBalance[]> {
    console.log(`🔍 getTokenBalances: Starting for address ${address}`);
    try {
      const balances: TokenBalance[] = [];
      
      // Get account resources to find all coin balances
      console.log(`🔍 getTokenBalances: Getting account resources for ${address}`);
      const resources = await this.aptos.getAccountResources({
        accountAddress: address,
      });
      console.log(`🔍 getTokenBalances: Got ${resources.length} resources for ${address}`);

      // Filter for coin store resources upfront to reduce processing
      const coinResources = resources.filter(resource => 
        resource.type.includes('CoinStore') || resource.type.includes('0x1::coin::CoinStore')
      );
      console.log(`🔍 getTokenBalances: Found ${coinResources.length} coin resources`);

      for (const resource of coinResources) {
        console.log(`🔍 getTokenBalances: Processing resource: ${resource.type}`);
        
        // Look for coin store resources
        if (resource.type.includes('CoinStore')) {
          const coinData = (resource.data as any).coin;
          
          if (coinData && coinData.value > 0) {
            // Extract coin type from resource type
            const coinTypeMatch = resource.type.match(/CoinStore<(.+)>/);
            const coinType = coinTypeMatch ? coinTypeMatch[1] : resource.type;
            
            // Get symbol from coin type
            const symbol = this.extractSymbol(coinType);
            
            const balance = {
              coinType,
              amount: coinData.value.toString(),
              symbol
            };
            console.log(`🔍 getTokenBalances: Adding balance:`, balance);
            balances.push(balance);
          }
        }
        
        // Also check for direct coin resources (some networks store them differently)
        if (resource.type.includes('0x1::coin::CoinStore')) {
          const coinData = (resource.data as any).coin;
          if (coinData && coinData.value > 0) {
            const balance = {
              coinType: '0x1::aptos_coin::AptosCoin',
              amount: coinData.value.toString(),
              symbol: 'APT'
            };
            console.log(`🔍 getTokenBalances: Adding APT balance:`, balance);
            balances.push(balance);
          }
        }
      }
      
      // Try alternative method to get APT balance only if no APT found
      const hasAptBalance = balances.some(b => b.coinType.includes('aptos_coin'));
      if (!hasAptBalance) {
        console.log(`🔍 getTokenBalances: No APT balance found, trying alternative method`);
        try {
          const aptBalance = await this.aptos.getAccountAPTAmount({
            accountAddress: address,
          });
          console.log(`🔍 getTokenBalances: Alternative APT balance check: ${aptBalance}`);
          if (aptBalance > 0) {
            balances.push({
              coinType: '0x1::aptos_coin::AptosCoin',
              amount: aptBalance.toString(),
              symbol: 'APT'
            });
            console.log(`🔍 getTokenBalances: Added APT balance via alternative method`);
          }
        } catch (aptError: any) {
          console.log(`🔍 getTokenBalances: Alternative APT balance check failed:`, aptError.message);
        }
      }
      
      console.log(`🔍 getTokenBalances: Returning ${balances.length} balances for ${address}`);
      return balances;
    } catch (error: any) {
      console.error('🔍 getTokenBalances: Error:', error.message || error);
      console.error('🔍 getTokenBalances: Full error:', error);
      return [];
    }
  }

  /**
   * Extract symbol from coin type
   */
  private extractSymbol(coinType: string): string {
    if (coinType.includes('::')) {
      const parts = coinType.split('::');
      return parts[parts.length - 1];
    }
    return coinType;
  }

  /**
   * Analyze transaction to determine type and details
   */
  private analyzeTransaction(tx: any): TransactionAnalysis {
    try {
      const analysis: TransactionAnalysis = {
        type: 'other'
      };

      // Check if it's a transfer transaction
      if (tx.payload && tx.payload.function) {
        const func = tx.payload.function;
        
        if (func.includes('transfer')) {
          analysis.type = 'transfer';
          analysis.from = tx.sender;
          
          if (tx.payload.arguments && tx.payload.arguments.length >= 2) {
            analysis.to = tx.payload.arguments[0];
            analysis.amount = tx.payload.arguments[1];
          }
        } else if (func.includes('swap') || func.includes('exchange')) {
          analysis.type = 'swap';
        } else if (func.includes('buy')) {
          analysis.type = 'buy';
        } else if (func.includes('sell')) {
          analysis.type = 'sell';
        }
      }

      // Check events for more detailed analysis
      if (tx.events) {
        for (const event of tx.events) {
          if (event.type.includes('Coin::DepositEvent')) {
            if (event.data.amount) {
              analysis.amount = event.data.amount;
            }
          }
          if (event.type.includes('TransferEvent')) {
            analysis.from = event.data.from;
            analysis.to = event.data.to;
            analysis.amount = event.data.amount;
          }
        }
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing transaction:', error);
      return { type: 'other' };
    }
  }
}
