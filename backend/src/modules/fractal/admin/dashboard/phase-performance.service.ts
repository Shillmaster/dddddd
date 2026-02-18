/**
 * BLOCK 73.6 — Phase Performance Service
 * 
 * Institutional-grade phase attribution engine.
 * Uses ONLY forward-truth (resolved snapshots), no backtest.
 * 
 * Provides:
 * - Per-phase statistics (hitRate, avgReturn, sharpe, etc.)
 * - Grade calculation (A-F based on composite score)
 * - Tier-separated analysis (TIMING/TACTICAL/STRUCTURE)
 */

import { SignalSnapshotModel, type SignalSnapshotDocument } from '../../storage/signal-snapshot.schema.js';
import { CanonicalStore } from '../../data/canonical.store.js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type Tier = 'TIMING' | 'TACTICAL' | 'STRUCTURE';
export type Role = 'ACTIVE' | 'SHADOW';
export type Preset = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type SampleQuality = 'OK' | 'LOW_SAMPLE' | 'VERY_LOW_SAMPLE';
export type PhaseType = 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN' | 'RECOVERY' | 'CAPITULATION' | 'UNKNOWN';

// Tier to horizon mapping
const TIER_HORIZONS: Record<Tier, number[]> = {
  TIMING: [7, 14],
  TACTICAL: [30, 90],
  STRUCTURE: [180, 365]
};

// Sample quality thresholds
const SAMPLE_THRESHOLDS = {
  OK: 12,
  LOW: 6,
  VERY_LOW: 3
};

export interface PhasePerformanceQuery {
  symbol: string;
  tier: Tier;
  h?: number;        // Specific horizon (7/14/30/90/180/365)
  preset?: Preset;
  role?: Role;
  from?: string;
  to?: string;
}

export interface PhaseStats {
  phaseId: string;
  phaseName: string;
  phaseType: PhaseType;
  samples: number;
  sampleQuality: SampleQuality;
  // Core metrics
  hitRate: number;
  avgRet: number;
  medianRet: number;
  p10: number;
  p90: number;
  worstDay: number;
  maxDD: number;
  expectancy: number;
  profitFactor: number;
  sharpe: number;
  // Quality indicators
  avgDivergenceScore: number;
  recencyWeight: number;
  // Grade
  score: number;
  grade: Grade;
  warnings: string[];
}

export interface GlobalStats {
  hitRate: number;
  avgRet: number;
  medianRet: number;
  p10: number;
  p90: number;
  sharpe: number;
  maxDD: number;
  expectancy: number;
  profitFactor: number;
}

export interface PhasePerformanceResponse {
  meta: {
    symbol: string;
    tier: Tier;
    horizonDays: number | null;
    preset: Preset | null;
    role: Role;
    from: string;
    to: string;
    resolvedCount: number;
  };
  global: GlobalStats;
  phases: PhaseStats[];
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[idx];
}

