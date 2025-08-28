# Ethereum Load Tester

A powerful tool for load testing Ethereum networks by creating multiple wallets, distributing funds, and spamming transactions concurrently.

## Features

- **Multi-wallet Management**: Creates configurable number of wallets from a master wallet
- **Automatic Fund Distribution**: Distributes funds equally among created wallets
- **Concurrent Transaction Spamming**: Sends transactions from multiple wallets simultaneously
- **Proper Nonce Management**: Handles nonce tracking to prevent transaction conflicts
- **Transaction Monitoring**: Waits for transaction confirmation before sending next one
- **Comprehensive Statistics**: Tracks success rates, TPS, and other metrics
- **Graceful Shutdown**: Handles SIGINT/SIGTERM for clean stops

## Prerequisites

- Node.js >= 16.0.0
- Yarn package manager
- Access to an Ethereum RPC endpoint
- A funded wallet (private key)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd eth-loadtester
```

2. Install dependencies:
```bash
yarn install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

Create a `.env` file with the following variables:

```bash
# Required
PRIVATE_KEY=0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110
RPC_URL=http://127.0.0.1:3050

# Optional (with defaults)
NUM_WALLETS=10
TRANSACTIONS_PER_WALLET=100
TRANSACTION_INTERVAL_MS=1000
GAS_LIMIT=21000
GAS_PRICE=20
TRANSACTION_AMOUNT=0.0001
```

### Configuration Options

- **PRIVATE_KEY**: Private key of the master wallet (must have funds)
- **RPC_URL**: Ethereum RPC endpoint URL
- **NUM_WALLETS**: Number of child wallets to create (default: 10)
- **TRANSACTIONS_PER_WALLET**: Number of transactions each wallet will send (default: 100)
- **TRANSACTION_INTERVAL_MS**: Delay between transactions from same wallet in milliseconds (default: 1000)
- **GAS_LIMIT**: Gas limit for transactions (default: 21000)
- **GAS_PRICE**: Gas price in gwei (default: 20)
- **TRANSACTION_AMOUNT**: Amount to send per transaction in ETH (default: 0.0001)

## Usage

### Basic Usage

```bash
yarn start
```

### What Happens

1. **Validation**: Validates configuration and connects to RPC
2. **Wallet Creation**: Creates the specified number of child wallets
3. **Fund Distribution**: Distributes funds from master wallet to child wallets
4. **Load Testing**: Starts concurrent transaction spamming from all wallets
5. **Statistics**: Displays comprehensive results at the end

### Example Output

```
🚀 Ethereum Load Tester Starting...

✅ Configuration validated
🔗 Connected to RPC: http://127.0.0.1:3050
📡 Network: unknown (Chain ID: 1337)
💼 Master wallet: 0x742d35Cc6634C0532925a3b8D4C9db96590b5e0e
💰 Master wallet balance: 10.0 ETH

Creating 10 wallets...
Created 10 wallets

📤 Distributing funds to child wallets...
Distributing 0.99 ETH to each wallet
Fund distribution completed

🔥 Starting load test...
Configuration: 100 transactions per wallet, 1000ms interval

=== Load Test Results ===
Duration: 120.45 seconds
Total Transactions: 1000
Successful Transactions: 995
Failed Transactions: 5
Success Rate: 99.50%
Average TPS: 8.26
========================
```

## Architecture

### Components

- **WalletManager**: Handles wallet creation, fund distribution, and nonce management
- **LoadTester**: Manages concurrent transaction execution and statistics
- **config.js**: Configuration management and validation
- **index.js**: Main entry point and orchestration

### Key Features

- **Concurrent Execution**: Each wallet runs transactions in parallel
- **Nonce Management**: Proper nonce tracking prevents transaction conflicts
- **Error Handling**: Robust error handling with automatic nonce recovery
- **Statistics Tracking**: Real-time monitoring of transaction success/failure
- **Graceful Shutdown**: Clean shutdown on SIGINT/SIGTERM signals

## Safety Features

- **Gas Reserve**: Automatically reserves gas for distribution transactions
- **Balance Validation**: Checks wallet balances before starting
- **Transaction Confirmation**: Waits for each transaction to be mined
- **Error Recovery**: Handles nonce issues and network errors gracefully

## Troubleshooting

### Common Issues

1. **"Master wallet has no funds"**
   - Ensure the master wallet has sufficient ETH balance
   - Check the private key is correct

2. **"Connection refused"**
   - Verify the RPC URL is correct and accessible
   - Ensure the Ethereum node is running

3. **"Nonce too low" errors**
   - The tool automatically handles nonce issues
   - If persistent, restart the tool

4. **High failure rate**
   - Reduce TRANSACTIONS_PER_WALLET or increase TRANSACTION_INTERVAL_MS
   - Check network congestion and gas prices

## Development

### Project Structure

```
eth-loadtester/
├── src/
│   ├── index.js          # Main entry point
│   ├── WalletManager.js  # Wallet management
│   ├── LoadTester.js     # Load testing logic
│   └── config.js         # Configuration
├── .env                  # Environment variables
├── package.json          # Dependencies
└── README.md            # This file
```

### Adding Features

The modular architecture makes it easy to extend:

- Add new transaction types in `LoadTester.js`
- Implement different fund distribution strategies in `WalletManager.js`
- Add new configuration options in `config.js`

## License

MIT License - see LICENSE file for details.
