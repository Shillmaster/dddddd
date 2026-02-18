/**
 * PHASE 2 — P0.1: Terminal Aggregator Endpoint
 * 
 * One request → entire terminal:
 * - chart (candles + sma200 + phaseZones)
 * - overlay (per focus horizon)
 * - multiSignal (all horizons)
 * - regime (global structure)
 * - resolver (final decision)
 * - volatility (P1.4: risk scaling)
 * 
 * GET /api/fractal/v2.1/terminal?symbol=BTC&set=extended&focus=30d
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { CanonicalStore } from '../data/canonical.store.js';
import { FractalEngine } from '../engine/fractal.engine.js';
import {
  HORIZON_CONFIG,
  FRACTAL_HORIZONS,
  type HorizonKey,
} from '../config/horizon.config.js';
import {
  HierarchicalResolverService,
  type HierarchicalResolveInput,
  type HorizonInput,
  computeConsensusIndex as computeFullConsensus,
  consensusToMultiplier,
  type HorizonSignalInput,
  type ConsensusResult,
  computeConflictPolicy,
  conflictToSizingMultiplier,
  type ConflictResult,
  computeSizingPolicy,
  type SizingResult,
  type PresetType,
  sizeToLabel,
} from '../strategy/resolver/index.js';
import {
  getVolatilityRegimeService,
  type VolatilityResult,
  type VolatilityApplied,
} from '../volatility/index.js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface TerminalPayload {
  meta: {
    symbol: string;
    asof: string;
    horizonSet: 'short' | 'extended';
    focus: HorizonKey;
    contractVersion: string;
  };
  chart: {
    candles: Array<{ ts: string; o: number; h: number; l: number; c: number; v: number }>;
    sma200: number;
    currentPrice: number;
    priceChange24h: number;
    globalPhase: string;
  };
  overlay: {
    focus: HorizonKey;
    windowLen: number;
    aftermathDays: number;
    currentWindow: number[];
    matches: Array<{
      id: string;
      similarity: number;
      phase: string;
    }>;
  };
  horizonMatrix: Array<{
    horizon: HorizonKey;
    tier: 'STRUCTURE' | 'TACTICAL' | 'TIMING';
    direction: 'BULL' | 'BEAR' | 'NEUTRAL';
    expectedReturn: number;
    confidence: number;
    reliability: number;
    entropy: number;
    tailRisk: number;
    stability: number;
    blockers: string[];
    weight: number;
  }>;
  structure: {
    globalBias: 'BULL' | 'BEAR' | 'NEUTRAL';
    biasStrength: number;
    phase: string;
    dominantHorizon: HorizonKey;
    explain: string[];
  };
  resolver: {
    timing: {
      action: 'ENTER' | 'WAIT' | 'EXIT';
      score: number;
      strength: number;
      dominantHorizon: HorizonKey;
    };
    final: {
      action: 'BUY' | 'SELL' | 'HOLD';
      mode: 'TREND_FOLLOW' | 'COUNTER_TREND' | 'HOLD';
      sizeMultiplier: number;
      reason: string;
      blockers: string[];
    };
    conflict: {
      hasConflict: boolean;
      shortTermDir: string;
      longTermDir: string;
    };
    consensusIndex: number;
  };
  // BLOCK 59.2 — Decision Kernel (P1.1)
  decisionKernel: {
    consensus: {
      score: number;           // 0..1 (agreement strength)
      dir: 'BUY' | 'SELL' | 'HOLD';  // dominant direction
      dispersion: number;      // 1 - score (disagreement)
      multiplier: number;      // sizing multiplier from consensus
      weights: {
        buy: number;
        sell: number;
        hold: number;
      };
      votes: Array<{
        horizon: HorizonKey;
        tier: 'TIMING' | 'TACTICAL' | 'STRUCTURE';
        direction: 'BUY' | 'SELL' | 'HOLD';
        rawConfidence: number;
        effectiveWeight: number;
        penalties: string[];
        contribution: number;
      }>;
    };
    // BLOCK 59.2 — P1.2: Conflict Policy
    conflict: {
      level: 'NONE' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'SEVERE';
      mode: 'TREND_FOLLOW' | 'COUNTER_TREND' | 'WAIT';
      sizingPenalty: number;
      sizingMultiplier: number;
      structureVsTiming: {
        aligned: boolean;
        structureDir: 'BUY' | 'SELL' | 'HOLD';
        timingDir: 'BUY' | 'SELL' | 'HOLD';
        divergenceScore: number;
      };
      tiers: {
        structure: { dir: 'BUY' | 'SELL' | 'HOLD'; strength: number };
        tactical: { dir: 'BUY' | 'SELL' | 'HOLD'; strength: number };
        timing: { dir: 'BUY' | 'SELL' | 'HOLD'; strength: number };
      };
      explain: string[];
      recommendation: string;
    };
    // BLOCK 59.2 — P1.3: Sizing Policy
    sizing: {
      mode: 'TREND_FOLLOW' | 'COUNTER_TREND' | 'NO_TRADE';
      preset: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
      baseSize: number;
      consensusMultiplier: number;
      conflictMultiplier: number;
      riskMultiplier: number;
      finalSize: number;
      sizeLabel: string;
      blockers: string[];
      explain: string[];
    };
  };
  // P1.4: Volatility Regime
  volatility: {
    regime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXPANSION' | 'CRISIS';
    rv30: number;
    rv90: number;
    atr14Pct: number;
    atrPercentile: number;
    volRatio: number;
    volZScore: number;
    policy: {
      sizeMultiplier: number;
      confidencePenaltyPp: number;
    };
    applied: {
      sizeBefore: number;
      sizeAfter: number;
      confBefore: number;
      confAfter: number;
    };
    blockers: string[];
    explain: string[];
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const canonicalStore = new CanonicalStore();
const engine = new FractalEngine();
const resolver = new HierarchicalResolverService();
const volatilityService = getVolatilityRegimeService();

const SHORT_HORIZONS: HorizonKey[] = ['7d', '14d', '30d'];
const EXTENDED_HORIZONS: HorizonKey[] = ['7d', '14d', '30d', '90d', '180d', '365d'];

function getTier(horizon: HorizonKey): 'STRUCTURE' | 'TACTICAL' | 'TIMING' {
  if (['180d', '365d'].includes(horizon)) return 'STRUCTURE';
  if (['30d', '90d'].includes(horizon)) return 'TACTICAL';
  return 'TIMING';
}

function getWeight(horizon: HorizonKey): number {
  const weights: Record<HorizonKey, number> = {
    '7d': 0.10, '14d': 0.15, '30d': 0.25, '90d': 0.20, '180d': 0.15, '365d': 0.15
  };
  return weights[horizon] || 0.1;
}

function detectPhase(candles: any[]): string {
  if (candles.length < 50) return 'UNKNOWN';
  const recent = candles.slice(-30);
  const ma20 = recent.slice(-20).reduce((s, c) => s + c.close, 0) / 20;
  const ma50 = candles.slice(-50).reduce((s, c) => s + c.close, 0) / 50;
  const currentPrice = recent[recent.length - 1].close;
  const priceVsMa20 = (currentPrice - ma20) / ma20;
  const priceVsMa50 = (currentPrice - ma50) / ma50;
  if (priceVsMa20 > 0.05 && priceVsMa50 > 0.10) return 'MARKUP';
  if (priceVsMa20 < -0.05 && priceVsMa50 < -0.10) return 'MARKDOWN';
  if (priceVsMa20 > 0 && priceVsMa50 < 0) return 'RECOVERY';
  if (priceVsMa20 < 0 && priceVsMa50 > 0) return 'DISTRIBUTION';
  return 'ACCUMULATION';
}

function computeSMA(candles: any[], period: number): number {
  if (candles.length < period) return candles[candles.length - 1]?.close || 0;
  return candles.slice(-period).reduce((s, c) => s + c.close, 0) / period;
}

async function computeHorizonSignal(candles: any[], horizon: HorizonKey) {
  const config = HORIZON_CONFIG[horizon];
  const phase = detectPhase(candles);
  
  const defaultSignal = {
    direction: 'NEUTRAL' as const,
    expectedReturn: 0,
    confidence: 0,
    reliability: 0.5,
    entropy: 1,
    tailRisk: 0.5,
    stability: 0.5,
    blockers: ['INSUFFICIENT_DATA'],
  };

  if (candles.length < config.minHistory) return defaultSignal;

  try {
    // Map to supported window sizes
    const supportedWindows = [30, 60, 90];
    const windowLen = supportedWindows.reduce((prev, curr) =>
      Math.abs(curr - config.windowLen) < Math.abs(prev - config.windowLen) ? curr : prev
    );

    const result = await engine.match({
      symbol: 'BTCUSD',
      candles,
      windowLen,
      topK: config.topK,
    });

    if (!result || !result.forwardStats) return defaultSignal;

    const stats = result.forwardStats;
    const meanReturn = stats.return?.mean || 0;
    const p10 = stats.return?.p10 || -0.1;
    const p50 = stats.return?.p50 || 0;
    const p90 = stats.return?.p90 || 0.1;
    
    const winRate = p50 > 0 ? 0.5 + (p50 / (p90 - p10)) * 0.3 : 0.5 - (Math.abs(p50) / (p90 - p10)) * 0.3;
    const clampedWinRate = Math.max(0.1, Math.min(0.9, winRate));
    const entropy = 1 - Math.abs(2 * clampedWinRate - 1);
    
    const spread = p90 - p10;
    const spreadFactor = Math.max(0, 1 - spread);
    const effectiveN = Math.min(result.matches?.length || 0, config.topK);
    const nFloor = Math.min(1, effectiveN / 10);
    const confidence = Math.abs(2 * clampedWinRate - 1) * (0.5 + spreadFactor * 0.5) * nFloor;
    
    const mcP95_DD = stats.drawdown?.p95 || 0.5;
    const stability = 1 - entropy * 0.5;
    
    let direction: 'BULL' | 'BEAR' | 'NEUTRAL' = 'NEUTRAL';
    if (confidence > 0.05 && meanReturn > 0.015) direction = 'BULL';
    else if (confidence > 0.05 && meanReturn < -0.015) direction = 'BEAR';

    const blockers: string[] = [];
    if (confidence < 0.05) blockers.push('LOW_CONFIDENCE');
    if (entropy > 0.8) blockers.push('HIGH_ENTROPY');
    if (mcP95_DD > 0.55) blockers.push('HIGH_TAIL_RISK');
    if (effectiveN < 5) blockers.push('LOW_SAMPLE');

    const horizonDays = parseInt(horizon.replace('d', ''), 10);
    const baseReliability = horizonDays >= 180 ? 0.85 : horizonDays >= 90 ? 0.80 : horizonDays >= 30 ? 0.75 : 0.70;

    return {
      direction,
      expectedReturn: meanReturn,
      confidence: Math.min(1, confidence),
      reliability: baseReliability * (1 - entropy * 0.2),
      entropy,
      tailRisk: mcP95_DD,
      stability,
      blockers,
    };
  } catch {
    return defaultSignal;
  }
}

function computeSimpleConsensusIndex(matrix: TerminalPayload['horizonMatrix']): number {
  const directions = matrix.map(h => h.direction);
  const bullCount = directions.filter(d => d === 'BULL').length;
  const bearCount = directions.filter(d => d === 'BEAR').length;
  const total = directions.length;
  const maxAgree = Math.max(bullCount, bearCount);
  return total > 0 ? maxAgree / total : 0;
}

/**
 * BLOCK 59.2 — P1.1: Build full consensus from horizonMatrix
 */
