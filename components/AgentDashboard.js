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

  // Register agent modal state
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regAddress, setRegAddress] = useState('0xf866683E1eC4a62503C0128413EA0269E2A397d4');
  const [regLoading, setRegLoading] = useState(false);
  const [regResult, setRegResult] = useState(null);

  // Live chain status (from discover endpoint)
  const [chainStatus, setChainStatus] = useState(null);

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
        if (data.storageStatus || data.meshStatus || data.uniswapQuote) {
          setChainStatus({ storage: data.storageStatus, mesh: data.meshStatus, uniswap: data.uniswapQuote });
        }
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

  const handleRegister = async () => {
    if (!regName.trim()) return;
    setRegLoading(true);
    setRegResult(null);
    try {
      const res = await fetch('/api/agent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: regName.trim(), agentAddress: regAddress.trim() }),
      });
      const data = await res.json();
      setRegResult(data);
      if (data.success) fetchDashboardData();
    } catch (e) {
      setRegResult({ error: e.message });
    } finally {
      setRegLoading(false);
    }
  };

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
            <h1>🤖 AgentVerify</h1>
            <p className={styles.subtitle}>
              Complete trust layer for autonomous AI agents
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {[
                { label: 'ENS', color: '#6366f1' },
                { label: 'Gensyn AXL', color: '#8b5cf6' },
                { label: 'KeeperHub', color: '#10b981' },
                { label: 'Uniswap', color: '#e91e8c' },
                { label: '0G Storage', color: '#0ea5e9' },
              ].map(t => (
                <span key={t.label} style={{
                  background: t.color, color: 'white',
                  padding: '2px 8px', borderRadius: '8px',
                  fontSize: '10px', fontWeight: '700', letterSpacing: '0.3px'
                }}>{t.label}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              background: '#1e40af', color: 'white',
              padding: '4px 10px', borderRadius: '12px',
              fontSize: '11px', fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              ⚡ ETHGlobal 2025
            </span>
            <button
              onClick={() => { setShowRegister(v => !v); setRegResult(null); }}
              style={{
                background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
                color: 'white', border: 'none', padding: '6px 14px',
                borderRadius: '8px', cursor: 'pointer', fontWeight: '700',
                fontSize: '12px', letterSpacing: '0.3px',
              }}
            >
              ➕ Register Agent
            </button>
            {loading && <span className={styles.loadingBadge}>Updating…</span>}
            <span style={{ color: '#475569', fontSize: '12px' }} suppressHydrationWarning>
              {lastUpdate ? `Updated ${lastUpdate}` : ''}
            </span>
          </div>
        </div>
      </div>

      {showRegister && (
        <div style={{
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)',
          borderRadius: '10px', padding: '20px', marginBottom: '16px',
        }}>
          <h3 style={{ margin: '0 0 14px', color: '#10b981', fontSize: '15px' }}>
            ⛓️ Register Agent on Sepolia ENS
          </h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1', minWidth: '160px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>Agent Name</label>
              <input
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="e.g. myagent (without .eth)"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '6px',
                  background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(100,116,139,0.4)',
                  color: 'white', fontSize: '13px', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: '2', minWidth: '220px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>Wallet Address</label>
              <input
                value={regAddress}
                onChange={e => setRegAddress(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '6px',
                  background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(100,116,139,0.4)',
                  color: '#10b981', fontFamily: 'monospace', fontSize: '12px', boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={handleRegister}
              disabled={regLoading || !regName.trim()}
              className={styles.button}
              style={{ minWidth: '120px', whiteSpace: 'nowrap' }}
            >
              {regLoading ? '⛓️ Sending tx…' : '🚀 Register'}
            </button>
          </div>

          {regResult && (
            <div style={{
              marginTop: '14px', padding: '12px 16px', borderRadius: '8px',
              background: regResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${regResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              fontSize: '13px',
            }}>
              {regResult.success ? (
                <>
                  <div style={{ color: '#10b981', fontWeight: '700', marginBottom: '6px' }}>
                    ✅ {regResult.data?.name} registered {regResult.data?.onChain ? 'on-chain' : '(local)'}
                  </div>
                  {regResult.data?.onChain && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${regResult.data.txHash}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: '#0ea5e9', fontSize: '12px', wordBreak: 'break-all' }}
                    >
                      🔗 View on Etherscan: {regResult.data.txHash?.slice(0, 20)}…
                    </a>
                  )}
                  {!regResult.data?.onChain && (
                    <div style={{ color: '#64748b', fontSize: '12px' }}>
                      Saved to local registry (set EXECUTION_MODE=TESTNET for on-chain tx)
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: '#f87171' }}>❌ {regResult.error}</div>
              )}
            </div>
          )}
        </div>
      )}

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
            {/* Live chain status strip */}
            {chainStatus && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Sepolia ENS', live: true, detail: 'resolved' },
                  {
                    label: 'Uniswap Quoter',
                    live: !!chainStatus.uniswap?.outputAmount,
                    detail: chainStatus.uniswap?.outputAmount
                      ? `1 ETH ≈ ${parseFloat(chainStatus.uniswap.outputAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC`
                      : 'no liquidity',
                  },
                  { label: 'KeeperHub API', live: true, detail: 'authenticated' },
                  {
                    label: '0G EVM Chain',
                    live: chainStatus.storage?.evmConnected,
                    detail: chainStatus.storage?.evmBlock ? `block ${chainStatus.storage.evmBlock.toLocaleString()}` : 'offline',
                  },
                  {
                    label: 'AXL Mesh',
                    live: chainStatus.mesh?.transport === 'axl-p2p',
                    detail: chainStatus.mesh?.transport || 'simulation',
                  },
                ].map(({ label, live, detail }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: live ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                    border: `1px solid ${live ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`,
                    borderRadius: '8px', padding: '6px 12px', fontSize: '12px',
                  }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: live ? '#10b981' : '#64748b', flexShrink: 0 }} />
                    <span style={{ color: live ? '#d1fae5' : '#94a3b8', fontWeight: '600' }}>{label}</span>
                    <span style={{ color: '#64748b' }}>{detail}</span>
                  </div>
                ))}
              </div>
            )}

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
