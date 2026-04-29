/**
 * pages/api/agent/settle.js
 * 
 * CP4: Uniswap Settlement Endpoints
 * 
 * Routes:
 * GET /api/agent/settle?action=quote&fromToken=USDC&toToken=DAI&amount=100
 * GET /api/agent/settle?action=history
 * GET /api/agent/settle?action=stats
 * POST /api/agent/settle (action: executeSwap, executePayment)
 */

import {
  getSwapQuote,
  executeSwap,
  executeAgentPayment,
  getSwapStatus,
  getSettlementHistory,
  getSettlementStats,
  completeSwap,
  initializeUniswap
} from '../../../agent/uniswapBridge.js';

export default async function handler(req, res) {
  try {
    const { method } = req;

    if (method === 'GET') {
      const { action, fromToken, toToken, amount, slippage, swapId, limit, offset } = req.query;

      // Get swap quote
      if (action === 'quote') {
        if (!fromToken || !toToken || !amount) {
          return res.status(400).json({
            success: false,
            error: 'Missing required parameters: fromToken, toToken, amount'
          });
        }

        const quoteSlippage = slippage ? parseFloat(slippage) : 0.5;
        const result = await getSwapQuote(fromToken, toToken, amount, quoteSlippage);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: result.error
          });
        }

        return res.status(200).json({
          success: true,
          quote: result.quote
        });
      }

      // Get swap status
      if (action === 'status' || swapId) {
        const id = swapId || action;
        if (!id || id === 'status') {
          return res.status(400).json({
            success: false,
            error: 'Missing swapId parameter'
          });
        }

        const result = getSwapStatus(id);
        if (!result.success) {
          return res.status(404).json(result);
        }

        return res.status(200).json(result);
      }

      // Get settlement history
      if (action === 'history') {
        const historyLimit = limit ? parseInt(limit) : 10;
        const historyOffset = offset ? parseInt(offset) : 0;

        const result = getSettlementHistory(historyLimit, historyOffset);
        return res.status(200).json(result);
      }

      // Get settlement statistics
      if (action === 'stats') {
        const result = getSettlementStats();
        return res.status(200).json(result);
      }

      // Initialize if needed
      if (action === 'init') {
        const result = initializeUniswap();
        return res.status(200).json(result);
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use: quote, status, history, stats, init'
      });
    }

    if (method === 'POST') {
      const { action, fromToken, toToken, amount, recipientAddress, slippage, swapId, txHash, receipt, fromAgentAddress, toAgentAddress, paymentToken, swapToToken } = req.body;

      // Execute swap
      if (action === 'executeSwap') {
        if (!fromToken || !toToken || !amount || !recipientAddress) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: fromToken, toToken, amount, recipientAddress'
          });
        }

        const swapSlippage = slippage ? parseFloat(slippage) : 0.5;
        const result = await executeSwap(fromToken, toToken, amount, recipientAddress, swapSlippage);

        if (!result.success) {
          return res.status(400).json(result);
        }

        return res.status(201).json(result);
      }

      // Execute agent payment
      if (action === 'executePayment') {
        if (!fromAgentAddress || !toAgentAddress || !paymentToken || !amount) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: fromAgentAddress, toAgentAddress, paymentToken, amount'
          });
        }

        const result = await executeAgentPayment(
          fromAgentAddress,
          toAgentAddress,
          paymentToken,
          amount,
          swapToToken
        );

        if (!result.success) {
          return res.status(400).json(result);
        }

        return res.status(201).json(result);
      }

      // Complete swap (called by KeeperHub after execution)
      if (action === 'completeSwap') {
        if (!swapId || !txHash) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields: swapId, txHash'
          });
        }

        const result = completeSwap(swapId, txHash, receipt);
        return res.status(200).json(result);
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use: executeSwap, executePayment, completeSwap'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or POST'
    });
  } catch (error) {
    console.error('Settle endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
