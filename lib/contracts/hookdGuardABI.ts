export const HOOKD_GUARD_ABI = [
    // Events
    'event KeeperRegistered(address indexed keeper, uint128 stake)',
    'event ChallengeSubmitted(bytes32 indexed poolId, uint256 challengeId, address indexed attacker, address indexed challenger)',
    'event ChallengeVoted(bytes32 indexed poolId, uint256 challengeId, address indexed voter, bool support)',
    'event ChallengeExecuted(bytes32 indexed poolId, uint256 challengeId, bool approved)',
    'event ProtectionTriggered(bytes32 indexed poolId, address indexed swapper, uint24 fee, string reason)',
    
    // View functions
    'function poolStates(bytes32 poolId) view returns (uint128 recentVolume, uint128 baselineVolume, uint64 lastUpdateBlock, uint160 lastPrice)',
    'function poolConfigs(bytes32 poolId) view returns (uint16 velocityMultiplier, uint16 blockWindow, uint16 surgeFeeMultiplier, bool protectionEnabled)',
    'function swapHistories(address user, bytes32 poolId) view returns (uint16 swapsInWindow, uint128 volumeInWindow, uint64 lastSwapBlock)',
    'function keepers(address keeper) view returns (uint128 stake, uint64 reputationScore, bool isActive)',
    'function challenges(bytes32 poolId, uint256 index) view returns (address suspectedAttacker, address challenger, bytes32 evidenceHash, uint64 submitBlock, uint16 votesFor, uint16 votesAgainst, bool executed, uint128 challengerStake)',
    'function getChallengeCount(bytes32 poolId) view returns (uint256)',
    'function isPenalized(bytes32 poolId, address user) view returns (bool)',
    'function activeKeepers(uint256 index) view returns (address)',
    
    // Write functions
    'function registerKeeper() payable',
    'function submitChallenge(bytes32 poolId, address suspectedAttacker, bytes32 evidenceHash) returns (uint256)',
    'function voteOnChallenge(bytes32 poolId, uint256 challengeId, bool support)',
    'function executeChallenge(bytes32 poolId, uint256 challengeId)',
  ] as const;