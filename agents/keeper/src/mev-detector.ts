import { ethers } from 'ethers';
import { PendingTransaction } from './mempool-monitor';
import config from './config';
import logger from './logger';

export interface MEVSignals {
  highGasPrice: boolean;
  largeSwapSize: boolean;
  frequentTrader: boolean;
  suspiciousTiming: boolean;
  knownBot: boolean;
}

export interface MEVAnalysis {
  isSuspicious: boolean;
  confidence: number;
  signals: MEVSignals;
  poolId: string | null;
  swapAmount: bigint | null;
  reason: string;
}

export class MEVDetector {
  private provider: ethers.JsonRpcProvider;
  private hookContract: ethers.Contract;
  private poolManagerContract: ethers.Contract;
  private addressHistory: Map<string, number[]> = new Map(); // address -> [block numbers]
  private knownBots: Set<string> = new Set();
  
  // Function selectors
  private readonly SWAP_SELECTOR = '0x128acb08'; // swap(PoolKey,SwapParams,bytes)
  
  constructor(
    provider: ethers.JsonRpcProvider,
    hookAddress: string,
    poolManagerAddress: string
  ) {
    this.provider = provider;
    
    // Simplified ABI - just what we need
    const hookAbi = [
      'function getPoolState(bytes32 poolId) view returns (tuple(uint128 recentVolume, uint128 baselineVolume, uint64 lastUpdateBlock, uint160 lastPrice))',
      'function getSwapHistory(address user, bytes32 poolId) view returns (tuple(uint16 swapsInWindow, uint128 volumeInWindow, uint64 lastSwapBlock))'
    ];
    
    this.hookContract = new ethers.Contract(hookAddress, hookAbi, provider);
    
    // Pool manager ABI (minimal)
    const poolManagerAbi = [
      'function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) returns (int256)'
    ];
    
    this.poolManagerContract = new ethers.Contract(poolManagerAddress, poolManagerAbi, provider);
  }
  
  async analyze(tx: PendingTransaction): Promise<MEVAnalysis> {
    const signals: MEVSignals = {
      highGasPrice: false,
      largeSwapSize: false,
      frequentTrader: false,
      suspiciousTiming: false,
      knownBot: false
    };
    
    // Check if transaction targets pool manager
    if (tx.to?.toLowerCase() !== this.poolManagerContract.target.toString().toLowerCase()) {
      return {
        isSuspicious: false,
        confidence: 0,
        signals,
        poolId: null,
        swapAmount: null,
        reason: 'Not a swap transaction'
      };
    }
    
    // Check if it's a swap
    if (!tx.data.startsWith(this.SWAP_SELECTOR)) {
      return {
        isSuspicious: false,
        confidence: 0,
        signals,
        poolId: null,
        swapAmount: null,
        reason: 'Not a swap function'
      };
    }
    
    // Decode swap parameters
    let poolId: string | null = null;
    let swapAmount: bigint | null = null;
    
    try {
      // Parse calldata (simplified - in production use proper ABI decoding)
      const iface = this.poolManagerContract.interface;
      const decoded = iface.parseTransaction({ data: tx.data });
      
      if (decoded) {
        // Extract pool ID from key
        const key = decoded.args[0];
        poolId = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'address', 'uint24', 'int24', 'address'],
            [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]
          )
        );
        
        // Extract swap amount
        swapAmount = decoded.args[1].amountSpecified;
      }
    } catch (error) {
      logger.warn('Failed to decode swap:', error);
    }
    
    // Signal 1: High gas price
    const gasPriceGwei = tx.maxFeePerGas 
      ? Number(tx.maxFeePerGas) / 1e9
      : tx.gasPrice 
        ? Number(tx.gasPrice) / 1e9
        : 0;
    
    signals.highGasPrice = gasPriceGwei > parseFloat(config.highGasThreshold);
    
    // Signal 2: Large swap size (if we have pool data)
    if (poolId && swapAmount) {
      try {
        const poolState = await this.hookContract.getPoolState(poolId);
        const swapPercent = Number(swapAmount) / Number(poolState.baselineVolume) * 100;
        signals.largeSwapSize = swapPercent > parseFloat(config.largeSwapThreshold);
      } catch (error) {
        // Pool might not be protected, skip
      }
    }
    
    // Signal 3: Frequent trader
    const currentBlock = await this.provider.getBlockNumber();
    const history = this.addressHistory.get(tx.from) || [];
    const recentSwaps = history.filter(block => currentBlock - block < 50).length;
    signals.frequentTrader = recentSwaps >= parseInt(config.frequencyThreshold);
    
    // Update history
    history.push(currentBlock);
    this.addressHistory.set(tx.from, history.slice(-100)); // Keep last 100
    
    // Signal 4: Known bot
    signals.knownBot = this.knownBots.has(tx.from.toLowerCase());
    
    // Signal 5: Suspicious timing (check for sandwich pattern)
    signals.suspiciousTiming = await this.checkSandwichPattern(tx.from, currentBlock);
    
    // Calculate confidence
    const signalCount = Object.values(signals).filter(Boolean).length;
    const confidence = signalCount / 5; // 5 total signals
    
    const isSuspicious = confidence >= 0.4; // 40% threshold
    
    let reason = 'Normal transaction';
    if (isSuspicious) {
      const activeSignals = Object.entries(signals)
        .filter(([, value]) => value)
        .map(([key]) => key);
      reason = `Suspicious signals: ${activeSignals.join(', ')}`;
    }
    
    return {
      isSuspicious,
      confidence,
      signals,
      poolId,
      swapAmount,
      reason
    };
  }
  
  private async checkSandwichPattern(address: string, currentBlock: number): Promise<boolean> {
    // Check if this address has multiple pending transactions
    // In production, would check mempool for frontrun + backrun pattern
    const history = this.addressHistory.get(address) || [];
    const veryRecentSwaps = history.filter(block => currentBlock - block < 2).length;
    return veryRecentSwaps >= 2; // 2+ swaps in 2 blocks = suspicious
  }
  
  addKnownBot(address: string) {
    this.knownBots.add(address.toLowerCase());
  }
  
  removeKnownBot(address: string) {
    this.knownBots.delete(address.toLowerCase());
  }
}