import express, { Request, Response } from 'express';
import cors from 'cors';
import { AptosActivityStream } from 'aptos-activity-sdk';
import { AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Prisma persistent storage for whale tracking
// Initialize Prisma Client
let prisma: PrismaClient | null = null;

console.log('🔍 Starting Prisma initialization...');
console.log('🔍 Environment variables check:');
console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');

try {
  if (process.env.DATABASE_URL) {
    // Create PostgreSQL adapter
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL
    });
    
    prisma = new PrismaClient({
      adapter,
      log: ['info', 'warn', 'error']
    });
    
    console.log('🔥 Prisma initialized successfully');
    console.log('🔍 Prisma client created:', !!prisma);
  } else {
    console.log('⚠️ DATABASE_URL not set, using fallback storage');
    console.log('💡 Quick fix: Set DATABASE_URL in your .env file');
    console.log('💡 For Neon: Get connection string from https://console.neon.tech');
    prisma = null;
  }
} catch (error) {
  console.error('❌ Prisma initialization failed:', error);
  console.log('⚠️ Prisma initialization failed, using fallback storage');
  prisma = null;
}

console.log('🔍 Prisma initialization complete. DB status:', !!prisma ? '✅ Connected' : '❌ Using fallback');

// In-memory fallback storage
let userWhaleData = new Map<string, Set<string>>();
let whaleSubscriptions = new Map<string, Set<string>>();

