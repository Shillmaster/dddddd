/**
 * BLOCK 75.3 & 75.4 — Attribution & Policy Routes
 * 
 * GET  /api/fractal/v2.1/admin/memory/attribution/summary - Attribution analysis
 * POST /api/fractal/v2.1/admin/governance/policy/dry-run - Calculate policy changes
 * POST /api/fractal/v2.1/admin/governance/policy/propose - Create policy proposal
 * POST /api/fractal/v2.1/admin/governance/policy/apply - Apply proposal (manual)
 * GET  /api/fractal/v2.1/admin/governance/policy/current - Get current config
 * GET  /api/fractal/v2.1/admin/governance/policy/history - Get policy history
 * GET  /api/fractal/v2.1/admin/governance/policy/pending - Get pending proposals
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { attributionService } from './attribution.service.js';
import { policyUpdateService, type PolicyUpdateMode } from '../policy/policy-update.service.js';

export async function attributionRoutes(fastify: FastifyInstance): Promise<void> {
  
  // ═══════════════════════════════════════════════════════════════
  // BLOCK 75.3: ATTRIBUTION
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * GET /api/fractal/v2.1/admin/memory/attribution/summary
   * 
   * Build attribution summary: which tiers/regimes performed best
   */
  fastify.get('/api/fractal/v2.1/admin/memory/attribution/summary', async (
    request: FastifyRequest<{
      Querystring: { symbol?: string; from?: string; to?: string }
    }>
  ) => {
    const symbol = request.query.symbol ?? 'BTC';
    const from = request.query.from;
    const to = request.query.to;
    
    try {
      const summary = await attributionService.buildAttributionSummary(symbol, from, to);
      
      return {
        symbol,
        period: summary.period,
        totalOutcomes: summary.totalOutcomes,
        
        tierAccuracy: summary.tierAccuracy.map(t => ({
          tier: t.tier,
          hitRate: Number((t.hitRate * 100).toFixed(1)) + '%',
          total: t.total,
          avgWeightWhenHit: Number(t.avgWeightWhenHit.toFixed(3)),
          avgWeightWhenMiss: Number(t.avgWeightWhenMiss.toFixed(3))
        })),
        dominantTier: summary.dominantTier,
        
        regimeAccuracy: summary.regimeAccuracy.slice(0, 5).map(r => ({
          regime: r.regime,
          hitRate: Number((r.hitRate * 100).toFixed(1)) + '%',
          avgReturn: Number(r.avgReturn.toFixed(2)) + '%',
          total: r.total
        })),
        
        divergenceImpact: summary.divergenceImpact.map(d => ({
          grade: d.grade,
          hitRate: Number((d.hitRate * 100).toFixed(1)) + '%',
          errorRate: Number((d.errorRate * 100).toFixed(1)) + '%',
          total: d.total
        })),
        
        consensusHitRate: Number((summary.consensusHitRate * 100).toFixed(1)) + '%',
        consensusAvgReturn: Number(summary.consensusAvgReturn.toFixed(2)) + '%',
        
        insights: summary.insights
      };
    } catch (err: any) {
      return { error: true, message: err.message };
    }
  });
  
  // ═══════════════════════════════════════════════════════════════
  // BLOCK 75.4: POLICY GOVERNANCE
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * POST /api/fractal/v2.1/admin/governance/policy/dry-run
   * 
   * Calculate policy changes without persisting
   */
  fastify.post('/api/fractal/v2.1/admin/governance/policy/dry-run', async (
    request: FastifyRequest<{
      Querystring: { symbol?: string; from?: string; to?: string }
    }>
  ) => {
    const symbol = request.query.symbol ?? 'BTC';
    const from = request.query.from;
    const to = request.query.to;
    
    try {
      const result = await policyUpdateService.runUpdate(symbol, 'DRY_RUN', from, to);
      return result;
    } catch (err: any) {
      return { error: true, message: err.message };
    }
  });
  
  /**
   * POST /api/fractal/v2.1/admin/governance/policy/propose
   * 
   * Create a policy proposal (awaits manual approval)
   */
  fastify.post('/api/fractal/v2.1/admin/governance/policy/propose', async (
    request: FastifyRequest<{
      Querystring: { symbol?: string; from?: string; to?: string }
    }>
  ) => {
    const symbol = request.query.symbol ?? 'BTC';
    const from = request.query.from;
    const to = request.query.to;
    
    try {
      const result = await policyUpdateService.runUpdate(symbol, 'PROPOSE', from, to);
      return result;
    } catch (err: any) {
      return { error: true, message: err.message };
    }
  });
  
  /**
   * POST /api/fractal/v2.1/admin/governance/policy/apply
   * 
   * Apply an approved proposal (manual confirmation)
   */
  fastify.post('/api/fractal/v2.1/admin/governance/policy/apply', async (
    request: FastifyRequest<{
      Body: { proposalId: string; appliedBy?: string }
    }>
  ) => {
    const { proposalId, appliedBy } = request.body || {};
    
    if (!proposalId) {
      return { error: true, message: 'proposalId is required' };
    }
    
    try {
      const result = await policyUpdateService.applyProposal(proposalId, appliedBy || 'admin');
      return result;
    } catch (err: any) {
      return { error: true, message: err.message };
    }
  });
  
  /**
   * GET /api/fractal/v2.1/admin/governance/policy/current
   * 
   * Get current active policy config
   */
  fastify.get('/api/fractal/v2.1/admin/governance/policy/current', async (
    request: FastifyRequest<{
      Querystring: { symbol?: string }
    }>
  ) => {
    const symbol = request.query.symbol ?? 'BTC';
    
    try {
      const config = await policyUpdateService.getCurrentConfig();
      return { symbol, config };
    } catch (err: any) {
      return { error: true, message: err.message };
    }
  });
  
  /**
   * GET /api/fractal/v2.1/admin/governance/policy/history
   * 
   * Get policy proposal history
   */
  fastify.get('/api/fractal/v2.1/admin/governance/policy/history', async (
    request: FastifyRequest<{
      Querystring: { symbol?: string; limit?: string }
    }>
  ) => {
    const symbol = request.query.symbol ?? 'BTC';
    const limit = parseInt(request.query.limit || '10', 10);
    
    try {
      const history = await policyUpdateService.getHistory(symbol, limit);
      return {
        symbol,
        count: history.length,
        proposals: history.map(p => ({
          id: (p as any)._id.toString(),
          version: p.version,
          status: p.status,
          guardrailsPass: p.guardrailsPass,
          resolvedCount: p.windowRange.resolvedCount,
          proposedAt: p.proposedAt,
          appliedAt: p.appliedAt
        }))
      };
    } catch (err: any) {
      return { error: true, message: err.message };
    }
  });
  
  /**
   * GET /api/fractal/v2.1/admin/governance/policy/pending
   * 
   * Get pending policy proposals
   */
  fastify.get('/api/fractal/v2.1/admin/governance/policy/pending', async (
    request: FastifyRequest<{
      Querystring: { symbol?: string }
    }>
  ) => {
    const symbol = request.query.symbol ?? 'BTC';
    
    try {
      const pending = await policyUpdateService.getPendingProposals(symbol);
      return {
        symbol,
        count: pending.length,
        proposals: pending.map(p => ({
          id: (p as any)._id.toString(),
          version: p.version,
          guardrailsPass: p.guardrailsPass,
          guardrailViolations: p.guardrailViolations,
          diffs: p.diffs,
          insights: p.evidenceSummary?.topInsights,
          proposedAt: p.proposedAt
        }))
      };
    } catch (err: any) {
      return { error: true, message: err.message };
    }
  });
  
  fastify.log.info('[Fractal] BLOCK 75.3 & 75.4: Attribution & Policy routes registered');
}
