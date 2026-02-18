# Fractal Terminal PRD — BLOCK 70.2 STEP 2

## Original Problem Statement
Клонировать репозиторий https://github.com/Shillmaster/ttrtrt66, поднять фронт, бэкенд, админку. Работать только с областью Fractal. Завершить STEP 2 — Real Horizon Binding для фронтенда.

## Architecture
- **Backend**: TypeScript/Fastify (запускается через Python proxy на port 8001)
- **Frontend**: React/CRA (port 3000)
- **Database**: MongoDB (local)
- **Key Module**: `/app/backend/src/modules/fractal/`

## User Personas
- Institutional Traders (target: hedge funds, prop trading)
- Quantitative Analysts
- System Administrators (via Admin Panel)

## Core Requirements (Static)
1. Multi-horizon fractal analysis (7D/14D/30D/90D/180D/365D)
2. Real-time horizon switching with full redraw
3. Distribution-based forecasting
4. Pattern matching engine
5. Admin dashboard for monitoring

## What's Been Implemented
### Date: 2026-02-18

**STEP 2 — Real Horizon Binding (COMPLETE)**

1. ✅ **HorizonSelector UI** - All 6 horizons with tier color coding (TIMING/TACTICAL/STRUCTURE)
2. ✅ **useFocusPack Hook** - AbortController, caching, proper data flow
3. ✅ **FractalMainChart** - Updated to use focusPack instead of hardcoded API calls
4. ✅ **drawForecast.js** - Dynamic markers based on current focus (not hardcoded 7d/14d/30d)
5. ✅ **Backend focus-pack API** - Returns correct distributionSeries length for each horizon
6. ✅ **FocusInfoPanel** - Shows current focus, window, aftermath, matches, quality
7. ✅ **Admin Dashboard** - Working at /admin/fractal

**API Validation Results:**
- 7D: distLen=7, matches=15
- 14D: distLen=14, matches=12  
- 30D: distLen=30, matches=10
- 90D: distLen=90, matches=8
- 180D: distLen=180, matches=6
- 365D: distLen=365, matches=5

## Prioritized Backlog

### P0 (Next)
- [ ] STEP 3 — Interactive Phase Shading (клик по фазе → открывается конкретный исторический фрактал с outcome)

### P1
- [ ] Fix StrategyPanel API endpoint
- [ ] ForwardPerformancePanel integration
- [ ] Matches modal/drawer for detailed analysis

### P2
- [ ] Fractal Overlay mode improvements
- [ ] Export functionality
- [ ] Real-time data updates

## Technical Notes
- Backend runs as proxy: Python FastAPI (8001) → TypeScript Fastify (8002)
- Frontend .env: REACT_APP_BACKEND_URL must match preview domain
- Focus-pack API: `/api/fractal/v2.1/focus-pack?symbol=BTC&focus=30d`

## Files Modified (STEP 2)
- `/app/frontend/src/components/fractal/chart/FractalMainChart.jsx`
- `/app/frontend/src/components/fractal/chart/layers/drawForecast.js`
