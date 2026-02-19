# Fractal Terminal PRD

## Original Problem Statement
Self-learning institutional trading terminal for BTC. Now with Memory & Self-Validation Layer (BLOCK 75) and Institutional Intelligence Layer (BLOCK 76).

## Architecture
- Backend: TypeScript Node.js (Fastify) on port 8002, proxied via Python FastAPI on 8001
- Frontend: React + Tailwind CSS on port 3000
- Database: MongoDB

## Core Requirements
- BTC-only focus
- Fractal pattern matching & analysis
- Multi-horizon consensus (7d/14d/30d/90d/180d/365d)
- Institutional governance controls

## User Personas
1. **Institutional Trader** - Needs consensus signals, sizing recommendations, horizon analysis
2. **Quant Researcher** - Needs raw data, pattern attribution, forward truth validation
3. **Risk Manager** - Needs governance controls, policy audit trail, guardrails

## What's Been Implemented

### Session: 2026-02-19

#### BLOCK 76 — Institutional Intelligence Layer ✅ COMPLETE

##### 76.1 — Consensus Pulse Service
- `GET /api/fractal/v2.1/consensus-pulse?symbol=BTC&days=7`
- 7-day consensus dynamics for terminal header
- Sparkline visualization data
- Sync state detection (ALIGNING/DIVERGING/NEUTRAL/STRUCTURAL_DOMINANCE)
- Structural weight & lock days tracking
- Divergence grade monitoring (A-F)

##### 76.2 — Weekly TG Digest
- `GET /api/fractal/v2.1/admin/weekly-digest/preview` - Preview digest
- `POST /api/fractal/v2.1/admin/weekly-digest/send` - Send to Telegram
- Institutional weekly intelligence report
- Consensus, divergence, attribution summary
- Auto-generated insights

##### 76.1 UI — ConsensusPulseStrip Component
- `/app/frontend/src/components/fractal/ConsensusPulseStrip.jsx`
- Mini sparkline chart
- Consensus index with 7d delta
- Sync state badge (color-coded)
- Structural weight percentage
- Lock days indicator
- Divergence grade badge

### Session: 2026-02-18 (continued 2026-02-19)

#### BLOCK 74 (Previous) — Verified Working
- 74.1: Horizon Stack View (6 horizons with adaptive weights)
- 74.2: Institutional Consensus Panel
- 74.3: Adaptive Weighting 2.0 with Structural Dominance

#### BLOCK 75 — Memory & Self-Validation Layer ✅ COMPLETE

##### 75.1 — Snapshot Persistence
- MongoDB model: `FractalPredictionSnapshot`
- Stores all 6 horizons × 3 presets × 2 roles = 36 snapshots/day
- Full terminal payload preserved for replay
- KernelDigest with direction, consensus, dominance, divergence
- Tier weights (STRUCTURE/TACTICAL/TIMING)
- Idempotent writes (unique index on symbol+asofDate+focus+role+preset)

##### 75.2 — Forward Truth Outcome Resolver
- MongoDB model: `FractalPredictionOutcome`
- Resolves matured snapshots with real price data
- Calculates hit/miss per direction (BUY/SELL/HOLD)
- Tier-level truth attribution (STRUCTURE/TACTICAL/TIMING hits)
- Band hit tracking (P10-P90)

##### 75.3 — Attribution Service
- Tier accuracy analysis (which tier performed best)
- Regime-specific accuracy (CRISIS/HIGH/NORMAL/LOW)
- Divergence impact analysis (grade → error correlation)
- Auto-generated insights

##### 75.4 — Policy Governance
- MongoDB model: `FractalPolicyProposal`
- DRY_RUN mode for simulation
- PROPOSE mode for creating proposals
- APPLY mode for manual confirmation
- Guardrails: min samples, max drift ±5%, weight normalization

#### BLOCK 75.UI — Admin Panel Tabs ✅ COMPLETE

##### 75.UI.1 — Attribution Tab
Route: `/admin/fractal?tab=attribution`

