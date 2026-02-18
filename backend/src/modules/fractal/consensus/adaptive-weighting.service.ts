/**
 * BLOCK 74.3 — Adaptive Weighting 2.0 Service
 * 
 * Institutional-grade weight calculation:
 * FINAL_WEIGHT = baseTierWeight × regimeModifier × divergencePenalty × phaseQualityModifier
 * 
 * Features:
 * - Regime-aware tier weighting (CRISIS → STRUCTURE dominates)
 * - Divergence penalty (low confidence → reduced weight)
 * - Phase quality modifier (bad phase → reduced weight)
 * - Structural dominance clamp (prevents short-term override)
 */

import type { HorizonKey } from '../config/horizon.config.js';
import type { Grade, SampleQuality } from '../admin/dashboard/phase-performance.service.js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type Tier = 'TIMING' | 'TACTICAL' | 'STRUCTURE';
export type VolRegime = 'LOW' | 'NORMAL' | 'HIGH' | 'EXPANSION' | 'CRISIS';
export type Direction = 'BULLISH' | 'BEARISH' | 'FLAT';
export type ConflictLevel = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';

export interface HorizonStackItem {
  horizon: HorizonKey;
  tier: Tier;
  direction: Direction;
  confidenceRaw: number;
  confidenceFinal: number;
  
  phase: {
    type: string;
    grade: Grade;
    score: number;
    sampleQuality: SampleQuality;
  };
  
  divergence: {
    score: number;
    grade: Grade;
    flags: string[];
  };
  
  tail: {
    p95dd: number;
    wfMaxDD: number;
  };
  
  matches: {
    count: number;
    primary: {
      id: string;
      score: number;
      return: number;
    } | null;
  };
  
  blockers: string[];
  voteWeight: number;
  weightBreakdown: {
    baseTier: number;
    regimeMod: number;
    divergenceMod: number;
    phaseMod: number;
    final: number;
  };
}

export interface ConsensusResult74 {
  consensusIndex: number;  // 0-100
  conflictLevel: ConflictLevel;
  
  votes: Array<{
    horizon: HorizonKey;
    direction: Direction;
    weight: number;
    contribution: number;
  }>;
  
  conflictReasons: string[];
  
  resolved: {
    action: 'BUY' | 'SELL' | 'HOLD';
    mode: 'TREND_FOLLOW' | 'COUNTER_TREND' | 'WAIT';
    sizeMultiplier: number;
    dominantTier: Tier;
  };
  
