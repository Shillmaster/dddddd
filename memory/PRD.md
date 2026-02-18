# Fractal Terminal PRD — BLOCK 73.1.1 Complete

## What's Been Implemented

### BLOCK 73.1.1 — STRUCTURE % MODE (Y-Axis Normalization) ✅ (Feb 18, 2026)

**Цель:** На горизонтах 180D/365D переключить Y-axis в % от NOW для читаемости структуры.

**Проблема до фикса:**
- 365D price scale показывал raw $ → огромный диапазон
- BTC history сжимала forecast в "линейку"
- Структура не читалась

**Решение (backend-driven):**
1. Добавлен тип `NormalizedSeries` в `focus.types.ts`:
   ```ts
   interface NormalizedSeries {
     mode: 'RAW' | 'PERCENT';
     basePrice: number;
     rawPath: number[];
     percentPath: number[];
     ...
     yRange: { minPercent, maxPercent, minPrice, maxPrice }
   }
   ```

2. Backend (`focus-pack.builder.ts`) определяет mode:
   - TIMING/TACTICAL (7d-90d) → `mode: RAW`
   - STRUCTURE (180d-365d) → `mode: PERCENT`

3. Frontend (`FractalChartCanvas.jsx`):
   - Читает `normalizedSeries.mode`
   - Создаёт % Y-scale для STRUCTURE
   - Рисует NOW reference line (зелёная пунктирная)
   - Y-axis labels: `+224%`, `-54%` вместо `$132,671`

**Результат:**
- 365D: Y-axis теперь `+224%` to `-124%`
- NOW reference line видна
- Forecast читаемый: `+99.9%`
- P95 Tail Risk виден
- История BTC структурно понятна

### BLOCK 73.1 — Primary Match Selection Engine ✅

- Weighted scoring engine для выбора Primary Match
- 5 компонентов: similarity, volatility, stability, outcome quality, recency
- Веса адаптируются под tier горизонта

### Previous Implementations ✅
- STEP A: Canvas Refactor (3 Modes: Price/Replay/Hybrid)
- BLOCK 72: 7D Insight Block
- 14D+ Spline Smoothing

---

## Prioritized Backlog

### P1 (Next)
- [ ] **BLOCK 73.2 — Divergence Engine** — Calculate and display `Divergence Score`
- [ ] **14D Continuity Fix** — Убрать визуальный обрыв 7→14

### P2
- [ ] Tooltip component scores (институциональная прозрачность)
- [ ] BLOCK 74 — Multi-Horizon Intelligence Stack
- [ ] BLOCK 75 — Memory & Self-Validation Layer

---

## Technical Notes

### Files Changed (BLOCK 73.1.1)
**Backend:**
- `/app/backend/src/modules/fractal/focus/focus.types.ts` — Added `NormalizedSeries`, `AxisMode`
- `/app/backend/src/modules/fractal/focus/focus-pack.builder.ts` — Added `buildNormalizedSeries()`

**Frontend:**
- `/app/frontend/src/components/fractal/chart/FractalChartCanvas.jsx` — % mode rendering
- `/app/frontend/src/components/fractal/chart/FractalMainChart.jsx` — Pass normalizedSeries
- `/app/frontend/src/components/fractal/chart/FractalHybridChart.jsx` — Pass normalizedSeries

### Axis Mode Logic
```js
const axisMode = normalizedSeries?.mode === 'PERCENT' ? 'PERCENT' : 'PRICE';
```

### Testing
- Backend API verified (365D returns `mode: PERCENT`, 30D returns `mode: RAW`)
- Screenshots: 30D ($), 180D (%), 365D (%) — all working correctly
