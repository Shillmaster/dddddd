/**
 * BLOCK 52.5.2 — Aftermath-Driven Forecast Renderer (FINAL CALIBRATION)
 * 
 * Features:
 * - Forecast zone background with "FORECAST" label
 * - Vertical separator at forecast start
 * - Price path with confidence decay (fades towards 30d)
 * - √t band growth (institutional standard)
 * - Upgraded tail floor marker with dot and label
 * - Key day markers (7d, 14d, 30d) with proper padding
 * - Forecast info label
 */

export function drawForecast(
  ctx,
  forecast,
  xRightAnchor,
  y,
  plotW,
  marginTop,
  marginBottom,
  canvasHeight
) {
  if (!forecast) return;

  const pricePath = forecast.pricePath;
  const upperBand = forecast.upperBand;
  const lowerBand = forecast.lowerBand;
  
  if (!pricePath?.length) return;

  const N = pricePath.length;
  
  // Forecast zone with right padding for 30d marker
  const rightPadding = 70;
  const forecastZoneWidth = Math.min(plotW * 0.55, 380) - rightPadding;
  
  // Day to X coordinate
  const dayToX = (day) => {
    const frac = day / N;
    return xRightAnchor + frac * forecastZoneWidth;
  };

  // === 1. FORECAST ZONE BACKGROUND ===
  ctx.save();
  
  // Light gray background
  const bgGradient = ctx.createLinearGradient(
    xRightAnchor, 0,
    xRightAnchor + forecastZoneWidth + rightPadding, 0
  );
  bgGradient.addColorStop(0, "rgba(0,0,0,0.03)");
  bgGradient.addColorStop(1, "rgba(0,0,0,0.01)");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(
    xRightAnchor,
    marginTop,
    forecastZoneWidth + rightPadding,
    canvasHeight - marginTop - marginBottom
  );
  ctx.restore();

  // === 2. FORECAST START SEPARATOR ===
  ctx.save();
  ctx.strokeStyle = "rgba(180, 0, 0, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(xRightAnchor, marginTop);
  ctx.lineTo(xRightAnchor, canvasHeight - marginBottom);
  ctx.stroke();
  ctx.restore();

  // === 3. NOW / FORECAST START LABEL ===
  ctx.save();
  ctx.fillStyle = "#dc2626";
  ctx.font = "bold 10px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("NOW", xRightAnchor, marginTop - 6);
  ctx.restore();

  // === 4. CONFIDENCE BAND (√t growth) ===
  if (upperBand?.length && lowerBand?.length) {
    ctx.save();
    ctx.beginPath();
    
    // Start from current price
    ctx.moveTo(xRightAnchor, y(pricePath[0]));
    
    // Upper boundary (forward)
    for (let i = 0; i < upperBand.length; i++) {
      const px = dayToX(i + 1);
      const py = y(upperBand[i]);
      ctx.lineTo(px, py);
    }
    
    // Lower boundary (backward)
    for (let i = lowerBand.length - 1; i >= 0; i--) {
      const px = dayToX(i + 1);
      const py = y(lowerBand[i]);
      ctx.lineTo(px, py);
    }
    
    // Close back to start
    ctx.lineTo(xRightAnchor, y(pricePath[0]));
    ctx.closePath();
    
    // Gradient fill — fades out towards end
    const bandGradient = ctx.createLinearGradient(
      xRightAnchor, 0,
      xRightAnchor + forecastZoneWidth, 0
    );
    bandGradient.addColorStop(0, "rgba(22, 163, 74, 0.20)");
    bandGradient.addColorStop(0.5, "rgba(22, 163, 74, 0.12)");
    bandGradient.addColorStop(1, "rgba(22, 163, 74, 0.05)");
    ctx.fillStyle = bandGradient;
    ctx.fill();
    ctx.restore();

    // Band edges (subtle)
    ctx.save();
    ctx.strokeStyle = "rgba(22, 163, 74, 0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    // Upper edge
    ctx.beginPath();
    ctx.moveTo(xRightAnchor, y(pricePath[0]));
    for (let i = 0; i < upperBand.length; i++) {
      ctx.lineTo(dayToX(i + 1), y(upperBand[i]));
    }
    ctx.stroke();
    
    // Lower edge
    ctx.beginPath();
    ctx.moveTo(xRightAnchor, y(pricePath[0]));
    for (let i = 0; i < lowerBand.length; i++) {
      ctx.lineTo(dayToX(i + 1), y(lowerBand[i]));
    }
    ctx.stroke();
    ctx.restore();
  }

  // === 5. PRICE PATH WITH CONFIDENCE DECAY ===
  // Line becomes less saturated towards 30d
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  
  // Draw path in segments with decreasing opacity
  const segments = 10;
  const segmentLength = Math.floor(pricePath.length / segments);
  
  for (let seg = 0; seg < segments; seg++) {
    const startIdx = seg * segmentLength;
    const endIdx = Math.min((seg + 1) * segmentLength, pricePath.length - 1);
    
    // Confidence decay: alpha goes from 1.0 to 0.6
    const progress = seg / segments;
    const alpha = 1 - progress * 0.4;
    
    ctx.strokeStyle = `rgba(22, 163, 74, ${alpha})`;
    ctx.lineWidth = 2.5 - progress * 0.5; // Slightly thinner towards end
    
    ctx.beginPath();
    if (seg === 0) {
      ctx.moveTo(xRightAnchor, y(pricePath[0]));
    } else {
      ctx.moveTo(dayToX(startIdx), y(pricePath[startIdx - 1]));
    }
    
    for (let i = startIdx; i <= endIdx; i++) {
      ctx.lineTo(dayToX(i + 1), y(pricePath[i]));
    }
    ctx.stroke();
  }
  ctx.restore();

  // === 6. TAIL FLOOR MARKER (UPGRADED) ===
  if (forecast.tailFloor && forecast.tailFloor > 0) {
    const tailY = y(forecast.tailFloor);
    
    // Only draw if within visible range
    if (tailY > marginTop && tailY < canvasHeight - marginBottom) {
      ctx.save();
      
      // Thicker dashed line
      ctx.strokeStyle = "rgba(200, 0, 0, 0.7)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(xRightAnchor, tailY);
      ctx.lineTo(dayToX(N), tailY);
      ctx.stroke();
      
      // Red dot at forecast start
      ctx.beginPath();
      ctx.arc(xRightAnchor, tailY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200, 0, 0, 0.9)";
      ctx.fill();
      
      // Label "P95 Tail Risk"
      ctx.fillStyle = "rgba(200, 0, 0, 0.85)";
      ctx.font = "bold 9px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("P95 Tail Risk", xRightAnchor + 10, tailY - 5);
      
      // Price value at end
      ctx.textAlign = "right";
      ctx.font = "9px system-ui";
      ctx.fillStyle = "rgba(200, 0, 0, 0.7)";
      ctx.fillText(
        forecast.tailFloor.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        dayToX(N) - 4,
        tailY + 12
      );
      ctx.restore();
    }
  }

  // === 7. KEY DAY MARKERS (7d, 14d, 30d) ===
  const keyDays = forecast.keyDays || [
    { day: 7, price: pricePath[6] },
    { day: 14, price: pricePath[13] },
    { day: 30, price: pricePath[N - 1] }
  ];
  
  const displayDays = [7, 14, 30];
  
  displayDays.forEach(day => {
    const kd = keyDays.find(k => k.day === day);
    const dayIndex = Math.min(day - 1, N - 1);
    const price = kd?.price || pricePath[dayIndex];
    if (!price) return;
    
    // For day 30, use the exact last point position
    const actualDay = day === 30 ? N : day;
    const px = dayToX(actualDay);
    const py = y(price);
    
    // Calculate alpha for confidence decay effect
    const progress = day / 30;
    const markerAlpha = 1 - progress * 0.3;
    
    // Circle marker
    ctx.save();
    ctx.fillStyle = `rgba(22, 163, 74, ${markerAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // White inner circle
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Day label
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${0.5 + markerAlpha * 0.2})`;
    ctx.font = "bold 10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${day}d`, px, py - 12);
    ctx.restore();
  });

  // === 8. FORECAST INFO LABEL ===
  const returnPct = ((forecast.R30 || 0) * 100).toFixed(1);
  const confPct = ((forecast.confidence || 0) * 100).toFixed(1);
  const sign = (forecast.R30 || 0) >= 0 ? "+" : "";
  const forecastType = forecast.type === 'aftermath-driven' ? '📈' : '📊';
  
  ctx.save();
  ctx.font = "11px system-ui";
  ctx.textAlign = "left";
  
  const labelX = xRightAnchor + 10;
  const labelY = canvasHeight - marginBottom + 18;
  
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText(`${forecastType} Forecast: ${sign}${returnPct}%`, labelX, labelY);
  
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillText(`Conf: ${confPct}%`, labelX + 130, labelY);
  ctx.restore();
}
