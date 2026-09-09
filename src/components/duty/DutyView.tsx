import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DutyRecord, DutyType, KoteCycleSummary } from '../../types';
import { DUTY_TYPES, UNIT_NAME, APP_NAME } from '../../utils/constants';
import { RankBadge, DutyTypeBadge } from '../common/Badge';
import { DutyFormModal } from './DutyFormModal';
import { DutyRosterBuilderModal } from './DutyRosterBuilderModal';
import { KoteCycleAssignModal } from './KoteCycleAssignModal';
import { RPTimelineModal } from './RPTimelineModal';
import { DutyCalendarView } from './DutyCalendarView';
import { UpcomingDutyView } from './UpcomingDutyView';
import {
  CalendarCheck,
  Plus,
  Clock,
  Search,
  Trash2,
  RefreshCw,
  Calendar,
  Table as TableIcon,
  Moon,
  Sun,
  AlertCircle,
  CalendarDays,
  Layers,
  Shield,
  Zap,
  Users,
} from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';

export const DutyView: React.FC = () => {
  const { canModify, hasAppointment } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'roster' | 'calendar' | 'upcoming'>('roster');
  const [duties, setDuties] = useState<DutyRecord[]>([]);
  const [onDutyList, setOnDutyList] = useState<DutyRecord[]>([]);
  const [koteCycles, setKoteCycles] = useState<{ date: string; nightCycle: KoteCycleSummary; dayCycle: KoteCycleSummary } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 2), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [selectedDutyType, setSelectedDutyType] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showDutyModal, setShowDutyModal] = useState(false);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [showKoteModal, setShowKoteModal] = useState(false);
  const [koteModalCycle, setKoteModalCycle] = useState<'NIGHT_18_06' | 'DAY_06_18'>('NIGHT_18_06');
  const [showRpModal, setShowRpModal] = useState(false);
  const [selectedAssignDate, setSelectedAssignDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchDuties = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const [dRes, onDutyRes, koteRes] = await Promise.all([
        api.getDutyRoster({
          startDate,
          endDate,
          dutyType: selectedDutyType,
          search,
        }),
        api.getCurrentlyOnDuty(),
        api.getKoteCycles(todayStr),
      ]);
      setDuties(dRes.duties);
      setOnDutyList(onDutyRes.onDutyPersonnel);
      setKoteCycles(koteRes);
    } catch (e: any) {
      console.error(e);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDuties(false);
    // Background polling: silently update in-place every 30s without resetting loading state or closing modals
    const interval = setInterval(() => {
      fetchDuties(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [startDate, endDate, selectedDutyType, search]);

  const handleDeleteDuty = async (id: string, date: string, name: string) => {
    if (!window.confirm(`Delete duty detail for ${name} on ${date}?`)) return;
    try {
      await api.deleteDuty(id);
      success('Duty Deleted', `Removed duty record on ${date}`);
      fetchDuties();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleOpenKoteModal = (cycle: 'NIGHT_18_06' | 'DAY_06_18', dateStr?: string) => {
    setKoteModalCycle(cycle);
    setSelectedAssignDate(dateStr || format(new Date(), 'yyyy-MM-dd'));
    setShowKoteModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-army-400" />
            Duty Roster & Guard Details
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit: <strong>{UNIT_NAME}</strong> • <strong>{APP_NAME}</strong> Continuous 3-Relief Rotating Guard System
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canModify() && hasAppointment(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']) && (
            <>
              <button
                onClick={() => handleOpenKoteModal('NIGHT_18_06')}
                className="px-3 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md"
              >
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span>Kote Night Cycle (3 Groups)</span>
              </button>

              <button
                onClick={() => handleOpenKoteModal('DAY_06_18')}
                className="px-3 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Kote Day Cycle (3 Groups)</span>
              </button>

              <button
                onClick={() => setShowRpModal(true)}
                className="px-3 py-2 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>RP 24h Timeline</span>
              </button>

              <button
                onClick={() => setShowBuilderModal(true)}
                className="px-3.5 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Full Daily Roster</span>
              </button>

              <button
                onClick={() => setShowDutyModal(true)}
                className="px-3 py-2 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Single Entry</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-Tabs: Table Roster / Monthly Calendar / Upcoming Duties */}
      <div className="p-1 rounded-2xl bg-tactical-900 border border-slate-700 flex flex-wrap gap-1 text-xs">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'roster' ? 'bg-army-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Duty Roster Table</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'calendar' ? 'bg-army-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Monthly Calendar View</span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'upcoming' ? 'bg-army-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Upcoming Duties</span>
        </button>
      </div>

      {/* Tab 1: Standard Table Roster */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* SPECIAL KOTE 12-HOUR 3-RELIEF CONTINUOUS ROTATING DISPLAY */}
          {koteCycles && (
            <div className="p-4 rounded-2xl bg-tactical-900 border border-red-500/30 space-y-4 shadow-tactical">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-2">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                      KOTE DUTY — 3-RELIEF CONTINUOUS ROTATING SYSTEM ({format(new Date(), 'dd MMM yyyy')})
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Each Group: <strong>2h Duty ↓ 4h Rest ↓ 2h Duty ↓ 4h Rest</strong> (4h Active Duty / Person • Full 12-Hour Continuous Coverage)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenKoteModal('NIGHT_18_06')}
                    className="px-2.5 py-1 rounded-lg bg-purple-950 border border-purple-500/40 text-purple-300 text-[11px] font-bold hover:bg-purple-900"
                  >
                    + Assign Night (3 Groups)
                  </button>
                  <button
                    onClick={() => handleOpenKoteModal('DAY_06_18')}
                    className="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-500/40 text-amber-300 text-[11px] font-bold hover:bg-amber-900"
                  >
                    + Assign Day (3 Groups)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. NIGHT CYCLE (18:00 - 06:00) */}
                <div className="p-3.5 rounded-xl bg-tactical-950 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <div className="flex items-center space-x-1.5">
                      <Moon className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-purple-300 font-mono text-xs uppercase">NIGHT CYCLE (1800–0600) — 3 GROUPS</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      12h Coverage
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs font-mono">
                    {koteCycles.nightCycle.groups.map((grp) => (
                      <div key={grp.groupNumber} className="p-2.5 rounded-lg bg-tactical-900 border border-purple-500/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-300 font-bold uppercase">{grp.groupLabel}</span>
                          <span className="text-amber-400 text-[10px] font-bold">Duty: {grp.dutyIntervals.join(' & ')}</span>
                        </div>

                        <div className="text-[11px]">
                          <div className="text-slate-300">
                            <strong>GC:</strong> {grp.guardCommander ? `${grp.guardCommander.rank} ${grp.guardCommander.name} (${grp.guardCommander.armyNumber})` : <span className="text-slate-500 italic">Not Assigned</span>}
                          </div>
                          <div className="text-slate-300">
                            <strong>Guard:</strong> {grp.guard ? `${grp.guard.rank} ${grp.guard.name} (${grp.guard.armyNumber})` : <span className="text-slate-500 italic">Not Assigned</span>}
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500">
                          Rest: {grp.restIntervals.join(' & ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. DAY CYCLE (06:00 - 18:00) */}
                <div className="p-3.5 rounded-xl bg-tactical-950 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <div className="flex items-center space-x-1.5">
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-amber-300 font-mono text-xs uppercase">DAY CYCLE (0600–1800) — 3 GROUPS</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      12h Coverage
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs font-mono">
                    {koteCycles.dayCycle.groups.map((grp) => (
                      <div key={grp.groupNumber} className="p-2.5 rounded-lg bg-tactical-900 border border-amber-500/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-300 font-bold uppercase">{grp.groupLabel}</span>
                          <span className="text-amber-400 text-[10px] font-bold">Duty: {grp.dutyIntervals.join(' & ')}</span>
                        </div>

                        <div className="text-[11px]">
                          <div className="text-slate-300">
                            <strong>GC:</strong> {grp.guardCommander ? `${grp.guardCommander.rank} ${grp.guardCommander.name} (${grp.guardCommander.armyNumber})` : <span className="text-slate-500 italic">Not Assigned</span>}
                          </div>
                          <div className="text-slate-300">
                            <strong>Guard:</strong> {grp.guard ? `${grp.guard.rank} ${grp.guard.name} (${grp.guard.armyNumber})` : <span className="text-slate-500 italic">Not Assigned</span>}
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500">
                          Rest: {grp.restIntervals.join(' & ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live "Currently On Duty" Active Ribbon */}
          <div className="p-4 rounded-2xl bg-tactical-900 border border-red-500/30 space-y-3 shadow-tactical">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <h4 className="text-xs font-bold text-white uppercase font-mono">
                  AUTOMATIC ACTIVE DUTY STATUS: CURRENTLY ON DUTY
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Real-time Clock: {format(new Date(), 'HH:mm:ss')}
              </span>
            </div>

            {onDutyList.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No active duties in progress at the current hour.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {onDutyList.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-tactical-950/80 border border-red-500/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>{d.dutyType}</span>
                        {d.dutyRole && d.dutyRole !== d.dutyType && (
                          <span className="text-amber-400 text-[10px] font-mono">({d.dutyRole})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        <strong>{d.rank} {d.name}</strong> <span className="text-amber-400 font-mono">({d.armyNumber})</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                        ON DUTY
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{d.startTime} - {d.endTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-tactical-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search soldier, army no, location, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white placeholder-slate-500"
              />
            </div>

            <div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
              />
            </div>

            <div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
              />
            </div>

            <div>
              <select
                value={selectedDutyType}
                onChange={(e) => setSelectedDutyType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-slate-300 font-semibold"
              >
                <option value="">All Duty Types</option>
                {DUTY_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block rounded-2xl bg-tactical-900 border border-slate-800 overflow-hidden shadow-tactical">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-tactical-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Duty Detail</th>
                    <th className="p-3.5">Assigned Role</th>
                    <th className="p-3.5">Shift / Cycle</th>
                    <th className="p-3.5">Assigned Soldier</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Timings</th>
                    <th className="p-3.5 text-center">Active Hours</th>
                    <th className="p-3.5 text-center">Night Duty</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-army-400 mb-2" />
                        <span>Loading duty roster...</span>
                      </td>
                    </tr>
                  ) : duties.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-500">
                        No duty details found for the selected date range. Click "Kote Night Cycle", "Kote Day Cycle", or "Full Daily Roster" to generate.
                      </td>
                    </tr>
                  ) : (
                    duties.map((d) => {
                      const isCrossMidnight = d.startDateTime && d.endDateTime && d.startDateTime.split('T')[0] !== d.endDateTime.split('T')[0];
                      return (
                        <tr key={d.id} className="hover:bg-tactical-800/40">
                          <td className="p-3.5 font-mono font-bold text-white whitespace-nowrap">{d.date}</td>
                          <td className="p-3.5">
                            <DutyTypeBadge type={d.dutyType} />
                          </td>
                          <td className="p-3.5 font-mono text-amber-300 font-bold whitespace-nowrap">
                            {d.dutyRole || d.dutyType}
                          </td>
                          <td className="p-3.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                            {d.shiftName || 'General'}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center space-x-1.5 whitespace-nowrap">
                              <RankBadge rank={d.rank || 'Sainik'} />
                              <strong className="text-white">{d.name}</strong>
                              <span className="text-slate-400 font-mono">({d.armyNumber})</span>
                              {d.currentStatus && d.currentStatus !== 'PRESENT' && (
                                <span className="text-[10px] text-rose-400 font-mono">[{d.currentStatus}]</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-300">{d.location}</td>
                          <td className="p-3.5 font-mono text-slate-300 whitespace-nowrap">
                            <span>{d.startTime} - {d.endTime}</span>
                            {isCrossMidnight && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-500/30">
                                +1d
                              </span>
                            )}
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
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                              d.activeStatus === 'ON_DUTY'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                                : d.activeStatus === 'UPCOMING'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-tactical-800 text-slate-400 border-slate-700'
                            }`}>
                              {d.activeStatus}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            {canModify() && hasAppointment(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']) && (
                              <button
                                onClick={() => handleDeleteDuty(d.id, d.date, d.name || '')}
                                className="p-1.5 rounded-lg bg-tactical-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Duty Cards (Visible only on < md screens) */}
          <div className="block md:hidden space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 rounded-2xl bg-tactical-900 border border-slate-800">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-army-400 mb-2" />
                <span>Loading duty roster...</span>
              </div>
            ) : duties.length === 0 ? (
              <div className="p-8 text-center text-slate-500 rounded-2xl bg-tactical-900 border border-slate-800">
                No duty details found for this date range.
              </div>
            ) : (
              duties.map((d) => {
                const isCrossMidnight = d.startDateTime && d.endDateTime && d.startDateTime.split('T')[0] !== d.endDateTime.split('T')[0];
                return (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-2xl bg-tactical-900 border border-slate-800 space-y-3 shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <DutyTypeBadge type={d.dutyType} />
                        <span className="text-amber-300 font-bold font-mono text-[11px]">
                          {d.dutyRole || d.dutyType}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                        d.activeStatus === 'ON_DUTY'
                          ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                          : d.activeStatus === 'UPCOMING'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-tactical-800 text-slate-400 border-slate-700'
                      }`}>
                        {d.activeStatus}
                      </span>
                    </div>

                    {/* Soldier Info */}
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-tactical-950 border border-slate-800">
                      <div className="flex items-center space-x-2 min-w-0">
                        <RankBadge rank={d.rank || 'Sainik'} />
                        <div className="min-w-0">
                          <div className="text-white font-bold text-xs truncate">{d.name}</div>
                          <div className="text-slate-400 font-mono text-[10px] truncate">
                            No: <span className="text-amber-300 font-bold">{d.armyNumber}</span> • {d.trade}
                          </div>
                        </div>
                      </div>
                      {d.currentStatus && d.currentStatus !== 'PRESENT' && (
                        <span className="text-[10px] text-rose-400 font-mono bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-500/30 flex-shrink-0">
                          {d.currentStatus}
                        </span>
                      )}
                    </div>

                    {/* Timing & Location */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded-lg bg-tactical-950 border border-slate-800/80">
                        <span className="text-[9px] text-slate-500 block uppercase">Timings</span>
                        <div className="text-white font-bold flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          <span>{d.startTime} - {d.endTime}</span>
                        </div>
                        {isCrossMidnight && (
                          <span className="text-[9px] text-purple-300 block font-sans mt-0.5 font-bold">
                            Overnight (+1 Day)
                          </span>
                        )}
                      </div>

                      <div className="p-2 rounded-lg bg-tactical-950 border border-slate-800/80">
                        <span className="text-[9px] text-slate-500 block uppercase">Hours & Night</span>
                        <div className="text-white font-bold mt-0.5">
                          {d.durationHours}h {d.isNightDuty ? `• ${d.nightDutyHours}h Night` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Location & Delete Action */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400 truncate text-[11px]">
                        📍 {d.location} {d.shiftName ? `• ${d.shiftName}` : ''}
                      </span>
                      {canModify() && hasAppointment(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']) && (
                        <button
                          onClick={() => handleDeleteDuty(d.id, d.date, d.name || '')}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors min-h-[36px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Monthly Calendar View */}
      {activeTab === 'calendar' && (
        <DutyCalendarView onAssignDutyForDate={(dt) => handleOpenKoteModal('NIGHT_18_06', dt)} />
      )}

      {/* Tab 3: Upcoming Duties */}
      {activeTab === 'upcoming' && (
        <UpcomingDutyView />
      )}

      {/* Kote 3-Relief Rotating Modal */}
      {showKoteModal && (
        <KoteCycleAssignModal
          isOpen={showKoteModal}
          onClose={() => setShowKoteModal(false)}
          onSuccess={fetchDuties}
          initialDate={selectedAssignDate}
          initialCycle={koteModalCycle}
        />
      )}

      {/* RP 24-Hour Timeline Modal */}
      {showRpModal && (
        <RPTimelineModal
          isOpen={showRpModal}
          onClose={() => setShowRpModal(false)}
          onSuccess={fetchDuties}
          initialDate={selectedAssignDate}
        />
      )}

      {/* Dynamic Duty Roster Builder Modal */}
      {showBuilderModal && (
        <DutyRosterBuilderModal
          isOpen={showBuilderModal}
          onClose={() => setShowBuilderModal(false)}
          onSuccess={fetchDuties}
          initialDate={selectedAssignDate}
        />
      )}

      {/* Single Duty Form Modal */}
      {showDutyModal && (
        <DutyFormModal
          isOpen={showDutyModal}
          onClose={() => setShowDutyModal(false)}
          onSuccess={fetchDuties}
          initialDate={selectedAssignDate}
        />
      )}
    </div>
  );
};
