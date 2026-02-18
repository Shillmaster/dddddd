/**
 * BLOCK 50 — InfoTooltip Component
 * 
 * Provides contextual help for moderators with explanations
 * of what each metric means and how to react.
 */

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info } from 'lucide-react';

export function InfoTooltip({ 
  title, 
  description, 
  action,
  severity,
  placement = 'top',
  children 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const severityColors = {
    info: 'border-blue-200 bg-blue-50',
    success: 'border-green-200 bg-green-50',
    warning: 'border-amber-200 bg-amber-50',
    danger: 'border-red-200 bg-red-50',
  };

  const bgColor = severityColors[severity] || severityColors.info;

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="p-0.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="More info"
      >
        {children || <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600" />}
      </button>

      {isOpen && (
        <div 
          ref={tooltipRef}
          className={`absolute z-50 w-72 p-4 rounded-xl border shadow-xl ${bgColor} ${
            placement === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' :
            placement === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' :
            placement === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' :
            'left-full ml-2 top-1/2 -translate-y-1/2'
          }`}
        >
          {title && (
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              {title}
            </h4>
          )}
          {description && (
            <p className="text-sm text-gray-700 mb-2 leading-relaxed">
              {description}
            </p>
          )}
          {action && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Как реагировать:</p>
              <p className="text-sm text-gray-700">{action}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-defined tooltips for Fractal admin
export const FRACTAL_TOOLTIPS = {
  governance: {
    title: 'Governance Mode',
    description: 'Текущий режим управления системой. NORMAL — стандартная работа. PROTECTION_MODE — ограниченный режим при высоком риске. FROZEN_ONLY — торговля приостановлена.',
    action: 'При PROTECTION или FROZEN — проверьте причины в карточке Playbook и примите решение о дальнейших действиях.',
  },
  freeze: {
    title: 'Contract Freeze',
    description: 'Когда контракт FROZEN, параметры модели не могут быть изменены. Это защита от случайных изменений в рабочей системе.',
    action: 'FROZEN — нормальное состояние для production. Размораживать только для планового обновления.',
  },
  guardrails: {
    title: 'Guardrails (Защитные ограничения)',
    description: 'Автоматические проверки параметров системы. VALID означает, что все параметры в допустимых пределах.',
    action: 'При VIOLATIONS — немедленно проверьте какие ограничения нарушены и примените корректирующие действия.',
  },
  health: {
    title: 'System Health',
    description: 'Общий показатель здоровья системы от 0% до 100%. Учитывает надёжность сигналов, качество данных, стабильность модели.',
    action: 'HEALTHY (>80%) — всё в порядке. WATCH (60-80%) — наблюдайте. ALERT (<60%) — требуется внимание. CRITICAL (<40%) — срочные меры.',
    severity: 'info',
  },
  topRisks: {
    title: 'Top Risks',
    description: 'Ключевые факторы риска системы. Показывает какие компоненты требуют внимания.',
    action: 'Фокусируйтесь на рисках со статусом ALERT и CRITICAL. OK и WARN можно мониторить.',
  },
  guard: {
    title: 'Catastrophic Guard',
    description: 'Защита от катастрофических потерь. Degeneration Score показывает насколько система приближается к опасным порогам.',
    action: 'OK (<55%) — безопасно. WARN (55-75%) — повышенное внимание. CRITICAL (>75%) — система автоматически снизит риск.',
    severity: 'warning',
  },
  reliability: {
    title: 'Reliability Score',
    description: 'Насколько можно доверять текущим сигналам системы. Основано на: качестве данных, стабильности модели, согласованности сигналов.',
    action: 'При низкой надёжности (<50%) система автоматически уменьшает размер позиций.',
    severity: 'info',
  },
  tailRisk: {
    title: 'Tail Risk (Monte Carlo)',
    description: 'Вероятностная оценка максимальных потерь. P95 Max Drawdown — максимальная просадка, которая произойдёт в 95% случаев.',
    action: 'До 35% — приемлемо. 35-45% — повышенный риск. >45% — критический уровень, рассмотрите снижение экспозиции.',
    severity: 'warning',
  },
  performance: {
    title: 'Performance Windows',
    description: 'Историческая эффективность за разные периоды. Sharpe — доходность с поправкой на риск. MaxDD — максимальная просадка. Hit Rate — процент прибыльных сигналов.',
    action: 'Sharpe >1.0 — отлично. 0.5-1.0 — хорошо. <0.5 — требует анализа причин.',
    severity: 'info',
  },
  playbook: {
    title: 'Playbook Recommendation',
    description: 'Автоматическая рекомендация действий на основе текущего состояния системы. Приоритет P1 — критический, P6 — информационный.',
    action: 'Внимательно прочитайте причины и предлагаемые действия. При P1-P2 — действуйте немедленно.',
    severity: 'warning',
  },
  recentActivity: {
    title: 'Recent Activity',
    description: 'График надёжности за последние 7 дней и журнал последних действий администратора.',
    action: 'Следите за трендом надёжности. Падающий тренд может указывать на проблемы.',
  },
};

export default InfoTooltip;
