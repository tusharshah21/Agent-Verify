/**
 * components/TaskFeed.js
 * Displays pending and completed tasks from AXL P2P (CP2)
 */

import React from 'react';
import styles from '../styles/Dashboard.module.css';

export default function TaskFeed({ tasks = [], detailed = false }) {
  if (tasks.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No pending tasks</p>
      </div>
    );
  }

  return (
    <div className={styles.feedContainer}>
      <div className={styles.feedList}>
        {tasks.slice(0, detailed ? undefined : 5).map((task, idx) => (
          <div key={idx} className={styles.feedItem}>
            <div className={styles.feedItemHeader}>
              <div className={styles.feedItemTitle}>
                <span className={styles.icon}>📋</span>
                <span>{task.content?.action || task.type}</span>
              </div>
              <span className={`${styles.badge} ${styles.pending}`}>
                {task.status}
              </span>
            </div>

            <div className={styles.feedItemDetails}>
              <p>
                <strong>From:</strong> {task.from || task.fromAddress?.slice(0, 10)}...
              </p>
              {task.content && (
                <p className={styles.taskContent}>
                  {JSON.stringify(task.content).slice(0, 100)}...
                </p>
              )}
            </div>

            <div className={styles.feedItemMeta}>
              <span>{new Date(task.timestamp).toLocaleString()}</span>
              {task.priority && <span className={styles.priority}>{task.priority}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
