import { AptosActivityStream } from '../src/AptosActivityStream';

// Configuration with fallback addresses
const CONFIG = {
  // Aptos network (testnet only)
  NETWORK: 'testnet' as const,
  // Node URLs for different networks
  NODE_URLS: {
    mainnet: 'https://fullnode.mainnet.aptoslabs.com',
    testnet: 'https://api.testnet.staging.aptoslabs.com/v1',
    devnet: 'https://fullnode.devnet.aptoslabs.com'
  } as const,
  // Primary addresses to monitor
  ADDRESSES: {
    mainnet: '0x97ecf7442e40a3185dd7029a8e6ba5eb042bbeb1283a76b83ad35fa4548f22b7',
    testnet: '0x97ecf7442e40a3185dd7029a8e6ba5eb042bbeb1283a76b83ad35fa4548f22b7', // Your testnet address
    devnet: '0x97ecf7442e40a3185dd7029a8e6ba5eb042bbeb1283a76b83ad35fa4548f22b7'
  } as const,
  // Fallback addresses (known active addresses)
  FALLBACK_ADDRESSES: {
    mainnet: [
      '0x1', // Core framework account
      '0x3', // Randomness
      '0x4', // Stake
      '0x5', // Coin
    ],
    testnet: [
      // Add known testnet addresses when found
    ],
    devnet: [
      // Add known devnet addresses when found
    ]
  } as const,
  // WebSocket server port
  PORT: 8080,
  // Polling interval in milliseconds
  POLLING_INTERVAL: 5000,
};

async function main() {
  const network = CONFIG.NETWORK;
  const nodeUrl = CONFIG.NODE_URLS[network];
  let addressToMonitor = CONFIG.ADDRESSES[network];
  
  console.log(`Starting Aptos Activity Monitor on ${network.toUpperCase()}...`);
  console.log(`Node URL: ${nodeUrl}`);
  console.log(`Primary address: ${addressToMonitor}`);
  
  // Create a new instance of AptosActivityStream
  const activityStream = new AptosActivityStream({
    nodeUrl: nodeUrl,
    reconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
  });

  try {
    // Start the WebSocket server
    await activityStream.start(CONFIG.PORT);
    console.log(`WebSocket server started on port ${CONFIG.PORT}`);

    // Watch the primary address
    const subscription = activityStream.watchAddress(
      addressToMonitor,
      'all',
      (event) => {
        console.log('\n=== New Activity Detected ===');
        console.log('Type:', event.type);
        console.log('Address:', event.address);
        console.log('Timestamp:', new Date(event.timestamp).toISOString());
        
        if (event.txHash) {
          console.log('Transaction Hash:', event.txHash);
        }
        if (event.blockHeight) {
          console.log('Block Height:', event.blockHeight);
        }
        
        // Display token balances if available
        if (event.data.balances) {
          console.log('\n--- Token Balances ---');
          event.data.balances.forEach((balance: any) => {
            console.log(`${balance.symbol || balance.coinType}: ${balance.amount}`);
          });
        }
        
        // Display transaction analysis if available
        if (event.data.analysis) {
          console.log('\n--- Transaction Analysis ---');
          const analysis = event.data.analysis;
          console.log('Action Type:', analysis.type.toUpperCase());
          if (analysis.amount) console.log('Amount:', analysis.amount);
          if (analysis.from) console.log('From:', analysis.from);
          if (analysis.to) console.log('To:', analysis.to);
        }
        
        // Display balance changes
        if (event.type === 'balance_change') {
          console.log('\n--- Balance Changes ---');
          console.log('Previous:', event.data.previous.map((b: any) => `${b.symbol || b.coinType}: ${b.amount}`).join(', ') || 'None');
          console.log('Current:', event.data.current.map((b: any) => `${b.symbol || b.coinType}: ${b.amount}`).join(', ') || 'None');
        }
        
        console.log('===========================\n');
      }
    );

    console.log(`Monitoring address: ${addressToMonitor} on ${network.toUpperCase()}`);
    console.log('Press Ctrl+C to stop monitoring...');
    console.log('\n💡 Tips:');
    console.log('- If no activity is detected, the address might not have recent transactions');
    console.log('- Try changing NETWORK to "testnet" or "devnet" for testing');
    console.log('- Update ADDRESSES with your target address');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nStopping monitor...');
      await subscription.unsubscribe();
      await activityStream.stop();
      console.log('Monitor stopped.');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start monitor:', error);
    process.exit(1);
  }
}

main().catch(console.error);
