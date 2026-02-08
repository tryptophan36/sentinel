export const hookdGuardAbi = [
  {
    type: 'function',
    name: 'getKeeper',
    stateMutability: 'view',
    inputs: [{ name: 'keeper', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'stake', type: 'uint128' },
          { name: 'reputationScore', type: 'uint64' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'registerKeeper',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getChallenge',
    stateMutability: 'view',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
      { name: 'challengeId', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'suspectedAttacker', type: 'address' },
          { name: 'challenger', type: 'address' },
          { name: 'evidenceHash', type: 'bytes32' },
          { name: 'submitBlock', type: 'uint64' },
          { name: 'votesFor', type: 'uint16' },
          { name: 'votesAgainst', type: 'uint16' },
          { name: 'executed', type: 'bool' },
          { name: 'challengerStake', type: 'uint128' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getChallengeCount',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'submitChallenge',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
      { name: 'suspectedAttacker', type: 'address' },
      { name: 'evidenceHash', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'voteOnChallenge',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
      { name: 'challengeId', type: 'uint256' },
      { name: 'support', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'executeChallenge',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId', type: 'bytes32' },
      { name: 'challengeId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'poolConfigs',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'velocityMultiplier', type: 'uint16' },
          { name: 'blockWindow', type: 'uint16' },
          { name: 'surgeFeeMultiplier', type: 'uint16' },
          { name: 'protectionEnabled', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getPoolState',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'recentVolume', type: 'uint128' },
          { name: 'baselineVolume', type: 'uint128' },
          { name: 'lastUpdateBlock', type: 'uint64' },
          { name: 'lastPrice', type: 'uint160' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'keepers',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'stake', type: 'uint128' },
      { name: 'reputationScore', type: 'uint64' },
      { name: 'isActive', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'activeKeepers',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'event',
    name: 'ProtectionTriggered',
    inputs: [
      { name: 'poolId', type: 'bytes32', indexed: true },
      { name: 'swapper', type: 'address', indexed: true },
      { name: 'fee', type: 'uint24', indexed: false },
      { name: 'reason', type: 'string', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ChallengeSubmitted',
    inputs: [
      { name: 'poolId', type: 'bytes32', indexed: true },
      { name: 'challengeId', type: 'uint256', indexed: false },
      { name: 'attacker', type: 'address', indexed: true },
      { name: 'challenger', type: 'address', indexed: true },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ChallengeVoted',
    inputs: [
      { name: 'poolId', type: 'bytes32', indexed: true },
      { name: 'challengeId', type: 'uint256', indexed: false },
      { name: 'voter', type: 'address', indexed: true },
      { name: 'support', type: 'bool', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ChallengeExecuted',
    inputs: [
      { name: 'poolId', type: 'bytes32', indexed: true },
      { name: 'challengeId', type: 'uint256', indexed: false },
      { name: 'approved', type: 'bool', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'KeeperRegistered',
    inputs: [
      { name: 'keeper', type: 'address', indexed: true },
      { name: 'stake', type: 'uint128', indexed: false },
    ],
    anonymous: false,
  },
] as const;
