import { ethers } from 'ethers';
import { MEVAnalysis } from './mev-detector';
import logger from './logger';

export class ChallengeSubmitter {
  private wallet: ethers.Wallet;
  private hookContract: ethers.Contract;
  private pendingChallenges: Map<string, string> = new Map(); // poolId+address -> txHash
  
  constructor(
    provider: ethers.Provider,
    privateKey: string,
    hookAddress: string
  ) {
    this.wallet = new ethers.Wallet(privateKey, provider);
    
    const hookAbi = [
      'function submitChallenge(bytes32 poolId, address suspectedAttacker, bytes32 evidenceHash) returns (uint256)',
      'function registerKeeper() payable',
      'function keepers(address) view returns (tuple(uint128 stake, uint64 reputationScore, bool isActive))'
    ];
    
    this.hookContract = new ethers.Contract(hookAddress, hookAbi, this.wallet);
  }
  
  async ensureRegistered(stakeAmount: string) {
    try {
      const keeper = await this.hookContract.keepers(this.wallet.address);
      
      if (!keeper.isActive) {
        logger.info('Registering as keeper...');
        const tx = await this.hookContract.registerKeeper({
          value: ethers.parseEther(stakeAmount)
        });
        await tx.wait();
        logger.info(`Registered as keeper with ${stakeAmount} ETH stake`);
      } else {
        logger.info('Already registered as keeper');
      }
    } catch (error) {
      logger.error('Failed to register as keeper:', error);
      throw error;
    }
  }
  
  async submitChallenge(
    poolId: string,
    attacker: string,
    analysis: MEVAnalysis
  ): Promise<string | null> {
    // Check if already submitted for this combo
    const key = `${poolId}-${attacker}`;
    if (this.pendingChallenges.has(key)) {
      logger.info('Challenge already pending for this attacker');
      return null;
    }
    
    try {
      // Create evidence object
      const evidence = {
        timestamp: Date.now(),
        confidence: analysis.confidence,
        signals: analysis.signals,
        reason: analysis.reason,
        swapAmount: analysis.swapAmount?.toString() || '0',
        detector: this.wallet.address
      };
      
      // In production, would upload to IPFS
      // For MVP, just hash the evidence
      const evidenceHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(evidence))
      );
      
      logger.info('Submitting challenge:', {
        poolId,
        attacker,
        confidence: analysis.confidence,
        evidenceHash
      });
      
      // Submit challenge
      const tx = await this.hookContract.submitChallenge(
        poolId,
        attacker,
        evidenceHash,
        {
          gasLimit: 500000
        }
      );
      
      logger.info(`Challenge submitted: ${tx.hash}`);
      
      // Track pending
      this.pendingChallenges.set(key, tx.hash);
      
      // Clean up after confirmation
      tx.wait().then(() => {
        logger.info(`Challenge confirmed: ${tx.hash}`);
        // Remove from pending after 100 blocks
        setTimeout(() => {
          this.pendingChallenges.delete(key);
        }, 100 * 12 * 1000); // ~100 blocks
      });
      
      return tx.hash;
      
    } catch (error) {
      logger.error('Failed to submit challenge:', error);
      return null;
    }
  }
  
  getPendingChallenges(): string[] {
    return Array.from(this.pendingChallenges.values());
  }
}