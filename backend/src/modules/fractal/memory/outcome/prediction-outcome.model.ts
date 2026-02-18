/**
 * BLOCK 75.2 — Prediction Outcome Model
 * 
 * Forward truth record: what actually happened after prediction.
 * Linked to PredictionSnapshot via (symbol, asofDate, focus, role, preset)
 * 
 * Principles:
 * - Write once after maturity
 * - Immutable truth
 * - Idempotent resolution
 */

import mongoose, { Schema, Document } from 'mongoose';
import type { FocusHorizon, SnapshotRole, SnapshotPreset, DirectionType, GradeType, TierType } from '../snapshot/prediction-snapshot.model.js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type OutcomeLabel = 'UP' | 'DOWN' | 'FLAT';

export interface PredictedState {
  direction: DirectionType;
  finalSize: number;
  consensusIndex: number;
  divergenceScore: number;
  phaseGrade: GradeType;
  volRegime: string;
  structuralLock: boolean;
  dominance: TierType;
  
  // Distribution if available
  p10?: number;
  p50?: number;
  p90?: number;
}

export interface TierTruth {
  tier: TierType;
  predictedDirection: 'BULLISH' | 'BEARISH' | 'FLAT';
  weight: number;
  hit: boolean;
}

export interface PredictionOutcomeDocument extends Document {
  symbol: 'BTC';
  asofDate: string;           // From snapshot
  focus: FocusHorizon;
  role: SnapshotRole;
  preset: SnapshotPreset;
  
  maturityDate: string;
  
  // Price data
  entryPrice: number;
  exitPrice: number;
  realizedReturnPct: number;  // (exit/entry - 1) * 100
  
  // Truth labeling
  hit: boolean;
  label: OutcomeLabel;
  directionTruth: OutcomeLabel;
  
  // Band hit (if distribution was predicted)
  bandHit?: 'P10_P90' | 'P25_P75' | 'OUTSIDE' | 'NA';
  
  // What was predicted
  predicted: PredictedState;
  
  // Tier-level truth (for attribution)
  tierTruth: TierTruth[];
  
  // Calibration metrics (optional)
  brier?: number;
  pinball?: number;
  
  // Meta for analysis
  meta: {
    volRegime?: string;
    phaseType?: string;
    divergenceGrade?: string;
    confidence?: number;
    entropy?: number;
  };
  
  resolvedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════

const PredictedStateSchema = new Schema({
  direction: { type: String, enum: ['BUY', 'SELL', 'HOLD'], required: true },
  finalSize: { type: Number, required: true },
  consensusIndex: { type: Number, required: true },
  divergenceScore: { type: Number, required: true },
  phaseGrade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'], required: true },
  volRegime: { type: String, required: true },
  structuralLock: { type: Boolean, required: true },
  dominance: { type: String, enum: ['TIMING', 'TACTICAL', 'STRUCTURE'], required: true },
  p10: { type: Number },
  p50: { type: Number },
  p90: { type: Number }
}, { _id: false });

const TierTruthSchema = new Schema({
  tier: { type: String, enum: ['TIMING', 'TACTICAL', 'STRUCTURE'], required: true },
  predictedDirection: { type: String, enum: ['BULLISH', 'BEARISH', 'FLAT'], required: true },
  weight: { type: Number, required: true },
  hit: { type: Boolean, required: true }
}, { _id: false });

const MetaSchema = new Schema({
  volRegime: { type: String },
  phaseType: { type: String },
  divergenceGrade: { type: String },
  confidence: { type: Number },
  entropy: { type: Number }
}, { _id: false });

const PredictionOutcomeSchema = new Schema<PredictionOutcomeDocument>(
  {
    symbol: { type: String, enum: ['BTC'], required: true },
    asofDate: { type: String, required: true },
    focus: { 
      type: String, 
      enum: ['7d', '14d', '30d', '90d', '180d', '365d'], 
      required: true 
    },
    role: { type: String, enum: ['ACTIVE', 'SHADOW'], required: true },
    preset: { 
      type: String, 
      enum: ['conservative', 'balanced', 'aggressive'], 
      required: true 
    },
    
    maturityDate: { type: String, required: true },
    
    entryPrice: { type: Number, required: true },
    exitPrice: { type: Number, required: true },
    realizedReturnPct: { type: Number, required: true },
    
    hit: { type: Boolean, required: true },
    label: { type: String, enum: ['UP', 'DOWN', 'FLAT'], required: true },
    directionTruth: { type: String, enum: ['UP', 'DOWN', 'FLAT'], required: true },
    
    bandHit: { type: String, enum: ['P10_P90', 'P25_P75', 'OUTSIDE', 'NA'] },
    
    predicted: { type: PredictedStateSchema, required: true },
    tierTruth: [TierTruthSchema],
    
    brier: { type: Number },
    pinball: { type: Number },
    
    meta: { type: MetaSchema },
    
    resolvedAt: { type: Date, required: true }
  },
  { timestamps: true }
);

/**
 * UNIQUE: One outcome per snapshot
 */
PredictionOutcomeSchema.index(
  { symbol: 1, asofDate: 1, focus: 1, role: 1, preset: 1 },
  { unique: true }
);

/**
 * Query index for stats aggregation
 */
PredictionOutcomeSchema.index({ symbol: 1, focus: 1, resolvedAt: 1 });

/**
 * Query index for attribution
 */
PredictionOutcomeSchema.index({ symbol: 1, 'meta.volRegime': 1, 'meta.phaseType': 1 });

export const PredictionOutcomeModel = 
  mongoose.models.FractalPredictionOutcome ||
  mongoose.model<PredictionOutcomeDocument>('FractalPredictionOutcome', PredictionOutcomeSchema);
