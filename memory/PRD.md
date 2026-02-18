# Fractal Terminal PRD

## Original Problem Statement
Клонировать репозиторий https://github.com/Shillmaster/JJcbjee, поднять фронт, бэк и админку. Работа только с модулем Fractal. Последний таск: BLOCK 73.5.2 — Phase Click Drilldown.

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
2. Phase detection (ACCUMULATION, MARKUP, DISTRIBUTION, MARKDOWN, RECOVERY)
3. Match overlay with historical patterns
4. Hybrid projection (Synthetic vs Replay)
5. Phase-aware filtering and drilldown

## What's Been Implemented

### Session: 2026-02-18

#### BLOCK 73.5.2 — Phase Click Drilldown (COMPLETED)

**Backend Changes:**
- Updated `/app/backend/src/modules/fractal/focus/focus-pack.builder.ts`
- Added phaseId parameter support for filtering matches by phase TYPE
- Phase filter extracts type from phaseId format: `PHASETYPE_FROM_TO`
- Returns phaseFilter object with phaseId, phaseType, filteredMatchCount

**Frontend Changes:**
- Updated `/app/frontend/src/components/fractal/chart/FractalChartCanvas.jsx`
  - Added click handler for phase selection
  - Added selectedPhaseId prop support
  
- Updated `/app/frontend/src/components/fractal/chart/FractalHybridChart.jsx`
  - Added PhaseFilterBar component showing active phase filter
  - Added handlePhaseClick callback for phase selection
  - Integrated with onPhaseFilter prop for parent notification
  
- Updated `/app/frontend/src/hooks/useFocusPack.js`
  - Added phaseId state and filterByPhase function
  - Auto-reset phaseId when focus changes
  
- Updated `/app/frontend/src/pages/FractalPage.js`
  - Connected useFocusPack phase filter to FractalHybridChart

**Testing Results:**
- Backend: 80% pass rate (phase filtering works correctly)
- Frontend: 100% pass rate (all UI interactions working)
- Overall: 95% success

## Prioritized Backlog

### P0 (Critical)
- [x] BLOCK 73.5.2 Phase Click Drilldown

### P1 (High Priority)
- [ ] BLOCK 73.6 — Phase Performance Heatmap
- [ ] External Ingress routing fix for production preview domain

### P2 (Medium Priority)  
- [ ] BLOCK 73.7 — Phase-Aware Sizing multiplier
- [ ] Phase comparison overlay (Phase-only vs Global distribution)

## Next Tasks
1. Implement BLOCK 73.6 Phase Performance Heatmap (table showing HitRate, AvgRet, Grade per phase)
2. Add keyboard shortcut (Esc) to clear phase filter
3. Consider "Insufficient phase matches" fallback logic
