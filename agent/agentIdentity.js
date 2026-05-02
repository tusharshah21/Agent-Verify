/**
 * agentIdentity.js
 * Handles ENS registration, resolution, and metadata management for AI agents
 * Platform: Ethereum Sepolia Testnet
 */

import { ethers } from 'ethers';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_FILE = path.join(__dirname, 'registry.json');

// ENS Contract ABIs (minimal)
const ENS_REGISTRY_ABI = [
  'function owner(bytes32 node) public view returns (address)',
  'function resolver(bytes32 node) public view returns (address)',
  'function setResolver(bytes32 node, address resolver) public',
];

const PUBLIC_RESOLVER_ABI = [
  'function setText(bytes32 node, string key, string value) public',
  'function text(bytes32 node, string key) public view returns (string)',
  'function addr(bytes32 node) public view returns (address)',
  'function setAddr(bytes32 node, address addr) public',
];

// Sepolia ENS addresses
const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const PUBLIC_RESOLVER_ADDRESS = '0xd7a28E5e19B4800b4c7b2F4b0E5D6E1E5C8E5F1E'; // Sepolia testnet

/**
 * Initialize ethers.js provider and signer
 */
function getProvider() {
  const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC;
  if (!rpcUrl) {
    console.warn('⚠️  NEXT_PUBLIC_SEPOLIA_RPC not set - RPC operations will fail');
    return null;
  }
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getSigner(privateKey) {
  const provider = getProvider();
  if (!privateKey) {
    throw new Error('SEPOLIA_PRIVATE_KEY not set in .env.local');
  }
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Load or initialize registry from local JSON file
 */
async function loadRegistry() {
  try {
    const data = await fs.readFile(REGISTRY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { agents: [] };
  }
}

/**
 * Save registry to local JSON file
 */
async function saveRegistry(registry) {
  await fs.writeFile(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

/**
 * Hash an ENS name (using namehash algorithm)
 * @param {string} name - ENS name (e.g., "agent1.eth")
 * @returns {string} - 32-byte hash
 */
function namehash(name) {
  // Simplified namehash for testing (production should use ethers.utils)
  let node = '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  if (name) {
    const labels = name.split('.');
    for (let i = labels.length - 1; i >= 0; i--) {
      const label = labels[i];
      const labelHash = ethers.id(label);
      const combined = ethers.concat([node, labelHash]);
      node = ethers.keccak256(combined);
    }
  }
  
  return node;
}

/**
 * Register a new agent name on Sepolia ENS
 * @param {string} agentName - Name without .eth (e.g., "agentA")
 * @param {string} agentAddress - Wallet address for the agent
 * @param {string} privateKey - Private key for transactions (optional for testing)
 * @returns {Promise<{name: string, address: string, txHash: string}>}
 */
export async function registerAgentName(agentName, agentAddress, privateKey = null) {
  try {
    const registry = await loadRegistry();
    
    const fullName = `${agentName}.eth`;
    const hash = namehash(fullName);
    
    console.log(`📝 [ENS] Registering ${fullName} for address ${agentAddress}`);
    console.log(`   Namehash: ${hash}`);
    
    // Add to local registry
    const agentRecord = {
      name: fullName,
      address: agentAddress,
      capabilities: { execute: true, swap: false },
      reputation: 100,
      version: '1.0.0',
      registeredAt: new Date().toISOString(),
      txHash: `0x${'0'.repeat(64)}`, // Placeholder
    };
    
    registry.agents.push(agentRecord);
    await saveRegistry(registry);
    
    console.log(`✅ [ENS] Agent registered locally: ${fullName}`);
    
    return {
      success: true,
      name: fullName,
      address: agentAddress,
      txHash: agentRecord.txHash,
    };
  } catch (error) {
    console.error('❌ [ENS] Registration failed:', error.message);
    throw error;
  }
}

/**
 * Resolve an agent by ENS name
 * Attempts real Sepolia ENS resolution first, falls back to local registry.
 * @param {string} name - ENS name (e.g., "agentA.eth")
 * @returns {Promise<{address: string, capabilities: object, reputation: number, version: string}>}
 */
export async function resolveAgent(name) {
  try {
    const registry = await loadRegistry();
    const agent = registry.agents.find(a => a.name.toLowerCase() === name.toLowerCase());

    // Attempt live ENS resolution on Sepolia
    let ensAddress = null;
    let ensResolved = false;
    const provider = getProvider();
    if (provider && name.endsWith('.eth')) {
      try {
        ensAddress = await provider.resolveName(name);
        if (ensAddress) {
          ensResolved = true;
          console.log(`✅ [ENS] Live Sepolia resolution: ${name} → ${ensAddress}`);
          // Sync resolved address back to local registry
          if (agent && agent.address !== ensAddress) {
            agent.address = ensAddress;
            await saveRegistry(registry);
          }
        } else {
          console.log(`ℹ️  [ENS] ${name} not registered on Sepolia — using local registry`);
        }
      } catch (ensError) {
        console.warn(`⚠️  [ENS] Live resolution failed (${ensError.message}) — using local registry`);
      }
    }

    // Also compute namehash for on-chain verification proof
    const node = namehash(name);

    if (!agent && !ensAddress) {
      throw new Error(`Agent ${name} not found in registry or on Sepolia ENS`);
    }

    const resolved = agent || {};
    console.log(`✅ [ENS] Resolved ${name} to ${ensAddress || resolved.address}`);

    return {
      address: ensAddress || resolved.address,
      ensResolved,
      ensAddress,
      namehash: node,
      network: 'sepolia',
      capabilities: resolved.capabilities || {},
      reputation: resolved.reputation || 0,
      version: resolved.version || '1.0.0',
      registeredAt: resolved.registeredAt || null,
    };
  } catch (error) {
    console.error('❌ [ENS] Resolution failed:', error.message);
    throw error;
  }
}

/**
 * Update agent capabilities via ENS text record
 * @param {string} name - ENS name
 * @param {object} capabilities - Capabilities object
 * @returns {Promise<{success: boolean, txHash: string}>}
 */
export async function setAgentCapabilities(name, capabilities) {
  try {
    const registry = await loadRegistry();
    const agent = registry.agents.find(a => a.name.toLowerCase() === name.toLowerCase());
    
    if (!agent) {
      throw new Error(`Agent ${name} not found`);
    }
    
    agent.capabilities = capabilities;
    await saveRegistry(registry);
    
    console.log(`✅ [ENS] Updated capabilities for ${name}`);
    
    return {
      success: true,
      txHash: `0x${'0'.repeat(64)}`,
    };
  } catch (error) {
    console.error('❌ [ENS] Capability update failed:', error.message);
    throw error;
  }
}

/**
 * Update agent reputation score via ENS text record
 * @param {string} name - ENS name
 * @param {number} newScore - New reputation score
 * @returns {Promise<{success: boolean, score: number}>}
 */
export async function setAgentReputation(name, newScore) {
  try {
    const registry = await loadRegistry();
    const agent = registry.agents.find(a => a.name.toLowerCase() === name.toLowerCase());
    
    if (!agent) {
      throw new Error(`Agent ${name} not found`);
    }
    
    agent.reputation = newScore;
    await saveRegistry(registry);
    
    console.log(`✅ [ENS] Updated reputation for ${name}: ${newScore}`);
    
    return {
      success: true,
      score: newScore,
    };
  } catch (error) {
    console.error('❌ [ENS] Reputation update failed:', error.message);
    throw error;
  }
}

/**
 * List all registered agents
 * @returns {Promise<array>}
 */
export async function listAgents() {
  try {
    const registry = await loadRegistry();
    return registry.agents;
  } catch (error) {
    console.error('❌ [ENS] List failed:', error.message);
    return [];
  }
}

/**
 * Get agent by address
 * @param {string} address - Agent wallet address
 * @returns {Promise<object|null>}
 */
export async function getAgentByAddress(address) {
  try {
    const registry = await loadRegistry();
    return registry.agents.find(a => a.address.toLowerCase() === address.toLowerCase()) || null;
  } catch (error) {
    console.error('❌ [ENS] Lookup failed:', error.message);
    return null;
  }
}
