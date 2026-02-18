# Fractal Research Terminal — PRD

## Original Problem Statement
Build a full-stack financial trading decision engine with:
- React frontend + Fastify (TypeScript) backend + MongoDB
- "Hedge-fund style" institutional-grade risk and decision system
- Admin panel for monitoring and configuration

## Core Architecture
```
/app
├── backend (Fastify + TypeScript)
│   └── src/modules/fractal/
│       ├── adaptive/      # Adaptive Regime Stack
│       ├── volatility/    # Volatility calculation & attribution
│       ├── strategy/resolver/  # Decision kernel
│       └── api/           # REST endpoints
└── frontend (React)
    └── src/features/fractal/
        ├── user/          # Main dashboard
        └── admin/         # Admin panel
```

## Implemented Features

### P1.1-P1.3: Decision Kernel ✅
- Consensus Index calculation
- Conflict Policy resolution
- Sizing Policy implementation

### P1.4: Volatility Regime Modifier ✅
- `volatility.calculator.ts` — RV30, RV90, ATR, Z-Score
- `volatility.regime.service.ts` — regime classification
- `VolatilityCard.jsx` — UI component

### PHASE 3 (BLOCKS 60-65): Adaptive Regime Stack ✅
- `regime.context.service.ts` — market regime detection
- `adaptive.horizon-weight.service.ts` — dynamic horizon weighting
- `adaptive.threshold.service.ts` — entry threshold adjustment
- `adaptive.conflict.service.ts` — regime-aware conflict resolution
- `adaptive.sizing.service.ts` — final size calculation

### P1.5: Volatility Attribution ✅
- `volatility.attribution.service.ts` — performance metrics by regime
- Admin API: `/api/fractal/v2.1/admin/volatility/attribution`
- `VolatilityTab.jsx` — admin UI with Regime Timeline

### P1.6: Sizing Breakdown ✅
- Backend: `sizingBreakdown` array in `/terminal` response
- `SizingBreakdown.jsx` — factor-by-factor display

## API Endpoints
- `GET /api/fractal/v2.1/terminal` — main decision data
- `GET /api/fractal/v2.1/admin/volatility/attribution` — performance attribution
- `GET /api/fractal/v2.1/admin/volatility/timeline` — regime timeline

## Database Schema (SignalSnapshotModel)
```typescript
{
  volatility: { regime, rv30, rv90, atr14Pct, zScore },
  sizingBreakdown: { baseSize, consensusMult, conflictMult, volMult, finalSize },
  rawDecision: { direction, confidence },
  outcomes: { d7: { realizedReturn }, ... }
}
```

## Prioritized Backlog

### P0 (High Priority)
- [ ] Regime Alert System (Telegram)
- [ ] API Contract Tightening v2.1

### P1 (Medium Priority)
- [ ] Policy Tuning Suggestions
- [ ] Admin Policy Editor (BLOCK 66)

### P2 (Future)
- [ ] PHASE 4 - Cycle Engine (Bitcoin halving context)

## Access
- **URL:** https://adaptive-regime.preview.emergentagent.com
- **Auth:** Not required (open access)
- **Admin:** `/admin/fractal`

## Last Updated
2026-02-17 — P1.6 Sizing Breakdown completed, visual verification done
