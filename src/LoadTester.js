const { ethers } = require('ethers');

class LoadTester {
  constructor(walletManager, config) {
    this.walletManager = walletManager;
    this.config = config;
    this.isRunning = false;
    this.stats = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      startTime: null,
      endTime: null
    };
  }

  async startLoadTest() {
    if (this.isRunning) {
      throw new Error('Load test is already running');
    }

    this.isRunning = true;
    this.stats.startTime = Date.now();
    this.stats.totalTransactions = 0;
    this.stats.successfulTransactions = 0;
    this.stats.failedTransactions = 0;

    console.log('Starting load test...');
    console.log(`Configuration: ${this.config.transactionsPerWallet} transactions per wallet, ${this.config.intervalMs}ms interval`);

    const wallets = this.walletManager.getWallets();
    
    // Initialize nonces for all wallets
    await this.initializeNonces(wallets);

    // Start concurrent transaction loops for each wallet
    const walletPromises = wallets.map((wallet, index) => 
      this.runWalletTransactions(wallet, index)
    );

    try {
      await Promise.all(walletPromises);
    } catch (error) {
      console.error('Load test encountered an error:', error.message);
    } finally {
      this.isRunning = false;
      this.stats.endTime = Date.now();
      this.printStats();
    }
  }

  async initializeNonces(wallets) {
    console.log('Initializing nonces for all wallets...');
    const noncePromises = wallets.map(async (wallet) => {
      await this.walletManager.updateNonce(wallet.address);
    });
    await Promise.all(noncePromises);
    console.log('Nonce initialization completed');
  }

  async runWalletTransactions(wallet, walletIndex) {
    console.log(`Starting transactions for wallet ${walletIndex + 1}`);
    
    // Stagger the start time for each wallet to distribute transactions throughout the interval
    const staggerDelay = (walletIndex * this.config.intervalMs) / this.walletManager.getWallets().length;
    await this.sleep(staggerDelay);
    
    for (let i = 0; i < this.config.transactionsPerWallet; i++) {
      if (!this.isRunning) break;

      try {
        await this.sendTransaction(wallet, walletIndex, i);
        
        // Wait for the specified interval before next transaction
        if (i < this.config.transactionsPerWallet - 1) {
          await this.sleep(this.config.intervalMs);
        }
      } catch (error) {
        console.error(`Wallet ${walletIndex + 1}, Transaction ${i + 1} failed:`, error.message);
        this.stats.failedTransactions++;
      }
    }
    
    console.log(`Completed all transactions for wallet ${walletIndex + 1}`);
  }

  async sendTransaction(wallet, walletIndex, transactionIndex) {
    const nonce = this.walletManager.getNextNonce(wallet.address);
    
    // Send a small amount to a random address (or back to master wallet)
    const recipient = this.walletManager.getMasterWallet().address;
    const amount = ethers.parseEther('0.0001'); // Small amount to preserve funds
    
    try {
      const tx = await wallet.sendTransaction({
        to: recipient,
        value: amount,
        nonce: nonce,
		// not setting gasLimit or gasPrice, becouse zksync network
      });

      this.stats.totalTransactions++;
      console.log(`Wallet ${walletIndex + 1}, Tx ${transactionIndex + 1}: ${tx.hash}`);

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        this.stats.successfulTransactions++;
        console.log(`✓ Wallet ${walletIndex + 1}, Tx ${transactionIndex + 1} confirmed in block ${receipt.blockNumber}`);
      } else {
        this.stats.failedTransactions++;
        console.log(`✗ Wallet ${walletIndex + 1}, Tx ${transactionIndex + 1} failed`);
      }

    } catch (error) {
      this.stats.failedTransactions++;
      
      // Handle nonce issues by updating nonce from network
      if (error.message.includes('nonce') || error.message.includes('replacement')) {
        console.log(`Nonce issue detected for wallet ${walletIndex + 1}, updating from network...`);
        await this.walletManager.updateNonce(wallet.address);
      }
      
      throw error;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    console.log('Stopping load test...');
    this.isRunning = false;
  }

  printStats() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    const tps = this.stats.successfulTransactions / duration;

    console.log('\n=== Load Test Results ===');
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Total Transactions: ${this.stats.totalTransactions}`);
    console.log(`Successful Transactions: ${this.stats.successfulTransactions}`);
    console.log(`Failed Transactions: ${this.stats.failedTransactions}`);
    console.log(`Success Rate: ${((this.stats.successfulTransactions / this.stats.totalTransactions) * 100).toFixed(2)}%`);
    console.log(`Average TPS: ${tps.toFixed(2)}`);
    console.log('========================\n');
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = LoadTester;
