import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RankBadge, FatigueBadge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { UNIT_NAME } from '../../utils/constants';
import {
  Scale,
  Clock,
  Award,
  TrendingUp,
  Moon,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

export const DutyAnalyticsView: React.FC = () => {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDutyAnalytics(period);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-army-400 animate-spin" />
      </div>
    );
  }

  const s = data.summary;
  const fSummary = s.fatigueSummary;

  return (
    <div className="space-y-6">
      {/* Header & Period Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <Scale className="w-6 h-6 text-army-400" />
            Duty Analytics & Fatigue Workload Index
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit: <strong>{UNIT_NAME}</strong> • Objective Workload Distribution & Night Duty Fatigue
          </p>
        </div>

        <div className="p-1 rounded-xl bg-tactical-900 border border-slate-700 flex items-center space-x-1 text-xs">
          {[
            { id: 'weekly', label: 'Weekly' },
            { id: 'monthly', label: 'Monthly' },
            { id: 'quarterly', label: 'Quarterly' },
            { id: 'yearly', label: 'Yearly' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                period === tab.id ? 'bg-army-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Duties"
          value={s.totalDuties}
          subtitle={`In ${period} cycle`}
          icon={<Clock className="w-4 h-4 text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          title="Total Hours"
          value={`${s.totalHours}h`}
          subtitle="Ground Hours"
          icon={<Clock className="w-4 h-4 text-blue-400" />}
          color="blue"
        />
        <StatCard
          title="Night Duties"
          value={s.totalNightDuties}
          subtitle="22:00 to 06:00 Window"
          icon={<Moon className="w-4 h-4 text-purple-400" />}
          color="purple"
        />
        <StatCard
          title="Night Hours"
          value={`${s.totalNightHours}h`}
          subtitle="Night Shift Exposure"
          icon={<Moon className="w-4 h-4 text-purple-400" />}
          color="purple"
        />
        <StatCard
          title="Mean Load"
          value={s.meanDutyPerSoldier}
          subtitle="Duties / Soldier"
          icon={<Scale className="w-4 h-4 text-amber-400" />}
          color="amber"
        />
        <StatCard
          title="High Fatigue"
          value={fSummary.high}
          subtitle="Personnel Flagged"
          icon={<Scale className="w-4 h-4 text-rose-400" />}
          color="rose"
        />
      </div>

      {/* Comprehensive Individual Duty & Fatigue Matrix */}
      <div className="rounded-2xl bg-tactical-900 border border-slate-800 p-5 space-y-4 shadow-tactical">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Individual Soldier Workload & Fatigue Index Matrix
            </h4>
            <p className="text-xs text-slate-400">
              Objective statistical tracking of duty assignments, night shifts, and fatigue scores
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-army-400">
            {data.soldierStats.length} Personnel
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-tactical-950 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Army No</th>
                <th className="p-3 font-sans">Rank & Name</th>
                <th className="p-3 font-sans">Trade</th>
                <th className="p-3 text-center text-white font-bold">Total Duties</th>
                <th className="p-3 text-center">Duty %</th>
                <th className="p-3 text-center">Total Hours</th>
                <th className="p-3 text-center text-purple-300">Night Duties</th>
                <th className="p-3 text-center text-purple-300">Night Hours</th>
                <th className="p-3 text-center">Multi-Duty Days</th>
                <th className="p-3 text-center">Fatigue Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.soldierStats.map((s: any) => (
                <tr key={s.id} className="hover:bg-tactical-800/40">
                  <td className="p-3 font-bold text-amber-300">{s.armyNumber}</td>
                  <td className="p-3 font-sans">
                    <div className="flex items-center space-x-1.5">
                      <RankBadge rank={s.rank} />
                      <strong className="text-white">{s.name}</strong>
                    </div>
                  </td>
                  <td className="p-3 font-sans text-army-400 font-bold">{s.trade}</td>
                  <td className="p-3 text-center font-bold text-white text-sm">{s.dutyCount}</td>
                  <td className="p-3 text-center text-slate-300">{s.dutyPercentage}%</td>
                  <td className="p-3 text-center text-blue-400">{s.dutyHours}h</td>
                  <td className="p-3 text-center font-bold text-purple-400">{s.nightDuties}</td>
                  <td className="p-3 text-center text-purple-300">{s.nightDutyHours}h</td>
                  <td className="p-3 text-center text-amber-400">{s.multiDutyDays}</td>
                  <td className="p-3 text-center">
                    <FatigueBadge level={s.fatigueLevel} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
