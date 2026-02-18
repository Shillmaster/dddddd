/**
 * FRACTAL RESEARCH TERMINAL v4
 * Institutional-grade pattern analysis interface
 * 
 * Features:
 * - Price Chart with Aftermath-Driven Forecast
 * - Fractal Overlay with Distribution Fan (P10-P90)
 * - P1.4: Volatility Regime Intelligence
 * - P1.6: Sizing Breakdown (transparent risk scaling)
 */

import React, { useState, useEffect } from 'react';
import { FractalMainChart } from '../components/fractal/chart/FractalMainChart';
import { FractalOverlaySection } from '../components/fractal/sections/FractalOverlaySection';
import { StrategyPanel } from '../components/fractal/sections/StrategyPanel';
import ForwardPerformancePanel from '../components/fractal/ForwardPerformancePanel';
import { VolatilityCard } from '../components/fractal/VolatilityCard';
import { SizingBreakdown } from '../components/fractal/SizingBreakdown';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

// ═══════════════════════════════════════════════════════════════
// CHART MODE SWITCHER
// ═══════════════════════════════════════════════════════════════

const ChartModeSwitcher = ({ mode, onModeChange }) => {
  const modes = [
    { id: 'price', label: 'Price Chart', icon: '📈' },
    { id: 'fractal', label: 'Fractal Overlay', icon: '📐' },
  ];
  
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg" data-testid="chart-mode-switcher">
      {modes.map(m => (
        <button
          key={m.id}
          onClick={() => onModeChange(m.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            mode === m.id
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          }`}
          data-testid={`mode-${m.id}`}
        >
          <span>{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN TERMINAL PAGE
// ═══════════════════════════════════════════════════════════════

const FractalTerminal = () => {
  const [chartMode, setChartMode] = useState('price');
  const [terminalData, setTerminalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const symbol = 'BTC';

  // Fetch full terminal data
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/fractal/v2.1/terminal?symbol=${symbol}&set=extended&focus=30d`)
      .then(r => r.json())
      .then(d => {
        setTerminalData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('[Terminal] Fetch error:', err);
        setLoading(false);
      });
  }, [symbol]);

  const volatility = terminalData?.volatility;
  const sizing = terminalData?.decisionKernel?.sizing;
  const consensus = terminalData?.decisionKernel?.consensus;
  const conflict = terminalData?.decisionKernel?.conflict;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="fractal-terminal">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-slate-900">Fractal Research Terminal</h1>
              <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                {symbol}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              v4 · Institutional Grade
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Chart Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Research Canvas</h2>
            <ChartModeSwitcher mode={chartMode} onModeChange={setChartMode} />
          </div>
          
          {/* Chart Render based on mode */}
          <div className="min-h-[450px]">
            {chartMode === 'price' && (
              <FractalMainChart symbol={symbol} width={1100} height={420} />
            )}
            
            {chartMode === 'fractal' && (
              <FractalOverlaySection symbol={symbol} />
            )}
          </div>

          {/* P1.4: Volatility Regime Card - Under Chart */}
          {volatility && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <VolatilityCard volatility={volatility} />
            </div>
          )}

          {/* P1.6: Sizing Breakdown - Full transparency */}
          {sizing && (
            <SizingBreakdown sizing={sizing} volatility={volatility} />
          )}

          {/* Decision Summary Cards */}
          {terminalData && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Consensus Card */}
              {consensus && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Consensus</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{(consensus.score * 100).toFixed(0)}%</span>
                    <span className={`text-sm font-medium ${
                      consensus.dir === 'BUY' ? 'text-green-600' : 
                      consensus.dir === 'SELL' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {consensus.dir}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Dispersion: {(consensus.dispersion * 100).toFixed(0)}%</div>
                </div>
              )}

              {/* Conflict Card */}
              {conflict && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Conflict</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold px-2 py-0.5 rounded ${
                      conflict.level === 'NONE' ? 'bg-green-100 text-green-700' :
                      conflict.level === 'MILD' ? 'bg-yellow-100 text-yellow-700' :
                      conflict.level === 'MODERATE' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {conflict.level}
                    </span>
                    <span className="text-sm text-gray-500">{conflict.mode}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Structure: {conflict.tiers?.structure?.dir} | Timing: {conflict.tiers?.timing?.dir}
                  </div>
                </div>
              )}

              {/* Regime Card */}
              {volatility && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Vol Regime</div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold px-2 py-0.5 rounded ${
                      volatility.regime === 'LOW' ? 'bg-green-100 text-green-700' :
                      volatility.regime === 'NORMAL' ? 'bg-gray-100 text-gray-700' :
                      volatility.regime === 'HIGH' ? 'bg-yellow-100 text-yellow-700' :
                      volatility.regime === 'EXPANSION' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {volatility.regime}
                    </span>
                    <span className="text-sm text-gray-500">×{volatility.policy?.sizeMultiplier?.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    RV30: {(volatility.rv30 * 100).toFixed(1)}% | Z: {volatility.volZScore?.toFixed(1)}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Strategy Engine Panel */}
          <StrategyPanel symbol={symbol} />
          
          {/* Forward Performance Panel (BLOCK 56.5) */}
          <ForwardPerformancePanel />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Fractal Research Terminal v4 · API v2.1</span>
            <span>Aftermath-Driven Forecast · Distribution Fan (P10-P90)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FractalTerminal;
