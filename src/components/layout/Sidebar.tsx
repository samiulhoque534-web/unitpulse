import React from 'react';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  CalendarCheck,
  Activity,
  CalendarRange,
  FileText,
  Shield,
  Scale,
  Crosshair,
  Dumbbell,
  History,
} from 'lucide-react';
import { AppointmentRole } from '../../types';
import { useAuth } from '../../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'personnel'
  | 'manpower'
  | 'duty'
  | 'duty_analytics'
  | 'pt'
  | 'games'
  | 'duty_vs_pt'
  | 'leave'
  | 'reports'
  | 'audit';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, isOpen, onClose }) => {
  const { user } = useAuth();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; roles?: AppointmentRole[] }[] = [
    { id: 'dashboard', label: 'Command Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'personnel', label: 'Personnel Database', icon: <Users className="w-4 h-4" /> },
    { id: 'manpower', label: 'Trade-wise Manpower', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'duty', label: 'Daily Duty Roster', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'duty_analytics', label: 'Duty Analytics & Fatigue', icon: <Scale className="w-4 h-4" /> },
    { id: 'pt', label: 'PT Management', icon: <Activity className="w-4 h-4" /> },
    { id: 'games', label: 'Games Management', icon: <Dumbbell className="w-4 h-4" /> },
    { id: 'duty_vs_pt', label: 'Duty vs PT/Games', icon: <Crosshair className="w-4 h-4" /> },
    { id: 'leave', label: 'Leave & 3-Month Forecast', icon: <CalendarRange className="w-4 h-4" /> },
    { id: 'reports', label: '16 Military Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Trail & Security', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container: Placed cleanly under main Navbar */}
      <aside
        className={`fixed top-14 bottom-0 left-0 z-30 w-64 bg-tactical-950/98 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onClose();
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === item.id
                  ? 'bg-army-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-tactical-900'
              }`}
            >
              <span className={activeTab === item.id ? 'text-white' : 'text-army-400'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer User Appointment Card */}
        <div className="p-3 border-t border-slate-800/80 bg-tactical-900/40">
          <div className="p-2.5 rounded-xl bg-tactical-950 border border-slate-800 text-xs">
            <div className="font-mono text-[10px] text-slate-500 uppercase font-bold">Logged In As</div>
            <div className="font-bold text-white truncate">{user?.displayName}</div>
            <div className="text-[10px] text-amber-400 font-mono">
              {user?.appointment === 'CO' ? 'Strict Read-Only Mode' : 'Read/Write Operations'}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
