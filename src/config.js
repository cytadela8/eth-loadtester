require('dotenv').config();

const config = {
  // Network configuration
  privateKey: process.env.PRIVATE_KEY,
  rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
  
  // Load testing configuration
  numWallets: parseInt(process.env.NUM_WALLETS) || 10,
  transactionsPerWallet: parseInt(process.env.TRANSACTIONS_PER_WALLET) || 100,
  intervalMs: parseInt(process.env.TRANSACTION_INTERVAL_MS) || 1000,
  
  // Transaction configuration
  gasLimit: parseInt(process.env.GAS_LIMIT) || 21000,
  gasPrice: process.env.GAS_PRICE || '20', // in gwei
  transactionAmount: process.env.TRANSACTION_AMOUNT || '0.0001', // in ETH
};

// Validation
function validateConfig() {
  const errors = [];
  
  if (!config.privateKey) {
    errors.push('PRIVATE_KEY is required in .env file');
  }
  
  if (!config.rpcUrl) {
    errors.push('RPC_URL is required in .env file');
  }
  
  if (config.numWallets <= 0) {
    errors.push('NUM_WALLETS must be greater than 0');
  }
  
  if (config.transactionsPerWallet <= 0) {
    errors.push('TRANSACTIONS_PER_WALLET must be greater than 0');
  }
  
  if (config.intervalMs < 0) {
    errors.push('TRANSACTION_INTERVAL_MS must be non-negative');
  }
  
  if (errors.length > 0) {
    throw new Error('Configuration validation failed:\n' + errors.join('\n'));
  }
}

module.exports = {
  config,
  validateConfig
};
