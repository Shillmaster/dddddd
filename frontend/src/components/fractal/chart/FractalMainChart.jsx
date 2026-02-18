import React, { useEffect, useMemo, useState } from "react";
import { FractalChartCanvas } from "./FractalChartCanvas";
import { buildAftermathForecast } from "./math/buildAftermathForecast";

/**
 * BLOCK 52.5.2 — Aftermath-Driven Forecast (Institutional Grade)
 * 
 * Подключает:
 * - /api/fractal/v2.1/chart (свечи, SMA200, фазы)
 * - /api/fractal/v2.1/signal (expectedReturn, confidence, risk)
 * - /api/fractal/v2.1/overlay (aftermath траектория лучшего матча)
 * 
 * Строит forecast на основе реальной исторической траектории,
 * калиброванной под текущий прогноз модели.
 */

export function FractalMainChart({ symbol = "BTC", width = 1100, height = 420 }) {
  const [chart, setChart] = useState(null);
  const [signal, setSignal] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all([
      fetch(`${API_URL}/api/fractal/v2.1/chart?symbol=${symbol}&limit=365`)
        .then(r => r.json())
        .catch(() => null),
      fetch(`${API_URL}/api/fractal/v2.1/signal?symbol=${symbol}`)
        .then(r => r.json())
        .catch(() => null),
      fetch(`${API_URL}/api/fractal/v2.1/overlay?symbol=${symbol}&windowLen=60&topK=5&aftermathDays=30`)
        .then(r => r.json())
        .catch(() => null)
    ]).then(([chartData, signalData, overlayData]) => {
      if (alive) {
        setChart(chartData);
        setSignal(signalData);
        setOverlay(overlayData);
        setLoading(false);
      }
    });

    return () => { alive = false; };
  }, [symbol, API_URL]);

  // Build aftermath-driven forecast
  const forecast = useMemo(() => {
    const candles = chart?.candles;
    if (!candles?.length) return null;
    if (!signal?.signalsByHorizon?.["30d"]) return null;

    const currentPrice = candles[candles.length - 1].c;
    
    // Get returns from signal
    const R7 = signal.signalsByHorizon["7d"]?.expectedReturn ?? 0;
    const R14 = signal.signalsByHorizon["14d"]?.expectedReturn ?? 0;
    const R30 = signal.signalsByHorizon["30d"]?.expectedReturn ?? 0;
    
    // Get risk metrics
    const confidence = signal.assembled?.confidence ?? 0.01;
    const maxDD_WF = signal.risk?.maxDD_WF ?? 0.08;
    const mcP95_DD = signal.risk?.mcP95_DD ?? 0.5;

    // Get best match aftermath from overlay
    const bestMatch = overlay?.matches?.[0];
    const aftermathNormalized = bestMatch?.aftermathNormalized || null;

    // If we have match-specific returns, use them (more accurate)
    const matchR7 = bestMatch?.return7d ?? R7;
    const matchR14 = bestMatch?.return14d ?? R14;
    const matchR30 = bestMatch?.return30d ?? R30;

    // Build forecast using aftermath trajectory
    return buildAftermathForecast({
      currentPrice,
      R7: matchR7,
      R14: matchR14,
      R30: matchR30,
      aftermathNormalized,
      maxDD_WF,
      mcP95_DD,
      confidence
    });
  }, [chart, signal, overlay]);

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
