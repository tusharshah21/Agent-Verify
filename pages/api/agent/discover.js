/**
 * pages/api/agent/discover.js
 * Agent Discovery Endpoint
 * GET: Find agents in the AXL mesh
 * CP2: AXL P2P Discovery
 */

import { getAXLMessenger } from '../../../agent/axlMessenger.js';
import { listAgents } from '../../../agent/agentIdentity.js';
import { get0GStatus } from '../../../agent/0gStorage.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    const { capability, status, limit = 20 } = req.query;

    const messenger = await getAXLMessenger();

    // Always seed mesh from ENS registry so online agents are visible
    const registryAgents = await listAgents();
    for (const agent of registryAgents) {
      const existing = messenger.onlineAgents.get(agent.address);
      if (!existing) {
        messenger.onlineAgents.set(agent.address, {
          name: agent.name,
          address: agent.address,
          lastSeen: new Date(agent.registeredAt).getTime(),
          capabilities: agent.capabilities || { execute: true, swap: true },
          reputation: agent.reputation || 100,
          status: 'online',
        });
      }
    }

    const filter = {};
    if (capability) filter.capability = capability;
    if (status) filter.status = status;

    const agents = await messenger.discoverAgents(filter);
    const results = agents.slice(0, parseInt(limit));

    return res.status(200).json({
      success: true,
      count: results.length,
      agents: results.map(agent => ({
        name: agent.name,
        address: agent.address,
        capabilities: agent.capabilities,
        reputation: agent.reputation || 0,
        status: agent.status,
        lastSeen: agent.lastSeen,
      })),
      meshStatus: await messenger.getMeshStatus(),
      storageStatus: get0GStatus(),
    });
  } catch (error) {
    console.error('Discovery error:', error);
    return res.status(500).json({
      error: 'Agent discovery failed',
      message: error.message,
    });
  }
}
