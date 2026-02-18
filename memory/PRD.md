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

### Session: 2026-02-18

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

API:
- `POST /api/fractal/v2.1/admin/memory/write-snapshots`
- `GET /api/fractal/v2.1/admin/memory/snapshots/latest`
- `GET /api/fractal/v2.1/admin/memory/snapshots/range`
- `GET /api/fractal/v2.1/admin/memory/snapshots/count`

##### 75.2 — Forward Truth Outcome Resolver
- MongoDB model: `FractalPredictionOutcome`
- Resolves matured snapshots with real price data
- Calculates hit/miss per direction (BUY/SELL/HOLD)
- Tier-level truth attribution (STRUCTURE/TACTICAL/TIMING hits)
- Band hit tracking (P10-P90)

API:
- `POST /api/fractal/v2.1/admin/memory/resolve-outcomes`
- `GET /api/fractal/v2.1/admin/memory/forward-stats`
- `GET /api/fractal/v2.1/admin/memory/calibration`

##### 75.3 — Attribution Service
- Tier accuracy analysis (which tier performed best)
- Regime-specific accuracy (CRISIS/HIGH/NORMAL/LOW)
- Divergence impact analysis (grade → error correlation)
- Auto-generated insights

API:
- `GET /api/fractal/v2.1/admin/memory/attribution/summary`

##### 75.4 — Policy Governance
- MongoDB model: `FractalPolicyProposal`
- DRY_RUN mode for simulation
- PROPOSE mode for creating proposals
- APPLY mode for manual confirmation
- Guardrails: min samples, max drift ±5%, weight normalization

API:
- `POST /api/fractal/v2.1/admin/governance/policy/dry-run`
- `POST /api/fractal/v2.1/admin/governance/policy/propose`
- `POST /api/fractal/v2.1/admin/governance/policy/apply`
- `GET /api/fractal/v2.1/admin/governance/policy/current`
- `GET /api/fractal/v2.1/admin/governance/policy/history`
- `GET /api/fractal/v2.1/admin/governance/policy/pending`

##### Cron + Telegram Integration
- Daily job now includes MEMORY_SNAPSHOTS step
- Writes snapshots after audit
- Resolves matured outcomes
- Telegram message includes memory stats: `🧠 MEMORY: wrote X | resolved Y`

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
1. Add Attribution tab to Admin Panel UI
2. Add Policy Governance tab to Admin Panel UI
3. Consensus Drift Tracker mini-chart
4. Weekly attribution report in Telegram
