import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DutyRecord } from '../../types';
import { RankBadge, DutyTypeBadge } from '../common/Badge';
import { UNIT_NAME } from '../../utils/constants';
import {
  CalendarCheck,
  Clock,
  Moon,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';

export const UpcomingDutyView: React.FC = () => {
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'next7' | 'next30'>('next7');
  const [duties, setDuties] = useState<DutyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUpcoming = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await api.getUpcomingDuties(filter);
      setDuties(res.upcomingDuties);
    } catch (e) {
      console.error(e);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming(false);
    const interval = setInterval(() => {
      fetchUpcoming(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const filteredDuties = duties.filter((d) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (d.name && d.name.toLowerCase().includes(term)) ||
      (d.armyNumber && d.armyNumber.toLowerCase().includes(term)) ||
      (d.dutyType && d.dutyType.toLowerCase().includes(term)) ||
      (d.location && d.location.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Upcoming Assigned Regimental Duties
          </h3>
          <p className="text-xs text-slate-400">
            Chronological roster of future scheduled duties for {UNIT_NAME}
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="p-1 rounded-xl bg-tactical-900 border border-slate-700 flex flex-wrap gap-1 text-xs">
          {[
            { id: 'today', label: "Today's Schedule" },
            { id: 'tomorrow', label: 'Tomorrow' },
            { id: 'next7', label: 'Next 7 Days' },
            { id: 'next30', label: 'Next 30 Days' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as any)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                filter === btn.id ? 'bg-army-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter upcoming duties by name, army no, guard post..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-tactical-900 border border-slate-700 text-xs text-white placeholder-slate-500"
        />
      </div>

      {/* Upcoming Duties List Cards / Table */}
      {isLoading ? (
        <div className="rounded-2xl bg-tactical-900 border border-slate-800 p-12 text-center text-slate-500 shadow-tactical">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-army-400 mb-2" />
          <span>Loading upcoming duty roster...</span>
        </div>
      ) : filteredDuties.length === 0 ? (
        <div className="rounded-2xl bg-tactical-900 border border-slate-800 p-12 text-center text-slate-500 shadow-tactical">
          No upcoming duties scheduled for the selected period.
        </div>
      ) : (
        <>
          {/* Mobile Card View (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {filteredDuties.map((d) => {
              const isOvernight = d.endTime <= d.startTime || (d.startDateTime && d.endDateTime && d.startDateTime.slice(0, 10) !== d.endDateTime.slice(0, 10));
              return (
                <div
                  key={d.id}
                  className="bg-tactical-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <RankBadge rank={d.rank || 'Sainik'} />
                        <span className="font-bold text-white text-sm">{d.name}</span>
                        <span className="text-amber-400 font-mono text-xs">({d.armyNumber})</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="text-army-400 font-mono font-semibold">{d.trade}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-300">{d.date}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border whitespace-nowrap ${
                        d.activeStatus === 'ON_DUTY'
                          ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                          : d.activeStatus === 'UPCOMING'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-tactical-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {d.activeStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2">
                      <DutyTypeBadge type={d.dutyType} />
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {d.location}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                    <div className="flex items-center gap-1.5 font-mono text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{d.startTime} - {d.endTime}</span>
                      {isOvernight && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                          (+1d)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-slate-400">{d.durationHours}h</span>
                      {d.isNightDuty && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Moon className="w-3 h-3" />
                          <span>{d.nightDutyHours}h</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block rounded-2xl bg-tactical-900 border border-slate-800 overflow-hidden shadow-tactical">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-tactical-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Assigned Soldier</th>
                    <th className="p-3.5">Trade</th>
                    <th className="p-3.5">Duty Detail</th>
                    <th className="p-3.5">Location / Post</th>
                    <th className="p-3.5">Timings</th>
                    <th className="p-3.5 text-center">Duration</th>
                    <th className="p-3.5 text-center">Night Shift</th>
                    <th className="p-3.5">Active Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredDuties.map((d) => {
                    const isOvernight = d.endTime <= d.startTime || (d.startDateTime && d.endDateTime && d.startDateTime.slice(0, 10) !== d.endDateTime.slice(0, 10));
                    return (
                      <tr key={d.id} className="hover:bg-tactical-800/40">
                        <td className="p-3.5 font-mono font-bold text-white whitespace-nowrap">
                          {d.date}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center space-x-1.5">
                            <RankBadge rank={d.rank || 'Sainik'} />
                            <strong className="text-white">{d.name}</strong>
                            <span className="text-amber-400 font-mono text-[11px]">({d.armyNumber})</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-army-400 font-bold">{d.trade}</td>
                        <td className="p-3.5">
                          <DutyTypeBadge type={d.dutyType} />
                        </td>
                        <td className="p-3.5 text-slate-300">{d.location}</td>
                        <td className="p-3.5 font-mono text-slate-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{d.startTime} - {d.endTime}</span>
                            {isOvernight && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                                (+1d)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-center text-white">{d.durationHours}h</td>
                        <td className="p-3.5 text-center">
                          {d.isNightDuty ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center gap-1 mx-auto w-max">
                              <Moon className="w-3 h-3" />
                              <span>{d.nightDutyHours}h</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">-</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                              d.activeStatus === 'ON_DUTY'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                                : d.activeStatus === 'UPCOMING'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-tactical-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {d.activeStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
