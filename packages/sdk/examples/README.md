# Aptos Activity Stream SDK Examples

This directory contains example scripts for using the Aptos Activity Stream SDK.

## monitorAddress.ts

A real-time activity monitor that watches for transactions on specific Aptos addresses.

### Features

- **Multi-network support**: Works with mainnet, testnet, and devnet
- **Real-time monitoring**: Uses WebSocket to broadcast activity events
- **Configurable addresses**: Monitor different addresses on different networks
- **Graceful error handling**: Handles 404 errors and network issues gracefully
- **Reduced noise**: Only logs errors once per address to avoid spam

### Usage

1. **Configure the network and address**:
   ```typescript
   const CONFIG = {
     NETWORK: 'mainnet', // Change to 'testnet' or 'devnet'
     ADDRESSES: {
       mainnet: '0x97ecf7442e40a3185dd7029a8e6ba5eb042bbeb1283a76b83ad35fa4548f22b7',
       testnet: '0x1', // Framework account (may not have transactions)
       devnet: '0x1'   // Framework account (may not have transactions)
     }
   };
   ```

2. **Run the monitor**:
   ```bash
   cd packages/sdk
   pnpx ts-node examples/monitorAddress.ts
   ```

3. **Stop monitoring**: Press `Ctrl+C` to gracefully stop the monitor.

### Output

The monitor will display:
- Network and node URL being used
- Address being monitored
- WebSocket server status
- Real-time activity events when detected
- Helpful tips if no activity is detected

### Example Output

```
Starting Aptos Activity Monitor on MAINNET...
Node URL: https://fullnode.mainnet.aptoslabs.com
Primary address: 0x97ecf7442e40a3185dd7029a8e6ba5eb042bbeb1283a76b83ad35fa4548f22b7
WebSocket server started on port 8080
Monitoring address: 0x97ecf7442e40a3185dd7029a8e6ba5eb042bbeb1283a76b83ad35fa4548f22b7 on MAINNET
Press Ctrl+C to stop monitoring...

💡 Tips:
- If no activity is detected, the address might not have recent transactions
- Try changing NETWORK to "testnet" or "devnet" for testing
- Update ADDRESSES with your target address

=== New Activity Detected ===
Type: transactions
Address: 0x97ecf7442e40a3185dd7029a8e6ba5eb042bbeb1283a76b83ad35fa4548f22b7
Timestamp: 2025-11-30T00:00:00.000Z
Transaction Hash: 0x2883682843f8c855b307353f9cb89148c5a9343e5507aa87d35c86769167d6f7
Block Height: 7032961589
Data: {...}
===========================
```

## monitorAddressImproved.ts

An enhanced version with better error handling and fallback mechanisms.

### Additional Features

- **Fallback addresses**: Includes known active addresses for each network
- **Better logging**: More informative console output
- **Tips section**: Provides guidance when no activity is detected

### Usage

Same as monitorAddress.ts but with enhanced features:
```bash
pnpx ts-node examples/monitorAddressImproved.ts
```

## findTestnetAddress.ts

A utility script to find active addresses on testnet for testing purposes.

### Usage

```bash
cd packages/sdk
pnpx ts-node examples/findTestnetAddress.ts
```

This script will:
- Test addresses from your provided transaction data
- Check known addresses like the framework account
- Display which addresses exist and have transactions

## Network Configuration

The SDK automatically detects the network based on the node URL:

- **Mainnet**: `https://fullnode.mainnet.aptoslabs.com` ✅ Recommended for production
- **Testnet**: `https://fullnode.testnet.aptoslabs.com` ⚠️ May have limited addresses
- **Devnet**: `https://fullnode.devnet.aptoslabs.com` ⚠️ May have limited addresses

**Note**: Testnet and devnet may not have the same addresses as mainnet. Use mainnet for reliable testing with known addresses.

## Error Handling

The monitor handles common errors gracefully:

- **404 Not Found**: Address doesn't exist or has no transactions (logged once)
- **No transactions**: Address exists but has no activity (logged once)
- **Network errors**: Automatic reconnection with configurable retry logic
- **WebSocket errors**: Client disconnection and reconnection

## Troubleshooting

### Address Not Found (404 Error)

If you see "Address not found or has no transactions":

1. **Check the network**: Make sure the address exists on the selected network
2. **Try mainnet**: Most addresses from transaction data are from mainnet
3. **Use a known address**: Try `0x1` (framework account) on mainnet

### No Activity Detected

If the monitor starts but shows no activity:

1. **Check recent transactions**: The address might not have recent activity
2. **Reduce polling interval**: Change `POLLING_INTERVAL` to check more frequently
3. **Try a more active address**: Use addresses with regular transactions

### Network Issues

If you experience connection problems:

1. **Check node URL**: Ensure the node is accessible
2. **Verify network**: Make sure you're using the correct network configuration
3. **Check reconnection settings**: Adjust `reconnectInterval` and `maxReconnectAttempts`

## Customization

You can customize:

- **Polling interval**: Change `POLLING_INTERVAL` (default: 5000ms)
- **WebSocket port**: Modify `PORT` (default: 8080)
- **Reconnect settings**: Adjust `reconnectInterval` and `maxReconnectAttempts`
- **Address to monitor**: Update the `ADDRESSES` configuration with your target addresses
- **Network**: Change `NETWORK` to switch between mainnet, testnet, and devnet
