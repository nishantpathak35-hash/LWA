'use client';

import React, { useState } from 'react';
import { useAppState } from './StateProvider';
import Sidebar from './Sidebar';
import DashboardView from './views/DashboardView';
import ProjectsView from './views/ProjectsView';
import VendorsView from './views/VendorsView';
import POsView from './views/POsView';
import PaymentsView from './views/PaymentsView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import { Menu, Sun, Moon } from 'lucide-react';
import { Button } from './ui/core';

export default function MainLayout() {
  const { activeView } = useAppState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    // In a real application, you might toggle document classes.
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'projects':
        return <ProjectsView />;
      case 'vendors':
        return <VendorsView />;
      case 'pos':
        return <POsView />;
      case 'payments':
        return <PaymentsView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Mobile Sidebar Toggle Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main content frame */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Header/Topbar */}
        <header className="h-16 px-6 border-b border-slate-900/60 bg-slate-950/40 backdrop-blur-md flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5 text-slate-400" />
            </Button>
            <h1 className="text-sm font-medium text-slate-200 capitalize font-serif tracking-wider">
              {activeView === 'pos' ? 'Purchase Orders' : activeView}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-slate-400 hover:text-slate-200" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-slate-400 hover:text-slate-200" />
              )}
            </Button>
          </div>
        </header>

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950/20">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
}
