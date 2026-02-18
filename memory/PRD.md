# Fractal Terminal PRD — BLOCK 72.1 Complete

## Original Problem Statement
Клонировать репозиторий, работать с областью Fractal. Завершить BLOCK 72.1 — 7D Directional Arrow Mode.

## What's Been Implemented

### BLOCK 72.1 — 7D = Directional Arrow Only (COMPLETE)

**Проблема:** 7D с 2 точками выглядел как "палка" - фейковая линия.

**Решение:** Полностью убрали trajectory/capsule для 7D. Только стрелка направления.

**На графике 7D теперь:**
- ✅ Зелёная/красная/серая стрелка ↑ / ↓ / →
- ✅ "7D OUTLOOK" label
- ✅ Bias: BULLISH / BEARISH / NEUTRAL
- ✅ Expected: +2.4%
- ✅ Conf: 42%
- ✅ Мини-бокс: Matches, Hit Rate, Timing

**Мини-панель под графиком:**
- ✅ Bias badge + Expected % + Target Price
- ✅ Conf / Matches / Hit Rate
- ✅ TIMING: WAIT / ENTER / EXIT

**Файлы:**
- `/app/frontend/src/components/fractal/chart/layers/draw7dArrow.js` (NEW)
- `/app/frontend/src/components/fractal/chart/ForecastSummary7d.jsx` (SIMPLIFIED)
- `/app/frontend/src/components/fractal/chart/FractalChartCanvas.jsx` (UPDATED)

### 14D+ остаётся как trajectory mode
- Полная траектория с fan
- Маркеры на ключевых днях

## Prioritized Backlog

### P0 (Next)
- [ ] STEP 72.2 — 14D spline continuity (добавить 7D point внутренне)
- [ ] STEP 72.3 — 365D % axis normalization

### P1  
- [ ] BLOCK 73 — Interactive Phase Shading
- [ ] Market State Header

### P2
- [ ] Fractal Explorer
- [ ] Export functionality

## Technical Notes
- 7D render mode: ARROW (draw7dArrow.js)
- 14D+ render mode: TRAJECTORY (drawForecast.js)
- Focus detection in FractalChartCanvas.jsx
