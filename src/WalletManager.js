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
}

module.exports = WalletManager;
