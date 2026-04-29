/**
 * components/AgentDashboard.js
 * Main dashboard container integrating all CP1-CP4 systems
 */

'use client';

import React, { useState, useEffect } from 'react';
import AgentList from './AgentList';
import TaskFeed from './TaskFeed';
import SettlementFeed from './SettlementFeed';
import ExecutionQueue from './ExecutionQueue';
import ReputationCard from './ReputationCard';
import styles from '../styles/Dashboard.module.css';

export default function AgentDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [executionStats, setExecutionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      setLastUpdate(new Date().toLocaleTimeString());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch agents from CP1
      const agentsRes = await fetch('/api/agent/discover');
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
      }

      // Fetch execution queue stats from CP3
      const statsRes = await fetch('/api/agent/execute?action=stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setExecutionStats(statsData.stats || {});
      }

      // Fetch settlement history from CP4
      const settlementsRes = await fetch('/api/agent/settle?action=history&limit=5');
      if (settlementsRes.ok) {
        const settlementsData = await settlementsRes.json();
        setSettlements(settlementsData.settlements || []);
      }

      // Note: /api/agent/task/fetch requires agentAddress parameter, so we skip it
      // and show empty tasks instead
      setTasks([]);
    } catch (err) {
      setError(err.message);
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (error && loading) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBanner}>
          ⚠️ Error loading dashboard: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>🤖 AgentVerify Dashboard</h1>
        <p className={styles.subtitle}>
          Real-time agent coordination, execution, and settlement
        </p>
        {loading && <span className={styles.loadingBadge}>Updating...</span>}
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'agents' ? styles.active : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          👥 Agents ({agents.length})
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'execution' ? styles.active : ''}`}
          onClick={() => setActiveTab('execution')}
        >
          ⛽ Execution
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'settlement' ? styles.active : ''}`}
          onClick={() => setActiveTab('settlement')}
        >
          💱 Settlement
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.content}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className={styles.tab}>
            <div className={styles.grid}>
              {/* Stats Cards */}
              <div className={styles.statsCard}>
                <div className={styles.statValue}>{agents.length}</div>
                <div className={styles.statLabel}>Agents Online</div>
              </div>
              <div className={styles.statsCard}>
                <div className={styles.statValue}>{executionStats?.total || 0}</div>
                <div className={styles.statLabel}>Queued Tasks</div>
              </div>
              <div className={styles.statsCard}>
                <div className={styles.statValue}>{settlements.length}</div>
                <div className={styles.statLabel}>Recent Swaps</div>
              </div>
              <div className={styles.statsCard}>
                <div className={styles.statValue}>{tasks.length}</div>
                <div className={styles.statLabel}>Pending Messages</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className={styles.section}>
              <h2>Recent Settlements</h2>
              <SettlementFeed settlements={settlements.slice(0, 3)} />
            </div>

            <div className={styles.section}>
              <h2>Execution Queue Status</h2>
              <ExecutionQueue stats={executionStats} />
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className={styles.tab}>
            <AgentList agents={agents} onRefresh={fetchDashboardData} />
          </div>
        )}

        {/* Execution Tab */}
        {activeTab === 'execution' && (
          <div className={styles.tab}>
            <ExecutionQueue stats={executionStats} detailed={true} />
            <TaskFeed tasks={tasks} />
          </div>
        )}

        {/* Settlement Tab */}
        {activeTab === 'settlement' && (
          <div className={styles.tab}>
            <SettlementFeed settlements={settlements} detailed={true} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p suppressHydrationWarning>Last updated: {lastUpdate}</p>
        <button className={styles.refreshButton} onClick={fetchDashboardData} disabled={loading}>
          {loading ? '🔄 Updating...' : '🔄 Refresh'}
        </button>
      </div>
    </div>
  );
}
