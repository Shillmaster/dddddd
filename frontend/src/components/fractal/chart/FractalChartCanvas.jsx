import React, { useEffect, useMemo, useRef, useState } from "react";
import { drawBackground } from "./layers/drawBackground";
import { drawGrid } from "./layers/drawGrid";
import { drawCandles } from "./layers/drawCandles";
import { drawSMA } from "./layers/drawSMA";
import { drawPhases } from "./layers/drawPhases";
import { drawForecast } from "./layers/drawForecast";
import { makeIndexXScale, makeYScale, paddedMinMax } from "./math/scale";

function Tooltip({ candle, sma, phase }) {
  const date = new Date(candle.t).toLocaleDateString();
  const up = candle.c >= candle.o;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        background: "#fff",
        border: "1px solid #e5e5e5",
        padding: "12px 14px",
        fontSize: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        borderRadius: 8,
        minWidth: 140,
        zIndex: 10
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{date}</div>
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "rgba(0,0,0,0.5)" }}>Open</span>
          <span>{candle.o.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "rgba(0,0,0,0.5)" }}>High</span>
          <span>{candle.h.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "rgba(0,0,0,0.5)" }}>Low</span>
          <span>{candle.l.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "rgba(0,0,0,0.5)" }}>Close</span>
          <span style={{ color: up ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
            {candle.c.toLocaleString()}
          </span>
        </div>
        {sma && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(0,0,0,0.5)" }}>SMA200</span>
            <span style={{ color: "#3b82f6" }}>{sma.toLocaleString()}</span>
          </div>
        )}
        {phase && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ color: "rgba(0,0,0,0.5)" }}>Phase</span>
            <span style={{ fontWeight: 500 }}>{phase}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function FractalChartCanvas({ chart, forecast, width, height }) {
  const ref = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  // Increased right margin for forecast zone (enough for full 30d + labels)
  const margins = useMemo(() => ({ left: 60, right: 320, top: 24, bottom: 36 }), []);

  // Mouse handler
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !chart?.candles?.length) return;

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;

      const plotW = width - margins.left - margins.right;
      const step = plotW / (chart.candles.length - 1);
      const index = Math.round((mx - margins.left) / step);

      if (index >= 0 && index < chart.candles.length) {
        setHoverIndex(index);
      } else {
        setHoverIndex(null);
      }
    };

    const handleLeave = () => setHoverIndex(null);

    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseleave", handleLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [chart, width, margins]);

  // Render
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawBackground(ctx, width, height);

    if (!chart?.candles?.length) {
      drawGrid(ctx, width, height, margins.left, margins.top, margins.right, margins.bottom);
      return;
    }

    const candles = chart.candles;
    const ts = candles.map(c => c.t);

    // y min/max — include forecast range if available
    let minY = Infinity, maxY = -Infinity;
    for (const c of candles) {
      if (c.l < minY) minY = c.l;
      if (c.h > maxY) maxY = c.h;
    }
    
    // Extend Y range to include forecast band
    if (forecast?.pricePath?.length) {
      // New format: pricePath, upperBand, lowerBand arrays
      for (let i = 0; i < forecast.pricePath.length; i++) {
        const upper = forecast.upperBand?.[i];
        const lower = forecast.lowerBand?.[i];
        if (upper && upper > maxY) maxY = upper;
        if (lower && lower < minY) minY = lower;
      }
      // Also consider tail floor
      if (forecast.tailFloor && forecast.tailFloor < minY) {
        minY = forecast.tailFloor;
      }
    } else if (forecast?.points?.length) {
      // Legacy format support
      for (const p of forecast.points) {
        if (p.lower < minY) minY = p.lower;
        if (p.upper > maxY) maxY = p.upper;
      }
      if (forecast.tailFloor && forecast.tailFloor < minY) {
        minY = forecast.tailFloor;
      }
    }
    
    const mm = paddedMinMax(minY, maxY, 0.08);

    const { x, step, plotW } = makeIndexXScale(candles.length, margins.left, margins.right, width);
    const { y } = makeYScale(mm.minY, mm.maxY, margins.top, margins.bottom, height);

    // phases -> grid -> candles -> sma -> forecast
    drawPhases(ctx, chart.phaseZones, ts, x, margins.top, height, margins.bottom);
    drawGrid(ctx, width, height, margins.left, margins.top, margins.right, margins.bottom);
    drawCandles(ctx, candles, x, y, step);
    drawSMA(ctx, chart.sma200, ts, x, y);

    // anchor at last candle x
    const xAnchor = x(candles.length - 1);
    drawForecast(ctx, forecast, xAnchor, y, plotW, margins.top, margins.bottom, height);

    // Crosshair
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < candles.length) {
      const xi = x(hoverIndex);
      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(xi, margins.top);
      ctx.lineTo(xi, height - margins.bottom);
      ctx.stroke();
      ctx.restore();
    }

    // Y-axis labels
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = "11px system-ui";
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const price = mm.minY + (i / yTicks) * (mm.maxY - mm.minY);
      const yPos = y(price);
      ctx.fillText(price.toLocaleString(undefined, { maximumFractionDigits: 0 }), 4, yPos + 4);
    }
    ctx.restore();

  }, [chart, forecast, width, height, margins, hoverIndex]);

  const hoverCandle = hoverIndex !== null && chart?.candles?.[hoverIndex];
  const hoverSma = hoverCandle && chart?.sma200?.find(s => s.t === hoverCandle.t)?.value;
  const hoverPhase = hoverCandle && chart?.phaseZones?.find(
    z => hoverCandle.t >= z.from && hoverCandle.t <= z.to
  )?.phase;

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={ref} style={{ cursor: "crosshair" }} />
      {hoverCandle && (
        <Tooltip candle={hoverCandle} sma={hoverSma} phase={hoverPhase} />
      )}
    </div>
  );
}
