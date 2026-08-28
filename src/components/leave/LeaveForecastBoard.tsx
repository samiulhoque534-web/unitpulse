import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RankBadge } from '../common/Badge';
import { UNIT_NAME } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { LeaveFormModal } from './LeaveFormModal';
import {
  CalendarRange,
  RefreshCw,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  AlertTriangle,
  Plus,
} from 'lucide-react';

interface LeaveForecastBoardProps {
  onSelectSoldierForLeave?: (personnelId: string) => void;
}

export const LeaveForecastBoard: React.FC<LeaveForecastBoardProps> = ({ onSelectSoldierForLeave }) => {
  const { canModify } = useAuth();
  const { success, error } = useToast();

  const [forecast, setForecast] = useState<any[]>([]);
  const [registerEntries, setRegisterEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Delete Modals
  const [editingLeaveRecord, setEditingLeaveRecord] = useState<any | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchForecast = async () => {
    setIsLoading(true);
    try {
      const res = await api.get3MonthForecast();
      setForecast(res.forecast);
      setRegisterEntries(res.registerEntries || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    setIsDeleting(true);
    try {
      if (entryToDelete.leaveId) {
        await api.deleteLeave(entryToDelete.leaveId);
      }
      success('Register Entry Deleted', `Removed record for ${entryToDelete.rank} ${entryToDelete.name}`);
      setEntryToDelete(null);
      fetchForecast();
    } catch (err: any) {
      error('Delete Failed', err.message || 'Failed to delete entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <RefreshCw className="w-8 h-8 text-army-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-amber-400" />
            3-Month Forward C Leave Register & Forecast
          </h3>
          <p className="text-xs text-slate-400">
            Cadence Ledger: <strong>{UNIT_NAME}</strong> • 90-Day Periodic Cycle with Edit & Safe Deletion
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canModify() && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Register Entry</span>
            </button>
          )}

          <button
            onClick={fetchForecast}
            className="p-2 rounded-xl bg-tactical-900 border border-slate-800 text-slate-400 hover:text-white"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Columns: Month 1, Month 2, Month 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {forecast.map((col, idx) => (
          <div
            key={col.monthKey}
            className="rounded-2xl bg-tactical-900 border border-slate-800 p-4 space-y-3 flex flex-col justify-between shadow-tactical"
          >
            <div>
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                    Month {idx + 1}
                  </span>
                  <h4 className="text-sm font-black text-white font-mono">{col.month}</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {col.personnel.length} Due
                </span>
              </div>

              {/* Personnel Cards List */}
              <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1">
                {col.personnel.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs italic">
                    No soldiers due for C Leave in this month.
                  </div>
                ) : (
                  col.personnel.map((p: any) => (
                    <div
                      key={p.personnelId}
                      className="p-3 rounded-xl bg-tactical-950 border border-slate-800 hover:border-slate-700 transition-all text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <RankBadge rank={p.rank} />
                          <strong className="text-white">{p.name}</strong>
                        </div>
                        <span className="text-amber-400 font-mono text-[11px] font-bold">
                          {p.armyNumber}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Trade: <strong className="text-slate-300">{p.trade}</strong></span>
                        <span>Due: <strong className="text-amber-300">{p.dueDate}</strong></span>
                      </div>

                      <div className="text-[10px] text-slate-500 flex justify-between items-center pt-1 border-t border-slate-800/80">
                        <span>Last C Leave: {p.lastLeaveDate}</span>
                        {onSelectSoldierForLeave && (
                          <button
                            type="button"
                            onClick={() => onSelectSoldierForLeave(p.personnelId)}
                            className="text-army-400 hover:text-army-300 font-bold"
                          >
                            Sanction →
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EXACT 3 MONTHS REGISTER TABLE: | Personnel | Date | C Leave | Next Due | Status | Action | */}
      <div className="rounded-2xl bg-tactical-900 border border-slate-800 overflow-hidden shadow-tactical space-y-3 p-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              3 MONTHS CADENCE REGISTER
            </h4>
            <p className="text-xs text-slate-400">
              Complete unit register roll tracking 3-month cadence and next due dates
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-army-400">
            {registerEntries.length} REGISTERED SOLDIERS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-tactical-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3">Personnel</th>
                <th className="p-3">Date (Last Leave)</th>
                <th className="p-3 text-center">C Leave Days</th>
                <th className="p-3">Next Due</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {registerEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    No register entries found.
                  </td>
                </tr>
              ) : (
                registerEntries.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-tactical-800/40">
                    <td className="p-3 font-sans">
                      <div className="flex items-center space-x-2">
                        <RankBadge rank={row.rank} />
                        <div>
                          <strong className="text-white block">{row.name}</strong>
                          <span className="text-amber-400 font-mono text-[10px] font-bold">{row.armyNumber} • {row.trade}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-300">{row.lastLeaveDate}</td>
                    <td className="p-3 text-center font-bold text-emerald-400">{row.cLeaveDays} days</td>
                    <td className="p-3 font-bold text-amber-300">{row.dueDate}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.status === 'Overdue'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : row.status === 'Due in 15 Days'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-sans">
                      {canModify() ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Edit */}
                          <button
                            onClick={() => {
                              if (row.leaveId) {
                                setEditingLeaveRecord({
                                  id: row.leaveId,
                                  personnelId: row.personnelId,
                                  leaveType: 'C_LEAVE',
                                  startDate: row.lastLeaveDate,
                                  endDate: row.lastLeaveDate,
                                  reason: '3 Months Cadence Leave',
                                  status: 'RETURNED',
                                });
                              } else if (onSelectSoldierForLeave) {
                                onSelectSoldierForLeave(row.personnelId);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-tactical-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setEntryToDelete(row)}
                            className="p-1.5 rounded-lg bg-tactical-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete Register Entry"
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

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <Modal
          isOpen={Boolean(entryToDelete)}
          onClose={() => setEntryToDelete(null)}
          title="Delete 3 Months Register Record"
          subtitle="Are you sure you want to delete this register entry?"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 rounded-xl bg-tactical-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Personnel:</span>
                <span className="font-bold text-white">{entryToDelete.rank} {entryToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Army Number:</span>
                <span className="font-mono font-bold text-amber-300">{entryToDelete.armyNumber}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Last Leave Date:</span>
                <span className="font-mono text-slate-300">{entryToDelete.lastLeaveDate}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">C Leave Days:</span>
                <span className="font-mono text-emerald-400 font-bold">{entryToDelete.cLeaveDays} days</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Next Due Date:</span>
                <span className="font-mono text-amber-300 font-bold">{entryToDelete.dueDate}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-start space-x-2 text-[11px] text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Deleting this entry will recalculate next due dates, update C Leave Due and Overdue alerts, and refresh 3-month forecast schedules.
              </span>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 rounded-xl bg-tactical-800 text-slate-300 font-bold hover:bg-tactical-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteEntry}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50 flex items-center space-x-1.5 shadow-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Entry'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit / Add Modal */}
      {(editingLeaveRecord || showAddModal) && (
        <LeaveFormModal
          isOpen={Boolean(editingLeaveRecord || showAddModal)}
          onClose={() => {
            setEditingLeaveRecord(null);
            setShowAddModal(false);
          }}
          onSuccess={fetchForecast}
          leaveRecord={editingLeaveRecord}
        />
      )}
    </div>
  );
};
