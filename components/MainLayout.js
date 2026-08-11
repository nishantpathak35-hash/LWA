'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from './StateProvider';
import Sidebar from './Sidebar';
import DashboardView from './views/DashboardView';
import ProjectsView from './views/ProjectsView';
import VendorsView from './views/VendorsView';
import POsView from './views/POsView';
import PaymentsView from './views/PaymentsView';
import ReportsView from './views/ReportsView';
import InvoicesView from './views/InvoicesView';
import SettingsView from './views/SettingsView';
import SiteDPRView from './views/operations/dpr/SiteDPRView';
import SiteWPRView from './views/operations/wpr/SiteWPRView';
import ErrorBoundary from './ErrorBoundary';
import { NotificationsPanel } from './ui/NotificationsPanel';
import ActivityStreamDrawer from './ui/ActivityStreamDrawer';
import { Menu, Sun, Moon, AlertTriangle, X, Search, Activity, LayoutDashboard, ShoppingBag, CreditCard, HardHat, MoreHorizontal, Plus, FilePlus, Receipt } from 'lucide-react';
import { Button } from './ui/core';
import { CommandPalette } from './ui/CommandPalette';

// ─── Constants ────────────────────────────────────────────────────────────────
const VIEW_FEATURE_MAP = {
  dashboard: 'dashboard',
  projects: 'projects',
  vendors: 'vendors',
  pos: 'purchase_orders',
  invoices: 'payments',
  payments: 'payments',
  reports: 'reports',
  settings: 'settings',
  site_dpr: 'operations',
  site_wpr: 'operations'
};

const VIEW_LABELS = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  vendors: 'Vendors',
  pos: 'Purchase Orders',
  invoices: 'Invoices',
  payments: 'Payments',
  reports: 'Reports',
  settings: 'Settings',
  site_dpr: 'Site DPR',
  site_wpr: 'Site WPR'
};

// Shortcut map: first key → second key → { view, children? }
// children: third key → { event } (dispatched as CustomEvent on window)
const SHORTCUT_MAP = {
  g: {
    d: { view: 'dashboard' },
    p: { view: 'payments', children: { n: { event: 'lx:new-payment-request' } } },
    o: { view: 'pos',      children: { n: { event: 'lx:new-po' } } },
    v: { view: 'vendors' },
    r: { view: 'reports' },
    s: { view: 'settings' },
    j: { view: 'projects' },
  }
};


const ORDERED_VIEWS = ['dashboard', 'projects', 'vendors', 'pos', 'payments', 'reports', 'settings', 'site_dpr', 'site_wpr'];

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

