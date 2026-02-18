import React, { useEffect, useMemo, useState } from "react";
import { FractalChartCanvas } from "./FractalChartCanvas";

/**
 * STEP A — Hybrid Projection Chart (MVP)
 * 
 * Shows both projections on same chart:
 * - Synthetic (green) - model forecast
 * - Replay (purple) - best historical match aftermath
 * 
 * Future: divergence analysis, confidence blend
 */

export function FractalHybridChart({ 
  symbol = "BTC", 
  width = 1100, 
  height = 420,
  focus = '30d',
  focusPack = null
}) {
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL || '';

  // Fetch chart data (candles, sma200, phases)
  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetch(`${API_URL}/api/fractal/v2.1/chart?symbol=${symbol}&limit=365`)
      .then(r => r.json())
      .then(chartData => {
        if (alive) {
          setChart(chartData);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [symbol, API_URL]);

  // Build forecast from focusPack
  const forecast = useMemo(() => {
    const candles = chart?.candles;
    if (!candles?.length) return null;
    if (!focusPack?.forecast) return null;

    const currentPrice = candles[candles.length - 1].c;
    const fp = focusPack.forecast;
    const meta = focusPack.meta;
    const overlay = focusPack.overlay;
    
    const aftermathDays = meta?.aftermathDays || 30;
    const markers = fp.markers || [];
    
    // Get distribution series
    const distributionSeries = overlay?.distributionSeries || {};
    const lastIdx = (distributionSeries.p50?.length || 1) - 1;
    const distribution7d = {
      p10: distributionSeries.p10?.[lastIdx] ?? -0.15,
      p25: distributionSeries.p25?.[lastIdx] ?? -0.05,
      p50: distributionSeries.p50?.[lastIdx] ?? 0,
      p75: distributionSeries.p75?.[lastIdx] ?? 0.05,
      p90: distributionSeries.p90?.[lastIdx] ?? 0.15,
    };
    
    return {
      pricePath: fp.path || [],
      upperBand: fp.upperBand || [],
      lowerBand: fp.lowerBand || [],
      tailFloor: fp.tailFloor,
      confidenceDecay: fp.confidenceDecay || [],
      markers: markers.map(m => ({
        day: m.dayIndex + 1,
        horizon: m.horizon,
        price: m.price,
        expectedReturn: m.expectedReturn
      })),
      aftermathDays,
      currentPrice,
      distribution7d,
      stats: overlay?.stats || {}
    };
  }, [chart, focusPack]);
  
  // Get primary replay match - BLOCK 73.1: Use weighted primaryMatch
  const primaryMatch = useMemo(() => {
    if (!chart?.candles?.length) return null;
    
    const currentPrice = chart.candles[chart.candles.length - 1].c;
    
    // BLOCK 73.1: Prefer primarySelection.primaryMatch from backend
    const match = focusPack?.primarySelection?.primaryMatch 
      || focusPack?.overlay?.matches?.[0]; // Fallback for backward compat
    
    if (!match?.aftermathNormalized?.length) return null;
    
    // Convert normalized aftermath to price series
    const replayPath = match.aftermathNormalized.map(r => currentPrice * (1 + r));
    
    return {
      id: match.id,
      date: match.date,
      similarity: match.similarity || 0.75,
      phase: match.phase,
      replayPath,
      // BLOCK 73.1: Include selection metadata
      selectionScore: match.selectionScore,
      selectionReason: match.selectionReason,
      scores: match.scores,
      // For future divergence calculation
      returns: match.aftermathNormalized
    };
  }, [focusPack, chart]);

  if (loading || !chart?.candles) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888' }}>Loading hybrid projection...</div>
      </div>
    );
  }

  const currentPrice = chart.candles[chart.candles.length - 1].c || 0;

  return (
    <div style={{ width, background: "#fff", borderRadius: 12, overflow: "hidden" }}>
      {/* Chart Canvas with hybrid mode */}
      <FractalChartCanvas 
        chart={chart} 
        forecast={forecast} 
        focus={focus}
        mode="hybrid"
        primaryMatch={primaryMatch}
        normalizedSeries={focusPack?.normalizedSeries}
        width={width} 
        height={height} 
      />
      
      {/* Hybrid Summary Panel */}
      <HybridSummaryPanel 
        forecast={forecast}
        primaryMatch={primaryMatch}
        currentPrice={currentPrice}
        focus={focus}
        divergence={focusPack?.divergence}
      />
    </div>
  );
}

/**
 * BLOCK 73.2 — Hybrid Summary Panel with Divergence Engine
 * 
 * Shows: Synthetic, Replay, and full Divergence metrics from backend
 */
