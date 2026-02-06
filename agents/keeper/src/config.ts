import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Network configuration
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  wsUrl: process.env.WS_URL || 'ws://localhost:8545',
  chainId: parseInt(process.env.CHAIN_ID || '11155111'), // Sepolia
  
  // Contract addresses
  hookAddress: process.env.HOOK_ADDRESS || '',
  poolManagerAddress: process.env.POOL_MANAGER_ADDRESS || '',
  
  // Keeper configuration
  privateKey: process.env.PRIVATE_KEY || '',
  minStake: process.env.MIN_STAKE || '0.1', // ETH
  
  // Detection thresholds
  highGasThreshold: process.env.HIGH_GAS_THRESHOLD || '100', // gwei
  largeSwapThreshold: process.env.LARGE_SWAP_THRESHOLD || '5', // % of pool
  frequencyThreshold: process.env.FREQUENCY_THRESHOLD || '3', // swaps per window
  
  // Monitoring
  monitoredPools: (process.env.MONITORED_POOLS || '').split(',').filter(Boolean),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};

export default config;