function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map(x => Math.pow(x - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

function calcSharpe(returns: number[], annualFactor: number = 52): number {
  if (returns.length < 2) return 0;
  const avg = mean(returns);
  const sd = stdev(returns);
  if (sd === 0) return 0;
  return (avg / sd) * Math.sqrt(annualFactor);
}

function calcProfitFactor(returns: number[]): number {
  const wins = returns.filter(r => r > 0);
  const losses = returns.filter(r => r < 0);
  const sumWins = wins.reduce((a, b) => a + b, 0);
  const sumLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
  if (sumLosses === 0) return sumWins > 0 ? 10 : 0;
  return sumWins / sumLosses;
}

function calcMaxDD(returns: number[]): number {
  if (returns.length === 0) return 0;
  let peak = 1;
  let equity = 1;
  let maxDD = 0;
  for (const r of returns) {
    equity *= (1 + r);
    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

function calcExpectancy(returns: number[]): number {
  if (returns.length === 0) return 0;
  const wins = returns.filter(r => r > 0);
  const losses = returns.filter(r => r < 0);
  const winRate = wins.length / returns.length;
  const avgWin = wins.length > 0 ? mean(wins) : 0;
  const avgLoss = losses.length > 0 ? Math.abs(mean(losses)) : 0;
  return winRate * avgWin - (1 - winRate) * avgLoss;
}

function getSampleQuality(samples: number): SampleQuality {
  if (samples >= SAMPLE_THRESHOLDS.OK) return 'OK';
  if (samples >= SAMPLE_THRESHOLDS.LOW) return 'LOW_SAMPLE';
  return 'VERY_LOW_SAMPLE';
}

function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function calcGrade(score: number): Grade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function calcRecencyWeight(dates: Date[], now: Date): number {
  if (dates.length === 0) return 0;
  // More recent samples get higher weight
  const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
  let totalWeight = 0;
  for (const d of dates) {
    const age = now.getTime() - d.getTime();
    const weight = Math.max(0, 1 - age / maxAge);
    totalWeight += weight;
  }
  return totalWeight / dates.length;
}

// ═══════════════════════════════════════════════════════════════
// PHASE DETECTION (Simplified, inline)
// ═══════════════════════════════════════════════════════════════

function detectPhaseSimple(closes: number[]): PhaseType {
  if (closes.length < 50) return 'UNKNOWN';
  
  const last = closes[closes.length - 1];
  const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
  
  // Simple phase detection based on MA relationships
  const aboveMa20 = last > ma20;
  const aboveMa50 = last > ma50;
  const ma20AboveMa50 = ma20 > ma50;
  
  // Calculate momentum (20-day ROC)
  const roc20 = (last - closes[closes.length - 21]) / closes[closes.length - 21];
  
  if (aboveMa20 && aboveMa50 && ma20AboveMa50 && roc20 > 0.05) {
    return 'MARKUP';
  }
  if (!aboveMa20 && !aboveMa50 && !ma20AboveMa50 && roc20 < -0.05) {
    return 'MARKDOWN';
  }
  if (aboveMa50 && !ma20AboveMa50 && roc20 < 0) {
    return 'DISTRIBUTION';
  }
  if (!aboveMa50 && ma20AboveMa50 && roc20 > 0) {
    return 'RECOVERY';
  }
  if (!aboveMa20 && roc20 < -0.10) {
    return 'CAPITULATION';
  }
  return 'ACCUMULATION';
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

export class PhasePerformanceService {
  private canonicalStore = new CanonicalStore();
  private phaseDetector = new PhaseDetector();
  
  /**
   * Get phase for a given date from price data
   */
  private async getPhaseForDate(symbol: string, date: Date): Promise<PhaseType> {
    try {
      // Get candles around this date for phase detection
      const lookbackDays = 90;
      const from = new Date(date.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
      
      const candles = await this.canonicalStore.getRange(symbol, '1D', from, date);
      if (!candles || candles.length < 20) return 'UNKNOWN';
      
      // Use phase detector on last candle
      const closes = candles.map(c => c.c);
      const phase = this.phaseDetector.detectPhaseSimple(closes);
      
      return (phase?.toUpperCase() || 'UNKNOWN') as PhaseType;
    } catch {
      return 'UNKNOWN';
    }
  }
  
  /**
   * Calculate stats for a set of returns
   */
  private calcStats(returns: number[], dates: Date[]): Omit<GlobalStats, 'hitRate'> & { hitRate: number } {
    const hits = returns.filter(r => r > 0).length;
    return {
      hitRate: returns.length > 0 ? hits / returns.length : 0,
      avgRet: mean(returns),
      medianRet: median(returns),
      p10: percentile(returns, 0.1),
      p90: percentile(returns, 0.9),
      sharpe: calcSharpe(returns, 52),
      maxDD: calcMaxDD(returns),
      expectancy: calcExpectancy(returns),
      profitFactor: calcProfitFactor(returns)
    };
  }
  
  /**
   * Calculate phase performance score (0-100)
   */
  private calcPhaseScore(stats: {
    hitRate: number;
    expectancy: number;
    sharpe: number;
    profitFactor: number;
    maxDD: number;
    avgDivergenceScore: number;
  }, sampleQuality: SampleQuality): number {
    // Normalize metrics to 0-1 scale
    const normHitRate = normalize(stats.hitRate, 0.3, 0.7);       // 30%-70% range
    const normExpectancy = normalize(stats.expectancy, -0.05, 0.1); // -5% to +10%
    const normSharpe = normalize(stats.sharpe, -0.5, 2.0);        // -0.5 to 2.0
    const normPF = normalize(stats.profitFactor, 0.5, 2.0);       // 0.5x to 2x
    const normDD = normalize(1 - stats.maxDD, 0.6, 1.0);          // 0-40% DD good
    const normDiv = normalize(stats.avgDivergenceScore, 40, 90);  // 40-90 good
    
    // Weighted composite
    let score = (
      0.30 * normHitRate +
      0.25 * normExpectancy +
      0.20 * normSharpe +
      0.15 * normPF +
      0.05 * normDD +
      0.05 * normDiv
    ) * 100;
    
    // Apply penalties
    if (sampleQuality === 'LOW_SAMPLE') score -= 10;
    if (sampleQuality === 'VERY_LOW_SAMPLE') score -= 20;
    if (stats.avgDivergenceScore < 55) score -= 15; // HIGH_DIVERGENCE penalty
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Main aggregation function
   */
  async aggregate(query: PhasePerformanceQuery): Promise<PhasePerformanceResponse> {
    const {
      symbol,
      tier,
      h,
      preset = 'BALANCED',
      role = 'ACTIVE',
      from,
      to
    } = query;
    
    // Determine horizons based on tier or specific h
    const horizons = h ? [h] : TIER_HORIZONS[tier];
    
    // Build filter
    const filter: any = {
      symbol,
      modelType: role,
      resolved: true
    };
    
    if (preset) {
      filter['strategy.preset'] = preset;
    }
    
    // Date range
    const now = new Date();
    const fromDate = from ? new Date(from) : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : now;
    filter.asOf = { $gte: fromDate, $lte: toDate };
    
    // Fetch resolved snapshots
    const snapshots = await SignalSnapshotModel
      .find(filter)
      .sort({ asOf: 1 })
      .lean() as SignalSnapshotDocument[];
    
    // Process snapshots and group by phase
    const phaseData: Map<PhaseType, {
      returns: number[];
      dates: Date[];
      divergenceScores: number[];
    }> = new Map();
    
    const allReturns: number[] = [];
    const allDates: Date[] = [];
    let resolvedCount = 0;
    
    for (const snap of snapshots) {
      // Get realized return for relevant horizons
      const outcomes = (snap as any).outcomes;
      if (!outcomes) continue;
      
      for (const hKey of horizons) {
        const outcome = outcomes[`${hKey}d`];
        if (!outcome || outcome.realizedReturn === undefined) continue;
        
        resolvedCount++;
        const ret = outcome.realizedReturn;
        
        // Detect phase at snapshot time
        const phase = await this.getPhaseForDate(symbol, snap.asOf);
        
        // Get divergence score if available (from metrics or default)
        const divergenceScore = snap.metrics?.similarityMean 
          ? snap.metrics.similarityMean * 100 
          : 70;
        
        // Add to phase bucket
        if (!phaseData.has(phase)) {
          phaseData.set(phase, { returns: [], dates: [], divergenceScores: [] });
        }
        const bucket = phaseData.get(phase)!;
        bucket.returns.push(ret);
        bucket.dates.push(snap.asOf);
        bucket.divergenceScores.push(divergenceScore);
        
        // Add to global
        allReturns.push(ret);
        allDates.push(snap.asOf);
      }
    }
    
    // Calculate global stats
    const globalStats = this.calcStats(allReturns, allDates);
    
    // Calculate per-phase stats
    const phases: PhaseStats[] = [];
    const warnings: string[] = [];
    
    for (const [phaseType, data] of phaseData.entries()) {
      if (phaseType === 'UNKNOWN') continue;
      
      const stats = this.calcStats(data.returns, data.dates);
      const sampleQuality = getSampleQuality(data.returns.length);
      const avgDivergenceScore = mean(data.divergenceScores);
      const recencyWeight = calcRecencyWeight(data.dates, now);
      
      const score = this.calcPhaseScore({
        hitRate: stats.hitRate,
        expectancy: stats.expectancy,
        sharpe: stats.sharpe,
        profitFactor: stats.profitFactor,
        maxDD: stats.maxDD,
        avgDivergenceScore
      }, sampleQuality);
      
      const grade = calcGrade(score);
      
      // Generate warnings
      const phaseWarnings: string[] = [];
      if (sampleQuality === 'LOW_SAMPLE') phaseWarnings.push('LOW_SAMPLE');
      if (sampleQuality === 'VERY_LOW_SAMPLE') phaseWarnings.push('VERY_LOW_SAMPLE');
      if (avgDivergenceScore < 55) phaseWarnings.push('HIGH_DIVERGENCE');
      if (recencyWeight < 0.4) phaseWarnings.push('RECENCY_BIAS');
      
      phases.push({
        phaseId: `phase_${phaseType.toLowerCase()}`,
        phaseName: phaseType,
        phaseType,
        samples: data.returns.length,
        sampleQuality,
        hitRate: stats.hitRate,
        avgRet: stats.avgRet,
        medianRet: stats.medianRet,
        p10: stats.p10,
        p90: stats.p90,
        worstDay: Math.min(...data.returns),
        maxDD: stats.maxDD,
        expectancy: stats.expectancy,
        profitFactor: stats.profitFactor,
        sharpe: stats.sharpe,
        avgDivergenceScore,
        recencyWeight,
        score,
        grade,
        warnings: phaseWarnings
      });
    }
    
    // Sort by grade (A first)
    phases.sort((a, b) => {
      const gradeOrder = { A: 0, B: 1, C: 2, D: 3, F: 4 };
      return gradeOrder[a.grade] - gradeOrder[b.grade];
    });
    
    // Global warnings
    if (resolvedCount < 20) warnings.push('INSUFFICIENT_DATA');
    if (phases.length === 0) warnings.push('NO_PHASE_DATA');
    
    return {
      meta: {
        symbol,
        tier,
        horizonDays: h || null,
        preset,
        role,
        from: fromDate.toISOString().slice(0, 10),
        to: toDate.toISOString().slice(0, 10),
        resolvedCount
      },
      global: globalStats,
      phases,
      warnings
    };
  }
}

export const phasePerformanceService = new PhasePerformanceService();
