# HookdGuard Deployment Guide

## Prerequisites

1. **Install Foundry** (required for Uniswap V4):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Install Uniswap V4 dependencies**:
   ```bash
   forge install Uniswap/v4-core
   forge install Uniswap/v4-periphery
   forge install foundry-rs/forge-std
   ```

## Configuration

### 1. Set up environment variables

Edit `.env.local` and add:

```env
# Your deployer wallet private key (KEEP SECRET!)
DEPLOYER_PRIVATE_KEY=0x...

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_key_here

# Uniswap V4 Pool Manager address for your target network
NEXT_PUBLIC_POOL_MANAGER_ADDRESS=0x...
```

⚠️ **IMPORTANT**: Never commit your private key! The `.env.local` file is gitignored.

### 2. Get Uniswap V4 Pool Manager Address

Uniswap V4 is currently in development. You'll need the PoolManager address for your target network:

- **Sepolia Testnet**: Check [Uniswap V4 docs](https://docs.uniswap.org/contracts/v4/overview) for testnet addresses
- **Mainnet**: Wait for official V4 launch

Update the `SEPOLIA_POOL_MANAGER` and `MAINNET_POOL_MANAGER` constants in:
- `script/Deploy.s.sol`
- `script/DeployDeterministic.s.sol`

## Deployment Methods

### Option 1: Simple Deployment (Recommended for Testing)

```bash
# Deploy to Sepolia
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify

# Deploy to Mainnet (when ready)
forge script script/Deploy.s.sol --rpc-url mainnet --broadcast --verify
```

### Option 2: Deterministic Deployment (For Production)

Uniswap V4 hooks require specific address prefixes. This script mines for a valid address:

```bash
# Deploy with correct hook address prefix
forge script script/DeployDeterministic.s.sol --rpc-url sepolia --broadcast --verify
```

This may take a few minutes as it searches for a valid salt.

## Post-Deployment

1. **Copy the deployed address** from the console output

2. **Update `.env.local`**:
   ```env
   NEXT_PUBLIC_HOOK_ADDRESS=0x...
   NEXT_PUBLIC_POOL_MANAGER_ADDRESS=0x...
   ```

3. **Restart your Next.js dev server**:
   ```bash
   npm run dev
   ```

4. **Verify the contract** (if not done automatically):
   ```bash
   forge verify-contract <CONTRACT_ADDRESS> contracts/HookdGuardMVP.sol:HookdGuardMVP \
     --chain sepolia \
     --constructor-args $(cast abi-encode "constructor(address)" <POOL_MANAGER_ADDRESS>)
   ```

## Testing the Deployment

1. Navigate to `http://localhost:3000/keeper`
2. Connect your wallet
3. Try registering as a keeper (requires 0.1 ETH)
4. Monitor the dashboard for MEV detection

## Troubleshooting

### "Invalid pool manager address"
- Make sure you've updated the pool manager addresses in the deployment scripts
- Verify the address is correct for your target network

### "Could not find valid salt"
- Increase the iteration limit in `DeployDeterministic.s.sol` (line 58)
- Or use the simple deployment method for testing

### "Hook flags mismatch"
- The hook requires specific address prefixes
- Use the deterministic deployment script
- Ensure you're using the correct Uniswap V4 hook permissions

### "Insufficient funds"
- Make sure your deployer wallet has enough ETH for:
  - Gas fees (~0.01-0.05 ETH on mainnet)
  - Lower on testnets

## Contract Architecture

**HookdGuardMVP** provides three layers of MEV protection:

1. **Velocity Protection**: Monitors swap volume velocity and applies surge pricing
2. **Progressive Fees**: Increases fees for frequent swappers
3. **Challenge System**: Keeper network can flag and penalize suspected MEV attackers

### Key Functions

- `registerKeeper()`: Become a keeper (requires 0.1 ETH stake)
- `submitChallenge()`: Report suspected MEV activity
- `voteOnChallenge()`: Vote on pending challenges
- `executeChallenge()`: Execute challenge after voting period

## Security Notes

- The hook only works with Uniswap V4 pools that register it
- Keepers are incentivized through reputation scoring
- Challenges require 70% supermajority to execute
- Penalties are temporary (100 blocks by default)

## Next Steps

1. Create test pools with the hook enabled
2. Deploy and run keeper agents (`agents/keeper/`)
3. Monitor MEV activity through the dashboard
4. Adjust protection parameters as needed

For more information, see the [main README](./README.md).
