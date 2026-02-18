/**
 * BLOCK 65/67 — Volatility Attribution Tab (Admin)
 * 
 * Shows:
 * 1. Regime Timeline
 * 2. Equity Raw vs Scaled
 * 3. Performance by Regime Table
 * 4. Protection Report
 */

import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

// ═══════════════════════════════════════════════════════════════
// REGIME COLORS
// ═══════════════════════════════════════════════════════════════

const REGIME_COLORS = {
  LOW: { bg: '#dcfce7', text: '#166534' },
  NORMAL: { bg: '#f3f4f6', text: '#374151' },
  HIGH: { bg: '#fef3c7', text: '#92400e' },
  EXPANSION: { bg: '#fee2e2', text: '#dc2626' },
  CRISIS: { bg: '#fecaca', text: '#7f1d1d' },
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function VolatilityTab() {
  const [attribution, setAttribution] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [attrRes, timeRes] = await Promise.all([
          fetch(`${API_BASE}/api/fractal/v2.1/admin/volatility/attribution?symbol=BTC`),
          fetch(`${API_BASE}/api/fractal/v2.1/admin/volatility/timeline?symbol=BTC&limit=90`),
        ]);
        
        if (attrRes.ok) {
          setAttribution(await attrRes.json());
        }
        if (timeRes.ok) {
          setTimeline(await timeRes.json());
        }
        setLoading(false);
      } catch (err) {
        console.error('[VolatilityTab] Error:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading volatility attribution...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      {attribution && <HeaderCard attribution={attribution} />}
      
      {/* Regime Timeline */}
      {timeline && <RegimeTimeline timeline={timeline} />}
      
      {/* Protection Delta */}
      {attribution && <ProtectionDeltaCard attribution={attribution} />}
      
      {/* Performance by Regime */}
      {attribution && <RegimePerformanceTable attribution={attribution} />}
      
      {/* Notes */}
      {attribution?.notes && (
        <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500">
          <div className="font-semibold mb-2">Notes:</div>
          <ul className="list-disc list-inside space-y-1">
            {attribution.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HEADER CARD
// ═══════════════════════════════════════════════════════════════

function HeaderCard({ attribution }) {
  const { sample, summary } = attribution;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Volatility Attribution</h2>
        <div className={`px-3 py-1 rounded text-sm font-medium ${
          sample.verdict === 'OK' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {sample.verdict}
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Symbol</div>
          <div className="font-semibold">{attribution.symbol}</div>
        </div>
        <div>
          <div className="text-gray-500">Sample Period</div>
          <div className="font-mono text-xs">{sample.from} → {sample.to}</div>
        </div>
        <div>
          <div className="text-gray-500">Snapshots</div>
          <div className="font-semibold">{sample.snapshotsTotal}</div>
        </div>
        <div>
          <div className="text-gray-500">Resolved</div>
          <div className="font-semibold">{sample.resolvedTotal}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REGIME TIMELINE
// ═══════════════════════════════════════════════════════════════

function RegimeTimeline({ timeline }) {
  const { timeline: data } = timeline;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Regime Timeline (Last {data.length} Days)</h3>
      
      {/* Timeline bars */}
      <div className="flex h-8 rounded overflow-hidden">
        {data.map((entry, i) => {
          const colors = REGIME_COLORS[entry.regime] || REGIME_COLORS.NORMAL;
          return (
            <div
              key={i}
              className="flex-1 relative group"
              style={{ backgroundColor: colors.bg }}
              title={`${entry.t}: ${entry.regime}`}
            >
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {entry.t}: {entry.regime}
                <br />
                RV30: {(entry.rv30 * 100).toFixed(1)}%
                <br />
                Z: {entry.z?.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs">
        {Object.entries(REGIME_COLORS).map(([regime, colors]) => (
          <div key={regime} className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: colors.bg }}
            />
            <span style={{ color: colors.text }}>{regime}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROTECTION DELTA CARD
// ═══════════════════════════════════════════════════════════════

function ProtectionDeltaCard({ attribution }) {
  const { summary } = attribution;
  const { raw, scaled, delta } = summary;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Protection Report: Raw vs Scaled</h3>
      
      <div className="grid grid-cols-4 gap-6">
        {/* CAGR */}
        <div>
          <div className="text-xs text-gray-500 mb-1">CAGR</div>
          <div className="flex items-baseline gap-2">
            <span className="text-gray-400 line-through">{(raw.cagr * 100).toFixed(1)}%</span>
            <span className="font-semibold">{(scaled.cagr * 100).toFixed(1)}%</span>
          </div>
        </div>
        
        {/* Sharpe */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Sharpe</div>
          <div className="flex items-baseline gap-2">
            <span className="text-gray-400 line-through">{raw.sharpe.toFixed(2)}</span>
            <span className={`font-semibold ${delta.sharpe > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {scaled.sharpe.toFixed(2)}
            </span>
            <span className={`text-xs ${delta.sharpe > 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({delta.sharpe > 0 ? '+' : ''}{delta.sharpe.toFixed(2)})
            </span>
          </div>
        </div>
        
        {/* MaxDD */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Max Drawdown</div>
          <div className="flex items-baseline gap-2">
            <span className="text-gray-400 line-through">-{(raw.maxDD * 100).toFixed(1)}%</span>
            <span className={`font-semibold ${delta.maxDD_pp < 0 ? 'text-green-600' : 'text-red-600'}`}>
              -{(scaled.maxDD * 100).toFixed(1)}%
            </span>
            <span className={`text-xs ${delta.maxDD_pp < 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({delta.maxDD_pp > 0 ? '+' : ''}{delta.maxDD_pp.toFixed(1)}pp)
            </span>
          </div>
        </div>
        
        {/* Worst Day */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Worst Day</div>
          <div className="flex items-baseline gap-2">
            <span className="text-gray-400 line-through">{(raw.worstDay * 100).toFixed(1)}%</span>
            <span className={`font-semibold ${delta.worstDay_pp > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(scaled.worstDay * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Key insight */}
      <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
        {delta.maxDD_pp < 0 ? (
          <span>Vol scaling reduced MaxDD by <strong>{Math.abs(delta.maxDD_pp).toFixed(1)}pp</strong> while Sharpe {delta.sharpe > 0 ? 'improved' : 'decreased'} by {Math.abs(delta.sharpe).toFixed(2)}</span>
        ) : (
          <span>Note: Scaled equity shows higher MaxDD — may need policy adjustment</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REGIME PERFORMANCE TABLE
// ═══════════════════════════════════════════════════════════════

function RegimePerformanceTable({ attribution }) {
  const { byRegime } = attribution;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Performance by Regime</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-600">Regime</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Days</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Trades</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Hit Rate</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Expectancy</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">MaxDD</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Worst Day</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Size Before</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Size After</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600">Vol Mult</th>
            </tr>
          </thead>
          <tbody>
            {byRegime.map((row) => {
              const colors = REGIME_COLORS[row.regime] || REGIME_COLORS.NORMAL;
              return (
                <tr key={row.regime} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {row.regime}
                    </span>
                  </td>
                  <td className="text-right py-2 px-3 font-mono">{row.countDays}</td>
                  <td className="text-right py-2 px-3 font-mono">{row.trades}</td>
                  <td className={`text-right py-2 px-3 font-mono ${row.hitRate >= 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                    {(row.hitRate * 100).toFixed(0)}%
                  </td>
                  <td className={`text-right py-2 px-3 font-mono ${row.expectancy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(row.expectancy * 100).toFixed(2)}%
                  </td>
                  <td className="text-right py-2 px-3 font-mono text-red-600">
                    -{(row.maxDD * 100).toFixed(1)}%
                  </td>
                  <td className="text-right py-2 px-3 font-mono text-red-600">
                    {(row.worstDay * 100).toFixed(1)}%
                  </td>
                  <td className="text-right py-2 px-3 font-mono">
                    {(row.avgSizeBeforeVol * 100).toFixed(0)}%
                  </td>
                  <td className="text-right py-2 px-3 font-mono">
                    {(row.avgSizeAfterVol * 100).toFixed(0)}%
                  </td>
                  <td className={`text-right py-2 px-3 font-mono ${row.avgVolMult < 1 ? 'text-orange-600' : 'text-green-600'}`}>
                    ×{row.avgVolMult.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VolatilityTab;
