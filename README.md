# Sentinel — Uniswap v4 Agentic Liquidity Sentinel

Sentinel is a lightweight agentic sentinel that monitors mempool activity and pool imbalance signals to protect LPs from targeted MEV (sandwiches, imbalance drains). When suspicious swaps are detected, it triggers a Uniswap v4 hook that raises fees or pauses swaps for a single block.

## Repo layout
- `app/` — Next.js App Router UI (simple dashboard)
- `agent/` — TypeScript sentinel skeleton (mempool watcher + guardian tx)
- `contracts/` — placeholder for the Uniswap v4 hook contract

## Quickstart (UI)
```bash
npm install
npm run dev
```

## Agent (skeleton)
See `agent/README.md` for environment variables and TODOs.

## Hook contract
See `contracts/README.md` for the recommended v4 template workflow.

## Demo checklist
1. Deploy hook contract on testnet.
2. Initialize a v4 pool using the hook.
3. Run agent with guardian key.
4. Simulate attack; capture protection TxIDs.
5. Record demo video (before/after).

## Hackathon submission
- GitHub repo
- Testnet TxIDs
- Demo video (≤ 3 minutes)
- README + setup instructions
