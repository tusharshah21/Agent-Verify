/**
 * pages/api/agent/discover.js
 * Agent Discovery Endpoint
 * GET: Find agents in the AXL mesh
 * CP2: AXL P2P Discovery
 */

import { getAXLMessenger } from '../../../agent/axlMessenger.js';
import { WALLET_CONFIG } from '../../../config/sepolia.js';

export default async function handler(req, res) {
  try {
    // Only GET requests for discovery
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    const { capability, status, limit = 10 } = req.query;

    // Get AXL messenger instance
    const messenger = await getAXLMessenger();

    // Build filter
    const filter = {};
    if (capability) filter.capability = capability;
    if (status) filter.status = status;

    // Discover agents
    const agents = await messenger.discoverAgents(filter);

    // Apply limit
    const results = agents.slice(0, parseInt(limit));

    return res.status(200).json({
      success: true,
      count: results.length,
      agents: results.map(agent => ({
        name: agent.name,
        address: agent.address,
        capabilities: agent.capabilities,
        status: agent.status,
        lastSeen: agent.lastSeen,
      })),
      meshStatus: await messenger.getMeshStatus(),
    });
  } catch (error) {
    console.error('Discovery error:', error);
    return res.status(500).json({
      error: 'Agent discovery failed',
      message: error.message,
    });
  }
}
