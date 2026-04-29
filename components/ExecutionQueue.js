/**
 * components/ExecutionQueue.js
 * Displays KeeperHub execution queue and task status (CP3)
 */

import React from 'react';
import styles from '../styles/Dashboard.module.css';

export default function ExecutionQueue({ stats = null, detailed = false }) {
  const statsData = stats || {};
  const {
    total = 0,
    queued = 0,
    executing = 0,
    completed = 0,
    failed = 0,
    confirming = 0
  } = statsData;

  const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
  const failureRate = total > 0 ? ((failed / total) * 100).toFixed(1) : 0;

  const statuses = [
    { label: 'Queued', count: queued, color: '#93c5fd', icon: '📋' },
    { label: 'Executing', count: executing, color: '#fbbf24', icon: '⚙️' },
    { label: 'Confirming', count: confirming, color: '#a78bfa', icon: '⏳' },
    { label: 'Completed', count: completed, color: '#10b981', icon: '✅' },
    { label: 'Failed', count: failed, color: '#ef4444', icon: '❌' },
  ];

  return (
    <div className={styles.executionQueue}>
      <div className={styles.queueStats}>
        <div className={styles.queueStatCard}>
          <div className={styles.statLabel}>Total Tasks</div>
          <div className={styles.statNumber}>{total}</div>
        </div>
        <div className={styles.queueStatCard}>
          <div className={styles.statLabel}>Success Rate</div>
          <div className={styles.statNumber} style={{ color: '#10b981' }}>
            {successRate}%
          </div>
        </div>
        <div className={styles.queueStatCard}>
          <div className={styles.statLabel}>Failure Rate</div>
          <div className={styles.statNumber} style={{ color: failed > 0 ? '#ef4444' : '#9ca3af' }}>
            {failureRate}%
          </div>
        </div>
      </div>

      {detailed && (
        <div className={styles.queueBreakdown}>
          <h3>Queue Breakdown</h3>
          <div className={styles.statusGrid}>
            {statuses.map((status, idx) => (
              <div key={idx} className={styles.statusCard}>
                <div className={styles.statusHeader}>
                  <span className={styles.statusIcon}>{status.icon}</span>
                  <span className={styles.statusLabel}>{status.label}</span>
                </div>
                <div className={styles.statusCount} style={{ color: status.color }}>
                  {status.count}
                </div>
                <div className={styles.statusBar}>
                  <div
                    className={styles.statusBarFill}
                    style={{
                      width: `${total > 0 ? (status.count / total) * 100 : 0}%`,
                      backgroundColor: status.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!detailed && (
        <div className={styles.queueSimple}>
          <div className={styles.queueBar}>
            {queued > 0 && (
              <div className={styles.barSegment} style={{ width: `${(queued / total) * 100}%`, backgroundColor: '#93c5fd' }} />
            )}
            {executing > 0 && (
              <div className={styles.barSegment} style={{ width: `${(executing / total) * 100}%`, backgroundColor: '#fbbf24' }} />
            )}
            {confirming > 0 && (
              <div className={styles.barSegment} style={{ width: `${(confirming / total) * 100}%`, backgroundColor: '#a78bfa' }} />
            )}
            {completed > 0 && (
              <div className={styles.barSegment} style={{ width: `${(completed / total) * 100}%`, backgroundColor: '#10b981' }} />
            )}
            {failed > 0 && (
              <div className={styles.barSegment} style={{ width: `${(failed / total) * 100}%`, backgroundColor: '#ef4444' }} />
            )}
          </div>
          <div className={styles.queueLegend}>
            {statuses.map((status, idx) => (
              <span key={idx} className={styles.legendItem}>
                <span className={styles.dot} style={{ backgroundColor: status.color }} />
                {status.label}: {status.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