const mockUserWhaleService = {
  createUser: async (userData: any) => {
    console.log('👤 Creating user:', userData.address);
    
    if (prisma) {
      try {
        // Create or update user in Prisma
        const user = await prisma.user.upsert({
          where: { address: userData.address },
          update: {
            lastConnected: new Date(),
            connectionCount: { increment: 1 },
            metadata: userData.metadata || {}
          },
          create: {
            address: userData.address,
            metadata: userData.metadata || {}
          }
        });
        
        console.log('🔥 User created/updated in Prisma:', user.address);
        return Promise.resolve(userData);
      } catch (error) {
        console.error('❌ Prisma user creation failed:', error);
        console.log('⚠️ Falling back to in-memory storage for user creation');
        // Gracefully fall back to in-memory
      }
    } else {
      // Fallback to in-memory
      console.log('💾 Using in-memory fallback for user creation');
    }
    
    return Promise.resolve(userData);
  },
  
  addTrackedAddress: async (userAddress: string, whaleAddress: string, metadata: any) => {
    console.log('➕ Adding whale subscription:', { userAddress, whaleAddress, metadata });
    
    if (prisma) {
      try {
        // Get or create user
        const user = await prisma.user.upsert({
          where: { address: userAddress },
          update: {},
          create: { address: userAddress }
        });
        
        // Get or create whale
        const whale = await prisma.whale.upsert({
          where: { address: whaleAddress },
          update: {
            lastActivity: new Date(),
            riskLevel: metadata?.riskLevel || 'medium',
            tags: metadata?.tags || []
          },
          create: {
            address: whaleAddress,
            riskLevel: metadata?.riskLevel || 'medium',
            tags: metadata?.tags || []
          }
        });
        
        // Create user-whale relationship
        const userWhale = await prisma.userWhale.upsert({
          where: {
            userId_whaleId: {
              userId: user.id,
              whaleId: whale.id
            }
          },
          update: {
            metadata: metadata
          },
          create: {
            userId: user.id,
            whaleId: whale.id,
            metadata: metadata
          }
        });
        
        console.log(`🔥 Added whale ${whaleAddress} to user ${userAddress} in Prisma`);
      } catch (error) {
        console.error('❌ Prisma add whale failed:', error);
        console.log('⚠️ Falling back to in-memory storage for whale addition');
        // Fall back to in-memory
      }
    }
    
    // Always try in-memory as fallback or primary
    if (!userWhaleData.has(userAddress)) {
      userWhaleData.set(userAddress, new Set());
    }
    if (!whaleSubscriptions.has(whaleAddress)) {
      whaleSubscriptions.set(whaleAddress, new Set());
    }
    
    userWhaleData.get(userAddress)!.add(whaleAddress);
    whaleSubscriptions.get(whaleAddress)!.add(userAddress);
    
    console.log(`💾 Added whale ${whaleAddress} to user ${userAddress} in memory`);
    
    return Promise.resolve({ success: true });
  },
  
  updateTrackedAddress: async (userAddress: string, whaleAddress: string, updateData: any) => {
    console.log('🔄 Updating whale activity:', { userAddress, whaleAddress, updateData });
    
    if (prisma) {
      try {
        // Update whale activity
        if (updateData.lastActivity) {
          await prisma.whale.update({
            where: { address: whaleAddress },
            data: { lastActivity: new Date(updateData.lastActivity) }
          });
        }
        
        // Create activity record
        if (updateData.lastTransactionHash) {
          await prisma.whaleActivity.create({
            data: {
              whale: { connect: { address: whaleAddress } },
              transactionHash: updateData.lastTransactionHash,
              type: updateData.type || 'unknown',
              amount: updateData.amount || '0',
              fromAddress: updateData.fromAddress || '',
              toAddress: updateData.toAddress || '',
              balanceChange: updateData.balanceChange,
              metadata: updateData
            }
          });
        }
        
        console.log(`🔥 Updated whale activity in Prisma for whale ${whaleAddress}`);
      } catch (error) {
        console.error('❌ Prisma update failed:', error);
        console.log('⚠️ Falling back to in-memory storage for whale update');
      }
    }
    
    return Promise.resolve({ success: true });
  },
  
  getTrackedAddresses: async (userAddress: string) => {
    console.log('📋 Getting whale subscriptions for user:', userAddress);
    
    if (prisma) {
      try {
        const user = await prisma.user.findUnique({
          where: { address: userAddress },
          include: {
            trackedWhales: {
              include: {
                whale: true
              }
            }
          }
        });
        
        if (user && user.trackedWhales.length > 0) {
          const trackedAddresses = user.trackedWhales.map((uw: any) => ({
            address: uw.whale.address,
            trackedAt: uw.trackedAt.toISOString()
          }));
          
          console.log(`🔍 Found ${trackedAddresses.length} whale subscriptions in Prisma for user ${userAddress}:`, trackedAddresses.map((t: { address: string }) => t.address));
          return Promise.resolve(trackedAddresses);
        } else {
          console.log(`🔍 No user found in Prisma: ${userAddress}`);
        }
      } catch (error) {
        console.error('❌ Prisma get whales failed:', error);
        console.log('⚠️ Falling back to in-memory storage for whale retrieval');
        // Fall back to in-memory
      }
    }
    
    // Fallback to in-memory
    const userWhales = userWhaleData.get(userAddress) || new Set();
    const trackedAddresses = Array.from(userWhales).map(address => ({
      address,
      trackedAt: new Date().toISOString()
    }));
    
    console.log(`🔍 Found ${trackedAddresses.length} whale subscriptions in memory for user ${userAddress}:`, trackedAddresses.map(t => t.address));
    return Promise.resolve(trackedAddresses);
  },
  
  removeTrackedAddress: async (userAddress: string, whaleAddress: string) => {
    console.log('➖ Removing whale subscription:', { userAddress, whaleAddress });
    
    if (prisma) {
      try {
        // Find and delete user-whale relationship
        const userWhale = await prisma.userWhale.findFirst({
          where: {
            user: { address: userAddress },
            whale: { address: whaleAddress }
          }
        });
        
        if (userWhale) {
          await prisma.userWhale.delete({
            where: { id: userWhale.id }
          });
          
          console.log(`🔥 Removed whale ${whaleAddress} from user ${userAddress} in Prisma`);
        }
      } catch (error) {
        console.error('❌ Prisma remove whale failed:', error);
        console.log('⚠️ Falling back to in-memory storage for whale removal');
        // Fall back to in-memory
      }
    }
    
    // Always try in-memory as fallback or primary
    const userWhales = userWhaleData.get(userAddress);
    const whaleSubs = whaleSubscriptions.get(whaleAddress);
    
    if (userWhales) {
      userWhales.delete(whaleAddress);
    }
    if (whaleSubs) {
      whaleSubs.delete(userAddress);
    }
    
    console.log(`💾 Removed whale ${whaleAddress} from user ${userAddress} in memory`);
    
    return Promise.resolve({ success: true });
  },
  
  getUsersTrackingAddress: async (whaleAddress: string) => {
    console.log('👥 Getting subscribers for whale:', whaleAddress);
    
    if (prisma) {
      try {
        const whale = await prisma.whale.findUnique({
          where: { address: whaleAddress },
          include: {
            subscribers: {
              include: {
                user: true
              }
            }
          }
        });
        
        if (whale && whale.subscribers.length > 0) {
          const trackingUsers = whale.subscribers.map((sub: any) => sub.user.address);
          
          console.log(`🔍 Found ${trackingUsers.length} users in Prisma tracking whale ${whaleAddress}:`, trackingUsers);
          return Promise.resolve(trackingUsers);
        } else {
          console.log(`🔍 No whale found in Prisma: ${whaleAddress}`);
        }
      } catch (error) {
        console.error('❌ Prisma get subscribers failed:', error);
        console.log('⚠️ Falling back to in-memory storage for subscriber retrieval');
        // Fall back to in-memory
      }
    }
    
    // Fallback to in-memory
    const trackingUsers = whaleSubscriptions.get(whaleAddress) || new Set();
    const usersArray = Array.from(trackingUsers);
    
    console.log(`🔍 Found ${usersArray.length} users in memory tracking whale ${whaleAddress}:`, usersArray);
    return Promise.resolve(usersArray);
  },
  
  // New method: Get all active whale subscriptions for monitoring
  getAllActiveWhales: async () => {
    if (prisma) {
      try {
        // Get all whales that have subscribers
        const whales = await prisma.whale.findMany({
          where: {
            subscribers: {
              some: {}
            }
          },
          select: {
            address: true
          }
        });
        
        const activeWhales = whales.map((w: any) => w.address);
        
        console.log('🐋 All currently tracked whales from Prisma:', activeWhales);
        return Promise.resolve(activeWhales);
      } catch (error) {
        console.error('❌ Prisma get active whales failed:', error);
        console.log('⚠️ Falling back to in-memory storage for active whales');
        // Fall back to in-memory
      }
    }
    
    // Fallback to in-memory
    const activeWhales = Array.from(whaleSubscriptions.keys());
    
    console.log('🐋 All currently tracked whales from memory:', activeWhales);
    return Promise.resolve(activeWhales);
  }
};

