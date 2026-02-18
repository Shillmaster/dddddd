# Fractal Terminal PRD

## Original Problem Statement
Клонировать репозиторий https://github.com/Shillmaster/JJcbjee, поднять фронт, бэк и админку. Работа только с модулем Fractal.

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
7. Phase-aware position sizing

## What's Been Implemented

### Session: 2026-02-18

#### BLOCK 73.5.2 — Phase Click Drilldown (COMPLETED)
- Backend: Фильтрация matches по типу фазы (phaseId → phaseType extraction)
- Frontend: Клик по фазе на графике → PhaseFilterBar с контекстом фазы + Clear Filter
- Hook: useFocusPack теперь поддерживает filterByPhase(phaseId)

#### BLOCK 73.6 — Phase Performance Heatmap (COMPLETED)
**Backend:**
- Endpoint: `/api/fractal/v2.1/admin/phase-performance`
- Service: `phase-performance.service.ts`

**Institutional Scoring Formula:**
```
Score = 40% HitRate + 25% Expectancy + 20% Sharpe + 15% Divergence
```

**Tier-Aware Sample Thresholds:**
- TIMING: OK ≥ 20, LOW 10-19, VERY_LOW < 10
- TACTICAL: OK ≥ 12, LOW 6-11, VERY_LOW < 6
- STRUCTURE: OK ≥ 18, LOW 10-17, VERY_LOW < 10

**Penalties:**
- LOW_SAMPLE: -12
- VERY_LOW_SAMPLE: -20
- HIGH_TAIL (P10 < threshold): -8
- HIGH_DIVERGENCE (< 55): -8
- LOW_RECENCY (< 0.3): -3

**Grade Calculation with Sample Caps:**
- A ≥ 85 (capped to C if LOW_SAMPLE, D if VERY_LOW)
- B ≥ 70 (same caps)
- C ≥ 55
- D ≥ 40
- F < 40

**Frontend:**
- PhaseHeatmap.jsx with grade-colored rows
- Global Baseline stats bar
- Filter button integration with Phase Click Drilldown

#### BLOCK 73.7 — Phase-Aware Sizing Multiplier (COMPLETED)
**Backend:**
- Updated `adaptive.sizing.service.ts`
- Added phaseMod to SizingBreakdown interface
- Added computePhaseModifier method

**Grade Multipliers:**
- A: ×1.15 (boost)
- B: ×1.05 (slight boost)
- C: ×1.00 (neutral)
- D: ×0.80 (reduce)
- F: ×0.60 (significant reduction)

**Sample Quality Caps (prevent boost on uncertain data):**
- LOW_SAMPLE: cap at ×1.00 (no boost, allow penalties)
- VERY_LOW_SAMPLE: cap at ×0.90 (slight penalty)

**Frontend:**
- Added "Phase Grade" to FACTOR_LABELS in SizingBreakdown.jsx

## Prioritized Backlog

### P0 (Critical)
- [x] BLOCK 73.5.2 Phase Click Drilldown
- [x] BLOCK 73.6 Phase Performance Heatmap (Institutional Scoring)
- [x] BLOCK 73.7 Phase-Aware Sizing Multiplier

### P1 (High Priority)
- [ ] Integration test: Phase grade flow from API → Sizing computation
- [ ] External Ingress routing fix for production preview domain

### P2 (Medium Priority)
- [ ] Phase comparison overlay (Phase-only vs Global distribution)
- [ ] Keyboard shortcuts (Esc to clear filter)
- [ ] Real forward-truth data collection (resolved snapshots)

## API Documentation

### Phase Performance Endpoint
```
GET /api/fractal/v2.1/admin/phase-performance?symbol=BTC&tier=TACTICAL&h=30

Response:
{
  meta: { tier, minSamplesForTrust, resolvedCount },
  global: { hitRate, avgRet, sharpe },
  phases: [{
    phaseName, grade, score, samples, sampleQuality,
    hitRate, avgRet, medianRet, p10, p90, sharpe,
    avgDivergenceScore, recencyWeight, warnings
  }]
}
```

## What's Been Implemented

### Session: 2026-02-18 (continued)

#### BLOCK 73.8 — Phase Grade Integration in Decision Kernel (COMPLETED)
**Backend (`fractal.terminal.routes.ts`):**
- `getPhaseGradeForCurrentPhase()` - fetches phase grade from phase-performance service
- `computePhaseConfidenceAdjustment()` - confidence adjustment logic
- Phase grade passed to terminal payload sizing: `phaseGrade`, `phaseSampleQuality`, `phaseScore`
- `confidenceAdjustment` object: `basePp`, `adjustmentPp`, `finalPp`, `reason`
- PHASE factor added to breakdown array

**Confidence Adjustment Rules:**
- Grade A + divergence < 50 → +5pp
- Grade A → +3pp
- Grade B + divergence < 55 → +3pp
- Grade B → +2pp
- Grade D → -3pp
- Grade F → -5pp

**Frontend (`SizingBreakdown.jsx`):**
- Phase Grade badge in header with color-coded styling
- Confidence Adjustment section with boost/penalty display
- PHASE factor in breakdown table

## Next Tasks
1. Test phase-aware sizing in production simulation
2. Add Phase Strength Indicator to terminal header
3. Wire phase grade to full trading decision (beyond sizing)
