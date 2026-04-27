/**
 * pages/api/agent/resolve.js
 * Endpoint to resolve agent identity and metadata
 * GET /api/agent/resolve?name=agentA.eth
 * POST /api/agent/resolve (for updates)
 */

import {
  resolveAgent,
  setAgentCapabilities,
  setAgentReputation,
  listAgents,
} from '../../../agent/agentIdentity.js';

export default async function handler(req, res) {
  // GET: Resolve or list agents
  if (req.method === 'GET') {
    try {
      const { name } = req.query;

      // List all agents if no name specified
      if (!name) {
        const agents = await listAgents();
        return res.status(200).json({
          success: true,
          agents: agents,
        });
      }

      // Resolve specific agent by name
      const agent = await resolveAgent(name);
      return res.status(200).json({
        success: true,
        data: agent,
      });
    } catch (error) {
      console.error('[API] Resolve GET error:', error.message);
      return res.status(404).json({
        error: error.message,
        details: 'Agent not found',
      });
    }
  }

  // POST: Update agent metadata
  if (req.method === 'POST') {
    try {
      const { name, capabilities, reputation } = req.body;

      if (!name) {
        return res.status(400).json({
          error: 'Missing required field: name',
        });
      }

      // Update capabilities if provided
      if (capabilities) {
        await setAgentCapabilities(name, capabilities);
      }

      // Update reputation if provided
      if (reputation !== undefined) {
        await setAgentReputation(name, reputation);
      }

      // Return updated agent data
      const updated = await resolveAgent(name);
      return res.status(200).json({
        success: true,
        message: 'Agent updated',
        data: updated,
      });
    } catch (error) {
      console.error('[API] Resolve POST error:', error.message);
      return res.status(500).json({
        error: error.message,
        details: 'Failed to update agent',
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}
