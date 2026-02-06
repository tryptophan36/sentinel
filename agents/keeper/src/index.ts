import { ethers } from 'ethers';
import config from './config';
import logger from './logger';
import { MempoolMonitor } from './mempool-monitor';
import { MEVDetector } from './mev-detector';
import { ChallengeSubmitter } from './challenge-submitter';

class KeeperAgent {
  private monitor: MempoolMonitor;
  private detector: MEVDetector;
  private submitter: ChallengeSubmitter;
  private provider: ethers.JsonRpcProvider;
  
  constructor() {
    // Initialize providers
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    // Initialize components
    this.monitor = new MempoolMonitor(config.wsUrl);
    this.detector = new MEVDetector(
      this.provider,
      config.hookAddress,
      config.poolManagerAddress
    );
    this.submitter = new ChallengeSubmitter(
      this.provider,
      config.privateKey,
      config.hookAddress
    );
    
    // Set up event handlers
    this.monitor.on('transaction', this.handleTransaction.bind(this));
  }
  
  async start() {
    logger.info('Starting Hook\'d Guard Keeper Agent...');
    logger.info('Configuration:', {
      chainId: config.chainId,
      hookAddress: config.hookAddress,
      monitoredPools: config.monitoredPools.length
    });
    
    // Ensure registered as keeper
    await this.submitter.ensureRegistered(config.minStake);
    
    // Start monitoring
    await this.monitor.start();
    
    logger.info('Keeper agent running. Press Ctrl+C to stop.');
  }
  
  private async handleTransaction(tx: any) {
    try {
      // Analyze transaction for MEV
      const analysis = await this.detector.analyze(tx);
      
      if (analysis.isSuspicious && analysis.poolId) {
        logger.warn('Suspicious transaction detected:', {
          hash: tx.hash,
          from: tx.from,
          confidence: analysis.confidence,
          reason: analysis.reason
        });
        
        // Submit challenge if confidence high enough
        if (analysis.confidence >= 0.6) {
          await this.submitter.submitChallenge(
            analysis.poolId,
            tx.from,
            analysis
          );
        }
      }
      
    } catch (error) {
      logger.error('Error handling transaction:', error);
    }
  }
  
  async stop() {
    logger.info('Stopping keeper agent...');
    await this.monitor.stop();
    logger.info('Keeper agent stopped');
  }
}

// Main entry point
async function main() {
  const keeper = new KeeperAgent();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await keeper.stop();
    process.exit(0);
  });
  
  await keeper.start();
}

main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});