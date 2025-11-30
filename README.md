# Aptos Whale Stream Platform

A comprehensive real-time whale monitoring platform for the Aptos blockchain, featuring SDKs, a backend API, and a modern web dashboard for tracking large transactions and market movements.

## 🌊 Overview

This platform provides three main components:
- **Aptos Activity SDK**: Real-time blockchain activity monitoring
- **Backend API**: Whale tracking and user management service  
- **Platform Dashboard**: Modern web interface for whale analytics

## 📦 Repository Structure

```
aptos-hacks/
├── packages/
│   ├── aptos-stream-sdk/          # Stream processing SDK
│   └── sdk/                       # Activity monitoring SDK
├── apps/
│   ├── backend/                   # Express.js API server
│   └── platform/                  # Next.js web dashboard
└── README.md
```

---

## 🚀 SDKs

### 1. Aptos Activity SDK (`packages/sdk`)

Real-time monitoring SDK for tracking Aptos blockchain activities using WebSockets.

#### Features
- **Real-time Monitoring**: Track transactions, events, and balance changes
- **WebSocket-based**: Instant notifications for address activities
- **Rate Limited**: Built-in batching and concurrency control
- **Multi-network**: Support for mainnet, testnet, and devnet
- **TypeScript**: Full type safety and IntelliSense support

#### Key Capabilities
- Monitor multiple addresses simultaneously
- Detect token balance changes
- Analyze transaction types (buy, sell, transfer, swap)
- Automatic reconnection and error handling
- Configurable polling intervals and batch sizes

#### Installation
```bash
npm install aptos-activity-sdk
```

#### Basic Usage
```typescript
import { AptosActivityStream } from 'aptos-activity-sdk';

const stream = new AptosActivityStream({
  nodeUrl: 'https://fullnode.mainnet.aptoslabs.com',
  pollingInterval: 15000,
  batchSize: 3
});

// Start monitoring
await stream.start(8080);

// Watch an address
const subscription = stream.watchAddress(
  '0x...',
  'all',
  (event) => {
    console.log('New activity:', event);
  }
);
```

#### Advanced Example
```typescript
// Monitor with custom configuration
const stream = new AptosActivityStream({
  nodeUrl: 'https://api.testnet.staging.aptoslabs.com/v1',
  reconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 5,
  batchSize: 3,
  pollingInterval: 15000,
  requestDelay: 1000,
  maxConcurrentRequests: 2
});

// Watch for balance changes only
const subscription = stream.watchAddress(
  whaleAddress,
  'balance_change',
  (event) => {
    if (event.type === 'balance_change') {
      const { previous, current } = event.data;
      console.log(`Balance changed for ${event.address}`);
      console.log('Before:', previous);
      console.log('After:', current);
    }
  }
);
```

#### API Reference

##### Constructor Options
```typescript
interface StreamOptions {
  nodeUrl?: string;              // Aptos node URL
  reconnect?: boolean;           // Auto-reconnect on disconnect
  reconnectInterval?: number;    // Reconnection delay (ms)
  maxReconnectAttempts?: number; // Max reconnection attempts
  batchSize?: number;            // Addresses per batch
  pollingInterval?: number;       // Polling frequency (ms)
  requestDelay?: number;         // Delay between batches (ms)
  maxConcurrentRequests?: number; // Concurrent request limit
}
```

##### Activity Events
```typescript
interface ActivityEvent {
  type: 'all' | 'transactions' | 'events' | 'resources' | 'balance_change';
  address: string;
  timestamp: number;
  data: any;
  txHash?: string;
  blockHeight?: number;
}
```

#### Use Cases
- **Wallet Monitoring**: Track user wallet activities
- **Whale Watching**: Monitor large holder movements
- **DEX Analytics**: Follow trading patterns
- **Security Alerts**: Detect suspicious activities
- **Portfolio Tracking**: Real-time balance updates

---

### 2. Aptos Stream SDK (`packages/aptos-stream-sdk`)

Stream processing utilities for handling blockchain data streams.

#### Features
- Data encoding/decoding utilities
- Stream processing helpers
- Modular architecture for extensibility

---

## 🌐 Backend API (`apps/backend`)

Express.js server providing whale tracking services and real-time data streaming.

