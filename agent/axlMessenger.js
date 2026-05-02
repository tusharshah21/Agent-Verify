/**
 * agent/axlMessenger.js
 * AXL (Gensyn) P2P Messaging for Agent-to-Agent Communication
 * CP2: Encrypted mesh networking with agent discovery
 */

import crypto from 'crypto';
import * as fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Message encryption/decryption helpers
 */
const MessageCrypto = {
  /**
   * Encrypt message for P2P transmission
   */
  encryptMessage(message, recipientPublicKey) {
    try {
      // For hackathon: use simple string encryption with timestamp
      const timestamp = Date.now();
      const nonce = crypto.randomBytes(16);
      
      // Create message envelope
      const envelope = {
        content: message,
        timestamp,
        nonce: nonce.toString('hex'),
        encrypted: true,
      };

      // Use modern crypto with proper key derivation
      const key = crypto
        .createHash('sha256')
        .update(recipientPublicKey.slice(0, 32))
        .digest();
      
      const cipher = crypto.createCipheriv('aes-256-cbc', key, nonce);
      let encrypted = cipher.update(JSON.stringify(envelope), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        nonce: nonce.toString('hex'),
        timestamp,
      };
    } catch (error) {
      throw new Error(`Message encryption failed: ${error.message}`);
    }
  },

  /**
   * Decrypt incoming message
   */
  decryptMessage(encryptedData, senderPublicKey) {
    try {
      const nonce = Buffer.from(encryptedData.nonce, 'hex');
      const key = crypto
        .createHash('sha256')
        .update(senderPublicKey.slice(0, 32))
        .digest();
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, nonce);
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const envelope = JSON.parse(decrypted);
      
      // Verify timestamp (reject messages older than 5 minutes)
      const age = Date.now() - envelope.timestamp;
      if (age > 300000) {
        throw new Error('Message expired');
      }

      return envelope.content;
    } catch (error) {
      throw new Error(`Message decryption failed: ${error.message}`);
    }
  },

  /**
   * Sign message with private key
   */
  signMessage(message, privateKey) {
    const sign = crypto.createSign('sha256');
    sign.update(JSON.stringify(message));
    return sign.sign(privateKey, 'hex');
  },

  /**
   * Verify message signature
   */
  verifySignature(message, signature, publicKey) {
    try {
      const verify = crypto.createVerify('sha256');
      verify.update(JSON.stringify(message));
      return verify.verify(publicKey, signature, 'hex');
    } catch {
      return false;
    }
  },
};

/**
 * AXL Mesh Manager — Gensyn Agent eXchange Layer
 *
 * Connects to the real AXL binary (https://github.com/gensyn-ai/axl) when running.
 * AXL provides: encrypted P2P routing, peer discovery, MCP + A2A support.
 * Your app calls localhost — AXL handles everything else.
 *
 * To run AXL:
 *   1. Download binary from https://github.com/gensyn-ai/axl/releases
 *   2. Run: axl start --port 9090
 *   3. Set AXL_PORT=9090 in .env.local (default)
 *
 * Falls back to local simulation if AXL binary is not running.
 */
class AXLMessenger {
  constructor() {
    this.meshId = process.env.AXL_MESH_ID || 'agentverify-hackathon-2024';
    this.nodeId = this.generateNodeId();
    this.messageQueue = [];
    this.onlineAgents = new Map();
    this.messageHistory = [];
    this.registryPath = path.join(__dirname, 'axl_messages.json');

    // AXL binary HTTP endpoint (localhost — AXL handles P2P from here)
    this.axlPort = process.env.AXL_PORT || '9090';
    this.axlBase = `http://localhost:${this.axlPort}`;
    this.axlAvailable = false;
  }