/** Session expires in 7 days from login. Returns hours remaining, or null if unknown. */
function getSessionHoursRemaining() {
  if (typeof window === 'undefined') return null;
  try {
    const loginTime = parseInt(localStorage.getItem('lx_login_time') || '0', 10);
    if (!loginTime) return null;
    const expiresAt = loginTime + 7 * 24 * 60 * 60 * 1000;
    const remaining = expiresAt - Date.now();
    return Math.max(0, Math.floor(remaining / (60 * 60 * 1000)));
  } catch {
    return null;
  }
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function MainLayout() {
  const { activeView, hasPermission, user, setActiveView } = useAppState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileQuickActionOpen, setMobileQuickActionOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [theme, setTheme] = useState(readStoredTheme);
  const [sessionHours, setSessionHours] = useState(null);
  const [sessionWarningDismissed, setSessionWarningDismissed] = useState(false);
  const [keySequence, setKeySequence] = useState([]); // tracks multi-key shortcut progress

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
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

  // ── Guard: redirect to allowed view ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const featureKey = VIEW_FEATURE_MAP[activeView];
    if (!featureKey || hasPermission(featureKey)) return;
    const fallbackView = getFirstAllowedView(hasPermission);
    if (fallbackView && fallbackView !== activeView) setActiveView(fallbackView);
  }, [activeView, hasPermission, setActiveView, user]);

  // ── Session expiry check ───────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setSessionHours(getSessionHoursRemaining());
    check();
    const interval = setInterval(check, 60 * 1000); // recheck every minute
    return () => clearInterval(interval);
  }, []);

  const showSessionWarning = (
    !sessionWarningDismissed &&
    sessionHours !== null &&
    sessionHours <= 24 &&
    sessionHours > 0
  );

  // ── Keyboard shortcuts (up to 3-key sequences: G → O → N, G → P → N, etc.) ─
  useEffect(() => {
    let seqTimer = null;

    const clearSeq = () => {
      setKeySequence([]);
      clearTimeout(seqTimer);
    };

    const resetTimer = () => {
      clearTimeout(seqTimer);
      seqTimer = setTimeout(clearSeq, 1500);
    };

    const handleKeyDown = (e) => {
      // Don't fire while typing in inputs
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (document.activeElement?.contentEditable === 'true') return;

      const key = e.key.toLowerCase();
      const seq = [...keySequence, key];

      // Seq length 1: expect 'g'
      if (seq.length === 1) {
        if (SHORTCUT_MAP[key]) {
          resetTimer();
          setKeySequence(seq);
          return;
        }
        clearSeq();
        return;
      }

      // Seq length 2: e.g. ['g', 'o']
      if (seq.length === 2) {
        const [k1, k2] = seq;
        const entry = SHORTCUT_MAP[k1]?.[k2];
        if (entry) {
          e.preventDefault();
          // Always navigate to the view
          setActiveView(entry.view);
          // If this key has children, wait for a 3rd key
          if (entry.children) {
            resetTimer();
            setKeySequence(seq);
            return;
          }
          clearSeq();
          return;
        }
        clearSeq();
        return;
      }

      // Seq length 3: e.g. ['g', 'o', 'n']
      if (seq.length === 3) {
        const [k1, k2, k3] = seq;
        const child = SHORTCUT_MAP[k1]?.[k2]?.children?.[k3];
        if (child?.event) {
          e.preventDefault();
          // Dispatch with a small delay so the view has time to mount
          setTimeout(() => window.dispatchEvent(new CustomEvent(child.event)), 150);
        }
        clearSeq();
        return;
      }

      clearSeq();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(seqTimer);
    };
  }, [keySequence, setActiveView]);

  // ── View renderer ─────────────────────────────────────────────────────────
  const renderActiveView = () => {
    const featureKey = VIEW_FEATURE_MAP[activeView];
    if (featureKey && user && !hasPermission(featureKey)) {
      if (getFirstAllowedView(hasPermission)) return null;
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

    const viewLabel = VIEW_LABELS[activeView] || activeView;
    const views = {
      dashboard: <DashboardView />,
      projects:  <ProjectsView />,
      vendors:   <VendorsView />,
      pos:       <POsView />,
      invoices:  <InvoicesView />,
      payments:  <PaymentsView />,
      reports:   <ReportsView />,
      settings:  <SettingsView />,
      site_dpr:  <SiteDPRView />,
      site_wpr:  <SiteWPRView />,
    };

    return (
      <ErrorBoundary label={viewLabel}>
        {views[activeView] ?? <DashboardView />}
      </ErrorBoundary>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans transition-colors duration-200">
      <CommandPalette />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main content */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* ── Header / Topbar ── */}
        <header className="h-13 px-5 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between flex-shrink-0 transition-colors duration-150 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-4 h-4 text-muted-foreground" />
            </Button>
            
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium hidden sm:inline">Luxeworx ERP</span>
              <span className="text-muted-foreground/60 hidden sm:inline">/</span>
              <h1 className="text-sm font-semibold text-foreground tracking-tight">
                {VIEW_LABELS[activeView] || activeView}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Trigger Button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('lx:open-command-palette'))}
              className="hidden md:flex items-center justify-between w-60 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Search...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">⌘K</kbd>
            </button>

            {/* Keyboard shortcut hint */}
            {keySequence.length > 0 && (
              <span className="text-[10px] px-2 py-1 rounded bg-slate-900 border border-slate-800 text-amber-400 font-mono font-semibold">
                {keySequence.map(k => k.toUpperCase()).join(' → ')} …
              </span>
            )}
            {/* Notifications bell */}
            <NotificationsPanel />
            {/* Activity Stream Drawer Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActivityDrawerOpen(true)}
              title="Team Activity Stream"
            >
              <Activity className="w-4 h-4 text-slate-400 hover:text-slate-200" />
            </Button>
            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-slate-400 hover:text-slate-200" />
              ) : (
                <Moon className="w-4 h-4 text-slate-400 hover:text-slate-200" />
              )}
            </Button>
          </div>
        </header>

        <ActivityStreamDrawer
          open={activityDrawerOpen}
          onClose={() => setActivityDrawerOpen(false)}
        />

        {/* ── Session expiry warning banner ── */}
        {showSessionWarning && (
          <div className="flex items-center gap-3 px-6 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex-shrink-0 font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Your session expires in <strong>{sessionHours}h</strong>. Save your work and log back in to continue.
            </span>
            <button
              onClick={() => setSessionWarningDismissed(true)}
              className="ml-auto p-1 rounded text-amber-600/70 hover:text-amber-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Scrollable View Area ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 bg-background transition-colors duration-200">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveView()}
          </div>
        </main>

        {/* ── Mobile Quick Action Sheet / Backdrop ── */}
        {mobileQuickActionOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-md flex flex-col justify-end p-6 animate-fade-in" onClick={() => setMobileQuickActionOpen(false)}>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Actions</span>
                <button onClick={() => setMobileQuickActionOpen(false)} className="p-1 text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setMobileQuickActionOpen(false);
                    setActiveView('payments');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('lx:new-payment-request')), 100);
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-gold hover:bg-amber-500/20 transition-all font-semibold text-xs gap-2"
                >
                  <Receipt className="w-6 h-6 text-gold" />
                  <span>Request Payment</span>
                </button>
                <button
                  onClick={() => {
                    setMobileQuickActionOpen(false);
                    setActiveView('pos');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('lx:new-po')), 100);
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all font-semibold text-xs gap-2"
                >
                  <ShoppingBag className="w-6 h-6 text-blue-400" />
                  <span>New Purchase Order</span>
                </button>
                <button
                  onClick={() => {
                    setMobileQuickActionOpen(false);
                    setActiveView('site_dpr');
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all font-semibold text-xs gap-2"
                >
                  <HardHat className="w-6 h-6 text-emerald-400" />
                  <span>File Site DPR</span>
                </button>
                <button
                  onClick={() => {
                    setMobileQuickActionOpen(false);
                    window.dispatchEvent(new CustomEvent('lx:open-command-palette'));
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all font-semibold text-xs gap-2"
                >
                  <Search className="w-6 h-6 text-purple-400" />
                  <span>Search System</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile Floating Capsule Navbar ── */}
        <div className="md:hidden fixed bottom-4 inset-x-4 z-30 pointer-events-none flex justify-center">
          <nav className="pointer-events-auto bg-slate-900/90 backdrop-blur-2xl border border-slate-800/80 rounded-full px-3 py-2 flex items-center justify-between gap-1 shadow-2xl shadow-black/80 max-w-sm w-full">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-full text-[10px] font-bold transition-all ${
                activeView === 'dashboard' ? 'bg-gold/15 text-gold shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="mt-0.5">Home</span>
            </button>

            <button
              onClick={() => setActiveView('pos')}
              className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-full text-[10px] font-bold transition-all ${
                activeView === 'pos' ? 'bg-gold/15 text-gold shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="mt-0.5">POs</span>
            </button>

            {/* Central Floating Gold FAB (+) Button */}
            <button
              onClick={() => setMobileQuickActionOpen(true)}
              className="flex items-center justify-center h-11 w-11 rounded-full bg-gradient-to-tr from-amber-500 via-gold to-amber-300 text-slate-950 shadow-lg shadow-gold/30 hover:scale-110 active:scale-95 transition-all -mt-4 border-2 border-slate-950 font-black"
              title="Quick Actions"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>

            <button
              onClick={() => setActiveView('payments')}
              className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-full text-[10px] font-bold transition-all ${
                activeView === 'payments' ? 'bg-gold/15 text-gold shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="mt-0.5">Pay</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center py-1 px-3.5 rounded-full text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
              <span className="mt-0.5">Menu</span>
            </button>
          </nav>
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}
