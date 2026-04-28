/**
 * API Route: Execute onchain via KeeperHub
 * POST /api/agent/execute - Schedule or execute task
 * GET /api/agent/execute - Get task status
 */

import {
  registerKeeperAccount,
  scheduleExecution,
  executeOnchain,
  getExecutionStatus,
  getAgentTasks,
  retryTask,
  getAllKeeperAccounts,
  getKeeperAccount,
  getQueueStats
} from '../../agent/keeperExecutor.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return handleGET(req, res);
    } else if (req.method === 'POST') {
      return handlePOST(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ Execute API error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function handleGET(req, res) {
  const { taskId, walletAddress, action } = req.query;

  try {
    // Action: get all keeper accounts
    if (action === 'accounts') {
      const result = await getAllKeeperAccounts();
      return res.status(200).json(result);
    }

    // Action: get keeper account
    if (action === 'account' && walletAddress) {
      const result = await getKeeperAccount(walletAddress);
      return res.status(result.success ? 200 : 404).json(result);
    }

    // Action: get queue stats
    if (action === 'stats') {
      const result = await getQueueStats();
      return res.status(200).json(result);
    }

    // Action: get agent tasks
    if (action === 'tasks' && walletAddress) {
      const result = await getAgentTasks(walletAddress);
      return res.status(200).json(result);
    }

    // Get task status
    if (taskId) {
      const result = await getExecutionStatus(taskId);
      return res.status(result.success ? 200 : 404).json(result);
    }

    return res.status(400).json({
      success: false,
      error: 'Missing required parameters. Use ?taskId=xxx or ?action=xxx'
    });
  } catch (error) {
    console.error('❌ GET error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function handlePOST(req, res) {
  const { action, walletAddress, taskId, onchainAction, params, agentAddress } = req.body;

  try {
    // Validate basic inputs
    if (!action || typeof action !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid "action" field'
      });
    }

    // Action: registerAccount
    if (action === 'registerAccount') {
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'Missing "walletAddress" field'
        });
      }

      const result = await registerKeeperAccount(walletAddress);
      return res.status(201).json(result);
    }

    // Action: scheduleExecution
    if (action === 'scheduleExecution') {
      if (!taskId || !agentAddress || !onchainAction) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: taskId, agentAddress, onchainAction'
        });
      }

      const result = await scheduleExecution(
        taskId,
        agentAddress,
        onchainAction,
        params || {}
      );
      return res.status(201).json(result);
    }

    // Action: executeTask
    if (action === 'executeTask') {
      if (!taskId) {
        return res.status(400).json({
          success: false,
          error: 'Missing "taskId" field'
        });
      }

      const result = await executeOnchain(taskId);
      return res.status(result.success ? 200 : 400).json(result);
    }

    // Action: retryTask
    if (action === 'retryTask') {
      if (!taskId) {
        return res.status(400).json({
          success: false,
          error: 'Missing "taskId" field'
        });
      }

      const result = await retryTask(taskId);
      return res.status(result.success ? 200 : 400).json(result);
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid action. Use: registerAccount, scheduleExecution, executeTask, or retryTask'
    });
  } catch (error) {
    console.error('❌ POST error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
