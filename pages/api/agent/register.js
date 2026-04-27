/**
 * pages/api/agent/register.js
 * Endpoint to register a new AI agent with ENS identity
 * POST /api/agent/register
 */

import { registerAgentName } from '../../../agent/agentIdentity.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentName, agentAddress } = req.body;

    // Validate inputs
    if (!agentName || !agentAddress) {
      return res.status(400).json({
        error: 'Missing required fields: agentName, agentAddress',
      });
    }

    if (!agentAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        error: 'Invalid Ethereum address format',
      });
    }

    // Register agent
    const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(500).json({
        error: 'Server not configured: SEPOLIA_PRIVATE_KEY missing',
      });
    }

    const result = await registerAgentName(agentName, agentAddress, privateKey);

    return res.status(201).json({
      success: true,
      message: `Agent registered: ${result.name}`,
      data: result,
    });
  } catch (error) {
    console.error('[API] Register error:', error.message);
    return res.status(500).json({
      error: error.message,
      details: 'Failed to register agent',
    });
  }
}