Features:
- **Controls**: Window (30d/90d/180d/365d), Preset, Role with URL sync
- **Headline KPIs**: Hit Rate, Expectancy, Sharpe, Max DD, Calibration, Avg Divergence
- **Tier Attribution Table**: STRUCTURE/TACTICAL/TIMING with hitRate, expectancy, sharpe, maxDD, grade
- **Regime Attribution**: Performance by volatility regime (LOW/NORMAL/HIGH/CRISIS)
- **Divergence Impact**: Grade A→F with hit rates and expectancy
- **Phase Attribution**: Phase types with grades and sizing multipliers
- **Auto Insights**: Deterministic rules generating actionable insights
- **Guardrails**: Insufficient data warnings, grade capping

##### 75.UI.2 — Governance Tab
Route: `/admin/fractal?tab=governance`

Features:
- **Current Policy**: Tier Weights, Divergence Penalties, Phase Multipliers
- **Proposed Changes**: Diff view with old→new values and % change
- **Guardrails Status**: Min Samples ✅, Drift ≤5% ✅, Not in Crisis ✅
- **Actions**: Dry Run, Propose, Apply (with confirmation modal)
- **Audit Log**: History of policy changes

## Testing Status
- Backend: 100% (all endpoints working)
- Frontend: 100% (all components working)
- Integration: 100%
- Last test report: `/app/test_reports/iteration_49.json`

## Prioritized Backlog

### P0 (Critical)
- [x] BLOCK 75 — Memory & Self-Validation Layer
- [x] BLOCK 75.UI — Attribution + Governance Tabs
- [x] BLOCK 76.1 — Consensus Pulse Service + UI
- [x] BLOCK 76.2 — Weekly TG Digest

### P1 (High)
- [ ] BLOCK 76.3 — Phase Strength Indicator in terminal header
- [ ] Weekly Digest Cron Job integration

### P2 (Medium)
- [ ] BLOCK 77 — Adaptive Weight Learning
- [ ] Consensus Drift Tracker (30d timeline view)
- [ ] Dominance History visualization
- [ ] Backtest replay from snapshots

### P3 (Future)
- [ ] Multi-asset support (ETH, SOL)
- [ ] Real-time WebSocket updates
- [ ] Mobile-optimized dashboard

## Key API Endpoints

### BLOCK 76 (Pulse)
- `GET /api/fractal/v2.1/consensus-pulse` - 7d consensus dynamics
- `GET /api/fractal/v2.1/admin/weekly-digest/preview` - Preview weekly report
- `POST /api/fractal/v2.1/admin/weekly-digest/send` - Send to Telegram

### BLOCK 75 (Memory)
- `POST /api/fractal/v2.1/admin/memory/write-snapshots` - Create daily snapshots
- `POST /api/fractal/v2.1/admin/memory/resolve-outcomes` - Resolve matured snapshots
- `GET /api/fractal/v2.1/admin/memory/snapshots/latest` - Get latest snapshot
- `GET /api/fractal/v2.1/admin/attribution` - Attribution tab data
- `GET /api/fractal/v2.1/admin/governance` - Governance tab data

## File Structure

```
/app/backend/src/modules/fractal/
├── pulse/                    # BLOCK 76
│   ├── consensus-pulse.service.ts
│   ├── consensus-pulse.routes.ts
│   ├── weekly-digest.service.ts
│   └── index.ts
├── memory/                   # BLOCK 75
│   ├── snapshot/
│   ├── outcome/
│   ├── attribution/
│   └── policy/
└── runtime/
    └── fractal.module.ts

/app/frontend/src/
├── components/fractal/
│   ├── ConsensusPulseStrip.jsx   # BLOCK 76.1 UI
│   └── admin/
│       ├── AttributionTab.jsx     # BLOCK 75.UI.1
│       └── GovernanceTab.jsx      # BLOCK 75.UI.2
├── hooks/
│   └── useConsensusPulse.js       # BLOCK 76.1 Hook
└── pages/
    └── FractalPage.js             # Main terminal page
```
