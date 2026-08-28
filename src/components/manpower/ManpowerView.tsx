import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatCard } from '../common/StatCard';
import { RankBadge, StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { UNIT_NAME } from '../../utils/constants';
import {
  Users,
  UserCheck,
  Clock,
  Award,
  CalendarRange,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Edit3,
  Save,
  CheckCircle2,
  Sliders,
  Info,
  HelpCircle,
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

export const ManpowerView: React.FC = () => {
  const { canModify, hasAppointment } = useAuth();
  const { success, error } = useToast();

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Overall Authorized Modal State
  const [showEditOverallModal, setShowEditOverallModal] = useState(false);
  const [overallAuthInput, setOverallAuthInput] = useState<number>(120);
  const [isSavingOverall, setIsSavingOverall] = useState(false);

  // Trade Authorized Modal State
  const [showEditTradeModal, setShowEditTradeModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<string>('');
  const [tradeAuthInput, setTradeAuthInput] = useState<number>(15);
  const [isSavingTrade, setIsSavingTrade] = useState(false);

  // Absent Breakdown Modal State
  const [selectedAbsentTrade, setSelectedAbsentTrade] = useState<any | null>(null);

  const fetchManpower = async () => {
    setIsLoading(true);
    try {
      const res = await api.getManpowerDashboard();
      setData(res);
      setOverallAuthInput(res.summary.overallAuthorized || res.summary.authorized);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchManpower();
  }, []);

  const handleSaveOverallAuthorized = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overallAuthInput || overallAuthInput <= 0) {
      error('Validation Error', 'Please enter a valid positive number for Overall Authorized Manpower.');
      return;
    }

    setIsSavingOverall(true);
    try {
      await api.updateAuthorizedManpower(overallAuthInput);
      success('Overall Authorized Strength Updated', `Overall Authorized Manpower set to ${overallAuthInput}`);
      setShowEditOverallModal(false);
      fetchManpower();
    } catch (err: any) {
      error('Update Failed', err.message);
    } finally {
      setIsSavingOverall(false);
    }
  };

  const handleOpenEditTrade = (tradeName: string, currentAuth: number) => {
    setEditingTrade(tradeName);
    setTradeAuthInput(currentAuth);
    setShowEditTradeModal(true);
  };

  const handleSaveTradeAuthorized = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tradeAuthInput === undefined || tradeAuthInput < 0) {
      error('Validation Error', 'Please enter a valid non-negative number for Trade Authorized Manpower.');
      return;
    }

    setIsSavingTrade(true);
    try {
      await api.updateTradeAuthorized({ trade: editingTrade, authorized: tradeAuthInput });
      success('Trade Authorized Updated', `Authorized Manpower for trade "${editingTrade}" set to ${tradeAuthInput}`);
      setShowEditTradeModal(false);
      
      // Update local state immediately for instant graph and table reactivity
      if (data && data.tradeAnalysis) {
        const updatedTradeAnalysis = data.tradeAnalysis.map((t: any) => {
          if (t.trade === editingTrade) {
            const updatedAuth = tradeAuthInput;
            const updatedSurplus = Math.max(0, t.held - updatedAuth);
            const updatedPct = updatedAuth > 0 ? Math.round((t.held / updatedAuth) * 100) : 0;
            return {
              ...t,
              authorized: updatedAuth,
              surplus: updatedSurplus,
              percentage: updatedPct,
              heldPercentage: updatedPct,
            };
          }
          return t;
        });

        const newTradeSum = updatedTradeAnalysis.reduce((acc: number, t: any) => acc + (t.authorized || 0), 0);

        setData({
          ...data,
          summary: {
            ...data.summary,
            tradeAuthorizedSum: newTradeSum,
          },
          tradeAnalysis: updatedTradeAnalysis,
        });
      }
      
      fetchManpower();
    } catch (err: any) {
      error('Update Failed', err.message);
    } finally {
      setIsSavingTrade(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-army-400 animate-spin" />
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-army-400" />
            Trade-wise Manpower & Parade State Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit: <strong>{UNIT_NAME}</strong> • <strong>AUTHORIZED vs HELD vs PRESENT vs SURPLUS</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {canModify() && hasAppointment(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']) && (
            <button
              onClick={() => {
                setOverallAuthInput(s.overallAuthorized || s.authorized);
                setShowEditOverallModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md"
            >
              <Sliders className="w-3.5 h-3.5 text-army-400" />
              <span>Configure Overall War Establishment</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard
          title="Overall Authorized"
          value={s.overallAuthorized || s.authorized}
          percentage={100}
          subtitle={`Trade Sum: ${s.tradeAuthorizedSum || s.authorized}`}
          icon={<Users className="w-4 h-4 text-slate-300" />}
          color="slate"
        />
        <StatCard
          title="Held Strength"
          value={s.held}
          percentage={s.heldPercentage}
          subtitle={`Shortage: ${s.shortageHeld || 0}`}
          icon={<Users className="w-4 h-4 text-blue-400" />}
          color="blue"
        />
        <StatCard
          title="Present in Lines"
          value={s.present}
          percentage={s.presentPercentage}
          subtitle={`Shortage: ${s.shortagePresent || 0}`}
          icon={<UserCheck className="w-4 h-4 text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          title="TY Duty"
          value={s.tyDuty}
          subtitle="Outstation Tasks"
          icon={<Clock className="w-4 h-4 text-blue-400" />}
          color="blue"
        />
        <StatCard
          title="Attachment"
          value={s.attachment}
          subtitle="Div/Bde Attachment"
          icon={<Award className="w-4 h-4 text-purple-400" />}
          color="purple"
        />
        <StatCard
          title="On Leave"
          value={s.leave}
          subtitle="P/C/Med Leave"
          icon={<CalendarRange className="w-4 h-4 text-amber-400" />}
          color="amber"
        />
        <StatCard
          title="Effective Ready"
          value={s.effectiveAvailable}
          percentage={s.effectivePercentage}
          subtitle="Available for Duty"
          icon={<ShieldAlert className="w-4 h-4 text-emerald-400" />}
          color="emerald"
        />
      </div>

      {/* Trade-wise Manpower Analysis Bar Chart & Table */}
      <div className="rounded-2xl bg-tactical-900 border border-slate-800 p-5 space-y-5 shadow-tactical">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-2">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              TRADE-WISE MANPOWER ANALYSIS (55 FD AMB)
            </h4>
            <p className="text-xs text-slate-400">
              Comparative Analysis: <strong>Authorized vs Held vs Present vs Absent vs Surplus</strong> across 13 Specialized Trades
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-300">
              Trade Authorized Sum: <strong className="text-white font-bold">{s.tradeAuthorizedSum || s.authorized}</strong>
            </span>
            <span className="text-xs font-mono font-bold text-army-400">13 SPECIALIZED TRADES</span>
          </div>
        </div>

        {/* Live Recharts Bar Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.tradeAnalysis} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <XAxis dataKey="trade" stroke="#64748b" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="authorized" name="Authorized Strength" fill="#64748b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="held" name="Held Strength" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="present" name="Present in Unit Lines" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* EXACT TRADE-WISE TABLE: Trade | Authorized | Held | Present | Absent | Surplus | Percentage */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-tactical-950 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3 font-sans">Trade</th>
                <th className="p-3 text-center text-slate-300">Authorized</th>
                <th className="p-3 text-center text-blue-400">Held</th>
                <th className="p-3 text-center text-emerald-400">Present</th>
                <th className="p-3 text-center text-amber-400">Absent</th>
                <th className="p-3 text-center text-purple-400">Surplus</th>
                <th className="p-3 text-center text-white">Percentage</th>
                <th className="p-3 text-right font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.tradeAnalysis.map((t: any) => (
                <tr key={t.trade} className="hover:bg-tactical-800/40">
                  <td className="p-3 font-bold text-white font-sans">{t.trade}</td>
                  <td className="p-3 text-center text-slate-200 font-bold bg-tactical-950/60">{t.authorized}</td>
                  <td className="p-3 text-center font-bold text-blue-400">{t.held}</td>
                  <td className="p-3 text-center font-bold text-emerald-400">{t.present}</td>
                  <td className="p-3 text-center">
                    {t.absent > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedAbsentTrade(t)}
                        className="px-2 py-0.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 font-bold transition-all inline-flex items-center gap-1 shadow-sm"
                        title="Click to view absent breakdown"
                      >
                        <span>{t.absent}</span>
                        <Info className="w-3 h-3 text-amber-400" />
                      </button>
                    ) : (
                      <span className="text-slate-500 font-bold">0</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-bold text-purple-300">
                    {t.surplus > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-500/30">
                        +{t.surplus}
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.percentage >= 100 ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' :
                      t.percentage >= 75 ? 'bg-blue-950/40 text-blue-300 border border-blue-500/30' :
                      t.percentage >= 50 ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30' :
                      'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                    }`}>
                      {t.percentage}%
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {canModify() && hasAppointment(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']) ? (
                      <button
                        onClick={() => handleOpenEditTrade(t.trade, t.authorized)}
                        className="px-2.5 py-1 rounded-lg bg-tactical-800 hover:bg-army-600 text-slate-300 hover:text-white font-sans font-bold text-[11px] transition-all inline-flex items-center gap-1 border border-slate-700"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Authorized</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 font-mono text-[10px]">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Non-Present Accountability Nominal Roll */}
      <div className="rounded-2xl bg-tactical-900 border border-slate-800 p-5 space-y-4 shadow-tactical">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Accountability Nominal Roll of Non-Present Personnel
            </h4>
            <p className="text-xs text-slate-400">
              Personnel away on TY Duty, Division Attachment, Sanctioned Leave, or Course
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400">
            {data.awayPersonnel.length} Soldiers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-tactical-950 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Army No</th>
                <th className="p-3">Rank & Name</th>
                <th className="p-3">Trade</th>
                <th className="p-3">Appointment</th>
                <th className="p-3">Status</th>
                <th className="p-3">Official Reason / Detachment Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {data.awayPersonnel.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    All organic strength currently present in unit lines.
                  </td>
                </tr>
              ) : (
                data.awayPersonnel.map((p: any) => (
                  <tr key={p.id} className="hover:bg-tactical-800/40">
                    <td className="p-3 font-mono font-bold text-amber-300">{p.armyNumber}</td>
                    <td className="p-3">
                      <div className="flex items-center space-x-1.5">
                        <RankBadge rank={p.rank} />
                        <strong className="text-white">{p.name}</strong>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-army-400 font-bold">{p.trade}</td>
                    <td className="p-3 text-slate-300">{p.appointment}</td>
                    <td className="p-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="p-3 text-slate-400 italic">{p.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ABSENT STATUS BREAKDOWN MODAL */}
      {selectedAbsentTrade && (
        <Modal
          isOpen={Boolean(selectedAbsentTrade)}
          onClose={() => setSelectedAbsentTrade(null)}
          title={`Absent Status Breakdown — Trade: ${selectedAbsentTrade.trade}`}
          subtitle={`Total Absent: ${selectedAbsentTrade.absent} Soldiers (Held: ${selectedAbsentTrade.held}, Present: ${selectedAbsentTrade.present})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Category Counts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-center">
                <span className="text-[10px] text-amber-300 font-bold uppercase">Leave</span>
                <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
                  {selectedAbsentTrade.absentBreakdown?.leave || 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-center">
                <span className="text-[10px] text-blue-300 font-bold uppercase">Course / Trg</span>
                <div className="text-xl font-black text-blue-400 font-mono mt-0.5">
                  {selectedAbsentTrade.absentBreakdown?.course || 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-center">
                <span className="text-[10px] text-indigo-300 font-bold uppercase">TY Duty</span>
                <div className="text-xl font-black text-indigo-400 font-mono mt-0.5">
                  {selectedAbsentTrade.absentBreakdown?.tyDuty || 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-center">
                <span className="text-[10px] text-purple-300 font-bold uppercase">Attachment</span>
                <div className="text-xl font-black text-purple-400 font-mono mt-0.5">
                  {selectedAbsentTrade.absentBreakdown?.attachment || 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-center">
                <span className="text-[10px] text-rose-300 font-bold uppercase">Hospital / CMH</span>
                <div className="text-xl font-black text-rose-400 font-mono mt-0.5">
                  {selectedAbsentTrade.absentBreakdown?.hospital || 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Other Absence</span>
                <div className="text-xl font-black text-slate-300 font-mono mt-0.5">
                  {selectedAbsentTrade.absentBreakdown?.other || 0}
                </div>
              </div>
            </div>

            {/* List of Absent Personnel in this Trade */}
            <div className="space-y-2">
              <h5 className="font-bold text-white uppercase text-[11px] font-mono">
                Absent Personnel Nominal Roll ({selectedAbsentTrade.trade})
              </h5>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/80">
                {selectedAbsentTrade.absentBreakdown?.personnel?.length > 0 ? (
                  selectedAbsentTrade.absentBreakdown.personnel.map((p: any) => (
                    <div key={p.id} className="p-2.5 bg-tactical-950 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-amber-300 font-bold text-[11px]">{p.armyNumber}</span>
                          <span className="text-white font-bold">{p.rank} {p.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 italic mt-0.5">{p.reason}</div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500 italic">No absent records found.</div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedAbsentTrade(null)}
                className="px-4 py-2 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT OVERALL AUTHORIZED MODAL */}
      {showEditOverallModal && (
        <Modal
          isOpen={showEditOverallModal}
          onClose={() => setShowEditOverallModal(false)}
          title="Configure Overall Authorized War Establishment"
          subtitle={`${UNIT_NAME} • Authorized Manpower Setting`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveOverallAuthorized} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                Overall Authorized Manpower (Total Unit Strength) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={overallAuthInput}
                onChange={(e) => setOverallAuthInput(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white text-sm font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Currently configured: <strong>{s.overallAuthorized || s.authorized}</strong>. Current Held: <strong>{s.held}</strong>.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditOverallModal(false)}
                className="px-4 py-2 rounded-xl bg-tactical-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingOverall}
                className="px-5 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold disabled:opacity-50 flex items-center space-x-1.5 shadow-lg"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingOverall ? 'Saving...' : 'Save Authorized Manpower'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT TRADE AUTHORIZED MODAL */}
      {showEditTradeModal && (
        <Modal
          isOpen={showEditTradeModal}
          onClose={() => setShowEditTradeModal(false)}
          title={`Edit Authorized Strength — Trade: ${editingTrade}`}
          subtitle={`${UNIT_NAME} • Trade-wise War Establishment`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveTradeAuthorized} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                Authorized Strength for {editingTrade} *
              </label>
              <input
                type="number"
                min="0"
                required
                value={tradeAuthInput}
                onChange={(e) => setTradeAuthInput(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white text-sm font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Current Held in {editingTrade}: <strong>{data.tradeAnalysis.find((t: any) => t.trade === editingTrade)?.held || 0}</strong> soldiers.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditTradeModal(false)}
                className="px-4 py-2 rounded-xl bg-tactical-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingTrade}
                className="px-5 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold disabled:opacity-50 flex items-center space-x-1.5 shadow-lg"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingTrade ? 'Saving...' : 'Save Trade Strength'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
