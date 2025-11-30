import express, { Request, Response } from 'express';
import cors from 'cors';
import { AptosActivityStream } from 'aptos-activity-sdk';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize the activity stream with rate limiting
const stream = new AptosActivityStream({
  nodeUrl: 'https://api.testnet.staging.aptoslabs.com/v1',
  batchSize: 3,
  pollingInterval: 15000,
  requestDelay: 1000,
  maxConcurrentRequests: 2,
});

// Store subscriptions
const subscriptions = new Map<string, any>();

// Start the stream
stream.start(8080).then(() => {
  console.log('🚀 Aptos Activity Stream started on port 8080');
}).catch(console.error);

// POST /add/whale/<walletaddress>
app.post('/add/whale/:walletAddress', async (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  
  try {
    console.log(`📡 Adding whale address: ${walletAddress}`);
    
    // Check if already subscribed
    if (subscriptions.has(walletAddress)) {
      return res.status(400).json({ 
        error: 'Address already being tracked',
        address: walletAddress 
      });
    }
    
    // Subscribe to the address
    const subscription = stream.watchAddress(walletAddress, 'all', (event: any) => {
      console.log(`🐋 Whale Activity [${walletAddress}]:`, {
        type: event.type,
        timestamp: new Date(event.timestamp).toISOString(),
        txHash: event.txHash,
        data: event.data
      });
    });
    
    // Store subscription
    subscriptions.set(walletAddress, subscription);
    
    console.log(`✅ Successfully added whale: ${walletAddress}`);
    console.log(`📊 Now tracking ${subscriptions.size} whale addresses`);
    
    res.json({ 
      message: 'Whale address added successfully',
      address: walletAddress,
      totalTracked: subscriptions.size
    });
    
  } catch (error) {
    console.error(`❌ Error adding whale ${walletAddress}:`, error);
    res.status(500).json({ 
      error: 'Failed to add whale address',
      address: walletAddress 
    });
  }
});

// GET /whales - list all tracked whales
app.get('/whales', (req: Request, res: Response) => {
  const whales = Array.from(subscriptions.keys());
  res.json({
    whales,
    total: whales.length
  });
});

// DELETE /whale/<walletaddress> - stop tracking
app.delete('/whale/:walletAddress', async (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  
  try {
    const subscription = subscriptions.get(walletAddress);
    if (!subscription) {
      return res.status(404).json({ 
        error: 'Whale address not found',
        address: walletAddress 
      });
    }
    
    // Unsubscribe
    await subscription.unsubscribe();
    subscriptions.delete(walletAddress);
    
    console.log(`🛑 Stopped tracking whale: ${walletAddress}`);
    
    res.json({ 
      message: 'Whale address removed successfully',
      address: walletAddress,
      remainingTracked: subscriptions.size
    });
    
  } catch (error) {
    console.error(`❌ Error removing whale ${walletAddress}:`, error);
    res.status(500).json({ 
      error: 'Failed to remove whale address',
      address: walletAddress 
    });
  }
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
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🌐 Whale tracker server running on http://localhost:${PORT}`);
  console.log(`📡 POST /add/whale/<address> - Add whale to track`);
  console.log(`📋 GET /whales - List tracked whales`);
  console.log(`🗑️  DELETE /whale/<address> - Stop tracking whale`);
  console.log(`❤️  GET /health - Health check`);
});