function HybridSummaryPanel({ forecast, primaryMatch, currentPrice, focus, divergence }) {
  if (!forecast || !currentPrice) return null;
  
  const syntheticReturn = forecast.pricePath?.length 
    ? ((forecast.pricePath[forecast.pricePath.length - 1] - currentPrice) / currentPrice * 100)
    : 0;
    
  const replayReturn = primaryMatch?.replayPath?.length
    ? ((primaryMatch.replayPath[primaryMatch.replayPath.length - 1] - currentPrice) / currentPrice * 100)
    : null;
  
  // Use backend divergence metrics if available
  const div = divergence || {};
  const score = div.score ?? null;
  const grade = div.grade ?? 'N/A';
  const flags = div.flags ?? [];
  
  // Grade colors
  const gradeColors = {
    'A': '#22c55e',
    'B': '#84cc16',
    'C': '#f59e0b',
    'D': '#f97316',
    'F': '#ef4444',
    'N/A': '#888',
  };
  
  const gradeColor = gradeColors[grade] || '#888';
  
  // Has warnings?
  const hasWarnings = flags.length > 0 && !flags.includes('PERFECT_MATCH');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>HYBRID PROJECTION</span>
        <span style={styles.subtitle}>{focus.toUpperCase()} Horizon</span>
        {/* Grade badge */}
        {score !== null && (
          <span style={{
            ...styles.gradeBadge,
            backgroundColor: gradeColor,
          }}>
            {grade} ({score})
          </span>
        )}
      </div>
      
      <div style={styles.grid}>
        {/* Synthetic Column */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <span style={{ ...styles.dot, backgroundColor: '#22c55e' }}></span>
            SYNTHETIC
          </div>
          <div style={{ ...styles.value, color: syntheticReturn >= 0 ? '#22c55e' : '#ef4444' }}>
            {syntheticReturn >= 0 ? '+' : ''}{syntheticReturn.toFixed(1)}%
          </div>
          <div style={styles.label}>Model Projection</div>
        </div>
        
        {/* Replay Column */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <span style={{ ...styles.dot, backgroundColor: '#8b5cf6' }}></span>
            REPLAY
          </div>
          {replayReturn !== null ? (
            <>
              <div style={{ ...styles.value, color: replayReturn >= 0 ? '#22c55e' : '#ef4444' }}>
                {replayReturn >= 0 ? '+' : ''}{replayReturn.toFixed(1)}%
              </div>
              <div style={styles.label}>
                {primaryMatch?.id || 'Historical'} ({primaryMatch?.selectionScore 
                  ? (primaryMatch.selectionScore * 100).toFixed(0) 
                  : (primaryMatch?.similarity ? (primaryMatch.similarity * 100).toFixed(0) : '—')}% match)
              </div>
            </>
          ) : (
            <div style={styles.noData}>No replay data</div>
          )}
        </div>
        
        {/* Divergence Column - Now from backend */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>DIVERGENCE</div>
          <div style={{ ...styles.value, color: gradeColor }}>
            {div.rmse != null ? `${div.rmse.toFixed(1)}%` : '—'}
          </div>
          <div style={{ ...styles.label, color: gradeColor }}>
            RMSE
          </div>
        </div>
      </div>
      
      {/* BLOCK 73.2: Detailed Divergence Metrics */}
      {divergence && (
        <DivergenceDetails divergence={divergence} hasWarnings={hasWarnings} />
      )}
    </div>
  );
}

/**
 * Detailed divergence metrics panel
 */
function DivergenceDetails({ divergence, hasWarnings }) {
  const { rmse, mape, corr, terminalDelta, directionalMismatch, flags, samplePoints } = divergence;
  
  return (
    <div style={styles.detailsContainer}>
      <div style={styles.detailsGrid}>
        <MetricItem label="Correlation" value={corr?.toFixed(2)} warning={corr < 0.3} />
        <MetricItem label="Terminal Δ" value={`${terminalDelta >= 0 ? '+' : ''}${terminalDelta?.toFixed(1)}%`} warning={Math.abs(terminalDelta) > 20} />
        <MetricItem label="Dir Mismatch" value={`${directionalMismatch?.toFixed(0)}%`} warning={directionalMismatch > 55} />
        <MetricItem label="Sample" value={samplePoints} />
      </div>
      
      {/* Warning flags */}
      {hasWarnings && flags.length > 0 && (
        <div style={styles.flagsRow}>
          {flags.filter(f => f !== 'PERFECT_MATCH').map((flag, i) => (
            <span key={i} style={styles.flag}>
              {formatFlag(flag)}
            </span>
          ))}
        </div>
      )}
      
      {/* Perfect match indicator */}
      {flags.includes('PERFECT_MATCH') && (
        <div style={styles.perfectMatch}>
          ✓ PERFECT ALIGNMENT
        </div>
      )}
    </div>
  );
}

function MetricItem({ label, value, warning }) {
  return (
    <div style={styles.metricItem}>
      <span style={styles.metricLabel}>{label}</span>
      <span style={{ ...styles.metricValue, color: warning ? '#f59e0b' : '#444' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function formatFlag(flag) {
  const labels = {
    'HIGH_DIVERGENCE': 'High Divergence',
    'LOW_CORR': 'Low Correlation',
    'TERM_DRIFT': 'Terminal Drift',
    'DIR_MISMATCH': 'Direction Mismatch',
  };
  return labels[flag] || flag;
}

const styles = {
  container: {
    backgroundColor: '#FAFAFA',
    border: '1px solid #EAEAEA',
    borderRadius: 8,
    padding: '12px 16px',
    marginTop: 8,
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid #EAEAEA',
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    color: '#444',
    letterSpacing: '0.5px',
  },
  subtitle: {
    fontSize: 10,
    color: '#888',
  },
  gradeBadge: {
    marginLeft: 'auto',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    color: '#fff',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 16,
  },
  column: {
    textAlign: 'center',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontSize: 10,
    fontWeight: 600,
    color: '#666',
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  value: {
    fontSize: 18,
    fontWeight: 700,
    fontFamily: 'monospace',
  },
  label: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  noData: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
  },
  // BLOCK 73.2: Details styles
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #EAEAEA',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    fontSize: 9,
    color: '#888',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  flagsRow: {
    display: 'flex',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  flag: {
    padding: '3px 8px',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 600,
    color: '#b45309',
  },
  perfectMatch: {
    marginTop: 10,
    padding: '4px 12px',
    backgroundColor: '#dcfce7',
    border: '1px solid #22c55e',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#166534',
    textAlign: 'center',
  },
};
    fontStyle: 'italic',
  },
};

export default FractalHybridChart;
