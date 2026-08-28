import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UNIT_NAME, APP_NAME, APPOINTMENTS } from '../../utils/constants';
import { AppointmentRole, DutyRecord } from '../../types';
import { api } from '../../services/api';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import {
  Shield,
  Clock,
  User,
  Key,
  LogOut,
  ChevronDown,
  Activity,
  Menu,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigateToTab }) => {
  const { user, logout, switchAppointment } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [onDutyCount, setOnDutyCount] = useState(0);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Live Real-Time Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch On-Duty Count periodically
  useEffect(() => {
    const fetchOnDuty = async () => {
      try {
        const res = await api.getCurrentlyOnDuty();
        setOnDutyCount(res.total);
      } catch (e) {}
    };
    fetchOnDuty();
    const interval = setInterval(fetchOnDuty, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-tactical-950/95 border-b border-slate-800 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-tactical">
        {/* Left: Mobile Toggle, Brand & Unit Header */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-tactical-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-army-600 via-army-700 to-tactical-900 border border-army-400/40 shadow-lg text-white">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black tracking-wider text-white font-mono uppercase">
                {APP_NAME}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {UNIT_NAME}
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-400 font-medium tracking-wide">
              Personnel, Manpower, Duty & Leave Management System
            </p>
          </div>
        </div>

        {/* Center/Right: Live Clock, Active On-Duty Counter, Appointment Menu */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Real-time Clock */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-tactical-900/80 border border-slate-800 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">{format(currentTime, 'EEE, dd MMM yyyy')}</span>
            <span className="text-army-400 font-bold">{format(currentTime, 'HH:mm:ss')}</span>
          </div>

          {/* Currently On-Duty Badge */}
          <button
            onClick={() => onNavigateToTab && onNavigateToTab('duty')}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-tactical-900 border border-red-500/30 text-xs hover:border-red-500/60 transition-all shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold text-white font-mono">{onDutyCount} ON DUTY</span>
          </button>

          {/* Appointment Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-tactical-900 border border-slate-700/80 hover:border-slate-500 text-left transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-army-600/30 border border-army-500/50 flex items-center justify-center text-[10px] font-bold text-army-300 font-mono">
                {user?.appointment || '2IC'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-white leading-tight">
                  {user?.displayName || 'Second-in-Command'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {user?.appointment === 'CO' ? 'Read-Only Oversight' : 'Operational Access'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-tactical-900 border border-slate-700 shadow-2xl z-50 p-2 text-xs animate-slide-in">
                <div className="p-2 border-b border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Current Appointment</div>
                  <div className="font-bold text-white text-sm">{user?.displayName}</div>
                  <div className="text-[11px] text-army-400 font-mono">{UNIT_NAME}</div>
                </div>

                <div className="py-2 space-y-1">
                  <div className="text-[10px] font-mono text-slate-500 uppercase px-2 font-bold">Switch Appointment Role</div>
                  {APPOINTMENTS.map((app) => (
                    <button
                      key={app.role}
                      onClick={() => {
                        switchAppointment(app.role);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-colors ${
                        user?.appointment === app.role
                          ? 'bg-army-950/80 text-white font-bold border border-army-500/40'
                          : 'text-slate-300 hover:bg-tactical-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{app.title}</div>
                        <div className="text-[10px] text-slate-400">{app.accessLevel}</div>
                      </div>
                      {user?.appointment === app.role && <CheckCircle2 className="w-4 h-4 text-army-400" />}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      setShowPasswordModal(true);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-tactical-800 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Change Appointment Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {showPasswordModal && (
        <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
};
