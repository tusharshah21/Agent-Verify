/**
 * GET /api/agent/messages
 * Returns AXL message history without requiring authentication.
 * Used by the dashboard to populate the encrypted message feed.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_FILE = path.join(__dirname, '../../../agent/axl_messages.json');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

  try {
    let messages = [];
    try {
      const raw = await fs.readFile(MESSAGES_FILE, 'utf-8');
      messages = JSON.parse(raw);
    } catch {
      messages = [];
    }

    // Newest first, apply limit
    const sorted = messages
      .slice()
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit);

    return res.status(200).json({
      success: true,
      count: sorted.length,
      messages: sorted.map(m => ({
        id: m.id,
        type: m.type,
        from: m.from,
        fromAddress: m.fromAddress,
        toAddress: m.toAddress,
        encrypted: !!m.encrypted,
        status: m.status,
        timestamp: m.timestamp,
        content: m.encrypted ? null : m.task,
      })),
    });
  } catch (error) {
    console.error('Messages API error:', error.message);
    return res.status(500).json({ error: 'Failed to load messages' });
  }
}
