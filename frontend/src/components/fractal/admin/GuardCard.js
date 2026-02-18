/**
 * BLOCK 50 — Guard Card (Improved UI)
 * Shows guard state, degeneration score, subscores with tooltips
 */

import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { InfoTooltip, FRACTAL_TOOLTIPS } from './InfoTooltip';

const stateConfig = {
  OK: { 
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50', 
    border: 'border-green-200', 
    bar: 'bg-green-500', 
    text: 'text-green-700',
    icon: ShieldCheck,
    description: 'Система в безопасной зоне'
  },
  WARN: { 
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50', 
    border: 'border-amber-200', 
    bar: 'bg-amber-500', 
    text: 'text-amber-700',
    icon: AlertTriangle,
    description: 'Повышенное внимание к рискам'
  },
  ALERT: { 
    bg: 'bg-gradient-to-br from-orange-50 to-amber-50', 
    border: 'border-orange-300', 
    bar: 'bg-orange-500', 
    text: 'text-orange-700',
    icon: ShieldAlert,
    description: 'Высокий уровень риска'
  },
  CRITICAL: { 
    bg: 'bg-gradient-to-br from-red-50 to-rose-50', 
    border: 'border-red-300', 
    bar: 'bg-red-500', 
    text: 'text-red-700',
    icon: ShieldAlert,
    description: 'Критический уровень — автоматическое снижение риска'
  },
};

const subscoreLabels = {
  drawdown: { name: 'Просадка', tip: 'Текущая просадка от максимума' },
  volatility: { name: 'Волатильность', tip: 'Уровень рыночной волатильности' },
  streak: { name: 'Серия потерь', tip: 'Последовательность убыточных сделок' },
  correlation: { name: 'Корреляция', tip: 'Корреляция с рынком' },
};

export function GuardCard({ guard }) {
  if (!guard) return null;
  
  const config = stateConfig[guard.state] || stateConfig.OK;
  const Icon = config.icon;
  const degScore = guard.degenerationScore * 100;
  
  // Determine zone
  const getZone = (score) => {
    if (score < 55) return { name: 'Безопасная зона', color: 'text-green-600' };
    if (score < 75) return { name: 'Зона внимания', color: 'text-amber-600' };
    return { name: 'Критическая зона', color: 'text-red-600' };
  };
  const zone = getZone(degScore);
  
  return (
    <div 
      className={`rounded-2xl border-2 ${config.border} ${config.bg} p-6 transition-all duration-300 hover:shadow-lg`}
      data-testid="guard-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Catastrophic Guard</h3>
          <InfoTooltip {...FRACTAL_TOOLTIPS.guard} placement="right" />
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 ${config.text}`}>
          <Icon className="w-4 h-4" />
          <span className="text-sm font-bold">{guard.state}</span>
        </div>
      </div>
      
      {/* Description */}
      <div className="mb-5 p-3 bg-white/50 rounded-xl border border-gray-100">
        <p className="text-sm text-gray-600">{config.description}</p>
      </div>
      
      {/* Degeneration Score */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-gray-500 font-medium">Degeneration Score</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${config.text}`}>{degScore.toFixed(0)}</span>
            <span className={`text-lg font-bold ${config.text}`}>%</span>
          </div>
        </div>
        
        {/* Visual Progress Bar */}
        <div className="relative mb-2">
          <div className="w-full bg-white/60 rounded-full h-4 overflow-hidden shadow-inner">
            {/* Zone backgrounds */}
            <div className="absolute inset-0 flex">
              <div className="w-[55%] bg-green-100"></div>
              <div className="w-[20%] bg-amber-100"></div>
              <div className="flex-1 bg-red-100"></div>
            </div>
            {/* Actual bar */}
            <div 
              className={`h-4 ${config.bar} transition-all duration-700 ease-out relative z-10`}
              style={{ width: `${degScore}%` }}
            ></div>
          </div>
          
          {/* Zone markers */}
          <div className="flex justify-between mt-1.5 px-1">
            <span className="text-[10px] text-green-600 font-medium">Safe</span>
            <span className="text-[10px] text-amber-600 font-medium">55%</span>
            <span className="text-[10px] text-red-600 font-medium">75%</span>
            <span className="text-[10px] text-gray-400">100%</span>
          </div>
        </div>
        
        {/* Current Zone */}
        <div className={`text-center text-sm font-medium ${zone.color}`}>
          {zone.name}
        </div>
      </div>
      
      {/* Subscores */}
      <div className="mb-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Компоненты риска</p>
        <div className="space-y-2.5">
          {Object.entries(guard.subscores || {}).map(([key, value]) => {
            const label = subscoreLabels[key] || { name: key, tip: '' };
            const percent = value * 100;
            const barColor = percent >= 70 ? 'bg-red-500' : percent >= 40 ? 'bg-amber-500' : 'bg-green-500';
            
            return (
              <div key={key} className="p-2.5 bg-white/50 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-600 font-medium">{label.name}</span>
                  <span className="text-xs font-mono font-bold text-gray-700">{percent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-1.5 ${barColor} transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Latch Warning */}
      {guard.latch?.active && (
        <div className="p-3 bg-amber-100 rounded-xl border border-amber-200 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm text-amber-800 font-medium">Latch активен</p>
            <p className="text-xs text-amber-600">
              До {new Date(guard.latch.until).toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuardCard;
