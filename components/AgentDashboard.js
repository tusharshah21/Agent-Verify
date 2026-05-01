/**
 * components/AgentDashboard.js
 * Main dashboard container integrating all CP1–CP5 systems
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AgentList from './AgentList';
import TaskFeed from './TaskFeed';
import SettlementFeed from './SettlementFeed';
import ExecutionQueue from './ExecutionQueue';
import AXLMessageFeed from './AXLMessageFeed';
import styles from '../styles/Dashboard.module.css';

export default function AgentDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [agents, setAgents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [executionStats, setExecutionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [agentsRes, statsRes, settlementsRes, messagesRes] = await Promise.allSettled([
        fetch('/api/agent/discover'),
        fetch('/api/agent/execute?action=stats'),
        fetch('/api/agent/settle?action=history&limit=10'),
        fetch('/api/agent/messages?limit=20'),
      ]);

      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
        const data = await agentsRes.value.json();
        setAgents(data.agents || []);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = await statsRes.value.json();
        setExecutionStats(data.stats || {});
      }

      if (settlementsRes.status === 'fulfilled' && settlementsRes.value.ok) {
        const data = await settlementsRes.value.json();
        setSettlements(data.settlements || []);
      }

      if (messagesRes.status === 'fulfilled' && messagesRes.value.ok) {
        const data = await messagesRes.value.json();
        setMessages(data.messages || []);
      }

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'agents', label: `👥 Agents (${agents.length})` },
    { id: 'messages', label: `🔐 Messages (${messages.length})` },
    { id: 'execution', label: '⛽ Execution' },
    { id: 'settlement', label: '💱 Settlement' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1>🤖 AgentVerify Dashboard</h1>
            <p className={styles.subtitle}>
              Trust layer — ENS Identity · AXL P2P · KeeperHub · Uniswap Settlement
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ 
              background: '#10b981', 
              color: 'white', 
              padding: '4px 10px', 
              borderRadius: '12px', 
              fontSize: '11px', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🚀 Testnet Mode
            </span>
            {loading && <span className={styles.loadingBadge}>Updating…</span>}
            <span style={{ color: '#475569', fontSize: '12px' }} suppressHydrationWarning>
              {lastUpdate ? `Updated ${lastUpdate}` : ''}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>⚠️ {error}</div>
      )}

      <div className={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'overview' && (
          <div className={styles.tab}>
            <div className={styles.grid}>
              <div className={styles.statsCard}>
                <div className={styles.statValue}>{agents.length}</div>
                <div className={styles.statLabel}>Agents Online</div>
              </div>
              <div className={styles.statsCard}>
                <div className={styles.statValue}>{messages.length}</div>
                <div className={styles.statLabel}>Mesh Messages</div>
              </div>
              <div className={styles.statsCard}>
                <div className={styles.statValue}>{executionStats?.total || 0}</div>
                <div className={styles.statLabel}>Queued Tasks</div>
              </div>
              <div className={styles.statsCard}>
                <div className={styles.statValue}>{settlements.length}</div>
                <div className={styles.statLabel}>Settlements</div>
              </div>
            </div>

            <div className={styles.section}>
              <h2>Online Agents</h2>
              <AgentList agents={agents.slice(0, 4)} onRefresh={fetchDashboardData} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div className={styles.section}>
                <h2>AXL Message Log</h2>
                <AXLMessageFeed messages={messages.slice(0, 5)} />
              </div>
              <div className={styles.section}>
                <h2>Recent Settlements</h2>
                <SettlementFeed settlements={settlements.slice(0, 3)} />
              </div>
            </div>

            <div className={styles.section}>
              <h2>Execution Queue</h2>
              <ExecutionQueue stats={executionStats} />
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className={styles.tab}>
            <AgentList agents={agents} onRefresh={fetchDashboardData} />
          </div>
        )}

        {activeTab === 'messages' && (
          <div className={styles.tab}>
            <div className={styles.section}>
              <h2>🔐 Encrypted AXL Message Feed</h2>
              <AXLMessageFeed messages={messages} />
            </div>
          </div>
        )}

        {activeTab === 'execution' && (
          <div className={styles.tab}>
            <ExecutionQueue stats={executionStats} detailed={true} />
            <div className={styles.section} style={{ marginTop: '20px' }}>
              <h2>Task Log</h2>
              <TaskFeed tasks={messages.filter(m => m.type === 'task')} />
            </div>
          </div>
        )}

        {activeTab === 'settlement' && (
          <div className={styles.tab}>
            <SettlementFeed settlements={settlements} detailed={true} />
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <p suppressHydrationWarning>
          Sepolia Testnet · Last updated: {lastUpdate || '—'}
        </p>
        <button
          className={styles.refreshButton}
          onClick={fetchDashboardData}
          disabled={loading}
        >
          {loading ? '🔄 Updating…' : '🔄 Refresh'}
        </button>
      </div>
    </div>
  );
}
