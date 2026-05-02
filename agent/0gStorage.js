/**
 * agent/0gStorage.js
 * 0G Decentralized Storage integration for agent state persistence.
 *
 * Stores agent registry, message history, and settlement records on 0G's
 * decentralized storage network instead of local JSON files.
 * Falls back to local JSON if 0G is not configured.
 *
 * 0G Track: Best Autonomous Agents, Swarms & iNFT Innovations ($7,500)
 * 0G Docs: https://build.0g.ai
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 0G network config — testnet endpoints
const ZG_CONFIG = {
  rpc: process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai',
  indexerRpc: process.env.OG_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai',
  kvRpc: process.env.OG_KV_RPC || 'https://kv-testnet.0g.ai',
  privateKey: process.env.OG_PRIVATE_KEY || process.env.SEPOLIA_PRIVATE_KEY,
};

// Namespace keys for different data types
const NAMESPACES = {
  AGENTS: '0x6167656e745f726567697374727900000000000000000000000000000000000', // "agent_registry"
  MESSAGES: '0x61786c5f6d657373616765730000000000000000000000000000000000000000', // "axl_messages"
  SETTLEMENTS: '0x7365742368697374006f72790000000000000000000000000000000000000000', // "set#history"
  KEEPER_QUEUE: '0x6b65657065725f717565756500000000000000000000000000000000000000', // "keeper_queue"
};

let kvClient = null;
let is0GAvailable = false;

/**
 * Initialize 0G KV client. Returns true if 0G is reachable.
 */
export async function init0GStorage() {
  if (!ZG_CONFIG.privateKey || ZG_CONFIG.privateKey.includes('your_')) {
    console.log('ℹ️  [0G] No private key configured — using local JSON fallback');
    return false;
  }

  try {
    // Dynamic import — @0glabs/0g-ts-sdk must be installed
    const { KvClient } = await import('@0glabs/0g-ts-sdk');
    kvClient = new KvClient(ZG_CONFIG.kvRpc);
    is0GAvailable = true;
    console.log('✅ [0G] Storage client initialized');
    console.log(`   KV RPC: ${ZG_CONFIG.kvRpc}`);
    return true;
  } catch (err) {
    console.warn(`⚠️  [0G] SDK not available (${err.message}) — run: npm install @0glabs/0g-ts-sdk`);
    console.log('ℹ️  [0G] Falling back to local JSON storage');
    is0GAvailable = false;
    return false;
  }
}

/**
 * Read a value from 0G KV store.
 * Key format: namespace + "/" + itemKey (hex-encoded)
 */
async function kvGet(namespace, itemKey) {
  if (!is0GAvailable || !kvClient) return null;
  try {
    const hexKey = Buffer.from(itemKey).toString('hex').padStart(64, '0');
    const value = await kvClient.getValue(namespace, `0x${hexKey}`, 0, 0);
    if (!value) return null;
    return JSON.parse(Buffer.from(value.slice(2), 'hex').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Write a value to 0G KV store.
 */
async function kvSet(namespace, itemKey, data) {
  if (!is0GAvailable || !kvClient) return false;
  try {
    const hexKey = Buffer.from(itemKey).toString('hex').padStart(64, '0');
    const valueHex = '0x' + Buffer.from(JSON.stringify(data)).toString('hex');
    await kvClient.setValue(namespace, `0x${hexKey}`, valueHex);
    return true;
  } catch (err) {
    console.warn(`[0G] KV write failed: ${err.message}`);
    return false;
  }
}

/**
 * Load agent registry from 0G (or local JSON fallback).
 */
export async function loadAgentRegistry() {
  const remote = await kvGet(NAMESPACES.AGENTS, 'registry');
  if (remote) {
    console.log('📦 [0G] Loaded agent registry from 0G Storage');
    return remote;
  }
  // Local fallback
  const localPath = path.join(__dirname, 'registry.json');
  try {
    return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
  } catch {
    return { agents: [] };
  }
}

/**
 * Save agent registry to 0G (and local JSON as backup).
 */
export async function saveAgentRegistry(registry) {
  // Always write local backup
  const localPath = path.join(__dirname, 'registry.json');
  fs.writeFileSync(localPath, JSON.stringify(registry, null, 2));

  const saved = await kvSet(NAMESPACES.AGENTS, 'registry', registry);
  if (saved) {
    console.log('📤 [0G] Agent registry persisted to 0G Storage');
  }
}

/**
 * Load settlement history from 0G (or local JSON fallback).
 */
export async function loadSettlementHistory() {
  const remote = await kvGet(NAMESPACES.SETTLEMENTS, 'history');
  if (remote) {
    console.log('📦 [0G] Loaded settlement history from 0G Storage');
    return remote;
  }
  const localPath = path.join(__dirname, 'settlement-history.json');
  try {
    return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
  } catch {
    return { settlements: [], totalVolume: 0, totalSwaps: 0, successRate: 0 };
  }
}

/**
 * Save settlement history to 0G.
 */
export async function saveSettlementHistory(data) {
  const localPath = path.join(__dirname, 'settlement-history.json');
  fs.writeFileSync(localPath, JSON.stringify(data, null, 2));

  const saved = await kvSet(NAMESPACES.SETTLEMENTS, 'history', data);
  if (saved) {
    console.log('📤 [0G] Settlement history persisted to 0G Storage');
  }
}

/**
 * Load keeper queue from 0G (or local JSON fallback).
 */
export async function loadKeeperQueue() {
  const remote = await kvGet(NAMESPACES.KEEPER_QUEUE, 'queue');
  if (remote) return remote;
  const localPath = path.join(__dirname, 'keeper-queue.json');
  try {
    return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Save keeper queue to 0G.
 */
export async function saveKeeperQueue(queue) {
  const localPath = path.join(__dirname, 'keeper-queue.json');
  fs.writeFileSync(localPath, JSON.stringify(queue, null, 2));
  await kvSet(NAMESPACES.KEEPER_QUEUE, 'queue', queue);
}

/**
 * Get 0G storage status for dashboard display.
 */
export function get0GStatus() {
  return {
    available: is0GAvailable,
    kvRpc: ZG_CONFIG.kvRpc,
    network: 'testnet',
    namespaces: Object.keys(NAMESPACES),
  };
}

// Initialize on module load
init0GStorage().catch(() => {});
