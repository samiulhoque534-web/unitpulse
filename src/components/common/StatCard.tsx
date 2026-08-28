import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  percentage?: number;
  icon: React.ReactNode;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'gold' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  percentage,
  icon,
  trend,
  color = 'slate',
  onClick,
}) => {
  const colorMap = {
    emerald: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
    blue: 'border-blue-500/30 bg-blue-950/20 text-blue-400',
    amber: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
    rose: 'border-rose-500/30 bg-rose-950/20 text-rose-400',
    purple: 'border-purple-500/30 bg-purple-950/20 text-purple-400',
    gold: 'border-yellow-500/30 bg-yellow-950/20 text-yellow-400',
    slate: 'border-slate-800 bg-tactical-900/60 text-slate-400',
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border p-4 backdrop-blur-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-600 hover:shadow-lg' : ''
      } ${colorMap[color] || colorMap.slate}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>{title}</span>
        </div>
        <div className="p-2 rounded-lg bg-tactical-800/80 border border-slate-700/50">
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
          {value}
        </div>
        {percentage !== undefined && (
          <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-tactical-800/80 border border-slate-700">
            {percentage}%
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
          <span>{subtitle}</span>
          {trend && <span className="font-medium text-slate-300">{trend}</span>}
        </div>
      )}
    </div>
  );
};
