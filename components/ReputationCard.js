/**
 * components/ReputationCard.js
 * Displays agent reputation score with visual indicator
 */

import React from 'react';
import styles from '../styles/Dashboard.module.css';

export default function ReputationCard({ reputation = 0 }) {
  const getReputationColor = (score) => {
    if (score >= 200) return '#10b981'; // green
    if (score >= 100) return '#f59e0b'; // amber
    if (score >= 50) return '#ef4444'; // red
    return '#6b7280'; // gray
  };

  const getReputationLabel = (score) => {
    if (score >= 200) return 'Excellent';
    if (score >= 100) return 'Good';
    if (score >= 50) return 'Fair';
    return 'New';
  };

  const color = getReputationColor(reputation);
  const label = getReputationLabel(reputation);

  return (
    <div className={styles.reputationCard}>
      <div className={styles.reputationScore}>
        <div
          className={styles.reputationGauge}
          style={{
            background: `conic-gradient(${color} ${(reputation / 300) * 100}%, #e5e7eb ${(reputation / 300) * 100}%)`,
          }}
        >
          <div className={styles.reputationInner}>
            <span className={styles.scoreText}>{reputation}</span>
          </div>
        </div>
      </div>
      <div className={styles.reputationInfo}>
        <p className={styles.label}>Reputation</p>
        <p className={styles.reputationLabel} style={{ color }}>
          {label}
        </p>
      </div>
    </div>
  );
}