#### Features
- **User Management**: Wallet connection and tracking
- **Whale Tracking**: Add/remove whale addresses
- **Real-time Streaming**: Server-Sent Events (SSE) for live updates
- **Persistent Storage**: PostgreSQL with Prisma ORM
- **Fallback Storage**: In-memory storage for development

#### API Endpoints

##### Wallet Connection
```http
POST /wallet/connect
Content-Type: application/json

{
  "userAddress": "0x..."
}
```

##### Add Whale to Track
```http
POST /add/whale/{walletAddress}
Content-Type: application/json

{
  "userAddress": "0x..."
}
```

##### Get User's Tracked Whales
```http
GET /whales?userAddress=0x...
```

##### Remove Whale Tracking
```http
DELETE /whale/{walletAddress}
Content-Type: application/json

{
  "userAddress": "0x..."
}
```

##### Real-time Events Stream
```http
GET /events
Accept: text/event-stream
```

##### Health Check
```http
GET /health
```

#### Database Schema
- **Users**: Wallet addresses and metadata
- **Whales**: Tracked addresses with risk levels
- **UserWhale**: Many-to-many relationships
- **WhaleActivity**: Transaction history and events

#### Configuration
```bash
# .env
DATABASE_URL=postgresql://...
PORT=3001
NODE_ENV=development
```

#### Use Cases
- **Whale Tracking Service**: Backend for whale monitoring apps
- **API Service**: RESTful API for blockchain data
- **Real-time Notifications**: SSE streaming for live updates
- **User Management**: Multi-user whale tracking

---

## 🖥️ Platform Dashboard (`apps/platform`)

Modern Next.js dashboard for whale monitoring and analytics.

#### Features
- **Real-time Dashboard**: Live whale activity monitoring
- **Wallet Integration**: Connect Aptos wallets
- **Whale Management**: Add/remove tracked addresses
- **Activity Feed**: Real-time transaction and balance updates
- **Modern UI**: Built with Tailwind CSS and shadcn/ui
- **Responsive Design**: Works on desktop and mobile

#### Technology Stack
- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **Wallet**: Aptos Wallet Adapter
- **TypeScript**: Full type safety

#### Key Pages
- **Home**: Landing page with platform overview
- **Dashboard**: Main monitoring interface
- **Manage Whales**: Add/remove whale addresses
- **Strategies**: Trading strategy configuration

#### Components
- **Activity Feed**: Real-time event display
- **Whale Cards**: Address information and stats
- **Balance Charts**: Visual balance tracking
- **Transaction History**: Detailed transaction logs

#### Use Cases
- **Trading Dashboard**: Monitor whale movements for trading
- **Portfolio Tracking**: Watch important addresses
- **Research Platform**: Study whale behavior patterns
- **Alert System**: Get notified about large transactions

---

## 🛠️ Development

### Prerequisites
- Node.js 18+
- pnpm package manager
- PostgreSQL (for production)

### Setup

1. **Clone Repository**
```bash
git clone <repository-url>
cd aptos-hacks
```

2. **Install Dependencies**
```bash
pnpm install
```

3. **Environment Setup**
```bash
# Backend environment
cd apps/backend
cp .env.example .env
# Configure DATABASE_URL and other variables

# Platform environment  
cd ../platform
cp .env.example .env
# Configure NEXT_PUBLIC_API_URL and other variables
```

4. **Database Setup** (Optional - uses in-memory fallback)
```bash
cd apps/backend
npx prisma migrate dev
npx prisma generate
```

### Running the Platform

1. **Start All Services**
```bash
pnpm dev
```

2. **Individual Services**
```bash
# Backend only
pnpm dev --filter=backend

# Platform only
pnpm dev --filter=platform

# SDK development
pnpm dev --filter=aptos-activity-sdk
```

### Build for Production
```bash
pnpm build
```

### Testing
```bash
# Run SDK examples
cd packages/sdk/examples
ts-node monitorAddressImproved.ts

# Test backend endpoints
curl http://localhost:3001/health

# Test platform
# Navigate to http://localhost:3000
```

---

## 📊 Use Cases & Examples

