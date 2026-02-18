/**
 * BLOCK 57.2 — Calibration Delta Panel
 * 
 * Shows:
 * - ΔECE (Expected Calibration Error)
 * - ΔBrier Score
 * - Warning if Shadow wins on performance but loses on calibration
 */

import React from 'react';

export default function CalibrationPanel({ calibration, state }) {
  const active = calibration?.active || {};
  const shadow = calibration?.shadow || {};

  const activeECE = (active.ece || 0) * 100;
  const shadowECE = (shadow.ece || 0) * 100;
  const deltaECE = shadowECE - activeECE;

  const activeBrier = (active.brier || 0) * 100;
  const shadowBrier = (shadow.brier || 0) * 100;
  const deltaBrier = shadowBrier - activeBrier;

  // Warning: if ECE or Brier degraded significantly (>2%)
  const calibrationWarning = deltaECE > 2 || deltaBrier > 2;

  const noData = !active.ece && !shadow.ece;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Calibration Delta</h3>
        <span style={styles.subtitle}>{state.preset} · {state.horizonKey}</span>
      </div>

      {noData ? (
        <div style={styles.noData}>
          No calibration data available yet
        </div>
      ) : (
        <>
          <div style={styles.grid}>
            {/* ECE Card */}
            <div style={styles.card}>
              <span style={styles.cardLabel}>Expected Calibration Error (ECE)</span>
              <div style={styles.cardRow}>
                <div style={styles.valueBlock}>
                  <span style={styles.roleLabel}>ACTIVE</span>
                  <span style={styles.value}>{activeECE.toFixed(2)}%</span>
                </div>
                <div style={styles.valueBlock}>
                  <span style={styles.roleLabel}>SHADOW</span>
                  <span style={{ ...styles.value, color: '#3b82f6' }}>{shadowECE.toFixed(2)}%</span>
                </div>
                <div style={styles.valueBlock}>
                  <span style={styles.roleLabel}>Δ</span>
                  <span style={{
                    ...styles.deltaValue,
                    color: deltaECE < 0 ? '#22c55e' : deltaECE > 2 ? '#ef4444' : '#64748b'
                  }}>
                    {deltaECE >= 0 ? '+' : ''}{deltaECE.toFixed(2)}%
                  </span>
                </div>
              </div>
              <p style={styles.hint}>Lower is better (more calibrated)</p>
            </div>

            {/* Brier Card */}
            <div style={styles.card}>
              <span style={styles.cardLabel}>Brier Score</span>
              <div style={styles.cardRow}>
                <div style={styles.valueBlock}>
                  <span style={styles.roleLabel}>ACTIVE</span>
                  <span style={styles.value}>{activeBrier.toFixed(2)}%</span>
                </div>
                <div style={styles.valueBlock}>
                  <span style={styles.roleLabel}>SHADOW</span>
                  <span style={{ ...styles.value, color: '#3b82f6' }}>{shadowBrier.toFixed(2)}%</span>
                </div>
                <div style={styles.valueBlock}>
                  <span style={styles.roleLabel}>Δ</span>
                  <span style={{
                    ...styles.deltaValue,
                    color: deltaBrier < 0 ? '#22c55e' : deltaBrier > 2 ? '#ef4444' : '#64748b'
                  }}>
                    {deltaBrier >= 0 ? '+' : ''}{deltaBrier.toFixed(2)}%
                  </span>
                </div>
              </div>
              <p style={styles.hint}>Lower is better (more accurate probability)</p>
            </div>
          </div>

          {/* Warning Banner */}
          {calibrationWarning && (
            <div style={styles.warning}>
              <span style={styles.warningIcon}>⚠️</span>
              <span>
                <strong>Calibration Degraded:</strong> Shadow may show better performance metrics
                but has worse probability calibration. This could indicate overfitting or
                confidence bias. Investigate before promotion.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 20,
    marginBottom: 24
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a'
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b'
  },
  noData: {
    padding: 24,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16
  },
  card: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    border: '1px solid #e2e8f0'
  },
  cardLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 12
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12
  },
  valueBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  roleLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase'
  },
  value: {
    fontSize: 16,
    fontWeight: 600,
    color: '#0f172a',
    fontFamily: 'ui-monospace, monospace'
  },
  deltaValue: {
    fontSize: 16,
    fontWeight: 700,
    fontFamily: 'ui-monospace, monospace'
  },
  hint: {
    margin: '8px 0 0 0',
    fontSize: 10,
    color: '#94a3b8'
  },
  warning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: 8,
    fontSize: 12,
    color: '#92400e'
  },
  warningIcon: {
    fontSize: 16
  }
};
