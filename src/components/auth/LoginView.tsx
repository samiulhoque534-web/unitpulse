import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { APPOINTMENTS, UNIT_NAME, APP_NAME, APP_SUBTITLE } from '../../utils/constants';
import { AppointmentRole } from '../../types';
import { Shield, Lock, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { success, error } = useToast();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRole>('2IC');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      error('Authentication Error', 'Please enter your password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await login(selectedAppointment, password);
      success('Authentication Successful', `Logged in under appointment: ${selectedAppointment}`);
    } catch (err: any) {
      error('Login Failed', err.message || 'Invalid appointment password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-tactical-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Military Accents */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-army-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full rounded-2xl bg-tactical-900 border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2 pb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-army-600 to-tactical-900 border border-army-400/40 shadow-tactical mb-2">
            <Shield className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-white font-mono uppercase">
              {APP_NAME}
            </h1>
            <p className="text-xs font-mono font-bold text-amber-400 tracking-wide mt-0.5">
              {UNIT_NAME}
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {APP_SUBTITLE}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Appointment Selector */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-2">
              Select Military Appointment
            </label>
            <div className="grid grid-cols-2 gap-2">
              {APPOINTMENTS.map((app) => (
                <button
                  key={app.role}
                  type="button"
                  onClick={() => setSelectedAppointment(app.role)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    selectedAppointment === app.role
                      ? 'bg-army-950/80 border-army-500 text-white shadow-md ring-1 ring-army-500'
                      : 'bg-tactical-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-[13px]">{app.role}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{app.accessLevel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Appointment Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono placeholder-slate-500 focus:border-army-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold transition-all shadow-lg flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Access UnitPulse Terminal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security Notice */}
        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center font-mono">
          RESTRICTED — 55 FD AMB MILITARY UNIT TERMINAL
        </div>
      </div>
    </div>
  );
};
