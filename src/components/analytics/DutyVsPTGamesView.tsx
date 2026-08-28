import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RankBadge } from '../common/Badge';
import { UNIT_NAME } from '../../utils/constants';
import {
  Crosshair,
  Info,
  RefreshCw,
  Activity,
  CalendarCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const DutyVsPTGamesView: React.FC = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDutyVsPTGamesAnalytics(days);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [days]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-army-400 animate-spin" />
      </div>
    );
  }

  // Top soldiers sorted by total duties
  const topDutySoldiers = [...data].sort((a, b) => b.totalDuties - a.totalDuties).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header & Window Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <Crosshair className="w-6 h-6 text-army-400" />
            Duty Burden vs. PT & Games Correlation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit: <strong>{UNIT_NAME}</strong> • Objective Workload Correlation without Automated Bias
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-bold">Analysis Window:</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-tactical-900 border border-slate-700 text-xs text-slate-200 font-semibold"
          >
            <option value={14}>Past 14 Days</option>
            <option value={30}>Past 30 Days (Standard)</option>
            <option value={60}>Past 60 Days</option>
            <option value={90}>Past 90 Days (Quarterly)</option>
          </select>
        </div>
      </div>

      {/* Military Notice */}
      <div className="p-4 rounded-2xl bg-tactical-900/80 border border-slate-800 flex items-start space-x-3 text-xs">
        <div className="p-2 rounded-xl bg-army-600/20 text-army-400 mt-0.5 flex-shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
            Objective Decision Support Framework
          </h4>
          <p className="text-slate-400 mt-0.5 leading-relaxed">
            Soldiers deployed on continuous night shifts (Kote, RP, Emergency Medical Cover, Convoy Driving) are routinely excused from morning PT by unit standing orders. This cross-analytical module mathematically correlates total duty days with physical training and games attendance rates to assist the Commanding Officer and Second-in-Command in distinguishing legitimate duty-induced absence from unexcused delays without making automated disciplinary conclusions.
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="p-5 rounded-2xl bg-tactical-900 border border-slate-800 space-y-4 shadow-tactical">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Duty Days vs PT & Games Attendance (Top 10 Active Duty Soldiers)
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">Past {days} Days</span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topDutySoldiers} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="totalDuties" name="Total Duties (Days)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ptExcusedDuty" name="PT Excused (Duty Cover)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ptAbsent" name="PT Unexcused Absence" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Nominal Roll Matrix */}
      <div className="rounded-2xl bg-tactical-900 border border-slate-800 p-5 space-y-4 shadow-tactical">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Cross-Correlation Matrix Nominal Roll
            </h4>
            <p className="text-xs text-slate-400">
              Comparative review of Duty frequency, PT/Games attendance rates, and absence justification
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-army-400">
            {data.length} Soldiers Analyzed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-tactical-950 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Army No</th>
                <th className="p-3 font-sans">Rank & Name</th>
                <th className="p-3 font-sans">Trade</th>
                <th className="p-3 text-center text-blue-400 font-bold">Duties</th>
                <th className="p-3 text-center text-purple-300">Night Shifts</th>
                <th className="p-3 text-center">PT %</th>
                <th className="p-3 text-center text-emerald-400">PT Excused (Duty)</th>
                <th className="p-3 text-center text-rose-400">PT Unexcused</th>
                <th className="p-3 text-center">Games %</th>
                <th className="p-3 text-center text-emerald-400">Games Excused</th>
                <th className="p-3 text-center text-amber-400">Leave Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-tactical-800/40">
                  <td className="p-3 font-bold text-amber-300">{row.armyNumber}</td>
                  <td className="p-3 font-sans">
                    <div className="flex items-center space-x-1.5">
                      <RankBadge rank={row.rank} />
                      <strong className="text-white">{row.name}</strong>
                    </div>
                  </td>
                  <td className="p-3 font-sans text-army-400 font-bold">{row.trade}</td>
                  <td className="p-3 text-center font-bold text-blue-400 text-sm">{row.totalDuties}d</td>
                  <td className="p-3 text-center font-bold text-purple-300">{row.nightDuties}</td>
                  <td className="p-3 text-center font-bold text-white">{row.ptPercentage}%</td>
                  <td className="p-3 text-center text-emerald-400 font-bold">{row.ptExcusedDuty}d</td>
                  <td className="p-3 text-center text-rose-400">
                    {row.ptAbsent > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                        {row.ptAbsent}d
                      </span>
                    ) : (
                      '0d'
                    )}
                  </td>
                  <td className="p-3 text-center font-bold text-white">{row.gamesPercentage}%</td>
                  <td className="p-3 text-center text-emerald-400 font-bold">{row.gamesExcusedDuty}d</td>
                  <td className="p-3 text-center text-amber-400">{row.leaveDays}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
