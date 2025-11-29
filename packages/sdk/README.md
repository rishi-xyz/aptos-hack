# Aptos Activity Stream SDK

A real-time monitoring SDK for the Aptos blockchain that allows you to track activities on specific addresses using WebSockets.

## Features

- Real-time monitoring of Aptos addresses
- WebSocket-based for instant notifications
- Support for different activity types (transactions, events, resources)
- Automatic reconnection and error handling
- TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @aptos-labs/ts-sdk ws
npm install --save-dev @types/ws @types/node
```

## Usage

### Basic Example

```typescript
import { AptosActivityStream } from './src/AptosActivityStream';

// Create a new instance
const activityStream = new AptosActivityStream({
  nodeUrl: 'https://fullnode.mainnet.aptoslabs.com',
  reconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
});

// Start the WebSocket server
activityStream.start(8080).then(() => {
  console.log('WebSocket server started on port 8080');
  
  // Watch for activities on an address
  const subscription = activityStream.watchAddress(
    '0x1', // Replace with the address you want to monitor
    'all', // Monitor all activity types
    (event) => {
      console.log('New activity:', event);
    }
  );
  
  // To stop watching
  // await subscription.unsubscribe();
});
```

### Running the Example

1. Navigate to the examples directory:
   ```bash
   cd examples
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the example:
   ```bash
   ts-node monitorAddress.ts
   ```

## API Reference

### `AptosActivityStream`

The main class for monitoring Aptos activities.

#### Constructor

```typescript
new AptosActivityStream(options: StreamOptions)
```

**Options:**

- `nodeUrl`: (string) The URL of the Aptos node to connect to. Defaults to mainnet.
- `reconnect`: (boolean) Whether to automatically reconnect on connection loss. Defaults to `true`.
- `reconnectInterval`: (number) Time in milliseconds between reconnection attempts. Defaults to `5000`.
- `maxReconnectAttempts`: (number) Maximum number of reconnection attempts. Defaults to `5`.

#### Methods

##### `start(port: number): Promise<void>`

Starts the WebSocket server on the specified port.

##### `stop(): Promise<void>`

Stops the WebSocket server and cleans up resources.

##### `watchAddress(address: string, type: ActivityType, handler: StreamHandler): StreamSubscription`

Starts watching for activities on the specified address.

- `address`: The Aptos address to monitor.
- `type`: Type of activities to watch for (`'all' | 'transactions' | 'events' | 'resources'`).
- `handler`: Callback function that receives activity events.

Returns a `StreamSubscription` object with an `unsubscribe` method to stop watching.

## Activity Event Format

Activity events have the following structure:

```typescript
{
  type: string;          // Type of activity ('transactions', 'events', 'resources')
  address: string;       // The address the activity is related to
  timestamp: number;     // Unix timestamp of when the activity was detected
  data: any;             // The raw activity data
  txHash?: string;       // Transaction hash (for transaction activities)
  blockHeight?: number;  // Block height (for transaction activities)
}
```

## License

MIT