function buildConsensusFromMatrix(matrix: TerminalPayload['horizonMatrix']): ConsensusResult {
  const signals: HorizonSignalInput[] = matrix.map(h => ({
    horizon: h.horizon,
    direction: h.direction === 'BULL' ? 'BUY' : h.direction === 'BEAR' ? 'SELL' : 'HOLD',
    confidence: h.confidence,
    blockers: h.blockers,
    reliability: h.reliability,
  }));
  
  return computeFullConsensus(signals);
}

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

export async function fractalTerminalRoutes(fastify: FastifyInstance): Promise<void> {
  
  fastify.get('/api/fractal/v2.1/terminal', async (
    req: FastifyRequest<{ Querystring: { symbol?: string; set?: string; focus?: string } }>,
    reply
  ) => {
    const symbol = String(req.query.symbol ?? 'BTC').toUpperCase();
    const set = (req.query.set === 'extended' ? 'extended' : 'short') as 'short' | 'extended';
    const focus = (req.query.focus || '30d') as HorizonKey;

    if (symbol !== 'BTC') {
      return reply.code(400).send({ error: 'BTC_ONLY' });
    }

    try {
      // Load candles
      const candles = await canonicalStore.getCandles({ symbol: 'BTCUSD', limit: 1200 });
      
      if (!candles || candles.length < 100) {
        return reply.code(503).send({ error: 'INSUFFICIENT_DATA' });
      }

      const currentPrice = candles[candles.length - 1].close;
      const prevPrice = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
      const sma200 = computeSMA(candles, 200);
      const globalPhase = detectPhase(candles);
      const asof = new Date().toISOString();

      // Build chart data (last 365 candles for display)
      const chartCandles = candles.slice(-365).map(c => ({
        ts: c.ts.toISOString(),
        o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume
      }));

      // Compute signals for all horizons in set
      const horizonsToUse = set === 'extended' ? EXTENDED_HORIZONS : SHORT_HORIZONS;
      const horizonMatrix: TerminalPayload['horizonMatrix'] = [];

      for (const h of horizonsToUse) {
        const sig = await computeHorizonSignal(candles, h);
        horizonMatrix.push({
          horizon: h,
          tier: getTier(h),
          direction: sig.direction,
          expectedReturn: sig.expectedReturn,
          confidence: sig.confidence,
          reliability: sig.reliability,
          entropy: sig.entropy,
          tailRisk: sig.tailRisk,
          stability: sig.stability,
          blockers: sig.blockers,
          weight: getWeight(h),
        });
      }

      // Build resolver input
      const horizonsInput: Record<HorizonKey, HorizonInput> = {} as any;
      for (const h of EXTENDED_HORIZONS) {
        const mat = horizonMatrix.find(m => m.horizon === h);
        horizonsInput[h] = {
          horizon: h,
          dir: mat?.direction === 'BULL' ? 'LONG' : mat?.direction === 'BEAR' ? 'SHORT' : 'HOLD',
          expectedReturn: mat?.expectedReturn || 0,
          confidence: mat?.confidence || 0,
          reliability: mat?.reliability || 0.5,
          phaseRisk: (mat?.entropy || 0) * 0.5,
          blockers: mat?.blockers || [],
        };
      }

      const sig30 = horizonMatrix.find(h => h.horizon === '30d');
      const resolverInput: HierarchicalResolveInput = {
        horizons: horizonsInput,
        globalEntropy: sig30?.entropy || 0.5,
        mcP95_DD: sig30?.tailRisk || 0.5,
      };

      const resolved = resolver.resolve(resolverInput);

      // Build structure (global bias)
      const structureHorizons = horizonMatrix.filter(h => h.tier === 'STRUCTURE');
      const explain: string[] = [];
      if (resolved.bias.dir === 'BULL') explain.push('Long-term horizons indicate bullish regime');
      else if (resolved.bias.dir === 'BEAR') explain.push('Long-term horizons indicate bearish regime');
      else explain.push('Long-term horizons are mixed/neutral');
      
      structureHorizons.forEach(h => {
        if (h.confidence > 0.1) {
          explain.push(`${h.horizon}: ${h.direction} (conf ${(h.confidence * 100).toFixed(0)}%)`);
        }
      });

      // Detect conflict
      const shortTermDirs = horizonMatrix.filter(h => h.tier === 'TIMING').map(h => h.direction);
      const longTermDirs = horizonMatrix.filter(h => h.tier === 'STRUCTURE').map(h => h.direction);
      const shortBias = shortTermDirs.filter(d => d === 'BULL').length > shortTermDirs.filter(d => d === 'BEAR').length ? 'BULL' : 'BEAR';
      const longBias = longTermDirs.filter(d => d === 'BULL').length > longTermDirs.filter(d => d === 'BEAR').length ? 'BULL' : 'BEAR';
      const hasConflict = shortBias !== longBias && shortBias !== 'NEUTRAL' && longBias !== 'NEUTRAL';

      // Overlay for focus horizon
      const focusConfig = HORIZON_CONFIG[focus];
      const supportedWindows = [30, 60, 90];
      const overlayWindowLen = supportedWindows.reduce((prev, curr) =>
        Math.abs(curr - focusConfig.windowLen) < Math.abs(prev - focusConfig.windowLen) ? curr : prev
      );

      const overlayResult = await engine.match({
        symbol: 'BTCUSD',
        candles,
        windowLen: overlayWindowLen,
        topK: focusConfig.topK,
      }).catch(() => null);

      // BLOCK 59.2 — P1.1: Full Consensus Index calculation
      const consensusResult = buildConsensusFromMatrix(horizonMatrix);
      const consensusMultiplier = consensusToMultiplier(consensusResult.score);
      const consensusIndex = computeSimpleConsensusIndex(horizonMatrix); // backward compat

      // BLOCK 59.2 — P1.2: Compute Conflict Policy
      const conflictResult = computeConflictPolicy({
        consensus: consensusResult,
        globalEntropy: sig30?.entropy || 0.5,
        mcP95_DD: sig30?.tailRisk || 0.5,
      });
      const conflictSizingMultiplier = conflictToSizingMultiplier(conflictResult.level);

      // BLOCK 59.2 — P1.3: Compute Sizing Policy
      const avgConfidence = horizonMatrix.reduce((s, h) => s + h.confidence, 0) / horizonMatrix.length;
      const avgReliability = horizonMatrix.reduce((s, h) => s + h.reliability, 0) / horizonMatrix.length;
      const avgEntropy = horizonMatrix.reduce((s, h) => s + h.entropy, 0) / horizonMatrix.length;
      const avgTailRisk = horizonMatrix.reduce((s, h) => s + h.tailRisk, 0) / horizonMatrix.length;

      const sizingResult = computeSizingPolicy({
        preset: 'BALANCED' as PresetType,  // default preset
        consensus: consensusResult,
        conflict: conflictResult,
        risk: {
          entropy: avgEntropy,
          tailRisk: avgTailRisk,
          reliability: avgReliability,
          phaseRisk: sig30?.entropy || 0.5,
          avgConfidence,
        },
      });

      // P1.4: Volatility Regime
      const volCandles = candles.map(c => ({
        ts: c.ts,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));
      const volatilityResult = volatilityService.evaluate(volCandles);
      const volatilityApplied = volatilityService.applyModifiers(
        volatilityResult,
        sizingResult.finalSize,
        avgConfidence,
        0.85 // maxSize
      );

      // Final size after volatility adjustment
      const finalSizeAfterVol = volatilityApplied.sizeAfter;
      const finalConfAfterVol = volatilityApplied.confAfter;

      const payload: TerminalPayload = {
        meta: {
          symbol,
          asof,
          horizonSet: set,
          focus,
          contractVersion: 'v2.1.0',
        },
        chart: {
          candles: chartCandles,
          sma200,
          currentPrice,
          priceChange24h: ((currentPrice - prevPrice) / prevPrice) * 100,
          globalPhase,
        },
        overlay: {
          focus,
          windowLen: overlayWindowLen,
          aftermathDays: focusConfig.aftermathDays,
          currentWindow: overlayResult?.currentWindow?.normalized || [],
          matches: (overlayResult?.matches || []).slice(0, 5).map((m: any) => ({
            id: m.id || m.date || 'unknown',
            similarity: m.similarity || 0,
            phase: m.phase || 'UNKNOWN',
          })),
        },
        horizonMatrix,
        // BLOCK 74.1: Horizon Stack (institutional intelligence layer)
        horizonStack: horizonMatrix.map((h, idx) => {
          const tier = h.tier as 'TIMING' | 'TACTICAL' | 'STRUCTURE';
          const direction = h.direction === 'BULL' ? 'BULLISH' : h.direction === 'BEAR' ? 'BEARISH' : 'FLAT';
          
          // Adaptive weights based on tier and regime
          const baseWeight = tier === 'STRUCTURE' ? 0.42 : tier === 'TACTICAL' ? 0.36 : 0.22;
          const regimeMod = volatilityResult.regime === 'CRISIS' ? 
            (tier === 'STRUCTURE' ? 1.35 : tier === 'TIMING' ? 0.6 : 1.1) : 1.0;
          const divMod = h.entropy > 0.7 ? 0.7 : h.entropy > 0.5 ? 0.9 : 1.0;
          const voteWeight = baseWeight * regimeMod * divMod;
          
          return {
            horizon: h.horizon,
            tier,
            direction,
            confidenceRaw: h.confidence,
            confidenceFinal: h.confidence * (1 - h.entropy * 0.3),
            phase: { type: globalPhase, grade: 'C', score: 50, sampleQuality: 'OK' },
            divergence: { score: (1 - h.entropy) * 100, grade: h.entropy < 0.3 ? 'A' : h.entropy < 0.5 ? 'B' : h.entropy < 0.7 ? 'C' : 'F', flags: h.entropy > 0.7 ? ['HIGH_DIVERGENCE'] : [] },
            tail: { p95dd: h.tailRisk, wfMaxDD: h.tailRisk * 0.6 },
            matches: { count: overlayResult?.matches?.length || 0, primary: overlayResult?.matches?.[0] ? { id: overlayResult.matches[0].id || 'unknown', score: overlayResult.matches[0].similarity || 0, return: overlayResult.matches[0].forwardReturn || 0 } : null },
            blockers: h.blockers,
            voteWeight,
          };
        }),
        // BLOCK 74.2: Institutional Consensus
        consensus74: (() => {
          const votes = horizonMatrix.map(h => {
            const dir = h.direction === 'BULL' ? 1 : h.direction === 'BEAR' ? -1 : 0;
            const tier = h.tier as 'TIMING' | 'TACTICAL' | 'STRUCTURE';
            const baseWeight = tier === 'STRUCTURE' ? 0.42 : tier === 'TACTICAL' ? 0.36 : 0.22;
            const weight = baseWeight / horizonMatrix.length;
            return { horizon: h.horizon, direction: h.direction === 'BULL' ? 'BULLISH' : h.direction === 'BEAR' ? 'BEARISH' : 'FLAT', weight, contribution: dir * weight * h.confidence };
          });
          const rawConsensus = votes.reduce((sum, v) => sum + v.contribution, 0);
          const consensusIdx = Math.round(50 + rawConsensus * 50);
          const bullW = votes.filter(v => v.direction === 'BULLISH').reduce((s, v) => s + v.weight, 0);
          const bearW = votes.filter(v => v.direction === 'BEARISH').reduce((s, v) => s + v.weight, 0);
          const conflictLvl = Math.abs(bullW - bearW) < 0.2 ? 'HIGH' : Math.abs(bullW - bearW) < 0.35 ? 'MODERATE' : 'LOW';
          const structDir = horizonMatrix.filter(h => h.tier === 'STRUCTURE').reduce((d, h) => h.direction === 'BULL' ? 'BULLISH' : h.direction === 'BEAR' ? 'BEARISH' : d, 'FLAT' as string);
          const action = rawConsensus > 0.1 ? 'BUY' : rawConsensus < -0.1 ? 'SELL' : 'HOLD';
          return {
            consensusIndex: consensusIdx,
            conflictLevel: conflictLvl,
            votes,
            conflictReasons: conflictLvl === 'HIGH' ? ['Mixed signals across tiers'] : [],
            resolved: { action, mode: action === 'HOLD' ? 'WAIT' : 'TREND_FOLLOW', sizeMultiplier: Math.min(1, Math.abs(rawConsensus) * 1.5), dominantTier: 'STRUCTURE' },
            adaptiveMeta: { regime: volatilityResult.regime, structuralDominance: true, divergencePenalties: 0, phasePenalties: 0, stabilityGuard: false },
          };
        })(),
        structure: {
          globalBias: resolved.bias.dir,
          biasStrength: resolved.bias.strength,
          phase: globalPhase,
          dominantHorizon: resolved.bias.dominantHorizon,
          explain,
        },
        resolver: {
          timing: {
            action: resolved.timing.action,
            score: resolved.timing.score,
            strength: resolved.timing.strength,
            dominantHorizon: resolved.timing.dominantHorizon,
          },
          final: {
            action: resolved.final.action,
            mode: resolved.final.mode,
            sizeMultiplier: resolved.final.sizeMultiplier,
            reason: resolved.final.reason,
            blockers: resolved.timing.blockers,
          },
          conflict: {
            hasConflict,
            shortTermDir: shortBias,
            longTermDir: longBias,
          },
          consensusIndex,
        },
        // BLOCK 59.2 — Decision Kernel (P1.1 + P1.2)
        decisionKernel: {
          consensus: {
            score: consensusResult.score,
            dir: consensusResult.dir,
            dispersion: consensusResult.dispersion,
            multiplier: consensusMultiplier,
            weights: {
              buy: consensusResult.buyWeight,
              sell: consensusResult.sellWeight,
              hold: consensusResult.holdWeight,
            },
            votes: consensusResult.votes.map(v => ({
              horizon: v.horizon,
              tier: v.tier,
              direction: v.direction,
              rawConfidence: v.rawConfidence,
              effectiveWeight: v.effectiveWeight,
              penalties: v.penalties,
              contribution: v.contribution,
            })),
          },
          // P1.2: Conflict Policy
          conflict: {
            level: conflictResult.level,
            mode: conflictResult.mode,
            sizingPenalty: conflictResult.sizingPenalty,
            sizingMultiplier: conflictSizingMultiplier,
            structureVsTiming: {
              aligned: conflictResult.structureVsTiming.aligned,
              structureDir: conflictResult.structureVsTiming.structureDir,
              timingDir: conflictResult.structureVsTiming.timingDir,
              divergenceScore: conflictResult.structureVsTiming.divergenceScore,
            },
            tiers: {
              structure: { dir: conflictResult.structure.dominantDir, strength: conflictResult.structure.strength },
              tactical: { dir: conflictResult.tactical.dominantDir, strength: conflictResult.tactical.strength },
              timing: { dir: conflictResult.timing.dominantDir, strength: conflictResult.timing.strength },
            },
            explain: conflictResult.explain,
            recommendation: conflictResult.recommendation,
          },
          // P1.3 + P1.6: Sizing Policy with Breakdown
          sizing: {
            mode: sizingResult.mode,
            preset: 'BALANCED',
            baseSize: sizingResult.baseSize,
            consensusMultiplier: sizingResult.consensusMultiplier,
            conflictMultiplier: sizingResult.conflictMultiplier,
            riskMultiplier: sizingResult.riskMultiplier,
            volatilityMultiplier: volatilityResult.policy.sizeMultiplier,
            finalSize: finalSizeAfterVol,
            finalPercent: Math.round(finalSizeAfterVol * 1000) / 10,
            sizeLabel: sizeToLabel(finalSizeAfterVol),
            blockers: [...sizingResult.blockers, ...volatilityResult.blockers],
            explain: sizingResult.explain,
            // P1.6: Full breakdown for transparency
            breakdown: [
              {
                factor: 'BASE_PRESET',
                order: 1,
                multiplier: sizingResult.baseSize,
                note: 'Balanced preset base',
                severity: 'OK',
              },
              {
                factor: 'CONSENSUS',
                order: 2,
                multiplier: sizingResult.consensusMultiplier,
                note: `Consensus ${(consensusResult.score * 100).toFixed(0)}%`,
                severity: sizingResult.consensusMultiplier >= 0.7 ? 'OK' : sizingResult.consensusMultiplier >= 0.4 ? 'WARN' : 'CRITICAL',
              },
              {
                factor: 'CONFLICT',
                order: 3,
                multiplier: sizingResult.conflictMultiplier,
                note: `Conflict ${conflictResult.level}`,
                severity: sizingResult.conflictMultiplier >= 0.8 ? 'OK' : sizingResult.conflictMultiplier >= 0.5 ? 'WARN' : 'CRITICAL',
              },
              {
                factor: 'RISK',
                order: 4,
                multiplier: sizingResult.riskMultiplier,
                note: 'Tail + entropy penalty',
                severity: sizingResult.riskMultiplier >= 0.8 ? 'OK' : sizingResult.riskMultiplier >= 0.5 ? 'WARN' : 'CRITICAL',
              },
              {
                factor: 'VOLATILITY',
                order: 5,
                multiplier: volatilityResult.policy.sizeMultiplier,
                note: `${volatilityResult.regime} regime clamp`,
                severity: volatilityResult.policy.sizeMultiplier >= 0.7 ? 'OK' : volatilityResult.policy.sizeMultiplier >= 0.4 ? 'WARN' : 'CRITICAL',
              },
            ],
            formula: `${sizingResult.baseSize.toFixed(2)} × ${sizingResult.consensusMultiplier.toFixed(2)} × ${sizingResult.conflictMultiplier.toFixed(2)} × ${sizingResult.riskMultiplier.toFixed(2)} × ${volatilityResult.policy.sizeMultiplier.toFixed(2)}`,
          },
        },
        // P1.4: Volatility Regime
        volatility: {
          regime: volatilityResult.regime,
          rv30: volatilityResult.features.rv30,
          rv90: volatilityResult.features.rv90,
          atr14Pct: volatilityResult.features.atr14Pct,
          atrPercentile: volatilityResult.features.atrPercentile,
          volRatio: volatilityResult.features.volRatio,
          volZScore: volatilityResult.features.volZScore,
          policy: {
            sizeMultiplier: volatilityResult.policy.sizeMultiplier,
            confidencePenaltyPp: volatilityResult.policy.confidencePenaltyPp,
          },
          applied: {
            sizeBefore: volatilityApplied.sizeBefore,
            sizeAfter: volatilityApplied.sizeAfter,
            confBefore: volatilityApplied.confBefore,
            confAfter: volatilityApplied.confAfter,
          },
          blockers: volatilityResult.blockers,
          explain: volatilityResult.explain,
        },
      };

      return reply.send(payload);
    } catch (err: any) {
      fastify.log.error({ err: err.message }, '[Terminal] Error');
      return reply.code(500).send({ error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  fastify.log.info('[Fractal] PHASE 2 P0.1: Terminal aggregator registered');
}
