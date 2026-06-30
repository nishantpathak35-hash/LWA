'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from './StateProvider';
import Sidebar from './Sidebar';
import DashboardView from './views/DashboardView';
import ProjectsView from './views/ProjectsView';
import VendorsView from './views/VendorsView';
import POsView from './views/POsView';
import PaymentsView from './views/PaymentsView';
import InvoicesView from './views/InvoicesView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import ErrorBoundary from './ErrorBoundary';
import { NotificationsPanel } from './ui/NotificationsPanel';
import { Menu, Sun, Moon, AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/core';
import { CommandPalette } from './ui/CommandPalette';

// ─── Constants ────────────────────────────────────────────────────────────────
const VIEW_FEATURE_MAP = {
  dashboard: 'dashboard',
  projects: 'projects',
  vendors: 'vendors',
  pos: 'purchase_orders',
  payments: 'payments',
  invoices: 'payments',
  reports: 'reports',
  settings: 'settings'
};

const VIEW_LABELS = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  vendors: 'Vendors',
  pos: 'Purchase Orders',
  payments: 'Payments',
  invoices: 'Invoices',
  reports: 'Reports',
  settings: 'Settings',
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


const ORDERED_VIEWS = ['dashboard', 'projects', 'vendors', 'pos', 'payments', 'invoices', 'reports', 'settings'];

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
      payments:  <PaymentsView />,
      invoices:  <InvoicesView />,
      reports:   <ReportsView />,
      settings:  <SettingsView />,
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
            <h1 className="text-sm font-medium text-foreground font-serif tracking-wider">
              {VIEW_LABELS[activeView] || activeView}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            {/* Keyboard shortcut hint (shows sequence in progress) */}
            {keySequence.length > 0 && (
              <span className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono animate-pulse mr-1">
                {keySequence.map(k => k.toUpperCase()).join(' → ')} …
              </span>
            )}
            {/* Notifications bell */}
            <NotificationsPanel />
            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-muted-foreground hover:text-foreground" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-muted-foreground hover:text-foreground" />
              )}
            </Button>
          </div>
        </header>

        {/* ── Session expiry warning banner ── */}
        {showSessionWarning && (
          <div className="flex items-center gap-3 px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-sm text-amber-300 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Your session expires in <strong>{sessionHours}h</strong>. Save your work and log back in to continue.
            </span>
            <button
              onClick={() => setSessionWarningDismissed(true)}
              className="ml-auto p-1 rounded text-amber-400/60 hover:text-amber-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Scrollable View Area ── */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background/30 transition-colors duration-200">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
}
