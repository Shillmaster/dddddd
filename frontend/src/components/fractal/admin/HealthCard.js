/**
 * BLOCK 50 — Health Card
 * Shows overall health state and top risks
 */

import React from 'react';

const healthColors = {
  HEALTHY: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
  WATCH: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  ALERT: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  CRITICAL: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
};

const severityColors = {
  OK: 'text-green-600 bg-green-50',
  WARN: 'text-amber-600 bg-amber-50',
  ALERT: 'text-orange-600 bg-orange-50',
  CRITICAL: 'text-red-600 bg-red-50',
};

export function HealthCard({ health }) {
  if (!health) return null;
  
  const colors = healthColors[health.state] || healthColors.HEALTHY;
  
  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">System Health</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`}></span>
          <span className={`text-sm font-bold ${colors.text}`}>{health.state}</span>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">Health Score</span>
          <span className="text-lg font-bold text-gray-800">{(health.score * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${colors.dot}`}
            style={{ width: `${health.score * 100}%` }}
          ></div>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-4 italic">{health.headline}</p>
      
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">Top Risks</p>
        {health.topRisks.map((risk, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{risk.key}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-700">{risk.value.toFixed(2)}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${severityColors[risk.severity]}`}>
                {risk.severity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HealthCard;
