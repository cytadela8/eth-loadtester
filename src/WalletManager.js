const { ethers } = require('ethers');

class WalletManager {
  constructor(provider, masterPrivateKey) {
    this.provider = provider;
    this.masterWallet = new ethers.Wallet(masterPrivateKey, provider);
    this.childWallets = [];
    this.nonces = new Map();
  }

  async createWallets(numWallets) {
    console.log(`Creating ${numWallets} wallets...`);
    
    for (let i = 0; i < numWallets; i++) {
      const wallet = ethers.Wallet.createRandom().connect(this.provider);
      this.childWallets.push(wallet);
      this.nonces.set(wallet.address, 0);
    }
    
    console.log(`Created ${this.childWallets.length} wallets`);
    return this.childWallets;
  }

  async distributeFunds() {
    const masterBalance = await this.masterWallet.provider.getBalance(this.masterWallet.address);
    console.log(`Master wallet balance: ${ethers.formatEther(masterBalance)} ETH`);

    if (masterBalance === 0n) {
      throw new Error('Master wallet has no funds to distribute');
    }

    // Reserve some ETH for gas fees (estimate 0.01 ETH per wallet for gas)
    const gasReserve = ethers.parseEther((0.01 * this.childWallets.length).toString());
    const availableBalance = masterBalance - gasReserve;
    
    if (availableBalance <= 0n) {
      throw new Error('Insufficient funds after reserving gas');
    }

    const amountPerWallet = availableBalance / BigInt(this.childWallets.length);
    console.log(`Distributing ${ethers.formatEther(amountPerWallet)} ETH to each wallet`);

    // Get initial nonce for master wallet
    let currentNonce = await this.provider.getTransactionCount(this.masterWallet.address, 'pending');

    // Process wallets in batches of 20
    const batchSize = 20;
    for (let batchStart = 0; batchStart < this.childWallets.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, this.childWallets.length);
      const batch = this.childWallets.slice(batchStart, batchEnd);
      
      console.log(`Processing batch ${Math.floor(batchStart / batchSize) + 1}: wallets ${batchStart + 1}-${batchEnd}`);

      // Send all transactions in this batch concurrently
      const batchPromises = batch.map(async (wallet, batchIndex) => {
        const globalIndex = batchStart + batchIndex;
        const txNonce = currentNonce + batchIndex;
        
        try {
          const tx = await this.masterWallet.sendTransaction({
            to: wallet.address,
            value: amountPerWallet,
            nonce: txNonce
          });
          
          console.log(`Sent funds to wallet ${globalIndex + 1}/${this.childWallets.length}: ${tx.hash}`);
          await tx.wait();
          console.log(`Confirmed funds for wallet ${globalIndex + 1}/${this.childWallets.length}`);
          
          return tx;
        } catch (error) {
          console.error(`Failed to send funds to wallet ${globalIndex + 1}:`, error.message);
          throw error;
        }
      });

      // Wait for all transactions in this batch to complete
      await Promise.all(batchPromises);
      
      // Update nonce for next batch
      currentNonce += batch.length;
      
      console.log(`Batch ${Math.floor(batchStart / batchSize) + 1} completed`);
    }

    console.log('Fund distribution completed');
  }

  async getWalletBalance(wallet) {
    return await this.provider.getBalance(wallet.address);
  }

  async updateNonce(walletAddress) {
    const currentNonce = await this.provider.getTransactionCount(walletAddress, 'pending');
    this.nonces.set(walletAddress, currentNonce);
    return currentNonce;
  }

  getNextNonce(walletAddress) {
    const currentNonce = this.nonces.get(walletAddress) || 0;
    this.nonces.set(walletAddress, currentNonce + 1);
    return currentNonce;
  }

  getWallets() {
    return this.childWallets;
  }

  getMasterWallet() {
    return this.masterWallet;
  }

  async collectAllFunds() {
    console.log('\n💰 Collecting remaining funds from all wallets...');
    
    const wallets = this.getWallets();
    let totalCollected = 0n;
    let successfulCollections = 0;
    
    // Collect from all wallets concurrently
    const collectionPromises = wallets.map(async (wallet, index) => {
      try {
        const balance = await this.provider.getBalance(wallet.address);
        
        if (balance === 0n) {
          console.log(`Wallet ${index + 1}: No funds to collect`);
          return { success: true, amount: 0n };
        }

        // Estimate gas cost for the transaction
        const gasPrice = await this.provider.getFeeData();
        const estimatedGasCost = BigInt(1000000) * (gasPrice.gasPrice || BigInt(20000000000)); // 20 gwei fallback
        
        if (balance <= estimatedGasCost) {
          console.log(`Wallet ${index + 1}: Balance too low to cover gas (${ethers.formatEther(balance)} ETH)`);
          return { success: true, amount: 0n };
        }

        const amountToSend = balance - estimatedGasCost;
        
        // Get current nonce for this wallet
        const walletNonce = await this.provider.getTransactionCount(wallet.address, 'pending');
        
        const tx = await wallet.sendTransaction({
          to: this.masterWallet.address,
          value: amountToSend,
          nonce: walletNonce
        });
        
        console.log(`Wallet ${index + 1}: Collecting ${ethers.formatEther(amountToSend)} ETH - ${tx.hash}`);
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log(`✓ Wallet ${index + 1}: Collection confirmed`);
          return { success: true, amount: amountToSend };
        } else {
          console.log(`✗ Wallet ${index + 1}: Collection failed`);
          return { success: false, amount: 0n };
        }
        
      } catch (error) {
        console.error(`Wallet ${index + 1}: Collection error - ${error.message}`);
        return { success: false, amount: 0n };
      }
    });

    // Wait for all collections to complete
    const results = await Promise.all(collectionPromises);
    
    // Aggregate results
    results.forEach(result => {
      if (result.success) {
        successfulCollections++;
        totalCollected += result.amount;
      }
    });

    console.log(`\n💰 Fund collection summary:`);
    console.log(`- Successful collections: ${successfulCollections}/${wallets.length}`);
    console.log(`- Total collected: ${ethers.formatEther(totalCollected)} ETH`);
    
    // Check final master wallet balance
    const finalBalance = await this.provider.getBalance(this.masterWallet.address);
    console.log(`- Master wallet final balance: ${ethers.formatEther(finalBalance)} ETH\n`);
    
    return {
      successfulCollections,
      totalWallets: wallets.length,
      totalCollected,
      finalMasterBalance: finalBalance
    };
  }
}

module.exports = WalletManager;