// Initialize the activity stream with rate limiting
const stream = new AptosActivityStream({
  nodeUrl: 'https://api.testnet.staging.aptoslabs.com/v1',
  batchSize: 3,
  pollingInterval: 15000,
  requestDelay: 1000,
  maxConcurrentRequests: 2,
});

// Store subscriptions (for active whale tracking)
const subscriptions = new Map<string, any>();

// Store SSE clients
const sseClients = new Set<any>();

// Store latest balance change events
const latestBalanceChanges = new Map<string, any>();

// Start the stream
stream.start(8080).then(() => {
  console.log('🚀 Aptos Activity Stream started on port 8080');
}).catch(console.error);

// POST /add/whale/<walletaddress>
app.post('/add/whale/:walletAddress', async (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  const { userAddress } = req.body; // Get user's wallet address from request body
  
  if (!userAddress) {
    return res.status(400).json({ 
      error: 'User address is required in request body',
      address: walletAddress 
    });
  }
  
  try {
    console.log(`📡 Adding whale address: ${walletAddress} for user: ${userAddress}`);
    
    // Store user-whale relationship
    try {
      await mockUserWhaleService.createUser({
        address: userAddress,
        metadata: {
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString()
        }
      });
      console.log(`✅ User ${userAddress} ensured`);
    } catch (error) {
      // User might already exist, that's fine
      console.log(`ℹ️ User ${userAddress} already exists`);
    }

    // Add whale to user's tracked list
    try {
      await mockUserWhaleService.addTrackedAddress(userAddress, walletAddress, {
        trackedAt: new Date().toISOString(),
        riskLevel: 'medium', // Default risk level
        tags: ['whale']
      });
      console.log(`✅ Whale ${walletAddress} added to user ${userAddress}`);
    } catch (error) {
      console.error(`❌ Error adding whale:`, error);
      return res.status(500).json({ 
        error: 'Failed to store whale tracking data',
        address: walletAddress 
      });
    }
    
    // Check if already subscribed for real-time tracking
    if (subscriptions.has(walletAddress)) {
      return res.status(400).json({ 
        error: 'Address already being tracked for real-time updates',
        address: walletAddress 
      });
    }
    
    // Subscribe to the address for real-time updates
    const subscription = stream.watchAddress(walletAddress, 'balance_change', async (event: any) => {
      console.log(`🐋 Whale Balance Change [${walletAddress}]:`, {
        type: event.type,
        timestamp: new Date(event.timestamp).toISOString(),
        txHash: event.txHash,
        data: event.data
      });
      
      // Store the latest balance change
      latestBalanceChanges.set(walletAddress, event);
      
      // Update with the balance change event
      try {
        await mockUserWhaleService.updateTrackedAddress(userAddress, walletAddress, {
          lastActivity: new Date(event.timestamp).toISOString(),
          lastTransactionHash: event.txHash,
          balanceChange: event.data
        });
      } catch (error) {
        console.error('❌ Error updating with balance change:', error);
      }
      
      // Send to all SSE clients
      const eventData = {
        type: 'balance_change',
        address: walletAddress,
        timestamp: event.timestamp,
        txHash: event.txHash,
        data: event.data,
        userAddress // Include user address for filtering
      };
      
      sseClients.forEach(client => {
        try {
          client.write(`data: ${JSON.stringify(eventData)}\n\n`);
        } catch (error) {
          console.error('Error sending SSE data:', error);
          sseClients.delete(client);
        }
      });
    });
    
    // Store subscription for real-time tracking
    subscriptions.set(walletAddress, subscription);
    
    console.log(`✅ Successfully added whale: ${walletAddress} for user: ${userAddress}`);
    console.log(`📊 Now tracking ${subscriptions.size} whale addresses in real-time`);
    
    res.json({ 
      message: 'Whale address added successfully',
      address: walletAddress,
      userAddress,
      totalTracked: subscriptions.size
    });
    
  } catch (error) {
    console.error(`❌ Error adding whale ${walletAddress} for user ${userAddress}:`, error);
    res.status(500).json({ 
      error: 'Failed to add whale address',
      address: walletAddress,
      userAddress
    });
  }
});