### 1. Whale Watching
Monitor large holder movements for market insights:
```typescript
// Track known whale addresses
const whales = [
  '0x97ecf7442e40a3185dd7029a8e6ba5eb042bbeb1283a76b83ad35fa4548f22b7',
  '0x123...abc'
];

whales.forEach(address => {
  stream.watchAddress(address, 'all', (event) => {
    if (event.data.analysis?.type === 'transfer') {
      console.log(`Large transfer detected: ${event.data.analysis.amount}`);
    }
  });
});
```

### 2. Portfolio Tracking
Monitor your own wallet for balance changes:
```typescript
stream.watchAddress(myWallet, 'balance_change', (event) => {
  const { previous, current } = event.data;
  console.log('Portfolio updated:', current);
});
```

### 3. DEX Monitoring
Track trading activities on decentralized exchanges:
```typescript
stream.watchAddress(dexContract, 'transactions', (event) => {
  if (event.data.analysis?.type === 'swap') {
    console.log(`Swap detected: ${event.data.analysis.amount}`);
  }
});
```

### 4. Security Alerts
Get notified about suspicious activities:
```typescript
stream.watchAddress(vaultAddress, 'all', (event) => {
  if (event.data.analysis?.amount > '1000000') {
    alert(`Large transaction detected: ${event.txHash}`);
  }
});
```

---

## 🔧 Configuration

### SDK Configuration
```typescript
const stream = new AptosActivityStream({
  nodeUrl: 'https://fullnode.mainnet.aptoslabs.com', // Network endpoint
  reconnect: true,                                    // Auto-reconnect
  reconnectInterval: 5000,                            // 5 second reconnect delay
  maxReconnectAttempts: 5,                           // Max retry attempts
  batchSize: 3,                                      // Addresses per batch
  pollingInterval: 15000,                            // 15 second polling
  requestDelay: 1000,                                // 1 second between batches
  maxConcurrentRequests: 2                           // Concurrent request limit
});
```

### Backend Configuration
```typescript
// server.ts key configurations
const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;

// Stream configuration
const stream = new AptosActivityStream({
  nodeUrl: 'https://api.testnet.staging.aptoslabs.com/v1',
  batchSize: 3,
  pollingInterval: 15000,
  requestDelay: 1000,
  maxConcurrentRequests: 2,
});
```

### Platform Configuration
```typescript
// next.config.js
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Wallet adapter configuration
const wallets = [
  new PetraWallet(),
  new MartianWallet(),
  // ... other wallets
];
```

---

## 🚀 Deployment

### Backend Deployment
```bash
# Build backend
cd apps/backend
pnpm build

# Run with PM2
pm2 start dist/server.js --name whale-backend

# Or with Docker
docker build -t whale-backend .
docker run -p 3001:3001 whale-backend
```

### Platform Deployment
```bash
# Build platform
cd apps/platform
pnpm build

# Deploy to Vercel
vercel --prod

# Or run with PM2
pm2 start .next/standalone/server.js --name whale-platform
```

### Environment Variables
```bash
# Production .env
DATABASE_URL=postgresql://user:pass@host:5432/whaledb
PORT=3001
NODE_ENV=production

NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Commit changes: `git commit -m "Add feature"`
5. Push to branch: `git push origin feature-name`
6. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Add comprehensive tests for new features
- Update documentation for API changes
- Use conventional commit messages

---

## 📝 License

MIT License - see LICENSE file for details.

---

## 🔗 Related Links

- [Aptos Documentation](https://aptos.dev/)
- [Aptos TS SDK](https://github.com/aptos-labs/ts-sdk)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

---

## 🆘 Support

For issues and questions:
1. Check the [examples](packages/sdk/examples/) directory
2. Review the [API documentation](#api-reference)
3. Open an issue on GitHub
4. Join our Discord community

---

## 🎯 Roadmap

- [ ] Mobile app for whale monitoring
- [ ] Advanced analytics and ML predictions
- [ ] Multi-chain support (Ethereum, Solana)
- [ ] Alert system with email/SMS notifications
- [ ] Historical data analysis tools
- [ ] Community whale rankings
- [ ] API rate limiting and authentication
- [ ] GraphQL API support
- [ ] WebSocket subscription management
- [ ] Performance optimizations and caching
