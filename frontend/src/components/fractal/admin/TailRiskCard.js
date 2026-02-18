/**
 * BLOCK 50 — Tail Risk Card (Monte Carlo)
 * Shows MC tail risk metrics
 */

import React from 'react';

export function TailRiskCard({ model }) {
  if (!model?.mc) return null;
  
  const { mc } = model;
  const p95DD = mc.p95MaxDD * 100;
  
  const getColor = (val, thresholds) => {
    if (val >= thresholds.critical) return 'text-red-600';
    if (val >= thresholds.warn) return 'text-amber-600';
    return 'text-green-600';
  };
  
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Tail Risk (MC)</h3>
        <span className="text-xs text-gray-400 font-mono">{mc.method}</span>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">P95 Max Drawdown</span>
          <span className={`text-2xl font-bold ${getColor(p95DD, { warn: 35, critical: 45 })}`}>
            {p95DD.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 ${p95DD >= 45 ? 'bg-red-500' : p95DD >= 35 ? 'bg-amber-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(p95DD, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>0%</span>
          <span className="text-amber-500">35%</span>
          <span className="text-red-500">45%</span>
          <span>100%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">P05 CAGR</p>
          <p className={`text-lg font-bold ${getColor(mc.p05CAGR * 100, { warn: 0, critical: -5 })}`}>
            {(mc.p05CAGR * 100).toFixed(1)}%
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">P10 Sharpe</p>
          <p className={`text-lg font-bold ${mc.p10Sharpe >= 0.5 ? 'text-green-600' : mc.p10Sharpe >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
            {mc.p10Sharpe.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default TailRiskCard;
