import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { RankBadge } from '../common/Badge';
import { UNIT_NAME } from '../../utils/constants';
import {
  Trophy,
  Save,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';

export const GamesView: React.FC = () => {
  const { canModify, hasAppointment } = useAuth();
  const { success, error } = useToast();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sheet, setSheet] = useState<any[]>([]);
  const [nonPresentWithRecords, setNonPresentWithRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'daily' | 'analytics'>('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      const [sheetRes, anaRes] = await Promise.all([
        api.getDailyGamesSheet(date),
        api.getGamesAnalytics(),
      ]);
      setSheet(sheetRes.sheet);
      setNonPresentWithRecords(sheetRes.nonPresentWithRecords || []);
      setSummary(sheetRes.summary);
      setAnalytics(anaRes);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, [date]);

  const handleUpdateRecord = (personnelId: string, field: 'status' | 'remarks', value: any) => {
    setSheet((prev) =>
      prev.map((item) => (item.personnelId === personnelId ? { ...item, [field]: value } : item))
    );
  };

  const handleMarkAllPresent = () => {
    setSheet((prev) => prev.map((item) => ({ ...item, status: 'PRESENT' })));
  };

  const handleSaveSheet = async () => {
    setIsSaving(true);
    try {
      await api.saveDailyGamesSheet({ date, records: sheet });
      success('Games Attendance Saved', `Logged Games attendance for ${sheet.length} present personnel on ${date}`);
      fetchGames();
    } catch (err: any) {
      error('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSheet = sheet.filter((row) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      row.armyNumber.toLowerCase().includes(term) ||
      row.name.toLowerCase().includes(term) ||
      row.rank.toLowerCase().includes(term) ||
      row.trade.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <Trophy className="w-6 h-6 text-army-400" />
            Games & Sports Attendance Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit: <strong>{UNIT_NAME}</strong> • Strict Eligibility: <strong>Only "PRESENT" Personnel Selectable</strong>
          </p>
        </div>

        <div className="p-1 rounded-xl bg-tactical-900 border border-slate-700 flex items-center space-x-1 text-xs">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'daily' ? 'bg-army-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Daily Games Sheet
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'analytics' ? 'bg-army-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Games Analytics
          </button>
        </div>
      </div>

      {/* Tab 1: Daily Games Sheet */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Ineligible Personnel Flagged Alert Banner */}
          {nonPresentWithRecords.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2">
              <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs font-mono">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>INELIGIBILITY ALERT: {nonPresentWithRecords.length} SOLDIER(S) PREVIOUSLY LOGGED ARE NO LONGER "PRESENT"</span>
              </div>
              <div className="space-y-1 text-xs text-rose-200">
                {nonPresentWithRecords.map((np) => (
                  <div key={np.personnelId} className="flex items-center space-x-2">
                    <span className="font-mono text-amber-300 font-bold">{np.armyNumber}</span>
                    <span>{np.rank} {np.name}:</span>
                    <span className="italic">{np.warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Bar: Date, Search, Batch Actions, Save */}
          <div className="p-4 rounded-2xl bg-tactical-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
                />
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Army No / Name / Rank / Trade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-tactical-950 border border-slate-700 text-white placeholder-slate-500 text-xs w-60"
                />
              </div>

              <span className="text-slate-400 font-mono text-xs">
                Eligible Personnel: <strong className="text-white font-bold">{sheet.length} Soldiers</strong>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {canModify() && hasAppointment(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']) && (
                <>
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="px-3 py-1.5 rounded-xl bg-tactical-800 hover:bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 font-bold"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSheet}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold flex items-center space-x-1.5 shadow-lg"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Games Sheet'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Daily Participation Summary */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-tactical-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Games Rate</span>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">{summary.participationPct}%</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{summary.presentCount} / {summary.totalEligible} Present</div>
              </div>

              <div className="p-3.5 rounded-xl bg-tactical-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Excused (Duty)</span>
                <div className="text-2xl font-black text-blue-400 font-mono mt-0.5">{summary.excusedDutyCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Post Guard Detail</div>
              </div>

              <div className="p-3.5 rounded-xl bg-tactical-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Excused (Medical)</span>
                <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">{summary.excusedMedCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">MI Room Medical Cover</div>
              </div>

              <div className="p-3.5 rounded-xl bg-tactical-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Unexcused Absences</span>
                <div className="text-2xl font-black text-rose-400 font-mono mt-0.5">{summary.absentCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Administrative Follow-up</div>
              </div>
            </div>
          )}

          {/* Dynamic Games Sheet Table */}
          <div className="rounded-2xl bg-tactical-900 border border-slate-800 overflow-hidden shadow-tactical">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-tactical-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Army Number</th>
                    <th className="p-3.5">Rank & Name</th>
                    <th className="p-3.5">Trade</th>
                    <th className="p-3.5">Appointment</th>
                    <th className="p-3.5">Games Status</th>
                    <th className="p-3.5">Remarks / Sport</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-army-400 mb-2" />
                        <span>Loading daily Games sheet...</span>
                      </td>
                    </tr>
                  ) : filteredSheet.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500">
                        No eligible present personnel found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSheet.map((row) => (
                      <tr key={row.personnelId} className="hover:bg-tactical-800/40">
                        <td className="p-3.5 font-mono font-bold text-amber-300">{row.armyNumber}</td>
                        <td className="p-3.5">
                          <div className="flex items-center space-x-1.5">
                            <RankBadge rank={row.rank} />
                            <strong className="text-white">{row.name}</strong>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-army-400 font-bold">{row.trade}</td>
                        <td className="p-3.5 text-slate-300">{row.appointment}</td>
                        <td className="p-3.5">
                          {canModify() && hasAppointment(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']) ? (
                            <select
                              value={row.status}
                              onChange={(e) => handleUpdateRecord(row.personnelId, 'status', e.target.value)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono border ${
                                row.status === 'PRESENT'
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                  : row.status === 'EXCUSED_DUTY'
                                  ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                                  : row.status === 'EXCUSED_MEDICAL'
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              <option value="PRESENT">PRESENT</option>
                              <option value="EXCUSED_DUTY">EXCUSED (DUTY)</option>
                              <option value="EXCUSED_MEDICAL">EXCUSED (MEDICAL)</option>
                              <option value="ABSENT">ABSENT</option>
                            </select>
                          ) : (
                            <span className="font-mono font-bold text-white">{row.status}</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {canModify() && hasAppointment(['2IC', 'DUTY_OFFICER', 'DUTY_MUNSHI']) ? (
                            <input
                              type="text"
                              placeholder="Football / Volleyball / Remarks..."
                              value={row.remarks}
                              onChange={(e) => handleUpdateRecord(row.personnelId, 'remarks', e.target.value)}
                              className="w-full px-2 py-1 rounded-lg bg-tactical-950 border border-slate-700 text-white placeholder-slate-600 text-xs"
                            />
                          ) : (
                            <span className="text-slate-400 italic">{row.remarks || '-'}</span>
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

      {/* Tab 2: Games Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-tactical-900 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-bold uppercase">7-Day Games Attendance</span>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-1">{analytics.weeklyRate}%</div>
            </div>
            <div className="p-5 rounded-2xl bg-tactical-900 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-bold uppercase">30-Day Games Attendance</span>
              <div className="text-3xl font-black text-blue-400 font-mono mt-1">{analytics.monthlyRate}%</div>
            </div>
            <div className="p-5 rounded-2xl bg-tactical-900 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-bold uppercase">Yearly Cumulative Rate</span>
              <div className="text-3xl font-black text-purple-400 font-mono mt-1">{analytics.yearlyRate}%</div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="rounded-2xl bg-tactical-900 border border-slate-800 p-5 space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Top 5 Consistent Games Participants (30-Day Rate)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-tactical-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Rank</th>
                    <th className="p-3">Army No</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Trade</th>
                    <th className="p-3 text-center">Participation %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {analytics.topPerformers.map((p: any, idx: number) => (
                    <tr key={p.id} className="hover:bg-tactical-800/40">
                      <td className="p-3 font-bold text-amber-400">#{idx + 1}</td>
                      <td className="p-3 text-white font-bold">{p.armyNumber}</td>
                      <td className="p-3 font-sans text-slate-200">{p.rank} {p.name}</td>
                      <td className="p-3 text-army-400 font-bold">{p.trade}</td>
                      <td className="p-3 text-center text-emerald-400 font-bold">{p.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