  /**
   * Generate unique node ID for this agent instance
   */
  generateNodeId() {
    return crypto
      .createHash('sha256')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Probe the AXL binary health endpoint. Returns true if binary is running.
   */
  async checkAXLBinary() {
    try {
      const { default: http } = await import('http');
      return new Promise((resolve) => {
        const req = http.get(`${this.axlBase}/health`, { timeout: 1000 }, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
      });
    } catch {
      return false;
    }
  }

  /**
   * POST to real AXL binary endpoint. Returns parsed JSON or null on failure.
   */
  async axlPost(endpoint, body) {
    try {
      const { default: http } = await import('http');
      return new Promise((resolve) => {
        const data = JSON.stringify(body);
        const options = {
          hostname: 'localhost',
          port: this.axlPort,
          path: endpoint,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
          timeout: 3000,
        };
        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(body)); } catch { resolve(null); }
          });
        });
        req.on('error', () => resolve(null));
        req.write(data);
        req.end();
      });
    } catch {
      return null;
    }
  }

  /**
   * GET from real AXL binary endpoint. Returns parsed JSON or null on failure.
   */
  async axlGet(endpoint) {
    try {
      const { default: http } = await import('http');
      return new Promise((resolve) => {
        const req = http.get(`${this.axlBase}${endpoint}`, { timeout: 3000 }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(body)); } catch { resolve(null); }
          });
        });
        req.on('error', () => resolve(null));
      });
    } catch {
      return null;
    }
  }

  /**
   * Initialize AXL mesh connection.
   * Connects to real AXL binary if running, else uses local simulation.
   */
  async initializeMesh(agentAddress, agentName, capabilities = {}) {
    try {
      console.log(`🔗 Initializing AXL mesh for ${agentName} (${agentAddress})`);

      // Check if real AXL binary is running
      this.axlAvailable = await this.checkAXLBinary();

      if (this.axlAvailable) {
        // Register this node with the real AXL daemon
        const result = await this.axlPost('/register', {
          nodeId: this.nodeId,
          agentAddress,
          agentName,
          capabilities,
          meshId: this.meshId,
        });
        if (result) {
          console.log(`✅ [AXL] Connected to real AXL binary (NodeID: ${this.nodeId.slice(0, 8)}...)`);
          console.log(`   Endpoint: ${this.axlBase} | MeshID: ${this.meshId}`);
        }
      } else {
        console.log(`ℹ️  [AXL] Binary not running on port ${this.axlPort} — using local simulation`);
        console.log(`   To enable: download AXL from github.com/gensyn-ai/axl and run: axl start --port ${this.axlPort}`);
      }

      // Register agent in local registry regardless
      await this.registerInMesh(agentAddress, agentName, capabilities);
      await this.loadMessageQueue();

      return {
        success: true,
        nodeId: this.nodeId,
        meshId: this.meshId,
        agentAddress,
        transport: this.axlAvailable ? 'axl-p2p' : 'local-simulation',
      };
    } catch (error) {
      throw new Error(`Mesh initialization failed: ${error.message}`);
    }
  }

  /**
   * Register agent in mesh network
   */
  async registerInMesh(agentAddress, agentName, capabilities) {
    try {
      // Add to online agents map
      this.onlineAgents.set(agentAddress, {
        name: agentName,
        address: agentAddress,
        lastSeen: Date.now(),
        capabilities: capabilities || { execute: true, swap: true, bridge: true },
        status: 'online',
      });

      console.log(`  📍 Registered ${agentName} in mesh`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Discover other agents in the mesh
   * Returns list of online agents matching filter criteria
   */
  async discoverAgents(filter = {}) {
    try {
      const agents = Array.from(this.onlineAgents.values());

      // Filter by capabilities if requested
      if (filter.capability) {
        return agents.filter(
          a => a.capabilities && a.capabilities[filter.capability]
        );
      }

      // Filter by status
      if (filter.status) {
        return agents.filter(a => a.status === filter.status);
      }

      return agents;
    } catch (error) {
      throw new Error(`Agent discovery failed: ${error.message}`);
    }
  }

  /**
   * Send encrypted task message to another agent.
   * Uses real AXL P2P routing if binary is running, else local queue.
   */
  async sendTaskMessage(fromAgent, toAgentAddress, taskData, options = {}) {
    try {
      const messageId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();

      const taskMessage = {
        id: messageId,
        type: 'task',
        from: fromAgent.name,
        fromAddress: fromAgent.address,
        toAddress: toAgentAddress,
        task: taskData,
        priority: options.priority || 'normal',
        expiresAt: timestamp + (options.ttl || 3600000),
        timestamp,
      };

      // Encrypt payload
      let encryptedMessage = taskMessage;
      if (options.recipientPublicKey) {
        encryptedMessage = {
          ...taskMessage,
          encrypted: MessageCrypto.encryptMessage(JSON.stringify(taskData), options.recipientPublicKey),
        };
        delete encryptedMessage.task;
      }

      let transport = 'local';

      // Route via real AXL binary if available
      if (this.axlAvailable) {
        const axlResult = await this.axlPost('/send', {
          to: toAgentAddress,
          messageId,
          payload: encryptedMessage,
          meshId: this.meshId,
        });
        if (axlResult?.success) {
          transport = 'axl-p2p';
          console.log(`📤 [AXL] P2P message sent: ${fromAgent.name} → ${toAgentAddress.slice(0, 8)}... (ID: ${messageId.slice(0, 8)})`);
        }
      }

      // Always persist locally as backup
      this.messageQueue.push({ ...encryptedMessage, status: 'pending', retries: 0 });
      await this.saveMessage({ ...taskMessage, status: 'sent', deliveredAt: null, transport });

      if (transport === 'local') {
        console.log(`📤 [AXL-sim] Task queued: ${fromAgent.name} → ${toAgentAddress.slice(0, 6)}...`);
      }

      return { messageId, status: 'queued', timestamp, expiresAt: encryptedMessage.expiresAt, transport };
    } catch (error) {
      throw new Error(`Failed to send task message: ${error.message}`);
    }
  }

  /**
   * Retrieve messages for a specific agent
   */
  async getMessagesForAgent(agentAddress, options = {}) {
    try {
      const messages = this.messageQueue.filter(
        msg => msg.toAddress === agentAddress && msg.status === 'pending'
      );

      // Mark as delivered
      for (const msg of messages) {
        msg.status = 'delivered';
        msg.deliveredAt = Date.now();
      }

      // Save updates
      for (const msg of messages) {
        await this.saveMessage(msg);
      }

      return messages.map(msg => ({
        id: msg.id,
        from: msg.from,
        fromAddress: msg.fromAddress,
        type: msg.type,
        priority: msg.priority,
        encrypted: !!msg.encrypted,
        timestamp: msg.timestamp,
        content: msg.encrypted ? msg.encrypted : msg.task,
      }));
    } catch (error) {
      throw new Error(`Failed to retrieve messages: ${error.message}`);
    }
  }

  /**
   * Acknowledge message receipt
   */
  async acknowledgeMessage(messageId, recipientAddress) {
    try {
      const message = this.messageQueue.find(m => m.id === messageId);
      if (message) {
        message.status = 'acknowledged';
        message.acknowledgedAt = Date.now();
        message.acknowledgedBy = recipientAddress;

        await this.saveMessage(message);
      }

      return { success: true, messageId };
    } catch (error) {
      throw new Error(`Failed to acknowledge message: ${error.message}`);
    }
  }

  /**
   * Respond to a task message
   */
  async respondToTask(messageId, fromAgent, toAgentAddress, response) {
    try {
      const originalMessage = this.messageQueue.find(m => m.id === messageId);
      if (!originalMessage) {
        throw new Error(`Original message ${messageId} not found`);
      }

      // Send response back
      const responseMessage = {
        id: crypto.randomBytes(16).toString('hex'),
        type: 'task_response',
        from: fromAgent.name,
        fromAddress: fromAgent.address,
        toAddress: toAgentAddress,
        inReplyTo: messageId,
        response,
        status: 'response',
        timestamp: Date.now(),
      };

      // Add to queue
      this.messageQueue.push(responseMessage);
      await this.saveMessage(responseMessage);

      console.log(`📥 Response sent from ${fromAgent.name} to ${toAgentAddress.slice(0, 6)}...`);

      return {
        messageId: responseMessage.id,
        inReplyTo: messageId,
        status: 'queued',
      };
    } catch (error) {
      throw new Error(`Failed to respond to task: ${error.message}`);
    }
  }

  /**
   * Get mesh status
   */
  async getMeshStatus() {
    return {
      meshId: this.meshId,
      nodeId: this.nodeId,
      online: true,
      agentsOnline: this.onlineAgents.size,
      pendingMessages: this.messageQueue.filter(m => m.status === 'pending').length,
      totalMessages: this.messageHistory.length,
    };
  }

  /**
   * Save message to persistent storage
   */
  async saveMessage(message) {
    try {
      const messages = await this.loadMessageHistory();
      messages.push({
        ...message,
        savedAt: Date.now(),
      });
      await fs.writeFile(this.registryPath, JSON.stringify(messages, null, 2));
      this.messageHistory.push(message);
    } catch (error) {
      console.warn(`Failed to save message: ${error.message}`);
    }
  }

  /**
   * Load message queue from persistent storage
   */
  async loadMessageQueue() {
    try {
      const messages = await this.loadMessageHistory();
      this.messageQueue = messages.filter(m => m.status === 'pending' || m.status === 'queued');
    } catch {
      this.messageQueue = [];
    }
  }

  /**
   * Load all message history
   */
  async loadMessageHistory() {
    try {
      await fs.access(this.registryPath);
      const data = await fs.readFile(this.registryPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Clear old messages (older than 24 hours)
   */
  async cleanupOldMessages() {
    try {
      const cutoffTime = Date.now() - 86400000; // 24 hours
      this.messageQueue = this.messageQueue.filter(m => m.timestamp > cutoffTime);
      this.messageHistory = this.messageHistory.filter(m => m.timestamp > cutoffTime);

      const messages = await this.loadMessageHistory();
      const filtered = messages.filter(m => m.timestamp > cutoffTime);
      await fs.writeFile(this.registryPath, JSON.stringify(filtered, null, 2));

      console.log(`🧹 Cleaned up old messages`);
    } catch (error) {
      console.warn(`Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Disconnect agent from mesh
   */
  async disconnectAgent(agentAddress) {
    try {
      this.onlineAgents.delete(agentAddress);
      console.log(`🔌 Agent ${agentAddress.slice(0, 6)}... disconnected from mesh`);
      return { success: true };
    } catch (error) {
      throw new Error(`Disconnect failed: ${error.message}`);
    }
  }
}

/**
 * Export singleton instance
 */
let messengerInstance = null;

export async function getAXLMessenger() {
  if (!messengerInstance) {
    messengerInstance = new AXLMessenger();
  }
  return messengerInstance;
}

export { AXLMessenger, MessageCrypto };
export default AXLMessenger;
