import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { RankBadge, StatusBadge, FatigueBadge } from '../common/Badge';
import { api } from '../../services/api';
import { isOfficerRank, getRankPLeaveLimit } from '../../utils/constants';
import {
  User,
  Shield,
  CalendarCheck,
  Activity,
  CalendarRange,
  Clock,
  Moon,
  Dumbbell,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Award,
} from 'lucide-react';

interface PersonnelDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnelId: string;
}

export const PersonnelDossierModal: React.FC<PersonnelDossierModalProps> = ({
  isOpen,
  onClose,
  personnelId,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && personnelId) {
      setIsLoading(true);
      api.getPersonnelDossier(personnelId)
        .then((res) => setData(res))
        .catch((e) => console.error(e))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, personnelId]);

  if (!isOpen) return null;

  const p = data?.soldier || data?.personnel;
  const d = data?.dutySummary;
  const f = data?.fatigueIndex;
  const pt = data?.ptScorecard;
  const gm = data?.gamesScorecard;
  const l = data?.leaveSummary;

  const isOfficer = p ? isOfficerRank(p.rank) : false;
  const pLimit = l?.pLeave?.limit || (p ? getRankPLeaveLimit(p.rank) : 60);
  const pUsed = l?.pLeave?.usedDays || 0;
  const pRemaining = l?.pLeave?.remainingDays !== undefined ? l.pLeave.remainingDays : Math.max(0, pLimit - pUsed);
  const pUsagePct = Math.min(100, Math.round((pUsed / pLimit) * 100));
  const isLimitReached = pUsed >= pLimit;
  const isLowBalance = pRemaining <= 5 && !isLimitReached;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confidential 360° Personnel Profile Dossier"
      subtitle={p ? `${p.rank} ${p.name} (${p.armyNumber}) - 55 Fd Amb` : 'Loading...'}
      maxWidth="4xl"
    >
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 text-army-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 text-xs font-sans">
          {/* Header Particulars Card */}
          <div className="p-4 rounded-2xl bg-tactical-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-army-600/30 border border-army-500/50 flex items-center justify-center text-lg font-bold text-army-300 font-mono">
                {p.rank ? p.rank.substring(0, 2) : 'SN'}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <RankBadge rank={p.rank} />
                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span className="text-amber-400 font-bold">{p.armyNumber}</span>
                  <span>•</span>
                  <span>Trade: <strong className="text-slate-200">{p.trade}</strong></span>
                  <span>•</span>
                  <span>Appt: <strong className="text-slate-200">{p.appointment}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:items-end space-y-1">
              <StatusBadge status={p.currentStatus} />
            </div>
          </div>

          {/* 3 Columns: Duty Summary, Fatigue Index, Physical Fitness */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Duty Statistics */}
            <div className="p-4 rounded-2xl bg-tactical-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-blue-400" />
                  Duty History
                </span>
                <span className="text-[10px] font-mono text-slate-500">MONTHLY</span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Duties (30d):</span>
                  <strong className="text-white">{d.monthly.totalDuties} details</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cumulative Hours:</span>
                  <strong className="text-white">{d.monthly.totalHours} hrs</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">Night Duties (22-06h):</span>
                  <strong className="text-purple-300">{d.monthly.nightDuties} shifts</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Night Duty Hours:</span>
                  <strong className="text-purple-300">{d.monthly.nightHours} hrs</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Yearly Total:</span>
                  <strong className="text-amber-400">{d.yearly.totalDuties} duties ({d.yearly.totalHours}h)</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Fatigue Index */}
            <div className="p-4 rounded-2xl bg-tactical-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Fatigue Level
                </span>
                <FatigueBadge level={f.level} />
              </div>
              <div className="space-y-2 text-[11px]">
                <p className="text-slate-400 leading-relaxed">
                  Administrative workload index calculated from duty count, total hours, night shift exposure, and multi-duty days.
                </p>
                <div className="p-2.5 rounded-xl bg-tactical-900 border border-slate-800 font-mono flex justify-between items-center">
                  <span className="text-slate-400">Calculated Workload:</span>
                  <strong className="text-white">{f.score} pts ({f.level})</strong>
                </div>
              </div>
            </div>

            {/* Card 3: PT & Games Attendance */}
            <div className="p-4 rounded-2xl bg-tactical-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Fitness & Sports
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">RATES</span>
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Morning PT Rate:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 font-bold">
                    {pt.monthly.percentage}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 pl-1">
                  Attended: {pt.monthly.attended} • Excused: {pt.monthly.excused}
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Evening Games Rate:</span>
                  <span className="px-2 py-0.5 rounded bg-blue-950/40 text-blue-300 font-bold">
                    {gm.monthly.percentage}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 pl-1">
                  Attended: {gm.monthly.attended} • Excused: {gm.monthly.excused}
                </div>
              </div>
            </div>
          </div>

          {/* Rank-Based P-Leave Dashboard & C-Leave Tracker */}
          <div className="p-5 rounded-2xl bg-tactical-950/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <CalendarRange className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-bold text-white uppercase tracking-wider text-xs">
                    ANNUAL P-LEAVE DASHBOARD & C-LEAVE SCHEDULE (YEAR {new Date().getFullYear()})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Category: <strong>{isOfficer ? 'Officer Entitlement (30 Days/Year)' : 'JCO / Other Rank Entitlement (60 Days/Year)'}</strong>
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                isLimitReached ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                isLowBalance ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {isLimitReached ? 'LIMIT REACHED' : isLowBalance ? 'LOW BALANCE' : 'P-LEAVE AVAILABLE'}
              </span>
            </div>

            {/* P-Leave Progress Bar & Stats */}
            <div className="space-y-2 p-3.5 rounded-xl bg-tactical-900 border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-bold">
                  Annual P-Leave Consumption: <strong className="text-blue-400">{pUsed}</strong> / {pLimit} days ({pUsagePct}%)
                </span>
                <span className="text-emerald-400 font-bold">
                  Remaining Balance: {pRemaining} days
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-tactical-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all ${
                    isLimitReached ? 'bg-rose-500' :
                    pUsagePct >= 80 ? 'bg-amber-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${pUsagePct}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                <span>0 days</span>
                <span>{Math.round(pLimit / 2)} days</span>
                <span>{pLimit} days (Annual Ceiling)</span>
              </div>
            </div>

            {/* C-Leave 3-Month Cadence Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono">
              <div className="p-2.5 rounded-xl bg-tactical-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">C-Leave (3-Month Cadence):</span>
                <span className="text-sm font-bold text-emerald-400">{l.cLeave.periodsThisYear} Spells</span>
                <span className="text-[10px] text-slate-500 block">{l.cLeave.totalDaysThisYear} total days</span>
              </div>

              <div className="p-2.5 rounded-xl bg-tactical-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Last C-Leave Date:</span>
                <span className="text-xs font-bold text-white">{l.cLeave.lastCLeaveDate || 'None'}</span>
                <span className="text-[10px] text-slate-500 block">{l.cLeave.daysSinceLastCLeave} days ago</span>
              </div>

              <div className="p-2.5 rounded-xl bg-tactical-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Next C-Leave Due:</span>
                <span className="text-xs font-bold text-amber-400">{l.cLeave.nextCLeaveDueDate || 'Calculated'}</span>
                <span className={`text-[10px] block font-bold ${l.cLeave.isOverdue ? 'text-rose-400' : l.cLeave.isDueIn15Days ? 'text-amber-400' : 'text-slate-500'}`}>
                  {l.cLeave.isOverdue ? 'OVERDUE' : l.cLeave.isDueIn15Days ? 'DUE IN 15 DAYS' : `In ${l.cLeave.daysUntilCLeaveDue}d`}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-tactical-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">P-Leave Status:</span>
                <span className={`text-xs font-bold ${isLimitReached ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isLimitReached ? 'Max Limit Exhausted' : `${pRemaining} days available`}
                </span>
                <span className="text-[10px] text-slate-500 block">{l.pLeave.periodsCount || 0} spells taken</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
