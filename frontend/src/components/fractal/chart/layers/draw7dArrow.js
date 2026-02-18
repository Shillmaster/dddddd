/**
 * BLOCK 72.1 — 7D Directional Arrow Mode
 * 
 * For 7D horizon we show ONLY:
 * - Direction arrow (up/down)
 * - Expected return %
 * - Confidence
 * - Timing label
 * 
 * NO trajectory, NO spline, NO capsule, NO fan.
 * 7D = direction bias, not macro forecast.
 * 
 * This is how institutional desks show short-term bias.
 */

export function draw7dArrow(
  ctx,
  distribution, // { p10, p25, p50, p75, p90 } - returns at day 7
  currentPrice,
  xRightAnchor,
  y,
  marginTop,
  marginBottom,
  canvasHeight,
  confidence = 42,
  sampleSize = 15,
  hitRate = 0.6
) {
  if (!distribution) return;
  
  const { p50 } = distribution;
  
  // Determine direction and bias
  const direction = p50 > 0.005 ? 'up' : p50 < -0.005 ? 'down' : 'neutral';
  const bias = p50 > 0.005 ? 'BULLISH' : p50 < -0.005 ? 'BEARISH' : 'NEUTRAL';
  
  // Colors
  const colors = {
    up: '#16a34a',    // green
    down: '#dc2626',  // red
    neutral: '#6b7280' // gray
  };
  const color = colors[direction];
  
  // === 1. FORECAST ZONE BACKGROUND (subtle) ===
  ctx.save();
  const zoneWidth = 200;
  const bgGradient = ctx.createLinearGradient(
    xRightAnchor, 0,
    xRightAnchor + zoneWidth, 0
  );
  bgGradient.addColorStop(0, "rgba(0,0,0,0.03)");
  bgGradient.addColorStop(1, "rgba(0,0,0,0.01)");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(
    xRightAnchor,
    marginTop,
    zoneWidth,
    canvasHeight - marginTop - marginBottom
  );
  ctx.restore();
  
  // === 2. NOW SEPARATOR ===
  ctx.save();
  ctx.strokeStyle = "rgba(180, 0, 0, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(xRightAnchor, marginTop);
  ctx.lineTo(xRightAnchor, canvasHeight - marginBottom);
  ctx.stroke();
  ctx.restore();
  
  // === 3. NOW LABEL ===
  ctx.save();
  ctx.fillStyle = "#dc2626";
  ctx.font = "bold 10px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("NOW", xRightAnchor, marginTop - 6);
  ctx.restore();
  
  // === 4. ARROW POSITION ===
  const arrowX = xRightAnchor + 60;
  const arrowY = y(currentPrice);
  const arrowLength = 40;
  
  // === 5. DRAW ARROW ===
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (direction === 'up') {
    // Arrow pointing up
    const tipY = arrowY - arrowLength;
    
    // Shaft
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX, tipY + 12);
    ctx.stroke();
    
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(arrowX, tipY);
    ctx.lineTo(arrowX - 10, tipY + 16);
    ctx.lineTo(arrowX + 10, tipY + 16);
    ctx.closePath();
    ctx.fill();
    
  } else if (direction === 'down') {
    // Arrow pointing down
    const tipY = arrowY + arrowLength;
    
    // Shaft
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX, tipY - 12);
    ctx.stroke();
    
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(arrowX, tipY);
    ctx.lineTo(arrowX - 10, tipY - 16);
    ctx.lineTo(arrowX + 10, tipY - 16);
    ctx.closePath();
    ctx.fill();
    
  } else {
    // Neutral - horizontal arrow/line
    ctx.beginPath();
    ctx.moveTo(arrowX - 20, arrowY);
    ctx.lineTo(arrowX + 20, arrowY);
    ctx.stroke();
    
    // Diamond marker
    ctx.beginPath();
    ctx.moveTo(arrowX + 25, arrowY);
    ctx.lineTo(arrowX + 35, arrowY - 6);
    ctx.lineTo(arrowX + 45, arrowY);
    ctx.lineTo(arrowX + 35, arrowY + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  
  // === 6. TEXT LABELS (right of arrow) ===
  const textX = arrowX + 30;
  const textY = direction === 'up' ? arrowY - arrowLength - 10 : 
                direction === 'down' ? arrowY + arrowLength + 20 :
                arrowY - 30;
  
  ctx.save();
  
  // "7D OUTLOOK" header
  ctx.font = "bold 10px system-ui";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.textAlign = "left";
  ctx.fillText("7D OUTLOOK", textX, textY);
  
  // Bias badge
  ctx.font = "bold 13px system-ui";
  ctx.fillStyle = color;
  const biasSymbol = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
  ctx.fillText(`${biasSymbol} ${bias}`, textX, textY + 16);
  
  // Expected return
  const p50Pct = (p50 * 100).toFixed(1);
  const sign = p50 >= 0 ? '+' : '';
  ctx.font = "bold 14px system-ui";
  ctx.fillText(`${sign}${p50Pct}%`, textX, textY + 34);
  
  // Confidence
  ctx.font = "11px system-ui";
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText(`Conf: ${confidence.toFixed(0)}%`, textX, textY + 50);
  
  ctx.restore();
  
  // === 7. MINI SUMMARY BOX (bottom right) ===
  const boxX = xRightAnchor + 20;
  const boxY = canvasHeight - marginBottom - 60;
  const boxW = 140;
  const boxH = 50;
  
  ctx.save();
  
  // Box background
  ctx.fillStyle = `${color}10`;
  ctx.strokeStyle = `${color}40`;
  ctx.lineWidth = 1;
  roundedRect(ctx, boxX, boxY, boxW, boxH, 6);
  ctx.fill();
  ctx.stroke();
  
  // Box content
  ctx.font = "10px system-ui";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.textAlign = "left";
  
  ctx.fillText(`Matches: ${sampleSize}`, boxX + 10, boxY + 18);
  ctx.fillText(`Hit Rate: ${(hitRate * 100).toFixed(0)}%`, boxX + 10, boxY + 32);
  
  // Timing action
  let timing = 'WAIT';
  if (bias === 'BULLISH' && confidence > 50) timing = 'ENTER';
  else if (bias === 'BEARISH' && confidence > 50) timing = 'EXIT';
  
  ctx.font = "bold 10px system-ui";
  ctx.fillStyle = timing === 'ENTER' ? '#16a34a' : timing === 'EXIT' ? '#dc2626' : '#f59e0b';
  ctx.fillText(`Timing: ${timing}`, boxX + 10, boxY + 46);
  
  ctx.restore();
}

// Helper function to draw rounded rectangles
function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
