import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import logger from './logger';

export interface PendingTransaction {
  hash: string;
  from: string;
  to: string | null;
  data: string;
  value: bigint;
  gasPrice: bigint | null;
  maxFeePerGas: bigint | null;
  maxPriorityFeePerGas: bigint | null;
  nonce: number;
  timestamp: number;
}

export class MempoolMonitor extends EventEmitter {
  private provider: ethers.WebSocketProvider;
  private txCache: Map<string, PendingTransaction> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute
  
  constructor(wsUrl: string) {
    super();
    this.provider = new ethers.WebSocketProvider(wsUrl);
    this.setupCleanup();
  }
  
  async start() {
    logger.info('Starting mempool monitor...');
    
    // Listen for pending transactions
    this.provider.on('pending', async (txHash: string) => {
      try {
        await this.handlePendingTx(txHash);
      } catch (error) {
        logger.error('Error handling pending tx:', error);
      }
    });
    
    logger.info('Mempool monitor started');
  }
  
  private async handlePendingTx(txHash: string) {
    // Skip if already processed
    if (this.txCache.has(txHash)) {
      return;
    }
    
    // Fetch transaction details
    const tx = await this.provider.getTransaction(txHash);
    if (!tx) {
      return;
    }
    
    const pendingTx: PendingTransaction = {
      hash: txHash,
      from: tx.from,
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gasPrice: tx.gasPrice,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      nonce: tx.nonce,
      timestamp: Date.now()
    };
    
    // Cache transaction
    this.txCache.set(txHash, pendingTx);
    
    // Emit for analysis
    this.emit('transaction', pendingTx);
  }
  
  private setupCleanup() {
    // Clean old transactions every minute
    setInterval(() => {
      const now = Date.now();
      for (const [hash, tx] of this.txCache.entries()) {
        if (now - tx.timestamp > this.CACHE_TTL) {
          this.txCache.delete(hash);
        }
      }
    }, 60000);
  }
  
  async stop() {
    await this.provider.destroy();
    logger.info('Mempool monitor stopped');
  }
}