/**
 * components/AXLMessageFeed.js
 * CP5: Encrypted AXL P2P message log display
 */

import React from 'react';
import styles from '../styles/Dashboard.module.css';

export default function AXLMessageFeed({ messages = [] }) {
  if (messages.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No encrypted messages in mesh log</p>
      </div>
    );
  }

  const getTypeIcon = (type) => {
    if (type === 'task_response') return '📥';
    if (type === 'task') return '📤';
    return '🔐';
  };

  const truncateId = (id) => id ? `${id.slice(0, 8)}...${id.slice(-4)}` : '—';

  return (
    <div className={styles.feedContainer}>
      <div className={styles.feedList}>
        {messages.map((msg, idx) => (
          <div key={idx} className={styles.feedItem}>
            <div className={styles.feedItemHeader}>
              <div className={styles.feedItemTitle}>
                <span className={styles.icon}>{getTypeIcon(msg.type)}</span>
                <code style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {truncateId(msg.id)}
                </code>
              </div>
              <span
                className={styles.badge}
                style={{
                  background: 'rgba(139,92,246,0.2)',
                  color: '#a78bfa',
                  fontSize: '10px',
                }}
              >
                {msg.encrypted ? '🔒 ENCRYPTED' : '📨 PLAIN'}
              </span>
            </div>

            <div className={styles.feedItemDetails}>
              <p>
                <strong>From:</strong>{' '}
                <code style={{ color: '#10b981', fontSize: '12px' }}>
                  {msg.from || msg.fromAddress?.slice(0, 12) + '...'}
                </code>
              </p>
              <p>
                <strong>To:</strong>{' '}
                <code style={{ color: '#0ea5e9', fontSize: '12px' }}>
                  {msg.toAddress?.slice(0, 12)}...
                </code>
              </p>
              {msg.type === 'task' && msg.content?.action && (
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                  Action: <strong>{msg.content.action}</strong>
                </p>
              )}
            </div>

            <div className={styles.feedItemMeta}>
              <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '—'}</span>
              <span className={styles.typeTag}>{msg.type?.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
