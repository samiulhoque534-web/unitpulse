import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldAlert,
  CalendarCheck,
  Activity,
  CalendarRange,
  AlertTriangle,
  FileText,
  UserCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronRight,
  Scale,
  Moon,
  Dumbbell,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatCard } from '../common/StatCard';
import { NavTab } from '../layout/Sidebar';
import { UNIT_NAME, APP_NAME, APP_SUBTITLE } from '../../utils/constants';
import { DutyRecord } from '../../types';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [manpowerData, setManpowerData] = useState<any>(null);
  const [onDutyList, setOnDutyList] = useState<DutyRecord[]>([]);
  const [dutyStats, setDutyStats] = useState<any>(null);
  const [ptStats, setPtStats] = useState<any>(null);
  const [gamesStats, setGamesStats] = useState<any>(null);
  const [leaveReminders, setLeaveReminders] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const [mRes, onDutyRes, dRes, ptRes, gmRes, lRemRes] = await Promise.all([
        api.getManpowerDashboard(),
        api.getCurrentlyOnDuty(),
        api.getDutyAnalytics('monthly'),
        api.getPTAnalytics(),
        api.getGamesAnalytics(),
        api.getLeaveReminders(),
      ]);

      setManpowerData(mRes);
      setOnDutyList(onDutyRes.onDutyPersonnel);
      setDutyStats(dRes);
      setPtStats(ptRes);
      setGamesStats(gmRes);
      setLeaveReminders(lRemRes);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !manpowerData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-army-400 animate-spin" />
          <p className="text-xs font-mono text-slate-400">Loading Operational State for {UNIT_NAME}...</p>
        </div>
      </div>
    );
  }

  const s = manpowerData.summary;
  const fSummary = dutyStats?.summary?.fatigueSummary || { low: 0, moderate: 0, high: 0 };

  return (
    <div className="space-y-6">
      {/* 1. UNIT HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-tactical-900 via-tactical-900 to-army-950/70 border border-slate-800 p-6 shadow-tactical">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {UNIT_NAME}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                MILITARY UNIT OPERATIONAL COMMAND
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide mt-1 uppercase font-mono">
              {APP_NAME} COMMAND DASHBOARD
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {APP_SUBTITLE}
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('duty')}
              className="px-3.5 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Today's Duty Roster</span>
            </button>
            <button
              onClick={() => onNavigate('pt')}
              className="px-3.5 py-2 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-army-400" />
              <span>PT Attendance</span>
            </button>
            <button
              onClick={() => onNavigate('leave')}
              className="px-3.5 py-2 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <CalendarRange className="w-3.5 h-3.5 text-amber-400" />
              <span>3-Month Forecast</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="px-3.5 py-2 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>16 Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MASTER MANPOWER TILES */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            LIVE MANPOWER & PARADE STATE
          </h3>
          <button
            onClick={() => onNavigate('manpower')}
            className="text-xs font-semibold text-army-400 hover:text-army-300 flex items-center gap-1"
          >
            Trade-wise Breakdown <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <StatCard
            title="Authorized"
            value={s.authorized}
            percentage={100}
            subtitle="War Establishment"
            icon={<Users className="w-4 h-4 text-slate-300" />}
            color="slate"
            onClick={() => onNavigate('manpower')}
          />
          <StatCard
            title="Held"
            value={s.held}
            percentage={s.heldPercentage}
            subtitle="Organic Strength"
            icon={<Users className="w-4 h-4 text-blue-400" />}
            color="blue"
            onClick={() => onNavigate('manpower')}
          />
          <StatCard
            title="Present"
            value={s.present}
            percentage={s.presentPercentage}
            subtitle="In Unit Lines"
            icon={<UserCheck className="w-4 h-4 text-emerald-400" />}
            color="emerald"
            onClick={() => onNavigate('manpower')}
          />
          <StatCard
            title="TY Duty"
            value={s.tyDuty}
            subtitle="Outstation Tasks"
            icon={<Clock className="w-4 h-4 text-blue-400" />}
            color="blue"
            onClick={() => onNavigate('manpower')}
          />
          <StatCard
            title="Attachment"
            value={s.attachment}
            subtitle="Div/Bde Attachment"
            icon={<Award className="w-4 h-4 text-purple-400" />}
            color="purple"
            onClick={() => onNavigate('manpower')}
          />
          <StatCard
            title="On Leave"
            value={s.leave}
            subtitle="P/C/Med Leave"
            icon={<CalendarRange className="w-4 h-4 text-amber-400" />}
            color="amber"
            onClick={() => onNavigate('leave')}
          />
          <StatCard
            title="Effective Ready"
            value={s.effectiveAvailable}
            percentage={s.effectivePercentage}
            subtitle="Available for Duty"
            icon={<ShieldAlert className="w-4 h-4 text-emerald-400" />}
            color="emerald"
            onClick={() => onNavigate('manpower')}
          />
        </div>
      </div>

      {/* 3. CURRENT ACTIVE DUTY CLOCK & ON-DUTY LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Currently On Duty Panel */}
        <div className="lg:col-span-2 rounded-2xl bg-tactical-900 border border-slate-800 p-5 space-y-4 shadow-tactical">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>CURRENTLY ON DUTY</span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                    LIVE
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  Real-time status based on active shift timings for {format(new Date(), 'dd MMMM yyyy')}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('duty')}
              className="text-xs font-bold text-army-400 hover:text-army-300 flex items-center gap-1"
            >
              Full Roster <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {onDutyList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-sans">
                No personnel currently active on ground shift.
              </div>
            ) : (
              onDutyList.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-xl bg-tactical-950/80 border border-red-500/20 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span>{d.dutyType}</span>
                      <span className="text-slate-400 font-mono">({d.location})</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      <strong>{d.rank} {d.name}</strong> <span className="text-amber-400 font-mono">({d.armyNumber})</span> • <span className="text-slate-400">{d.trade}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-bold text-white text-xs">{d.startTime} - {d.endTime}</div>
                    <div className="text-[10px] text-emerald-400 font-bold">ACTIVE NOW</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* C Leave Reminders & Alert Widget */}
        <div className="rounded-2xl bg-tactical-900 border border-slate-800 p-5 flex flex-col justify-between shadow-tactical">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">C Leave Reminders</h4>
                  <p className="text-[11px] text-slate-400 font-mono">3-Month Cadence Tracker</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-tactical-800 text-slate-300">
                ALERTS
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-tactical-950/70 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-300 font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>C Leave Due in 15 Days</span>
                </div>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {leaveReminders?.counts?.dueIn15Days || 0}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-tactical-950/70 border border-rose-500/30 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-rose-300 font-bold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>C Leave Overdue</span>
                </div>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  {leaveReminders?.counts?.overdue || 0}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-tactical-950/70 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Currently on P/C/Med Leave:</span>
                <span className="font-mono font-bold text-white">{s.leave} Soldiers</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('leave')}
            className="mt-4 w-full py-2.5 rounded-xl bg-tactical-800 hover:bg-tactical-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1 border border-slate-700"
          >
            <span>Open 3-Month Forecast Board</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. TRADE-WISE MANPOWER BAR CHART & STATUS PIE CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trade-wise Manpower Bar Chart (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-tactical-900 border border-slate-800 p-5 space-y-4 shadow-tactical">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                TRADE-WISE MANPOWER ANALYSIS (55 FD AMB)
              </h4>
              <p className="text-[11px] text-slate-400">Held Strength vs. Present in Unit Lines</p>
            </div>
            <span className="text-[10px] font-mono text-army-400 font-bold">13 TRADES</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={manpowerData.tradeAnalysis} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="trade" stroke="#64748b" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="held" name="Held Strength" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="present" name="Present in Lines" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overall Manpower Status Pie Chart (1 col) */}
        <div className="rounded-2xl bg-tactical-900 border border-slate-800 p-5 space-y-4 shadow-tactical flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              MANPOWER DISPOSITION STATUS
            </h4>
            <p className="text-[11px] text-slate-400">Unit-Wide Strength Allocation</p>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={manpowerData.statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {manpowerData.statusPieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-slate-800">
            {manpowerData.statusPieData.map((item: any) => (
              <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-tactical-950/60">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <strong className="text-white">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. OPERATIONAL READINESS METRICS: DUTY, FATIGUE, PT & GAMES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Monthly Duty & Night Duty */}
        <div className="p-5 rounded-2xl bg-tactical-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-blue-400" />
              Duty Operations
            </span>
            <span className="text-[10px] font-mono text-slate-400">30 DAYS</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Duties:</span>
              <strong className="text-white">{dutyStats?.summary?.totalDuties || 0}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Hours:</span>
              <strong className="text-white">{dutyStats?.summary?.totalHours || 0}h</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">Night Duties (22-06h):</span>
              <strong className="text-purple-300">{dutyStats?.summary?.totalNightDuties || 0}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Night Duty Hours:</span>
              <strong className="text-purple-300">{dutyStats?.summary?.totalNightHours || 0}h</strong>
            </div>
          </div>
        </div>

        {/* Metric 2: Fatigue Index Distribution */}
        <div className="p-5 rounded-2xl bg-tactical-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-400" />
              Fatigue Index
            </span>
            <span className="text-[10px] font-mono text-slate-400">WORKLOAD</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 font-bold">
              <span>Low Fatigue:</span>
              <span>{fSummary.low} Soldiers</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-300 font-bold">
              <span>Moderate Fatigue:</span>
              <span>{fSummary.moderate} Soldiers</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300 font-bold">
              <span>High Fatigue:</span>
              <span>{fSummary.high} Soldiers</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Physical Training (PT) Attendance */}
        <div className="p-5 rounded-2xl bg-tactical-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              PT Attendance
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">FITNESS</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Weekly PT Rate:</span>
              <strong className="text-emerald-400">{ptStats?.unitRates?.weekly || 95}%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Monthly PT Rate:</span>
              <strong className="text-white">{ptStats?.unitRates?.monthly || 92}%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Yearly Standard:</span>
              <strong className="text-white">{ptStats?.unitRates?.yearly || 93}%</strong>
            </div>
          </div>
        </div>

        {/* Metric 4: Evening Games Attendance */}
        <div className="p-5 rounded-2xl bg-tactical-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-blue-400" />
              Games & Sports
            </span>
            <span className="text-[10px] font-mono text-blue-400 font-bold">SPORTS</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Weekly Games Rate:</span>
              <strong className="text-blue-400">{gamesStats?.unitRates?.weekly || 90}%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Monthly Games Rate:</span>
              <strong className="text-white">{gamesStats?.unitRates?.monthly || 88}%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Yearly Standard:</span>
              <strong className="text-white">{gamesStats?.unitRates?.yearly || 89}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
