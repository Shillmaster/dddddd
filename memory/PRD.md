# Fractal Terminal PRD

## Original Problem Statement
Self-learning institutional trading terminal for BTC. Now with Memory & Self-Validation Layer (BLOCK 75).

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

API Endpoints:
- `GET /api/fractal/v2.1/admin/attribution` - Full Attribution tab data
- `GET /api/fractal/v2.1/admin/governance` - Full Governance tab data

## Testing Status
- Backend: 100% (11/11 endpoints working)
- Frontend: 100% (2/2 pages working)
- Integration: 100%

## Prioritized Backlog

### P0 (Critical)
- [x] BLOCK 75 — Memory & Self-Validation Layer

### P1 (High)
- [ ] Consensus Drift Tracker (7d history mini-chart)
- [ ] Phase Strength Indicator in terminal header
- [ ] Attribution UI in Admin Panel

### P2 (Medium)
- [ ] Dominance History visualization
- [ ] Policy Proposal review UI
- [ ] Backtest replay from snapshots

### P3 (Future)
- [ ] Multi-asset support (ETH, SOL)
- [ ] Real-time WebSocket updates
- [ ] Mobile-optimized dashboard

## Next Tasks
1. Consensus Drift Tracker (7d mini-chart in terminal header)
2. Weekly attribution digest in Telegram
3. Backtest replay from snapshots

## Prioritized Backlog

### P0 (Critical)
- [x] BLOCK 75 — Memory & Self-Validation Layer
- [x] BLOCK 75.UI — Attribution + Governance Tabs

### P1 (High)
- [ ] Consensus Drift Tracker (7d history mini-chart)
- [ ] Phase Strength Indicator in terminal header
- [ ] Weekly TG attribution digest

### P2 (Medium)
- [ ] Dominance History visualization
- [ ] Backtest replay from snapshots
- [ ] Enhanced calibration charts

### P3 (Future)
- [ ] Multi-asset support (ETH, SOL)
- [ ] Real-time WebSocket updates
- [ ] Mobile-optimized dashboard