  adaptiveMeta: {
    regime: VolRegime;
    structuralDominance: boolean;
    divergencePenalties: number;
    phasePenalties: number;
    stabilityGuard: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS — INSTITUTIONAL CALIBRATION
// ═══════════════════════════════════════════════════════════════

// Base Tier Weights (sum = 1.0 per tier group)
const BASE_TIER_WEIGHTS: Record<HorizonKey, number> = {
  '7d': 0.08,
  '14d': 0.10,
  '30d': 0.18,
  '90d': 0.22,
  '180d': 0.20,
  '365d': 0.22,
};

// Volatility Regime Modifiers
const REGIME_MODIFIERS: Record<VolRegime, Record<Tier, number>> = {
  LOW: {
    TIMING: 1.15,
    TACTICAL: 1.00,
    STRUCTURE: 0.90,
  },
  NORMAL: {
    TIMING: 1.00,
    TACTICAL: 1.00,
    STRUCTURE: 1.00,
  },
  HIGH: {
    TIMING: 0.85,
    TACTICAL: 1.05,
    STRUCTURE: 1.10,
  },
  EXPANSION: {
    TIMING: 0.80,
    TACTICAL: 1.10,
    STRUCTURE: 1.15,
  },
  CRISIS: {
    TIMING: 0.60,
    TACTICAL: 1.10,
    STRUCTURE: 1.35,
  },
};

// Divergence Grade Penalties
const DIVERGENCE_MODIFIERS: Record<Grade, number> = {
  A: 1.05,
  B: 1.00,
  C: 0.90,
  D: 0.70,
  F: 0.50,
};

// Phase Quality Modifiers
const PHASE_MODIFIERS: Record<Grade, number> = {
  A: 1.10,
  B: 1.05,
  C: 1.00,
  D: 0.85,
  F: 0.65,
};

// Structural Dominance Threshold
const STRUCTURAL_DOMINANCE_THRESHOLD = 0.55;

// Stability Guard Threshold (consensus jump)
const STABILITY_GUARD_THRESHOLD = 20;

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

export class AdaptiveWeightingService {
  private lastConsensusIndex: number | null = null;
  
  /**
   * Get tier for horizon
   */
  getTier(horizon: HorizonKey): Tier {
    if (['7d', '14d'].includes(horizon)) return 'TIMING';
    if (['30d', '90d'].includes(horizon)) return 'TACTICAL';
    return 'STRUCTURE';
  }
  
  /**
   * Convert direction string to standardized Direction type
   */
  normalizeDirection(dir: string): Direction {
    const upper = dir.toUpperCase();
    if (['BULL', 'BULLISH', 'UP', 'LONG', 'BUY'].includes(upper)) return 'BULLISH';
    if (['BEAR', 'BEARISH', 'DOWN', 'SHORT', 'SELL'].includes(upper)) return 'BEARISH';
    return 'FLAT';
  }
  
  /**
   * Calculate divergence grade from score
   */
  getDivergenceGrade(score: number): Grade {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }
  
  /**
   * Compute adaptive weight for a single horizon
   */
  computeHorizonWeight(
    horizon: HorizonKey,
    regime: VolRegime,
    divergenceGrade: Grade,
    phaseGrade: Grade,
    hasHighDivergence: boolean
  ): { weight: number; breakdown: HorizonStackItem['weightBreakdown'] } {
    const tier = this.getTier(horizon);
    
    // Step 1: Base tier weight
    const baseTier = BASE_TIER_WEIGHTS[horizon];
    
    // Step 2: Regime modifier
    const regimeMod = REGIME_MODIFIERS[regime]?.[tier] ?? 1.0;
    
    // Step 3: Divergence modifier
    let divergenceMod = DIVERGENCE_MODIFIERS[divergenceGrade] ?? 1.0;
    if (hasHighDivergence) {
      divergenceMod *= 0.85;  // Additional penalty for HIGH_DIVERGENCE flag
    }
    
    // Step 4: Phase quality modifier
    const phaseMod = PHASE_MODIFIERS[phaseGrade] ?? 1.0;
    
    // Step 5: Final weight
    const final = baseTier * regimeMod * divergenceMod * phaseMod;
    
    return {
      weight: final,
      breakdown: {
        baseTier,
        regimeMod,
        divergenceMod,
        phaseMod,
        final,
      },
    };
  }
  
  /**
   * Build full horizon stack with adaptive weights
   */
  buildHorizonStack(
    horizonData: Array<{
      horizon: HorizonKey;
      direction: string;
      confidence: number;
      entropy: number;
      tailRisk: number;
      reliability: number;
      blockers: string[];
      matchCount: number;
      primaryMatch: { id: string; score: number; return: number } | null;
    }>,
    regime: VolRegime,
    phaseGrades: Record<string, { grade: Grade; score: number; sampleQuality: SampleQuality }>
  ): HorizonStackItem[] {
    const stack: HorizonStackItem[] = [];
    
    for (const h of horizonData) {
      const tier = this.getTier(h.horizon);
      const direction = this.normalizeDirection(h.direction);
      
      // Get phase grade for this horizon's tier
      const tierPhaseKey = tier.toLowerCase();
      const phaseData = phaseGrades[tierPhaseKey] || { grade: 'C' as Grade, score: 50, sampleQuality: 'OK' as SampleQuality };
      
      // Calculate divergence from entropy (higher entropy = more divergence = lower score)
      const divergenceScore = Math.max(0, Math.min(100, (1 - h.entropy) * 100));
      const divergenceGrade = this.getDivergenceGrade(divergenceScore);
      const hasHighDivergence = h.entropy > 0.7;
      
      // Compute adaptive weight
      const { weight, breakdown } = this.computeHorizonWeight(
        h.horizon,
        regime,
        divergenceGrade,
        phaseData.grade,
        hasHighDivergence
      );
      
      // Adjusted confidence (with penalties applied)
      const confidenceFinal = h.confidence * (1 - h.entropy * 0.3) * (phaseData.score / 100);
      
      stack.push({
        horizon: h.horizon,
        tier,
        direction,
        confidenceRaw: h.confidence,
        confidenceFinal: Math.max(0, Math.min(1, confidenceFinal)),
        
        phase: {
          type: 'CURRENT',  // Will be filled by caller
          grade: phaseData.grade,
          score: phaseData.score,
          sampleQuality: phaseData.sampleQuality,
        },
        
        divergence: {
          score: divergenceScore,
          grade: divergenceGrade,
          flags: hasHighDivergence ? ['HIGH_DIVERGENCE'] : [],
        },
        
        tail: {
          p95dd: h.tailRisk,
          wfMaxDD: h.tailRisk * 0.6,  // Approximate
        },
        
        matches: {
          count: h.matchCount,
          primary: h.primaryMatch,
        },
        
        blockers: h.blockers,
        voteWeight: weight,
        weightBreakdown: breakdown,
      });
    }
    
    // Normalize weights to sum to 1.0
    const totalWeight = stack.reduce((sum, item) => sum + item.voteWeight, 0);
    if (totalWeight > 0) {
      stack.forEach(item => {
        item.voteWeight = item.voteWeight / totalWeight;
        item.weightBreakdown.final = item.voteWeight;
      });
    }
    
    return stack;
  }
  
  /**
   * Compute institutional consensus from horizon stack
   */
  computeConsensus(
    stack: HorizonStackItem[],
    regime: VolRegime
  ): ConsensusResult74 {
    // Calculate directional votes
    const votes = stack.map(item => {
      const directionScore = item.direction === 'BULLISH' ? 1 : item.direction === 'BEARISH' ? -1 : 0;
      const contribution = item.voteWeight * directionScore * item.confidenceFinal;
      
      return {
        horizon: item.horizon,
        direction: item.direction,
        weight: item.voteWeight,
        contribution,
      };
    });
    
    // Raw consensus score (-1 to +1)
    const rawConsensus = votes.reduce((sum, v) => sum + v.contribution, 0);
    
    // Convert to 0-100 index (50 = neutral)
    const consensusIndex = Math.round(50 + rawConsensus * 50);
    
    // Determine conflict level
    const bullishWeight = stack.filter(s => s.direction === 'BULLISH').reduce((sum, s) => sum + s.voteWeight, 0);
    const bearishWeight = stack.filter(s => s.direction === 'BEARISH').reduce((sum, s) => sum + s.voteWeight, 0);
    const maxWeight = Math.max(bullishWeight, bearishWeight);
    const minWeight = Math.min(bullishWeight, bearishWeight);
    const weightDiff = maxWeight - minWeight;
    
    let conflictLevel: ConflictLevel = 'NONE';
    if (weightDiff < 0.2) conflictLevel = 'HIGH';
    else if (weightDiff < 0.35) conflictLevel = 'MODERATE';
    else if (weightDiff < 0.5) conflictLevel = 'LOW';
    
    // Check structural dominance
    const structureWeight = stack
      .filter(s => s.tier === 'STRUCTURE')
      .reduce((sum, s) => sum + s.voteWeight, 0);
    const structuralDominance = structureWeight > STRUCTURAL_DOMINANCE_THRESHOLD;
    
    // Get dominant tier direction
    const structureDir = this.getTierDominantDirection(stack, 'STRUCTURE');
    const tacticalDir = this.getTierDominantDirection(stack, 'TACTICAL');
    const timingDir = this.getTierDominantDirection(stack, 'TIMING');
    
    // Build conflict reasons
    const conflictReasons: string[] = [];
    if (structureDir !== timingDir && structureDir !== 'FLAT' && timingDir !== 'FLAT') {
      conflictReasons.push(`Short-term ${timingDir.toLowerCase()} vs long-term ${structureDir.toLowerCase()}`);
    }
    if (structuralDominance) {
      conflictReasons.push('Structure tier dominates decision');
    }
    if (regime === 'CRISIS') {
      conflictReasons.push('Crisis regime active — short-term signals suppressed');
    }
    
    // Determine resolved action
    let action: 'BUY' | 'SELL' | 'HOLD';
    let mode: 'TREND_FOLLOW' | 'COUNTER_TREND' | 'WAIT';
    let sizeMultiplier: number;
    
    // If structural dominance, follow structure
    const dominantDirection = structuralDominance ? structureDir : 
      (rawConsensus > 0.1 ? 'BULLISH' : rawConsensus < -0.1 ? 'BEARISH' : 'FLAT');
    
    if (dominantDirection === 'BULLISH') {
      action = 'BUY';
      mode = structureDir === timingDir ? 'TREND_FOLLOW' : 'COUNTER_TREND';
    } else if (dominantDirection === 'BEARISH') {
      action = 'SELL';
      mode = structureDir === timingDir ? 'TREND_FOLLOW' : 'COUNTER_TREND';
    } else {
      action = 'HOLD';
      mode = 'WAIT';
    }
    
    // Size multiplier based on consensus strength and conflict
    const consensusStrength = Math.abs(rawConsensus);
    const conflictPenalty = conflictLevel === 'HIGH' ? 0.5 : 
                            conflictLevel === 'MODERATE' ? 0.75 :
                            conflictLevel === 'LOW' ? 0.9 : 1.0;
    sizeMultiplier = Math.min(1.0, consensusStrength * 1.5) * conflictPenalty;
    
    // Stability guard check
    let stabilityGuard = false;
    if (this.lastConsensusIndex !== null) {
      const jump = Math.abs(consensusIndex - this.lastConsensusIndex);
      if (jump > STABILITY_GUARD_THRESHOLD) {
        stabilityGuard = true;
        sizeMultiplier = Math.min(sizeMultiplier, 0.5);
        conflictReasons.push(`Stability guard: consensus jumped ${jump} points`);
      }
    }
    this.lastConsensusIndex = consensusIndex;
    
    // Count penalties
    const divergencePenalties = stack.filter(s => s.divergence.grade === 'D' || s.divergence.grade === 'F').length;
    const phasePenalties = stack.filter(s => s.phase.grade === 'D' || s.phase.grade === 'F').length;
    
    return {
      consensusIndex,
      conflictLevel,
      votes,
      conflictReasons,
      resolved: {
        action,
        mode,
        sizeMultiplier: Math.round(sizeMultiplier * 100) / 100,
        dominantTier: structuralDominance ? 'STRUCTURE' : 'TACTICAL',
      },
      adaptiveMeta: {
        regime,
        structuralDominance,
        divergencePenalties,
        phasePenalties,
        stabilityGuard,
      },
    };
  }
  
  /**
   * Get dominant direction for a tier
   */
  private getTierDominantDirection(stack: HorizonStackItem[], tier: Tier): Direction {
    const tierItems = stack.filter(s => s.tier === tier);
    if (tierItems.length === 0) return 'FLAT';
    
    let bullish = 0, bearish = 0;
    for (const item of tierItems) {
      if (item.direction === 'BULLISH') bullish += item.voteWeight;
      else if (item.direction === 'BEARISH') bearish += item.voteWeight;
    }
    
    if (bullish > bearish * 1.2) return 'BULLISH';
    if (bearish > bullish * 1.2) return 'BEARISH';
    return 'FLAT';
  }
}

// Singleton
let _instance: AdaptiveWeightingService | null = null;

export function getAdaptiveWeightingService(): AdaptiveWeightingService {
  if (!_instance) {
    _instance = new AdaptiveWeightingService();
  }
  return _instance;
}
