/**
 * BLOCK 50 — Guard Card (Degeneration Monitor)
 * Shows guard state, degeneration score, subscores
 */

import React from 'react';

const stateColors = {
  OK: { bg: 'bg-green-50', border: 'border-green-200', bar: 'bg-green-500', text: 'text-green-700' },
  WARN: { bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500', text: 'text-amber-700' },
  ALERT: { bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-500', text: 'text-orange-700' },
  CRITICAL: { bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-500', text: 'text-red-700' },
};

export function GuardCard({ guard }) {
  if (!guard) return null;
  
  const colors = stateColors[guard.state] || stateColors.OK;
  const degScore = guard.degenerationScore * 100;
  
  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Catastrophic Guard</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.text} bg-white`}>
          {guard.state}
        </span>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">Degeneration Score</span>
          <span className={`text-xl font-bold ${colors.text}`}>{degScore.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-white rounded-full h-3 overflow-hidden">
          <div 
            className={`h-3 ${colors.bar} transition-all duration-500`}
            style={{ width: `${degScore}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>Safe</span>
          <span>55%</span>
          <span>75%</span>
          <span>Critical</span>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase">Subscores</p>
        {Object.entries(guard.subscores).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-24 capitalize">{key}</span>
            <div className="flex-1 bg-white rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-1.5 ${value >= 0.7 ? 'bg-red-500' : value >= 0.4 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${value * 100}%` }}
              ></div>
            </div>
            <span className="text-xs font-mono text-gray-600 w-10 text-right">{(value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
      
      {guard.latch.active && (
        <div className="p-2 bg-amber-100 rounded-lg">
          <p className="text-xs text-amber-700">
            <span className="font-bold">Latch Active</span> until {new Date(guard.latch.until).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default GuardCard;
