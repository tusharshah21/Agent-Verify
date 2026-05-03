/**
 * agent/0gStorage.js
 * 0G Decentralized Storage — agent state persistence on 0G KV store.
 *
 * Stores agent registry, settlement history, and keeper queue on 0G testnet.
 * Falls back to local JSON if 0G is not reachable.
 *
 * 0G Track: Best Autonomous Agents & Swarms ($7,500)
 * Docs: https://build.0g.ai
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ZG_CONFIG = {
  kvRpc: process.env.OG_KV_RPC || 'https://kv-testnet.0g.ai',
  rpc: process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai',
  privateKey: process.env.OG_PRIVATE_KEY || process.env.SEPOLIA_PRIVATE_KEY,
};

// Stream IDs — keccak256 of a human-readable namespace string
function streamId(name) {
  return ethers.keccak256(ethers.toUtf8Bytes(`agentverify:${name}`));
}

// Key IDs — keccak256 of the item key
function kvKey(name) {
  return ethers.keccak256(ethers.toUtf8Bytes(name));
}

let kvClient = null;
let batcher = null;
let is0GAvailable = false;

/**
 * Initialize 0G KV client. Silent fallback if SDK missing or unreachable.
 */
export async function init0GStorage() {
  if (!ZG_CONFIG.privateKey || ZG_CONFIG.privateKey.includes('your_')) {
    console.log('ℹ️  [0G] No private key — using local JSON');
    return false;
  }
  try {
    const { KvClient, Batcher } = await import('@0glabs/0g-ts-sdk');

    kvClient = new KvClient(ZG_CONFIG.kvRpc);

    // Batcher is needed for writes — requires a signer
    const provider = new ethers.JsonRpcProvider(ZG_CONFIG.rpc);
    const signer = new ethers.Wallet(ZG_CONFIG.privateKey, provider);
    batcher = await Batcher.createKvBatcher(kvClient, signer, ZG_CONFIG.kvRpc);

    is0GAvailable = true;
    console.log('✅ [0G] KV client ready');
    console.log(`   Stream base: ${ZG_CONFIG.kvRpc}`);
    return true;
  } catch (err) {
    console.warn(`⚠️  [0G] Init failed (${err.message}) — falling back to local JSON`);
    is0GAvailable = false;
    return false;
  }
}

/**
 * Read from 0G KV store. Returns parsed object or null.
 */
async function kvGet(namespace, itemKey) {
  if (!is0GAvailable || !kvClient) return null;
  try {
    const sid = streamId(namespace);
    const kid = kvKey(itemKey);
    const result = await kvClient.getValue(sid, kid);
    if (!result || !result.data || result.size === 0) return null;
    const raw = Buffer.from(result.data.slice(2), 'hex').toString('utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write to 0G KV store via Batcher. Falls back silently.
 */
async function kvSet(namespace, itemKey, data) {
  if (!is0GAvailable || !batcher) return false;
  try {
    const sid = streamId(namespace);
    const kid = kvKey(itemKey);
    const valueHex = '0x' + Buffer.from(JSON.stringify(data)).toString('hex');
    batcher.streamIds = [sid];
    batcher.kvEntries = [{ key: kid, data: valueHex }];
    await batcher.exec();
    return true;
  } catch (err) {
    console.warn(`[0G] Write failed: ${err.message}`);
    return false;
  }
}

// ─── Public helpers (each has local JSON fallback) ───────────────────────────

export async function loadAgentRegistry() {
  const remote = await kvGet('agents', 'registry');
  if (remote) { console.log('📦 [0G] Agent registry loaded from 0G KV'); return remote; }
  const f = path.join(__dirname, 'registry.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { return { agents: [] }; }
}

export async function saveAgentRegistry(registry) {
  fs.writeFileSync(path.join(__dirname, 'registry.json'), JSON.stringify(registry, null, 2));
  if (await kvSet('agents', 'registry', registry))
    console.log('📤 [0G] Agent registry persisted to 0G KV');
}

export async function loadSettlementHistory() {
  const remote = await kvGet('settlements', 'history');
  if (remote) { console.log('📦 [0G] Settlement history loaded from 0G KV'); return remote; }
  const f = path.join(__dirname, 'settlement-history.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf-8')); }
  catch { return { settlements: [], totalVolume: 0, totalSwaps: 0, successRate: 0 }; }
}

export async function saveSettlementHistory(data) {
  fs.writeFileSync(path.join(__dirname, 'settlement-history.json'), JSON.stringify(data, null, 2));
  if (await kvSet('settlements', 'history', data))
    console.log('📤 [0G] Settlement history persisted to 0G KV');
}

export async function loadKeeperQueue() {
  const remote = await kvGet('keeper', 'queue');
  if (remote) return remote;
  const f = path.join(__dirname, 'keeper-queue.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { return []; }
}

export async function saveKeeperQueue(queue) {
  fs.writeFileSync(path.join(__dirname, 'keeper-queue.json'), JSON.stringify(queue, null, 2));
  await kvSet('keeper', 'queue', queue);
}

export function get0GStatus() {
  return {
    available: is0GAvailable,
    kvRpc: ZG_CONFIG.kvRpc,
    network: '0G Testnet',
  };
}

init0GStorage().catch(() => {});
