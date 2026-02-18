/**
 * BLOCK 50 — Performance Card
 * Shows performance windows (30/60/90 day)
 */

import React from 'react';

export function PerformanceCard({ performance }) {
  if (!performance?.windows) return null;
  
  const { windows } = performance;
  
  const formatPercent = (val) => `${(val * 100).toFixed(1)}%`;
  const formatSharpe = (val) => val.toFixed(2);
  
  const getSharpeColor = (val) => {
    if (val >= 1.0) return 'text-green-600';
    if (val >= 0.5) return 'text-green-500';
    if (val >= 0) return 'text-amber-600';
    return 'text-red-600';
  };
  
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Performance Windows</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-gray-500 font-medium">Window</th>
              <th className="text-right py-2 text-gray-500 font-medium">Sharpe</th>
              <th className="text-right py-2 text-gray-500 font-medium">MaxDD</th>
              <th className="text-right py-2 text-gray-500 font-medium">Hit Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-50">
              <td className="py-2 font-medium text-gray-700">30 Day</td>
              <td className={`py-2 text-right font-mono font-bold ${getSharpeColor(windows.d30.sharpe)}`}>
                {formatSharpe(windows.d30.sharpe)}
              </td>
              <td className="py-2 text-right font-mono text-gray-600">{formatPercent(windows.d30.maxDD)}</td>
              <td className="py-2 text-right font-mono text-gray-600">{formatPercent(windows.d30.hitRate)}</td>
            </tr>
            <tr className="border-b border-gray-50">
              <td className="py-2 font-medium text-gray-700">60 Day</td>
              <td className={`py-2 text-right font-mono font-bold ${getSharpeColor(windows.d60.sharpe)}`}>
                {formatSharpe(windows.d60.sharpe)}
              </td>
              <td className="py-2 text-right font-mono text-gray-600">{formatPercent(windows.d60.maxDD)}</td>
              <td className="py-2 text-right font-mono text-gray-600">{formatPercent(windows.d60.hitRate)}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-gray-700">90 Day</td>
              <td className={`py-2 text-right font-mono font-bold ${getSharpeColor(windows.d90.sharpe)}`}>
                {formatSharpe(windows.d90.sharpe)}
              </td>
              <td className="py-2 text-right font-mono text-gray-600">{formatPercent(windows.d90.maxDD)}</td>
              <td className="py-2 text-right font-mono text-gray-600">{formatPercent(windows.d90.hitRate)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PerformanceCard;
