# Fractal Terminal PRD

## Original Problem Statement
Клонировать репозиторий https://github.com/Shillmaster/JJcbjee, поднять фронт, бэк и админку. Работа только с модулем Fractal. Последний таск: BLOCK 73.5.2 → BLOCK 73.6.

## Architecture
- **Backend**: Node.js/TypeScript (Fastify) on port 8002, proxied via Python FastAPI on 8001
- **Frontend**: React with Tailwind CSS on port 3000
- **Database**: MongoDB (configured via MONGO_URL)

## User Personas
- Institutional traders analyzing crypto market phases
- Quantitative analysts researching fractal patterns
- Portfolio managers making sizing decisions

## Core Requirements
1. Multi-horizon fractal analysis (7D-365D)
2. Phase detection (ACCUMULATION, MARKUP, DISTRIBUTION, MARKDOWN, RECOVERY, CAPITULATION)
3. Match overlay with historical patterns
4. Hybrid projection (Synthetic vs Replay)
5. Phase-aware filtering and drilldown
6. Phase performance attribution with grades

## What's Been Implemented

### Session: 2026-02-18

#### BLOCK 73.5.2 — Phase Click Drilldown (COMPLETED)
- Backend: Фильтрация matches по типу фазы (phaseId → phaseType extraction)
- Frontend: Клик по фазе на графике → PhaseFilterBar с контекстом фазы + Clear Filter
- Hook: useFocusPack теперь поддерживает filterByPhase(phaseId)

#### BLOCK 73.6 — Phase Performance Heatmap (COMPLETED)
**Backend:**
- New endpoint: `/api/fractal/v2.1/admin/phase-performance`
- Service: `phase-performance.service.ts` with:
  - Tier-separated analysis (TIMING/TACTICAL/STRUCTURE)
  - Grade calculation (A-F based on composite score)
  - Metrics: hitRate, avgRet, medianRet, sharpe, profitFactor, expectancy, maxDD
  - Sample quality indicators (OK/LOW_SAMPLE/VERY_LOW_SAMPLE)
  - Fallback mode using overlay data when no resolved snapshots
- Routes registered in `fractal.module.ts`

**Frontend:**
- New component: `PhaseHeatmap.jsx`
- Features:
  - Grade-colored rows (A=green, F=red)
  - Global Baseline stats bar
  - Per-phase metrics (Samples, Hit Rate, Avg Ret, Sharpe, Score)
  - Filter button integration with Phase Click Drilldown (73.5.2)
  - Expandable row details on click
- Integrated in FractalPage.js under chart

**Testing Results:**
- Backend: 100% (all 6 phases returned with grades and metrics)
- Frontend: Heatmap visible and functional

## Prioritized Backlog

### P0 (Critical)
- [x] BLOCK 73.5.2 Phase Click Drilldown
- [x] BLOCK 73.6 Phase Performance Heatmap

### P1 (High Priority)
- [ ] BLOCK 73.7 — Phase-Aware Sizing Multiplier
- [ ] External Ingress routing fix for production preview domain (Cloudflare 520)

### P2 (Medium Priority)
- [ ] Phase comparison overlay (Phase-only vs Global distribution)
- [ ] Keyboard shortcuts (Esc to clear filter)
- [ ] "Insufficient phase matches" fallback logic

## Next Tasks
1. Implement BLOCK 73.7 Phase-Aware Sizing (grade → multiplier: A=×1.15, D=×0.65)
2. Add keyboard shortcut (Esc) to clear phase filter
3. Consider resolved snapshots collection for production forward-truth data
