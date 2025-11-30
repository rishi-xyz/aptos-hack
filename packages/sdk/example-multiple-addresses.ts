import { AptosActivityStream } from './src/AptosActivityStream';

// Example: Monitor multiple addresses with rate limiting
async function example() {
  // Configure the stream with rate limiting options
  const stream = new AptosActivityStream({
    nodeUrl: 'https://api.testnet.staging.aptoslabs.com/v1',
    batchSize: 3,                    // Process 3 addresses at a time
    pollingInterval: 15000,          // Poll every 15 seconds
    requestDelay: 1000,              // 1 second delay between batches
    maxConcurrentRequests: 2,       // Max 2 requests at the same time
  });

  // Start the WebSocket server
  await stream.start(8080);
  console.log('🚀 Aptos Activity Stream started on port 8080');

  // Watch multiple addresses (minimum 3 as requested)
  const addresses = [
    '0x3bc1ad169b51aa1f3bb0736cef92ba12c687fe2cde795b1be1b19107ccaae022',                           // Example address 1
    '0x2',                           // Example address 2  
    '0x3',                           // Example address 3
    // Add more addresses as needed
  ];

  // Subscribe to activities for all addresses
  const subscriptions = addresses.map(address => 
    stream.watchAddress(address, 'all', (event) => {
      console.log(`📡 Activity for ${address}:`, {
        type: event.type,
        timestamp: new Date(event.timestamp).toISOString(),
        data: event.data
      });
    })
  );

  // Keep the process running
  console.log(`📊 Monitoring ${addresses.length} addresses...`);
  console.log('Press Ctrl+C to stop');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    
    // Unsubscribe from all addresses
    await Promise.all(subscriptions.map(sub => sub.unsubscribe()));
    
    // Stop the stream
    await stream.stop();
    console.log('✅ Stream stopped');
    process.exit(0);
  });
}

// Run the example
example().catch(console.error);
