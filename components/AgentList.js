/**
 * components/AgentList.js
 * Displays all discovered agents with reputation and capabilities
 */

import React from 'react';
import ReputationCard from './ReputationCard';
import styles from '../styles/Dashboard.module.css';

export default function AgentList({ agents = [], onRefresh }) {
  if (agents.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No agents discovered on the mesh yet</p>
        <button onClick={onRefresh} className={styles.button}>
          🔍 Discover Agents
        </button>
      </div>
    );
  }

  return (
    <div className={styles.agentGrid}>
      {agents.map((agent, idx) => (
        <div key={idx} className={styles.agentCard}>
          <div className={styles.agentHeader}>
            <h3>{agent.name}</h3>
            <span className={`${styles.badge} ${agent.status === 'online' ? styles.online : styles.offline}`}>
              {agent.status}
            </span>
          </div>

          <div className={styles.agentInfo}>
            <p className={styles.address}>
              <span className={styles.label}>Address:</span>
              <code>{agent.address?.slice(0, 10)}...{agent.address?.slice(-8)}</code>
            </p>

            {agent.lastSeen && (
              <p className={styles.label}>
                Last Seen: {new Date(agent.lastSeen).toLocaleString()}
              </p>
            )}
          </div>

          {agent.capabilities && (
            <div className={styles.capabilities}>
              <span className={styles.capLabel}>Capabilities:</span>
              <div className={styles.capList}>
                {Object.entries(agent.capabilities).map(([cap, enabled]) => (
                  enabled && <span key={cap} className={styles.capBadge}>{cap}</span>
                ))}
              </div>
            </div>
          )}

          {agent.reputation && (
            <ReputationCard reputation={agent.reputation} />
          )}
        </div>
      ))}
    </div>
  );
}
