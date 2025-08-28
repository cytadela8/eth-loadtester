const { ethers } = require('ethers');
const WalletManager = require('./WalletManager');
const LoadTester = require('./LoadTester');
const { config, validateConfig } = require('./config');

async function main() {
  let walletManager;
  let error;
  
  try {
    console.log('🚀 Ethereum Load Tester Starting...\n');
    
    // Validate configuration
    validateConfig();
    console.log('✅ Configuration validated');
    
    // Setup provider
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    console.log(`🔗 Connected to RPC: ${config.rpcUrl}`);
    
    // Test connection
    try {
      const network = await provider.getNetwork();
      console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
    } catch (networkError) {
      console.warn('⚠️  Could not fetch network info, but continuing...');
    }
    
    // Initialize wallet manager
    walletManager = new WalletManager(provider, config.privateKey);
    console.log(`💼 Master wallet: ${walletManager.getMasterWallet().address}`);
    
    // Check master wallet balance
    const masterBalance = await provider.getBalance(walletManager.getMasterWallet().address);
    console.log(`💰 Master wallet balance: ${ethers.formatEther(masterBalance)} ETH\n`);
    
    if (masterBalance === 0n) {
      throw new Error('Master wallet has no funds. Please fund the wallet before running the load test.');
    }
    
    // Create child wallets
    await walletManager.createWallets(config.numWallets);
    
    // Distribute funds to child wallets
    console.log('\n📤 Distributing funds to child wallets...');
    await walletManager.distributeFunds();
    
    // Verify wallet balances
    console.log('\n💰 Verifying wallet balances...');
    const wallets = walletManager.getWallets();
    for (let i = 0; i < Math.min(3, wallets.length); i++) {
      const balance = await walletManager.getWalletBalance(wallets[i]);
      console.log(`Wallet ${i + 1}: ${ethers.formatEther(balance)} ETH`);
    }
    if (wallets.length > 3) {
      console.log(`... and ${wallets.length - 3} more wallets`);
    }
    
    // Initialize load tester
    const loadTesterConfig = {
      transactionsPerWallet: config.transactionsPerWallet,
      intervalMs: config.intervalMs,
      gasLimit: config.gasLimit,
      gasPrice: config.gasPrice,
      transactionAmount: config.transactionAmount
    };
    
    const loadTester = new LoadTester(walletManager, loadTesterConfig);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, stopping load test...');
      loadTester.stop();
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, stopping load test...');
      loadTester.stop();
    });
    
    // Start load test
    console.log('\n🔥 Starting load test...');
    await loadTester.startLoadTest();
    
    console.log('✅ Load test completed successfully!');
    
  } catch (err) {
    error = err;
    console.error('❌ Error:', err.message);
  } finally {
    // Always try to collect funds back, regardless of success or failure
    try {
      if (walletManager && walletManager.getWallets().length > 0) {
        console.log('\n🔄 Attempting to collect all remaining funds...');
        await walletManager.collectAllFunds();
      }
    } catch (collectionError) {
      console.error('⚠️  Fund collection failed:', collectionError.message);
    }
    
    // Exit with appropriate code
    if (error) {
      process.exit(1);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the main function
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
