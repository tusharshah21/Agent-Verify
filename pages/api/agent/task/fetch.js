/**
 * pages/api/agent/task/fetch.js
 * Fetch Task Messages for Agent
 * GET: Retrieve pending messages for an agent
 * CP2: AXL P2P Messaging
 */

import { getAXLMessenger } from '../../../../agent/axlMessenger.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    const { agentAddress } = req.query;

    if (!agentAddress) {
      return res.status(400).json({
        error: 'Missing agentAddress query parameter',
      });
    }

    if (!agentAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        error: 'Invalid agent address format',
      });
    }

    // Get AXL messenger
    const messenger = await getAXLMessenger();

    // Fetch messages for this agent
    const messages = await messenger.getMessagesForAgent(agentAddress);

    return res.status(200).json({
      success: true,
      agentAddress,
      count: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        from: msg.from,
        fromAddress: msg.fromAddress,
        type: msg.type,
        priority: msg.priority,
        encrypted: msg.encrypted,
        timestamp: msg.timestamp,
        content: msg.content,
      })),
    });
  } catch (error) {
    console.error('Task fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch tasks',
      message: error.message,
    });
  }
}