// GET /whales - list user's tracked whales
app.get('/whales', async (req: Request, res: Response) => {
  const { userAddress } = req.query;
  
  if (!userAddress) {
    return res.status(400).json({ 
      error: 'User address is required as query parameter',
      example: '/whales?userAddress=0x...'
    });
  }
  
  try {
    console.log(`📋 Fetching whales for user: ${userAddress}`);
    
    // Get user's tracked whales
    const trackedAddresses = await mockUserWhaleService.getTrackedAddresses(userAddress as string);
    
    const whales = trackedAddresses.map((addr: { address: string }) => addr.address);
    
    console.log(`✅ Found ${whales.length} whales for user: ${userAddress}`);
    
    res.json({
      whales,
      total: whales.length,
      userAddress,
      trackedAddresses // Include full tracking data for additional info
    });
    
  } catch (error) {
    console.error(`❌ Error fetching whales for user ${userAddress}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch tracked whales',
      userAddress
    });
  }
});

// DELETE /whale/<walletaddress> - stop tracking
app.delete('/whale/:walletAddress', async (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  const { userAddress } = req.body; // Get user's wallet address from request body
  
  if (!userAddress) {
    return res.status(400).json({ 
      error: 'User address is required in request body',
      address: walletAddress 
    });
  }
  
  try {
    console.log(`🗑️ Removing whale: ${walletAddress} for user: ${userAddress}`);
    
    // Remove tracked whale
    try {
      await mockUserWhaleService.removeTrackedAddress(userAddress, walletAddress);
      console.log(`✅ Whale ${walletAddress} removed from user ${userAddress}`);
    } catch (error) {
      console.error(`❌ Error removing whale:`, error);
      return res.status(500).json({ 
        error: 'Failed to remove whale tracking data',
        address: walletAddress 
      });
    }
    
    // Check if still being tracked by other users for real-time updates
    const otherUsersTracking = await mockUserWhaleService.getUsersTrackingAddress(walletAddress);
    
    // Remove real-time subscription if no other users are tracking this whale
    if (otherUsersTracking.length === 0) {
      const subscription = subscriptions.get(walletAddress);
      if (subscription) {
        await subscription.unsubscribe();
        subscriptions.delete(walletAddress);
        console.log(`🛑 Stopped real-time tracking for whale: ${walletAddress} (no other users tracking)`);
      }
    } else {
      console.log(`ℹ️ Keeping real-time tracking for whale: ${walletAddress} (still tracked by ${otherUsersTracking.length} other users)`);
    }
    
    res.json({ 
      message: 'Whale address removed successfully',
      address: walletAddress,
      userAddress,
      remainingTracked: subscriptions.size
    });
    
  } catch (error) {
    console.error(`❌ Error removing whale ${walletAddress} for user ${userAddress}:`, error);
    res.status(500).json({ 
      error: 'Failed to remove whale address',
      address: walletAddress,
      userAddress
    });
  }
});

// GET /events - Server-Sent Events endpoint for whale balance changes
app.get('/events', (req: Request, res: Response) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to whale balance change stream' })}\n\n`);

  // Add client to SSE clients set
  sseClients.add(res);

  // Send latest balance changes to new client
  if (latestBalanceChanges.size > 0) {
    for (const [address, event] of latestBalanceChanges) {
      const eventData = {
        type: 'balance_change',
        address: address,
        timestamp: event.timestamp,
        txHash: event.txHash,
        data: event.data,
        isLatest: true
      };
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    }
  }

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(res);
    console.log('🔌 SSE client disconnected');
  });

  console.log('🔌 New SSE client connected');
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    trackedWhales: subscriptions.size,
    streamPort: 8080,
    serverPort: PORT
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  // Unsubscribe from all whales
  for (const [address, subscription] of subscriptions) {
    await subscription.unsubscribe();
  }
  
  // Stop the stream
  await stream.stop();
  console.log('✅ Server stopped gracefully');
});

