import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditLog } from '../../types';
import { UNIT_NAME } from '../../utils/constants';
import { History, Search, Shield, RefreshCw } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs({
        search,
        action: selectedAction,
        appointment: selectedAppointment,
      });
      setLogs(res.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, selectedAction, selectedAppointment]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <History className="w-6 h-6 text-army-400" />
            Security Audit Trail & Governance Logs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit: <strong>{UNIT_NAME}</strong> • Immutable Military Accountability Trail
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-tactical-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search details, appointment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white placeholder-slate-500"
          />
        </div>

        <div>
          <select
            value={selectedAppointment}
            onChange={(e) => setSelectedAppointment(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-slate-300 font-semibold"
          >
            <option value="">All Appointments</option>
            <option value="CO">CO (Commanding Officer)</option>
            <option value="2IC">2IC (Second-in-Command)</option>
            <option value="DUTY_OFFICER">Duty Officer</option>
            <option value="DUTY_MUNSHI">Duty Munshi</option>
          </select>
        </div>

        <div>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-slate-300 font-semibold"
          >
            <option value="">All Actions</option>
            <option value="ASSIGN_DUTY">ASSIGN_DUTY</option>
            <option value="SAVE_PT_ATTENDANCE">SAVE_PT_ATTENDANCE</option>
            <option value="SAVE_GAMES_ATTENDANCE">SAVE_GAMES_ATTENDANCE</option>
            <option value="SANCTION_LEAVE">SANCTION_LEAVE</option>
            <option value="CREATE_PERSONNEL">CREATE_PERSONNEL</option>
            <option value="UPDATE_STATUS">UPDATE_STATUS</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-tactical-900 border border-slate-800 overflow-hidden shadow-tactical">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-tactical-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Appointment</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Action Executed</th>
                <th className="p-3.5">Module</th>
                <th className="p-3.5">Log Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-sans">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-army-400 mb-2" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-sans">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-tactical-800/40">
                    <td className="p-3.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-army-500/20 text-army-300 border border-army-500/30">
                        {l.appointment}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-white text-xs whitespace-nowrap">
                      {l.userDisplayName}
                    </td>
                    <td className="p-3.5 font-mono text-amber-300 font-bold text-xs whitespace-nowrap">
                      {l.action}
                    </td>
                    <td className="p-3.5 font-mono text-slate-400 text-xs">
                      {l.entityType}
                    </td>
                    <td className="p-3.5 text-slate-300 text-xs max-w-md break-words">
                      {l.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
