'use client';

import React, { useState, useEffect } from 'react';
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
import { CommandPalette } from './ui/CommandPalette';

const VIEW_FEATURE_MAP = {
  dashboard: 'dashboard',
  projects: 'projects',
  vendors: 'vendors',
  pos: 'purchase_orders',
  payments: 'payments',
  reports: 'reports',
  settings: 'settings'
};

const ORDERED_VIEWS = ['dashboard', 'projects', 'vendors', 'pos', 'payments', 'reports', 'settings'];

function getFirstAllowedView(hasPermission) {
  return ORDERED_VIEWS.find((viewId) => {
    const featureKey = VIEW_FEATURE_MAP[viewId];
    return !featureKey || hasPermission(featureKey);
  }) || null;
}

function readStoredTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    return localStorage.getItem('lx_theme') || 'dark';
  } catch {
    return 'dark';
  }
}

export default function MainLayout() {
  const { activeView, hasPermission, user, setActiveView } = useAppState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(readStoredTheme);

  // Map of view id → feature permission key
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    try {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
      localStorage.setItem('lx_theme', nextTheme);
    } catch (e) {
      console.error('Failed to toggle theme:', e);
    }
  };

  useEffect(() => {
    if (!user) return;
    const featureKey = VIEW_FEATURE_MAP[activeView];
    if (!featureKey || hasPermission(featureKey)) return;

    const fallbackView = getFirstAllowedView(hasPermission);
    if (fallbackView && fallbackView !== activeView) {
      setActiveView(fallbackView);
    }
  }, [activeView, hasPermission, setActiveView, user]);

  const renderActiveView = () => {
    // Guard: check if user has permission for this view
    const featureKey = VIEW_FEATURE_MAP[activeView];
    if (featureKey && user && !hasPermission(featureKey)) {
      if (getFirstAllowedView(hasPermission)) {
        return null;
      }
      return (
        <div className="flex flex-col items-center justify-center h-96 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">🚫</span>
          </div>
          <div>
            <h2 className="text-lg font-medium text-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground mt-1">You don&apos;t have permission to view this module.</p>
            <p className="text-xs text-muted-foreground mt-1">Contact your administrator to request access.</p>
          </div>
        </div>
      );
    }

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
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans transition-colors duration-200">
      <CommandPalette />
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
        <header className="h-16 px-6 border-b border-border bg-card/45 backdrop-blur-md flex items-center justify-between flex-shrink-0 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </Button>
            <h1 className="text-sm font-medium text-foreground capitalize font-serif tracking-wider">
              {activeView === 'pos' ? 'Purchase Orders' : activeView}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-muted-foreground hover:text-foreground" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-muted-foreground hover:text-foreground" />
              )}
            </Button>
          </div>
        </header>

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background/30 transition-colors duration-200">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
}
