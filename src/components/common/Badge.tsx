import React from 'react';
import { RankType, ManpowerStatus, FatigueLevel, DutyType } from '../../types';
import { DUTY_COLORS } from '../../utils/constants';

export const RankBadge: React.FC<{ rank: RankType | string }> = ({ rank }) => {
  const isOfficer = ['Lieutenant Colonel', 'Major', 'Captain', 'Lieutenant', '2Lieutenant'].includes(rank);
  const isJCO = ['Master Warrent Officer', 'Senior Warrent Officer', 'Warrent Officer'].includes(rank);
  const isNCO = ['Sergent', 'Corporal', 'Lance Corporal'].includes(rank);
  const isCivilian = rank === 'Civil' || rank === 'NC(E)';

  const styleClass = isOfficer
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
    : isJCO
    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold'
    : isNCO
    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    : isCivilian
    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold'
    : 'bg-tactical-800 text-slate-300 border-slate-700';

  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-mono border ${styleClass}`}>
      {rank}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: ManpowerStatus | string }> = ({ status }) => {
  const styles: Record<string, string> = {
    PRESENT: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    TY_DUTY: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    ATTACHMENT: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    LEAVE: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    OTHER: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  };

  const labels: Record<string, string> = {
    PRESENT: 'PRESENT',
    TY_DUTY: 'TY DUTY',
    ATTACHMENT: 'ATTACHMENT',
    LEAVE: 'ON LEAVE',
    OTHER: 'OTHER ABSENCE',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${styles[status] || 'bg-tactical-800 text-slate-300'}`}>
      {labels[status] || status}
    </span>
  );
};

export const FatigueBadge: React.FC<{ level: FatigueLevel | string }> = ({ level }) => {
  const styles: Record<string, string> = {
    LOW: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    MODERATE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    HIGH: 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${styles[level] || 'bg-tactical-800 text-slate-300'}`}>
      {level} FATIGUE
    </span>
  );
};

export const DutyTypeBadge: React.FC<{ type: DutyType | string }> = ({ type }) => {
  const color = DUTY_COLORS[type as DutyType] || '#64748b';
  return (
    <span
      className="px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1.5 border"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{type}</span>
    </span>
  );
};
