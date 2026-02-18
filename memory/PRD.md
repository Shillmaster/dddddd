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

#### BLOCK 74 — Multi-Horizon Intelligence Stack (COMPLETED)

**74.1 Horizon Stack View (Backend + Frontend):**
- `horizonStack[]` in terminal payload with 6 horizons (7d-365d)
- Each horizon: tier, direction, confidenceFinal, phase, divergence, tail, matches, blockers, voteWeight
- Adaptive weighting: baseTier × regimeMod × divergenceMod
- Frontend: `HorizonStackView.jsx` - clickable horizon rows with tier colors

**74.2 Institutional Consensus (Backend + Frontend):**
- `consensus74` object in terminal payload
- consensusIndex (0-100), conflictLevel, votes[], conflictReasons[], resolved
- resolved: action (BUY/SELL/HOLD), mode (TREND_FOLLOW/COUNTER_TREND/WAIT), sizeMultiplier, dominantTier
- adaptiveMeta: regime, structuralDominance, divergencePenalties, phasePenalties, stabilityGuard
- Frontend: `ConsensusPanel.jsx` - institutional consensus display with expandable details

**74.3 Adaptive Weighting 2.0 — Hard Structural Dominance (COMPLETED):**

*Desk-Grade Decision Engine with Constitutional Rules*

**Core Rule:** If STRUCTURE_WEIGHT >= 55% → STRUCTURE determines direction (structuralLock=true)
- TIMING can only affect size, NOT reverse direction
- timingOverrideBlocked = true when timing conflicts

**Regime Modifiers:**
- CRISIS: STRUCTURE ×1.35, TACTICAL ×1.10, TIMING ×0.60
- EXPANSION: STRUCTURE ×0.85, TACTICAL ×1.05, TIMING ×1.20
- HIGH: STRUCTURE ×1.10, TACTICAL ×1.05, TIMING ×0.85
- LOW: STRUCTURE ×0.90, TACTICAL ×1.00, TIMING ×1.15
- NORMAL: all ×1.00

**Penalty Modifiers:**
- Divergence Grade: A(×1.05), B(×1.00), C(×0.90), D(×0.75), F(×0.55)
- HIGH_DIVERGENCE flag: additional ×0.85
- Phase Quality: A(×1.10), B(×1.05), C(×1.00), D(×0.85), F(×0.65)

**New API Fields in consensus74:**
- direction, dominance, structuralLock, timingOverrideBlocked
- adaptiveMeta: structureWeightSum, tacticalWeightSum, timingWeightSum
- adaptiveMeta: structuralDirection, tacticalDirection, timingDirection
- adaptiveMeta: weightAdjustments {structureBoost, tacticalBoost, timingClamp}

**Frontend Updates (ConsensusPanel.jsx):**
- 🔒 STRUCTURAL LOCK badge when structuralLock=true
- Dominance Alert showing which tier controls direction
- Tier Weight Distribution with visual bars
- Regime Impact display showing boost/clamp values

## Next Tasks
1. BLOCK 75 — Memory & Self-Validation Layer (weight corrections from forward truth)
2. Consensus Drift Tracker (7d history mini-chart)
3. Phase Strength Indicator in terminal header
4. Production simulation testing

