import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar, NavTab } from './Sidebar';

interface AppLayoutProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ activeTab, onSelectTab, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-tactical-950 text-slate-100 flex flex-col font-sans overflow-x-hidden">
      <Navbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onNavigateToTab={(tab) => onSelectTab(tab as NavTab)}
      />

      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex overflow-x-hidden">
        <main className="flex-1 lg:pl-64 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
