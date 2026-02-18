/**
 * BLOCK 50 — Snapshot Timeline
 * Shows recent reliability snapshots
 */

import React from 'react';

const healthDots = {
  HEALTHY: 'bg-green-500',
  WATCH: 'bg-amber-500',
  ALERT: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
};

export function SnapshotTimeline({ recent }) {
  if (!recent?.snapshots) return null;
  
  const { snapshots, audit } = recent;
  
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Recent Activity</h3>
      
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Reliability (7 days)</p>
        <div className="flex items-end gap-1 h-16">
          {snapshots.slice(0, 7).reverse().map((snap, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div 
                className={`w-full rounded-t ${healthDots[snap.health] || 'bg-gray-300'}`}
                style={{ height: `${snap.reliability * 60}px` }}
                title={`${snap.date}: ${(snap.reliability * 100).toFixed(0)}%`}
              ></div>
              <span className="text-[10px] text-gray-400 mt-1">{snap.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
      
      {audit.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Audit Log</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {audit.slice(0, 5).map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 font-mono w-16">
                  {new Date(entry.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${
                  entry.action === 'APPLIED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {entry.action}
                </span>
                <span className="text-gray-500 truncate">{entry.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SnapshotTimeline;
