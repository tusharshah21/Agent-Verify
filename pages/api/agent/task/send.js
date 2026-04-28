/**
 * pages/api/agent/task/send.js
 * Send Task Message Between Agents
 * POST: Send encrypted task to another agent
 * CP2: AXL P2P Messaging
 */

import { getAXLMessenger } from '../../../../agent/axlMessenger.js';
import { WALLET_CONFIG } from '../../../../config/sepolia.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    const {
      fromAgentName,
      fromAgentAddress,
      toAgentAddress,
      task,
      priority = 'normal',
      ttl = 3600000, // 1 hour default
      recipientPublicKey,
    } = req.body;

    // Validate required fields
    if (!fromAgentName || !fromAgentAddress || !toAgentAddress || !task) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fromAgentName', 'fromAgentAddress', 'toAgentAddress', 'task'],
      });
    }

    // Validate Ethereum addresses
    if (!toAgentAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        error: 'Invalid recipient address format',
      });
    }

    // Get AXL messenger
    const messenger = await getAXLMessenger();

    // Initialize mesh if not already done
    await messenger.registerInMesh(fromAgentAddress, fromAgentName, {
      execute: true,
      swap: true,
      bridge: true,
    });

    // Send task message
    const result = await messenger.sendTaskMessage(
      {
        name: fromAgentName,
        address: fromAgentAddress,
      },
      toAgentAddress,
      task,
      {
        priority,
        ttl,
        recipientPublicKey,
      }
    );

    return res.status(200).json({
      success: true,
      messageId: result.messageId,
      status: result.status,
      timestamp: result.timestamp,
      expiresAt: result.expiresAt,
      message: `Task sent from ${fromAgentName} to ${toAgentAddress.slice(0, 6)}...`,
    });
  } catch (error) {
    console.error('Task send error:', error);
    return res.status(500).json({
      error: 'Failed to send task',
      message: error.message,
    });
  }
}
