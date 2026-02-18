/**
 * BLOCK 50 — Reliability Card
 * Shows reliability score, badge, and breakdown
 */

import React from 'react';

const badgeColors = {
  OK: 'bg-green-100 text-green-700',
  WARN: 'bg-amber-100 text-amber-700',
  DEGRADED: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export function ReliabilityCard({ model }) {
  if (!model?.reliability) return null;
  
  const { reliability } = model;
  const badgeColor = badgeColors[reliability.badge] || badgeColors.OK;
  
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Reliability</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
          {reliability.badge}
        </span>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">Score</span>
          <span className="text-2xl font-bold text-gray-800">{(reliability.score * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full ${reliability.score >= 0.7 ? 'bg-green-500' : reliability.score >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${reliability.score * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Policy</p>
          <p className="text-sm font-medium text-gray-700">{reliability.policy}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Modifier</p>
          <p className="text-sm font-medium text-gray-700">{reliability.modifier.toFixed(2)}x</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">Breakdown</p>
        {Object.entries(reliability.breakdown).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-20 capitalize">{key}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${value >= 0.7 ? 'bg-green-500' : value >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${value * 100}%` }}
              ></div>
            </div>
            <span className="text-xs font-mono text-gray-600 w-10 text-right">{(value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReliabilityCard;
