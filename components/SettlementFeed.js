/**
 * components/SettlementFeed.js
 * Displays settlement history and swap transactions (CP4)
 */

import React from 'react';
import styles from '../styles/Dashboard.module.css';

export default function SettlementFeed({ settlements = [], detailed = false }) {
  if (settlements.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No recent settlements</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
      case 'EXECUTING':
        return '✅';
      case 'PENDING':
        return '⏳';
      case 'FAILED':
        return '❌';
      default:
        return '📦';
    }
  };

  return (
    <div className={styles.feedContainer}>
      <div className={styles.feedList}>
        {settlements.slice(0, detailed ? undefined : 5).map((settlement, idx) => (
          <div key={idx} className={styles.feedItem}>
            <div className={styles.feedItemHeader}>
              <div className={styles.feedItemTitle}>
                <span className={styles.icon}>
                  {settlement.type === 'AGENT_PAYMENT' ? '💰' : '💱'}
                </span>
                <span>
                  {settlement.fromToken} → {settlement.toToken}
                </span>
              </div>
              <span className={`${styles.badge} ${styles[settlement.status?.toLowerCase()]}`}>
                {getStatusIcon(settlement.status)} {settlement.status}
              </span>
            </div>

            <div className={styles.feedItemDetails}>
              <p>
                <strong>Amount:</strong> {settlement.amount || settlement.amountIn || '—'} {settlement.fromToken}
              </p>
              {settlement.txHash && (
                <p>
                  <strong>Tx:</strong>{' '}
                  <code className={styles.txHash}>
                    {settlement.txHash?.slice(0, 12)}...{settlement.txHash?.slice(-8)}
                  </code>
                </p>
              )}
            </div>

            <div className={styles.feedItemMeta}>
              <span>{new Date(settlement.createdAt).toLocaleString()}</span>
              {settlement.type && (
                <span className={styles.typeTag}>{settlement.type}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
