# Fractal Terminal PRD — BLOCK 73.2 Complete

## What's Been Implemented

### BLOCK 73.2 — Divergence Engine ✅ (Feb 18, 2026)

**Цель:** Оценивать расхождение между Synthetic и Replay, не просто показывать две линии.

**Backend (`divergence.service.ts`):**
- **RMSE**: Root mean square error (%)
- **MAPE**: Mean absolute % error
- **MaxAbsDev**: Maximum absolute deviation (%)
- **TerminalDelta**: End-point divergence (%)
- **DirectionalMismatch**: % of days with opposite direction
- **Correlation**: Pearson correlation on daily returns

**Composite Score (0-100):**
- Tier-specific weights (TIMING/TACTICAL/STRUCTURE)
- TIMING: больше terminalDelta + dirMismatch
- STRUCTURE: больше corr + rmse

**Grades:**
- A: ≥85 (green)
- B: 70-84 (lime)
- C: 55-69 (amber)
- D: 40-54 (orange)
- F: <40 (red)

**Warning Flags:**
- `HIGH_DIVERGENCE` — RMSE > 15%
- `LOW_CORR` — correlation < 0.3
- `TERM_DRIFT` — terminal delta > 20%
- `DIR_MISMATCH` — direction mismatch > 55%
- `PERFECT_MATCH` — RMSE ≤ 1%

**Frontend (`FractalHybridChart.jsx`):**
- Grade badge (B (73), D (49), etc.)
- RMSE display
- Details row: Correlation, Terminal Δ, Dir Mismatch, Sample
- Warning chips (orange badges)

**Results:**
- 30D: Score 73 (B), RMSE 3.0% — хорошее совпадение
- 365D: Score 49 (D), RMSE 39.2%, flag: "High Divergence" — ожидаемо для long horizon

### BLOCK 73.1.1 — STRUCTURE % MODE ✅
- Y-axis в % для 180D/365D horizons
- NOW reference line

### BLOCK 73.1 — Primary Match Selection Engine ✅
- Weighted scoring для выбора Primary Match
- 5 компонентов scoring

---

## Prioritized Backlog

### P1 (Next)
- [ ] **BLOCK 73.3 — 14D Continuity Fix** — убрать визуальный обрыв линии 7→14

### P2
- [ ] Tooltip component scores
- [ ] Auto-penalty в sizing stack на основе divergence
- [ ] BLOCK 74 — Multi-Horizon Intelligence Stack

---

## Technical Notes

### Files Created/Updated (BLOCK 73.2)
**Backend:**
- `/app/backend/src/modules/fractal/engine/divergence.service.ts` — NEW
- `/app/backend/src/modules/fractal/focus/focus.types.ts` — Added `DivergenceMetrics`
- `/app/backend/src/modules/fractal/focus/focus-pack.builder.ts` — Integration

**Frontend:**
- `/app/frontend/src/components/fractal/chart/FractalHybridChart.jsx` — Updated panel

### API Response Structure
```json
{
  "focusPack": {
    "divergence": {
      "score": 73,
      "grade": "B",
      "rmse": 3.04,
      "corr": 0.556,
      "terminalDelta": 0,
      "directionalMismatch": 37.9,
      "flags": [],
      "samplePoints": 30
    }
  }
}
```

### Testing
- Backend API: curl verified (30D: B/73, 365D: F/34)
- Screenshots: 30D and 365D Hybrid mode working correctly
