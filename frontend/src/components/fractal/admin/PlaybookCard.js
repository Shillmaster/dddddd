/**
 * BLOCK 50 — Playbook Card
 * Shows recommended action and apply button
 */

import React, { useState } from 'react';

const playbookColors = {
  NO_ACTION: { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600' },
  INVESTIGATION: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  PROTECTION_ESCALATION: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  RECALIBRATION: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  RECOVERY: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  FREEZE_ONLY: { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-700' },
};

const priorityLabels = {
  1: 'CRITICAL',
  2: 'HIGH',
  3: 'MEDIUM',
  4: 'LOW',
  5: 'LOW',
  6: 'NONE',
};

export function PlaybookCard({ recommendation, onApply }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [applying, setApplying] = useState(false);
  
  if (!recommendation) return null;
  
  const colors = playbookColors[recommendation.playbook] || playbookColors.NO_ACTION;
  const canApply = recommendation.playbook !== 'NO_ACTION';
  
  const handleApply = async () => {
    if (recommendation.requiresConfirm && !showConfirm) {
      setShowConfirm(true);
      return;
    }
    
    setApplying(true);
    try {
      await onApply?.(recommendation.playbook);
    } finally {
      setApplying(false);
      setShowConfirm(false);
    }
  };
  
  return (
    <div className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Playbook Recommendation</h3>
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
          recommendation.priority <= 2 ? 'bg-red-100 text-red-700' : 
          recommendation.priority <= 4 ? 'bg-amber-100 text-amber-700' : 
          'bg-gray-100 text-gray-600'
        }`}>
          P{recommendation.priority} - {priorityLabels[recommendation.priority]}
        </span>
      </div>
      
      <div className="mb-4">
        <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold ${colors.badge}`}>
          {recommendation.playbook.replace(/_/g, ' ')}
        </span>
      </div>
      
      {recommendation.reasonCodes.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Reasons</p>
          <ul className="space-y-1">
            {recommendation.reasonCodes.map((reason, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-gray-400">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {recommendation.suggestedActions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Suggested Actions</p>
          <div className="space-y-1">
            {recommendation.suggestedActions.map((action, i) => (
              <div key={i} className="text-xs bg-white rounded px-2 py-1 font-mono text-gray-600">
                {action.action}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {canApply && (
        <div className="mt-4">
          {showConfirm ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">Confirm applying this playbook?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {applying ? 'Applying...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleApply}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Apply Recommendation
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PlaybookCard;
