import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { NavTab } from './components/layout/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { PersonnelView } from './components/personnel/PersonnelView';
import { ManpowerView } from './components/manpower/ManpowerView';
import { DutyView } from './components/duty/DutyView';
import { DutyAnalyticsView } from './components/analytics/DutyAnalyticsView';
import { PTView } from './components/pt/PTView';
import { GamesView } from './components/games/GamesView';
import { DutyVsPTGamesView } from './components/analytics/DutyVsPTGamesView';
import { LeaveView } from './components/leave/LeaveView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RefreshCw } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tactical-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-10 h-10 text-army-400 animate-spin" />
          <p className="text-xs font-mono text-slate-400">Initializing UNITPULSE Terminal (55 Fd Amb)...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <AppLayout activeTab={activeTab} onSelectTab={setActiveTab}>
      <ErrorBoundary fallbackTitle="UnitPulse View Error">
        {activeTab === 'dashboard' && <DashboardView onNavigate={(t) => setActiveTab(t)} />}
        {activeTab === 'personnel' && <PersonnelView />}
        {activeTab === 'manpower' && <ManpowerView />}
        {activeTab === 'duty' && <DutyView />}
        {activeTab === 'duty_analytics' && <DutyAnalyticsView />}
        {activeTab === 'pt' && <PTView />}
        {activeTab === 'games' && <GamesView />}
        {activeTab === 'duty_vs_pt' && <DutyVsPTGamesView />}
        {activeTab === 'leave' && <LeaveView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'audit' && <AuditLogsView />}
      </ErrorBoundary>
    </AppLayout>
  );
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ErrorBoundary fallbackTitle="Application Crash Guard">
          <MainAppContent />
        </ErrorBoundary>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
