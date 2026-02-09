# 🛡️ Sentinel — Autonomous MEV Defense for Uniswap v4

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue.svg)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-blue.svg)](https://www.typescriptlang.org/)

**Protecting liquidity providers from MEV attacks through decentralized keeper networks and Uniswap v4 hooks**


</div>

---

## 📖 Overview

**Sentinel** (also known as **Hook'd Guard**) is an autonomous MEV defense system for Uniswap v4 that protects liquidity providers from sandwich attacks, JIT liquidity exploits, and other MEV threats. It combines smart contract hooks, decentralized keeper networks, and dynamic fee adjustments to prevent attacks before they extract value.

### The Problem

Liquidity providers on Uniswap lose millions annually to MEV attacks:
- **Sandwich attacks** manipulate prices around LP trades
- **JIT liquidity** extracts fees without taking on risk
- **Velocity spikes** drain pools during volatile periods
- Traditional solutions are reactive or centralized

### The Solution

Sentinel provides **proactive, decentralized protection** through:
- 🔍 **Real-time monitoring** by a decentralized keeper network
- ⚡ **Instant response** via Uniswap v4 `beforeSwap` hooks
- 🎯 **Multi-layer defense** with velocity limits, progressive fees, and challenge-based governance
- 💰 **Economic alignment** through stake-weighted reputation and rewards

---

## ✨ Key Features

### 🛡️ Multi-Layer Protection

1. **Velocity Limits** — Detects abnormal trading volume spikes
2. **Progressive Fees** — Escalates fees for repeated suspicious activity
3. **Challenge System** — Community governance for disputed detections
4. **Address Penalties** — Temporary blocks for confirmed attackers

### 🌐 Decentralized Keeper Network

- Anyone can become a keeper by staking tokens
- Keepers monitor mempool activity and submit protection transactions
- Reputation-weighted voting for challenge resolution
- Economic incentives for accurate detections

### ⚙️ Uniswap v4 Hook Integration

- Implements `beforeSwap` hook for real-time fee adjustments
- Dynamic fee calculation based on velocity and history
- Configurable protection parameters per pool
- Gas-optimized for mainnet deployment

### 📊 Real-Time Dashboard

- Monitor pool protection status and recent activity
- Track velocity metrics and protection events
- View swap history with surge fee indicators
- Explore on-chain evidence of blocked attacks

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Keeper Network                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Keeper 1 │  │ Keeper 2 │  │ Keeper 3 │  │ Keeper N │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │           │
│       └─────────────┴─────────────┴─────────────┘           │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   HookdGuardMVP.sol    │
              │   (Uniswap v4 Hook)    │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │    Uniswap v4 Pools    │
              │   (ETH/USDC, etc.)     │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Next.js Dashboard    │
              │  (Real-time Monitoring) │
              └────────────────────────┘
```

### How It Works

1. **Monitoring** — Keepers watch mempool activity and on-chain signals
2. **Detection** — Suspicious patterns trigger keeper alerts
3. **Protection** — Keepers submit guardian transactions to the hook
4. **Enforcement** — Hook adjusts fees or blocks swaps via `beforeSwap`
5. **Governance** — Community challenges and votes on disputed events

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Foundry (for smart contract development)
- MetaMask or compatible Web3 wallet
- Testnet ETH (Sepolia)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/Sentinel.git
cd Sentinel

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Configure environment variables
# Add your RPC URLs, contract addresses, etc.
```

### Running the Dashboard

```bash
# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### Deploying the Hook Contract

```bash
# Set up Foundry environment
forge install

# Deploy to Sepolia testnet
./deploy.sh

# Initialize pool with hook
forge script script/InitializePoolWithHook.s.sol --broadcast
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

---



## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# RPC Configuration
NEXT_PUBLIC_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY

# Contract Addresses
NEXT_PUBLIC_HOOK_ADDRESS=0x9aAe4ce026d393Ecff575BC1f36E85192C3690c0
NEXT_PUBLIC_POOL_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_POOL_IDS=0x...

# Token Addresses
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_WETH_ADDRESS=0x...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Private Keys (for deployment only)
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

### Pool Configuration

Configure protection parameters in the hook contract:

```solidity
PoolConfig({
    velocityMultiplier: 300,      // 3x baseline = trigger
    blockWindow: 10,              // Track last 10 blocks
    surgeFeeMultiplier: 500,      // 5x fee increase
    protectionEnabled: true       // Master switch
})
```

---

## 🧪 Testing

### Run Attack Simulations

```bash
# Simulate all attack types
./run-all-attacks.sh

# Simulate specific attack
forge script script/SimulateAttack.s.sol --broadcast

# Check pool state
./simulation/check-pool.sh
```

### Run Unit Tests

```bash
# Run Foundry tests
forge test -vvv

# Run with gas reporting
forge test --gas-report

# Run specific test
forge test --match-test testVelocityProtection
```

### Frontend Testing

```bash
# Run Next.js in development
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

---

## 📊 Live Testnet Deployment

### Sepolia Testnet

- **Hook Contract**: [`0x9aAe4ce026d393Ecff575BC1f36E85192C3690c0`](https://sepolia.etherscan.io/address/0x9aAe4ce026d393Ecff575BC1f36E85192C3690c0)
- **Pool Manager**: `0x...` (Uniswap v4 PoolManager)
- **Protected Pools**: ETH/USDC, WBTC/ETH

### Recent Protection Events

View recent transactions showing protection in action:
- [Attack Blocked #1](https://sepolia.etherscan.io/tx/0x14729a322216eb0eb4cbcb4cd81777241724820adcdcaf38095cb6a3c8672027)
- [Attack Blocked #2](https://sepolia.etherscan.io/tx/0x966dd68835bc2e6e460235dfbf679e8d3d656be2bb0701458bcaf07dcd98502d)
- [Surge Fee Applied]([https://sepolia.etherscan.io/tx/0x...](https://sepolia.etherscan.io/tx/0xd6d50434983273ec6ddc9bfc6cd211deb29babd718add4e9bf2326b6eccd53b9)

---

## 🎥 Demo Video

Watch our 3-minute demo: [YouTube Link](#)

**Demo Highlights:**
- Real-time attack detection and blocking
- Keeper network coordination
- Challenge system in action
- Dashboard monitoring

---

## 🛠️ Technology Stack

### Smart Contracts
- **Solidity 0.8.24** — Hook implementation
- **Foundry** — Development and testing
- **Uniswap v4** — Hook integration

### Frontend
- **Next.js 14** — React framework
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **Wagmi** — Ethereum interactions
- **Viem** — Low-level Ethereum library
- **Recharts** — Data visualization

### Infrastructure
- **Sepolia Testnet** — Ethereum testnet
- **Etherscan** — Block explorer
- **Vercel** — Frontend deployment
- **WalletConnect** — Wallet integration

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Uniswap Labs** — For Uniswap v4 and hooks framework
- **Foundry** — For excellent Solidity development tools
- **Next.js** — For the powerful React framework
- **The Ethereum Community** — For continuous innovation



<div align="center">

**Built with ❤️ for the Ethereum community**

[⬆ Back to Top](#️-sentinel--autonomous-mev-defense-for-uniswap-v4)

</div>
