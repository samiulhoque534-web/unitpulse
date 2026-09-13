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
  X,
  LogOut,
} from 'lucide-react';
import { AppointmentRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { UNIT_NAME, APP_NAME } from '../../utils/constants';

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

export const navItems: { id: NavTab; label: string; icon: React.ReactNode; roles?: AppointmentRole[] }[] = [
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

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.appointment))
  );

  return (
    <>
      {/* Mobile Backdrop: Closes drawer when tapped outside */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 animate-fade-in"
        />
      )}

      {/* Sidebar Container: Full-height Drawer on mobile (z-50), docked sidebar on desktop (lg:z-30) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-tactical-950 border-r border-slate-800 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out lg:top-14 lg:bottom-0 lg:z-30 lg:w-64 lg:max-w-none lg:shadow-none lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Drawer Header: Visible only on mobile (< lg) */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-tactical-950/90 lg:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-army-600 to-tactical-900 border border-army-400/40 text-white shadow-sm">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-black tracking-wider text-white font-mono uppercase">
                {APP_NAME}
              </div>
              <div className="text-[10px] font-bold font-mono text-amber-400 leading-none">
                {UNIT_NAME}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-tactical-900 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Navigation Links: Cleanly scrollable on any mobile screen */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onClose();
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                activeTab === item.id
                  ? 'bg-army-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-tactical-900'
              }`}
            >
              <span className={activeTab === item.id ? 'text-white' : 'text-army-400'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer User Appointment Card & Quick Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-tactical-900/40 space-y-2">
          <div className="p-2.5 rounded-xl bg-tactical-950 border border-slate-800 text-xs">
            <div className="font-mono text-[10px] text-slate-500 uppercase font-bold">Logged In As</div>
            <div className="font-bold text-white truncate">{user?.displayName}</div>
            <div className="text-[10px] text-amber-400 font-mono">
              {user?.appointment === 'CO' ? 'Strict Read-Only Mode' : 'Read/Write Operations'}
            </div>
          </div>

          {/* Quick Sign Out for Mobile Drawer */}
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/30 transition-colors lg:hidden min-h-[40px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
