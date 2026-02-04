# Hook Contract

This folder is reserved for the Uniswap v4 hook contract. Recommended flow:

1. Clone or copy the Uniswap v4 template into this folder.
2. Implement a `GuardianHook` that can raise fees or pause swaps for one block.
3. Restrict guardian actions to the off-chain sentinel address.

Suggested hook behavior (MVP):
- `beforeSwap` checks `guardianMode` (normal / shield / pause).
- `afterSwap` optionally resets the mode after 1 block.
- Guardian can set `mode` + `blockExpiry`.

We can wire this in once you choose the v4 template version.