app.listen(PORT, () => {
  console.log(`🌐 Whale tracker server running on http://localhost:${PORT}`);
  console.log(`📡 POST /wallet/connect - Connect wallet and fetch user's whale subscriptions`);
  console.log(`📡 POST /add/whale/<address> - Add whale to track`);
  console.log(`📋 GET /whales - List tracked whales`);
  console.log(`🗑️  DELETE /whale/<address> - Stop tracking whale`);
  console.log(`🔌 GET /events - SSE stream for balance changes`);
  console.log(`❤️  GET /health - Health check`);
});

app.post('/wallet/connect', async (req: Request, res: Response) => {
  const { userAddress } = req.body;
  
  if (!userAddress) {
    return res.status(400).json({ 
      error: 'User address is required in request body',
      example: { userAddress: '0x...' }
    });
  }
  
  try {
    console.log(`🔗 Wallet connection request for user: ${userAddress}`);
    
    // Create user if not exists
    await mockUserWhaleService.createUser({
      address: userAddress,
      metadata: {
        lastConnected: new Date().toISOString(),
        connectionCount: 1
      }
    });
    
    // Get user's subscribed whales from persistent storage
    const trackedAddresses = await mockUserWhaleService.getTrackedAddresses(userAddress);
    const whales = trackedAddresses.map((addr: { address: string }) => addr.address);
    
    console.log(`📋 User ${userAddress} has ${whales.length} subscribed whales:`, whales);
    
    // Start real-time monitoring for user's whales if not already tracking
    for (const whaleAddress of whales) {
      if (!subscriptions.has(whaleAddress)) {
        console.log(`🔍 Starting real-time monitoring for whale: ${whaleAddress}`);
        
        const subscription = stream.watchAddress(whaleAddress, 'balance_change', async (event: any) => {
          console.log(`🐋 Whale Balance Change [${whaleAddress}]:`, {
            type: event.type,
            timestamp: new Date(event.timestamp).toISOString(),
            txHash: event.txHash,
            data: event.data
          });
          
          // Store the latest balance change
          latestBalanceChanges.set(whaleAddress, event);
          
          // Update whale activity for all users tracking this whale
          const trackingUsers = await mockUserWhaleService.getUsersTrackingAddress(whaleAddress);
          
          for (const user of trackingUsers) {
            try {
              await mockUserWhaleService.updateTrackedAddress(user, whaleAddress, {
                lastActivity: new Date(event.timestamp).toISOString(),
                lastTransactionHash: event.txHash,
                balanceChange: event.data
              });
            } catch (error) {
              console.error(`❌ Error updating whale activity for user ${user}:`, error);
            }
          }
          
          // Send to all SSE clients
          const eventData = {
            type: 'balance_change',
            address: whaleAddress,
            timestamp: event.timestamp,
            txHash: event.txHash,
            data: event.data,
            trackingUsers // Include which users are tracking this whale
          };
          
          sseClients.forEach(client => {
            client.write(`data: ${JSON.stringify(eventData)}\n\n`);
          });
        });
        
        subscriptions.set(whaleAddress, subscription);
        console.log(`✅ Started monitoring whale: ${whaleAddress}`);
      } else {
        console.log(`ℹ️ Already monitoring whale: ${whaleAddress}`);
      }
    }
    
    res.json({
      message: 'Wallet connected successfully',
      userAddress,
      whales,
      total: whales.length,
      trackedAddresses,
      monitoringStatus: whales.map((w: string) => ({
        address: w,
        isMonitoring: subscriptions.has(w)
      }))
    });
    
    console.log(`🔗 Wallet connected for user ${userAddress}. Monitoring ${whales.length} whales.`);
    
  } catch (error) {
    console.error(`❌ Error connecting wallet for user ${userAddress}:`, error);
    res.status(500).json({ 
      error: 'Failed to connect wallet',
      userAddress
    });
  }
});
