/**
 * BLOCK 76.1 — Consensus Pulse Routes
 * BLOCK 76.2 — Weekly Digest Routes
 * 
 * GET /api/fractal/v2.1/consensus-pulse - 7d consensus dynamics
 * POST /api/fractal/v2.1/admin/weekly-digest/send - Send weekly digest
 * GET /api/fractal/v2.1/admin/weekly-digest/preview - Preview digest
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { consensusPulseService } from './consensus-pulse.service.js';
import { weeklyDigestService } from './weekly-digest.service.js';

export async function consensusPulseRoutes(fastify: FastifyInstance): Promise<void> {
  
  /**
   * GET /api/fractal/v2.1/consensus-pulse
   * 
   * Returns 7-day consensus pulse for terminal header
   */
  fastify.get('/api/fractal/v2.1/consensus-pulse', async (
    request: FastifyRequest<{
      Querystring: { symbol?: string; days?: string }
    }>
  ) => {
    const symbol = request.query.symbol ?? 'BTC';
    const days = parseInt(request.query.days || '7', 10);
    
    if (symbol !== 'BTC') {
      return { error: true, message: 'BTC_ONLY' };
    }
    
    try {
      let pulse = await consensusPulseService.getConsensusPulse(symbol, days);
      
      // If no snapshots, use live fallback
      if (pulse.series.length === 0) {
        pulse = await consensusPulseService.getLivePulse(symbol);
      }
      
      return pulse;
    } catch (err: any) {
      return { error: true, message: err.message };
    }
  });
  
  /**
   * GET /api/fractal/v2.1/admin/weekly-digest/preview
   * 
   * Preview weekly digest without sending
   */
  fastify.get('/api/fractal/v2.1/admin/weekly-digest/preview', async (
    request: FastifyRequest<{
      Querystring: { symbol?: string }
    }>
  ) => {
    const symbol = request.query.symbol ?? 'BTC';
    
    try {
      const digest = await weeklyDigestService.buildDigest(symbol);
      const message = weeklyDigestService.formatTelegramMessage(digest);
      
      return {
        digest,
        telegramPreview: message
      };
    } catch (err: any) {
      return { error: true, message: err.message };
    }
  });
  
  /**
   * POST /api/fractal/v2.1/admin/weekly-digest/send
   * 
   * Send weekly digest to Telegram
   */
  fastify.post('/api/fractal/v2.1/admin/weekly-digest/send', async (
    request: FastifyRequest<{
      Querystring: { symbol?: string }
    }>
  ) => {
    const symbol = request.query.symbol ?? 'BTC';
    
    try {
      const result = await weeklyDigestService.sendWeeklyDigest(symbol);
      return result;
    } catch (err: any) {
      return { error: true, message: err.message };
    }
  });
  
  fastify.log.info('[Fractal] BLOCK 76.1: Consensus Pulse routes registered');
  fastify.log.info('[Fractal] BLOCK 76.2: Weekly Digest routes registered');
}
