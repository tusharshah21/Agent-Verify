/**
 * config/sepolia.js
 * Ethereum Sepolia Testnet Configuration
 * Used for all contract interactions, RPC calls, and token swaps
 */

/**
 * Network Configuration
 */
export const SEPOLIA_CONFIG = {
  chainId: 11155111,
  name: 'Ethereum Sepolia',
  rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC,
  RPC_URL: process.env.NEXT_PUBLIC_SEPOLIA_RPC, // For keeper executor
  explorerUrl: 'https://sepolia.etherscan.io',
  testnet: true,
};

/**
 * Wallet Configuration
 */
export const WALLET_CONFIG = {
  address: process.env.SEPOLIA_PUBLIC_KEY,
  privateKey: process.env.SEPOLIA_PRIVATE_KEY,
  PRIVATE_KEY: process.env.SEPOLIA_PRIVATE_KEY, // For keeper executor (uppercase)
  agentAddress: process.env.AGENT_WALLET_ADDRESS,
  agentPrivateKey: process.env.AGENT_WALLET_PRIVATE_KEY,
};

/**
 * ENS Configuration
 */
export const ENS_CONFIG = {
  registryAddress: process.env.ENS_REGISTRAR_ADDRESS || '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85',
  resolverAddress: process.env.ENS_RESOLVER_ADDRESS || '0xd7a28E5e19B4800b4c7b2F4b0E5D6E1E5C8E5F1E',
  baseName: 'eth',
  registrationDuration: 31536000, // 1 year in seconds
};

/**
 * Token Configuration (Common ERC20 tokens on Sepolia)
 */
export const TOKENS = {
  // Stablecoins
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x6Aed6dC4c6f94F27e84ec3e7AEb9a7CFCa2e0FEe', // Sepolia USDC
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', // Sepolia USDT
    decimals: 6,
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0xFF34B3d4Aee5E41547dF56B684CAB966aF1a87F2', // Sepolia DAI
    decimals: 18,
  },

  // Wrapped Ether
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0xfFf9976782d46CC05630D92EE39253FFFFFFAFEd',
    decimals: 18,
  },

  // Test tokens
  LINK: {
    symbol: 'LINK',
    name: 'Chainlink Token',
    address: '0x779877A7B0D9C8c7c94777144017F2938FA48d0F', // Sepolia LINK
    decimals: 18,
  },
};

/**
 * Uniswap Configuration
 */
export const UNISWAP_CONFIG = {
  routerAddress: process.env.UNISWAP_ROUTER_ADDRESS || '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  quoterAddress: '0xEd1f8fAd404D26D89c75A1d6b118570FD4203b48', // Sepolia Quoter V2
  factoryAddress: '0x0227628f3F023bb0B980b67d528571985F6EfA1',
  swapRouter02Address: '0x68b3465833fb72B5A828cCEEaC9BF242352bECA5',
  defaultSlippage: 0.5, // 0.5% default slippage
  maxSlippage: 2.0, // 2% max slippage
};

/**
 * AXL (Gensyn) Configuration (For CP2)
 */
export const AXL_CONFIG = {
  apiKey: process.env.AXL_API_KEY,
  meshId: process.env.AXL_MESH_ID || 'agentverify-hackathon-2024',
  localPort: 9090,
};

/**
 * KeeperHub Configuration (For CP3)
 */
export const KEEPER_HUB_CONFIG = {
  apiKey: process.env.KEEPER_HUB_API_KEY,
  accountId: process.env.KEEPER_HUB_ACCOUNT_ID,
  gasLimit: 300000,
  gasBuffer: 1.2, // 20% buffer
};

/**
 * Gas Configuration
 */
export const GAS_CONFIG = {
  maxFeePerGas: '50', // gwei (will be fetched from network)
  maxPriorityFeePerGas: '2', // gwei
  gasLimitMultiplier: 1.2, // Add 20% buffer
};

/**
 * Transaction Configuration
 */
export const TX_CONFIG = {
  confirmations: 2,
  timeout: 60000, // 60 seconds
  retryAttempts: 3,
  retryDelay: 5000, // 5 seconds between retries
};

/**
 * Validation Helpers
 */
export function validateConfig() {
  const errors = [];

  // Check RPC URL
  if (!SEPOLIA_CONFIG.rpcUrl) {
    errors.push('❌ NEXT_PUBLIC_SEPOLIA_RPC not set in .env.local');
  }

  // Check wallet
  if (!WALLET_CONFIG.address) {
    errors.push('❌ SEPOLIA_PUBLIC_KEY not set in .env.local');
  }
  if (!WALLET_CONFIG.privateKey) {
    errors.push('❌ SEPOLIA_PRIVATE_KEY not set in .env.local');
  }

  // Check agent wallet
  if (!WALLET_CONFIG.agentAddress) {
    errors.push('❌ AGENT_WALLET_ADDRESS not set in .env.local');
  }

  if (errors.length > 0) {
    console.error('\n⚠️ Configuration Errors:\n' + errors.join('\n'));
    return false;
  }

  console.log('✅ All configuration checks passed!');
  return true;
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol) {
  return TOKENS[symbol] || null;
}

/**
 * Format token amount (with decimals)
 */
export function formatTokenAmount(amount, decimals) {
  const factor = Math.pow(10, decimals);
  return (amount * factor).toString();
}

/**
 * Parse token amount (remove decimals)
 */
export function parseTokenAmount(amount, decimals) {
  const factor = Math.pow(10, decimals);
  return amount / factor;
}

/**
 * Get Sepolia Etherscan link for address
 */
export function getExplorerLink(address, type = 'address') {
  const baseUrl = SEPOLIA_CONFIG.explorerUrl;
  if (type === 'tx') return `${baseUrl}/tx/${address}`;
  if (type === 'token') return `${baseUrl}/token/${address}`;
  return `${baseUrl}/address/${address}`;
}

export default {
  SEPOLIA_CONFIG,
  WALLET_CONFIG,
  ENS_CONFIG,
  TOKENS,
  UNISWAP_CONFIG,
  AXL_CONFIG,
  KEEPER_HUB_CONFIG,
  GAS_CONFIG,
  TX_CONFIG,
  validateConfig,
  getTokenBySymbol,
  formatTokenAmount,
  parseTokenAmount,
  getExplorerLink,
};
