import React, { useEffect, useMemo, useState } from "react";
import { FractalChartCanvas } from "./FractalChartCanvas";

/**
 * BLOCK 70.2 STEP 2 — Focus-Aware Main Chart
 * 
 * UPDATED: Uses focusPack from useFocusPack hook for real horizon binding.
 * When focus changes, the entire forecast and distribution fan changes.
 * 
 * Props:
 * - focus: Current horizon ('7d'|'14d'|'30d'|'90d'|'180d'|'365d')
 * - focusPack: Data from useFocusPack hook
 */

export function FractalMainChart({ 
  symbol = "BTC", 
  width = 1100, 
  height = 420,
  focus = '30d',
  focusPack = null
}) {
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL || '';

  // Fetch chart data (candles, sma200, phases) - this doesn't depend on focus
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

  // Build forecast from focusPack - this changes with focus
  const forecast = useMemo(() => {
    const candles = chart?.candles;
    if (!candles?.length) return null;
    if (!focusPack?.forecast) return null;

    const currentPrice = candles[candles.length - 1].c;
    const fp = focusPack.forecast;
    const meta = focusPack.meta;
    const overlay = focusPack.overlay;
    
    // Get aftermath days from meta
    const aftermathDays = meta?.aftermathDays || 30;
    
    // Build markers from focusPack forecast
    const markers = fp.markers || [];
    
    // Convert distribution-based forecast to chart format
    // pricePath = central path (p50)
    // upperBand/lowerBand = confidence bands
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
      // Include distribution stats for display
      stats: overlay?.stats || {}
    };
  }, [chart, focusPack]);

  if (loading) {
    return (
      <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 12 }}>
        <div style={{ color: "rgba(0,0,0,0.5)", fontSize: 14 }}>Loading chart...</div>
      </div>
    );
  }

  return (
    <div style={{ width, background: "#fff", borderRadius: 12, overflow: "hidden" }}>
      <FractalChartCanvas chart={chart} forecast={forecast} width={width} height={height} />
    </div>
  );
}
