/**
 * BLOCK 50 — Governance Card
 * Shows governance mode, freeze state, guardrails
 */

import React from 'react';

const modeColors = {
  NORMAL: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100' },
  PROTECTION_MODE: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', badge: 'bg-amber-100' },
  FROZEN_ONLY: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-100' },
  HALT_TRADING: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', badge: 'bg-red-200' },
};

export function GovernanceCard({ governance }) {
  if (!governance) return null;
  
  const colors = modeColors[governance.mode] || modeColors.NORMAL;
  
  return (
    <div className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Governance</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.badge} ${colors.text}`}>
          {governance.mode.replace('_', ' ')}
        </span>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Active Preset</span>
          <span className="text-sm font-mono font-medium text-gray-800">{governance.activePreset}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Contract</span>
          <span className={`text-sm font-medium ${governance.freeze.isFrozen ? 'text-blue-600' : 'text-gray-600'}`}>
            {governance.freeze.isFrozen ? 'FROZEN' : 'UNFROZEN'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Guardrails</span>
          <span className={`text-sm font-medium ${governance.guardrails.valid ? 'text-green-600' : 'text-red-600'}`}>
            {governance.guardrails.valid ? 'VALID' : `${governance.guardrails.violations.length} VIOLATIONS`}
          </span>
        </div>
        
        {governance.protectionMode && (
          <div className="mt-3 p-2 bg-amber-100 rounded-lg">
            <p className="text-xs text-amber-700 font-medium">Protection Mode Active - Exposure Limited</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GovernanceCard;
