import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { LeaveRecord, LeaveType } from '../../types';
import { LEAVE_TYPES, UNIT_NAME, getRankPLeaveLimit } from '../../utils/constants';
import { RankBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { LeaveFormModal } from './LeaveFormModal';
import { LeaveForecastBoard } from './LeaveForecastBoard';
import {
  CalendarRange,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  UserCheck,
  Calendar,
  AlertCircle,
  Edit2,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

export const LeaveView: React.FC = () => {
  const { canModify, user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'active' | 'forecast' | 'reminders' | 'yearly'>('active');
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [reminders, setReminders] = useState<any>(null);
  const [yearlySummary, setYearlySummary] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLeaveRecord, setEditingLeaveRecord] = useState<LeaveRecord | null>(null);
  const [preselectedSoldierId, setPreselectedSoldierId] = useState<string>('');

  // Delete Confirmation Modal State
  const [leaveToDelete, setLeaveToDelete] = useState<LeaveRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLeaveData = async () => {
    setIsLoading(true);
    try {
      const [recRes, remRes, yrRes] = await Promise.all([
        api.getLeaveRecords({
          leaveType: selectedLeaveType,
          status: selectedStatus,
          search,
        }),
        api.getLeaveReminders(),
        api.getYearlyLeaveSummary(),
      ]);

      setRecords(recRes.records);
      setReminders(remRes);
      setYearlySummary(yrRes.summary);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [selectedLeaveType, selectedStatus, search]);

  const handleReturnFromLeave = async (id: string, name: string) => {
    if (!window.confirm(`Mark ${name} as RETURNED from leave and restored to PRESENT in unit lines?`)) {
      return;
    }
    try {
      await api.returnFromLeave(id);
      success('Soldier Returned', `Marked ${name} as returned from leave.`);
      fetchLeaveData();
    } catch (err: any) {
      error('Return Failed', err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!leaveToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteLeave(leaveToDelete.id);
      success('Leave Record Deleted', res.message || 'Removed leave record and recalculated entitlements.');
      setLeaveToDelete(null);
      fetchLeaveData();
    } catch (err: any) {
      error('Delete Failed', err.message || 'Failed to delete leave record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isCO = user?.appointment === 'CO';

  return (
    <div className="space-y-6">
      {/* Header & Sanction Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-army-400" />
            Regimental Leave & 3-Month Forecast Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit: <strong>{UNIT_NAME}</strong> • Rank-Based P-Leave (30d Officer / 60d JCO-OR) & 3-Month C-Leave Schedule
            {isCO && <span className="ml-2 text-amber-400 font-mono font-bold">(CO Strictly Read-Only)</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canModify() && (
            <button
              onClick={() => {
                setPreselectedSoldierId('');
                setEditingLeaveRecord(null);
                setShowFormModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Sanction Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="p-1 rounded-2xl bg-tactical-900 border border-slate-700 flex flex-wrap gap-1 text-xs">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'active' ? 'bg-army-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Active & Logged Leaves
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'forecast' ? 'bg-army-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          3 Months Register & Forecast
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'reminders' ? 'bg-army-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>C Leave Reminders</span>
          {reminders && (reminders.counts.overdue > 0 || reminders.counts.dueIn15Days > 0) && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white">
              {reminders.counts.overdue + reminders.counts.dueIn15Days}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('yearly')}
          className={`px-4 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'yearly' ? 'bg-army-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Annual Leave Ledger (P-Leave Cap)
        </button>
      </div>

      {/* Tab 1: Active & Logged Leaves */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-tactical-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search soldier, army no, reason, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white placeholder-slate-500"
              />
            </div>

            <div>
              <select
                value={selectedLeaveType}
                onChange={(e) => setSelectedLeaveType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-slate-300 font-semibold"
              >
                <option value="">All Leave Types</option>
                {LEAVE_TYPES.map((lt) => (
                  <option key={lt.type} value={lt.type}>
                    {lt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-slate-300 font-semibold"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE (Away)</option>
                <option value="UPCOMING">UPCOMING</option>
                <option value="RETURNED">RETURNED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          {/* Records Table: | Personnel | Leave Type | Start | End | Days | Action (Edit / Delete) | */}
          <div className="rounded-2xl bg-tactical-900 border border-slate-800 overflow-hidden shadow-tactical">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-tactical-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Personnel</th>
                    <th className="p-3.5">Leave Type</th>
                    <th className="p-3.5 font-mono">Start Date</th>
                    <th className="p-3.5 font-mono">End Date</th>
                    <th className="p-3.5 text-center font-mono">Days</th>
                    <th className="p-3.5">Reason & Destination</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-army-400 mb-2" />
                        <span>Loading leave records...</span>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500">
                        No leave records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    records.map((l) => (
                      <tr key={l.id} className="hover:bg-tactical-800/40">
                        {/* Personnel */}
                        <td className="p-3.5">
                          <div className="flex items-center space-x-2 whitespace-nowrap">
                            <RankBadge rank={l.rank || 'Sainik'} />
                            <div>
                              <strong className="text-white block">{l.name}</strong>
                              <span className="font-mono text-amber-400 text-[11px] font-bold">{l.armyNumber} • {l.trade}</span>
                            </div>
                          </div>
                        </td>

                        {/* Leave Type */}
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            l.leaveType === 'P_LEAVE'
                              ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                              : l.leaveType === 'C_LEAVE'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : l.leaveType === 'MEDICAL_LEAVE'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                              : 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                          }`}>
                            {l.leaveType.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Start Date */}
                        <td className="p-3.5 font-mono text-slate-300 whitespace-nowrap font-bold">
                          {l.startDate}
                        </td>

                        {/* End Date */}
                        <td className="p-3.5 font-mono text-slate-300 whitespace-nowrap font-bold">
                          {l.endDate}
                        </td>

                        {/* Days */}
                        <td className="p-3.5 font-mono font-bold text-center text-amber-400 text-sm">
                          {l.totalDays}d
                        </td>

                        {/* Reason & Address */}
                        <td className="p-3.5">
                          <div className="text-white font-medium">{l.reason}</div>
                          {l.destinationAddress && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{l.destinationAddress}</div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            l.status === 'ACTIVE'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : l.status === 'UPCOMING'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-tactical-800 text-slate-400 border-slate-700'
                          }`}>
                            {l.status}
                          </span>
                        </td>

                        {/* Action: Return, Edit, Delete */}
                        <td className="p-3.5 text-right font-sans">
                          {canModify() ? (
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Return from leave if ACTIVE */}
                              {l.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleReturnFromLeave(l.id, l.name || '')}
                                  className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center space-x-1"
                                  title="Mark Returned"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Return</span>
                                </button>
                              )}

                              {/* Edit Option */}
                              <button
                                onClick={() => {
                                  setEditingLeaveRecord(l);
                                  setShowFormModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-tactical-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                                title="Edit Leave Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Option */}
                              <button
                                onClick={() => setLeaveToDelete(l)}
                                className="p-1.5 rounded-lg bg-tactical-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete Leave Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 3-Month Forward Forecast & 3 Months Register */}
      {activeTab === 'forecast' && (
        <LeaveForecastBoard
          onSelectSoldierForLeave={(pId) => {
            setPreselectedSoldierId(pId);
            setEditingLeaveRecord(null);
            setShowFormModal(true);
          }}
        />
      )}

      {/* Tab 3: C Leave Reminders (Due in 15 Days & Overdue) */}
      {activeTab === 'reminders' && reminders && (
        <div className="space-y-6 font-sans">
          {/* Overdue Nominal Roll */}
          <div className="rounded-2xl bg-tactical-900 border border-rose-500/30 p-5 space-y-4 shadow-tactical">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <div>
                  <h4 className="text-sm font-bold text-white uppercase">LEAVE CADENCE OVERDUE NOMINAL ROLL</h4>
                  <p className="text-xs text-slate-400">Personnel who have exceeded 90 days since their last leave (P Leave or C Leave)</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {reminders.overdue.length} Overdue
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="bg-tactical-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Army No</th>
                    <th className="p-3 font-sans">Rank & Name</th>
                    <th className="p-3 font-sans">Trade</th>
                    <th className="p-3">Last Leave</th>
                    <th className="p-3">Expected Due Date</th>
                    <th className="p-3 text-center text-rose-400 font-bold">Days Overdue</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reminders.overdue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 font-sans">
                        No soldiers currently overdue for leave.
                      </td>
                    </tr>
                  ) : (
                    reminders.overdue.map((p: any) => (
                      <tr key={p.personnelId} className="hover:bg-tactical-800/40">
                        <td className="p-3 font-bold text-amber-300">{p.armyNumber}</td>
                        <td className="p-3 font-sans">
                          <div className="flex items-center space-x-1.5">
                            <RankBadge rank={p.rank} />
                            <strong className="text-white">{p.name}</strong>
                          </div>
                        </td>
                        <td className="p-3 font-sans text-army-400 font-bold">{p.trade}</td>
                        <td className="p-3 text-slate-300">
                          <span className="block font-bold">{p.lastLeaveDate}</span>
                          <span className="text-[10px] text-amber-400 font-sans">{p.lastLeaveType || 'Leave'}</span>
                        </td>
                        <td className="p-3 text-rose-300 font-bold">{p.nextCLeaveDueDate || p.nextDueDate}</td>
                        <td className="p-3 text-center font-bold text-rose-400 text-sm">
                          +{p.daysOverdue} days
                        </td>
                        <td className="p-3 text-right font-sans">
                          {canModify() && (
                            <button
                              onClick={() => {
                                setPreselectedSoldierId(p.personnelId);
                                setEditingLeaveRecord(null);
                                setShowFormModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-army-600 hover:bg-army-500 text-white font-bold text-[11px]"
                            >
                              Sanction Leave
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Due in 15 Days Nominal Roll */}
          <div className="rounded-2xl bg-tactical-900 border border-amber-500/30 p-5 space-y-4 shadow-tactical">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-bold text-white uppercase">LEAVE CADENCE DUE IN 15 DAYS</h4>
                  <p className="text-xs text-slate-400">Personnel approaching their 90-day leave due date (from last P Leave or C Leave)</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {reminders.dueIn15Days.length} Upcoming
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="bg-tactical-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Army No</th>
                    <th className="p-3 font-sans">Rank & Name</th>
                    <th className="p-3 font-sans">Trade</th>
                    <th className="p-3">Last Leave</th>
                    <th className="p-3">Expected Due Date</th>
                    <th className="p-3 text-center text-amber-400 font-bold">Days Until Due</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reminders.dueIn15Days.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 font-sans">
                        No soldiers due in the next 15 days.
                      </td>
                    </tr>
                  ) : (
                    reminders.dueIn15Days.map((p: any) => (
                      <tr key={p.personnelId} className="hover:bg-tactical-800/40">
                        <td className="p-3 font-bold text-amber-300">{p.armyNumber}</td>
                        <td className="p-3 font-sans">
                          <div className="flex items-center space-x-1.5">
                            <RankBadge rank={p.rank} />
                            <strong className="text-white">{p.name}</strong>
                          </div>
                        </td>
                        <td className="p-3 font-sans text-army-400 font-bold">{p.trade}</td>
                        <td className="p-3 text-slate-300">
                          <span className="block font-bold">{p.lastLeaveDate}</span>
                          <span className="text-[10px] text-amber-400 font-sans">{p.lastLeaveType || 'Leave'}</span>
                        </td>
                        <td className="p-3 text-amber-300 font-bold">{p.nextCLeaveDueDate || p.nextDueDate}</td>
                        <td className="p-3 text-center font-bold text-amber-400 text-sm">
                          In {p.daysUntilDue} days
                        </td>
                        <td className="p-3 text-right font-sans">
                          {canModify() && (
                            <button
                              onClick={() => {
                                setPreselectedSoldierId(p.personnelId);
                                setEditingLeaveRecord(null);
                                setShowFormModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-army-600 hover:bg-army-500 text-white font-bold text-[11px]"
                            >
                              Sanction Leave
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Annual Leave Ledger */}
      {activeTab === 'yearly' && (
        <div className="rounded-2xl bg-tactical-900 border border-slate-800 p-5 space-y-4 shadow-tactical font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                ANNUAL P-LEAVE UTILIZATION LEDGER (2026)
              </h4>
              <p className="text-xs text-slate-400">
                Military P-Leave Caps: <strong>Officers (30 Days)</strong> • <strong>JCO/ORs, NC(E), Civil (60 Days)</strong>
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-army-400">
              TOTAL {yearlySummary.length} PERSONNEL
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-tactical-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3 font-sans">Personnel</th>
                  <th className="p-3 text-center">Annual Cap</th>
                  <th className="p-3 text-center text-blue-400">P-Leave Used</th>
                  <th className="p-3 text-center text-emerald-400">Remaining</th>
                  <th className="p-3 text-center text-amber-400">C-Leave Days</th>
                  <th className="p-3 text-center">Usage %</th>
                  <th className="p-3 text-right text-white">Total Away</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {yearlySummary.map((s) => (
                  <tr key={s.personnelId} className="hover:bg-tactical-800/40">
                    <td className="p-3 font-sans">
                      <div className="flex items-center space-x-2">
                        <RankBadge rank={s.rank} />
                        <div>
                          <strong className="text-white block">{s.name}</strong>
                          <span className="text-amber-400 font-mono text-[10px] font-bold">{s.armyNumber} • {s.trade}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-300">{s.pLeaveLimit} Days</td>
                    <td className="p-3 text-center font-bold text-blue-400">{s.pLeaveDaysUsed} Days</td>
                    <td className="p-3 text-center font-bold text-emerald-400">{s.pLeaveDaysRemaining} Days</td>
                    <td className="p-3 text-center text-amber-400">{s.cLeaveDaysUsed} Days</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.pLeaveUsagePct >= 100
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : s.pLeaveUsagePct >= 75
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {s.pLeaveUsagePct}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-white text-sm">
                      {s.totalDaysAway} Days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {leaveToDelete && (
        <Modal
          isOpen={Boolean(leaveToDelete)}
          onClose={() => setLeaveToDelete(null)}
          title="Delete Leave Record Confirmation"
          subtitle="Are you sure you want to delete this leave record?"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 rounded-xl bg-tactical-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Personnel:</span>
                <span className="font-bold text-white">{leaveToDelete.rank} {leaveToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Army Number:</span>
                <span className="font-mono font-bold text-amber-300">{leaveToDelete.armyNumber}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Leave Type:</span>
                <span className="font-mono font-bold text-blue-400">{leaveToDelete.leaveType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Start Date:</span>
                <span className="font-mono text-slate-300">{leaveToDelete.startDate}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">End Date:</span>
                <span className="font-mono text-slate-300">{leaveToDelete.endDate}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Total Duration:</span>
                <span className="font-mono text-amber-400 font-bold text-sm">{leaveToDelete.totalDays} Days</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-start space-x-2 text-[11px] text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Deleting this leave record will permanently remove it from the central database, restore soldier's status to PRESENT if currently active, and immediately recalculate P-Leave and C-Leave balances.
              </span>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setLeaveToDelete(null)}
                className="px-4 py-2 rounded-xl bg-tactical-800 text-slate-300 font-bold hover:bg-tactical-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50 flex items-center space-x-1.5 shadow-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Leave Record'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Form Modal (Sanction / Edit) */}
      {showFormModal && (
        <LeaveFormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setEditingLeaveRecord(null);
          }}
          onSuccess={fetchLeaveData}
          initialPersonnelId={preselectedSoldierId}
          leaveRecord={editingLeaveRecord}
        />
      )}
    </div>
  );
};
