'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { isPaymentPending } from '../app/lib/paymentStatus';
import { shouldIgnoreNavigationShortcut } from '../app/lib/navigationShortcuts';
import { useAppState } from './StateProvider';
import Sidebar from './Sidebar';
import POsView from './views/POsView';
import PaymentsView from './views/PaymentsView';
import ErrorBoundary from './ErrorBoundary';
import { NotificationsPanel } from './ui/NotificationsPanel';
import ActivityStreamDrawer from './ui/ActivityStreamDrawer';
import InstallPWA from './ui/InstallPWA';
import { Menu, Sun, Moon, AlertTriangle, X, Search, Activity, LayoutDashboard, ShoppingBag, CreditCard, MoreHorizontal, Plus, Receipt, ShieldCheck, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from './ui/core';
import { CommandPalette } from './ui/CommandPalette';

// Detect Mac for keyboard shortcut display
const viewLoading = () => <div role="status" className="p-6 text-muted-foreground">Loading…</div>;
const DashboardView = dynamic(() => import('./views/DashboardView'), { loading: viewLoading });
const ProjectsView = dynamic(() => import('./views/ProjectsView'), { loading: viewLoading });
const VendorsView = dynamic(() => import('./views/VendorsView'), { loading: viewLoading });
const ReportsView = dynamic(() => import('./views/ReportsView'), { loading: viewLoading });
const InvoicesView = dynamic(() => import('./views/InvoicesView'), { loading: viewLoading });
const SettingsView = dynamic(() => import('./views/SettingsView'), { loading: viewLoading });
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

// ─── Constants ────────────────────────────────────────────────────────────────
const VIEW_FEATURE_MAP = {
  dashboard: 'dashboard',
  projects: 'projects',
  vendors: 'vendors',
  pos: 'purchase_orders',
  invoices: 'payments',
  payments: 'payments',
  reports: 'reports',
  settings: 'settings'
};

const VIEW_LABELS = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  vendors: 'Vendors',
  pos: 'Purchase Orders',
  invoices: 'Invoices',
  payments: 'Payments',
  reports: 'Reports',
  settings: 'Settings'
};

// Shortcut map: first key → second key → { view, children? }
// children: third key → { event } (dispatched as CustomEvent on window)
const SHORTCUT_MAP = {
  g: {
    d: { view: 'dashboard' },
    p: { view: 'payments', children: { n: { event: 'lx:new-payment-request' } } },
    o: { view: 'pos',      children: { n: { event: 'lx:new-po' } } },
    i: { view: 'invoices' },
    v: { view: 'vendors' },
    r: { view: 'reports' },
    s: { view: 'settings' },
    j: { view: 'projects' },
  }
};


const ORDERED_VIEWS = ['dashboard', 'projects', 'vendors', 'pos', 'invoices', 'payments', 'reports', 'settings'];

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
  const { activeView, hasPermission, user, setActiveView, payments, pos } = useAppState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileQuickActionOpen, setMobileQuickActionOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [theme, setTheme] = useState(readStoredTheme);
  const [sessionHours, setSessionHours] = useState(null);
  const [sessionWarningDismissed, setSessionWarningDismissed] = useState(false);
  const [keySequence, setKeySequence] = useState([]); // tracks multi-key shortcut progress
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('lx_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('lx_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  const pendingPaymentsCount = useMemo(() => {
    return (payments || []).filter(isPaymentPending).length;
  }, [payments]);

  const pendingPOsCount = useMemo(() => {
    return (pos || []).filter(p => {
      const st = String(p.status || p.approval_status || '').toLowerCase().trim();
      return st === 'pending approval' || st === 'pending_approval' || st === 'pending' || st.includes('pending') || st.includes('submitted') || st === 'under approval';
    }).length;
  }, [pos]);

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
      if (shouldIgnoreNavigationShortcut(e)) {
        if (keySequence.length) clearSeq();
        return;
      }
      // Ctrl+B / Cmd+B to toggle sidebar retraction
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

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
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-2xl">🚫</span>
          </div>
          <div>
            <h2 className="text-base font-medium text-foreground">Access Restricted</h2>
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
    };

    return (
      <ErrorBoundary label={viewLabel}>
        {views[activeView] ?? <DashboardView />}
      </ErrorBoundary>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      <CommandPalette />
      <InstallPWA />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar 
        mobileOpen={mobileMenuOpen} 
        setMobileOpen={setMobileMenuOpen} 
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* ── Header / Topbar ── */}
        <header className="h-12 px-4 md:px-5 border-b border-border bg-card flex items-center justify-between flex-shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile menu trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </Button>

            {/* Desktop Sidebar Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex h-7 w-7"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-primary" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </Button>
            
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground hidden sm:inline">LWA</span>
              <span className="text-muted-foreground/40 hidden sm:inline">/</span>
              <h1 className="text-sm font-medium text-foreground">
                {VIEW_LABELS[activeView] || activeView}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Search Trigger */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('lx:open-command-palette'))}
              className="hidden md:flex items-center justify-between w-52 px-3 py-1.5 rounded-md bg-muted border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Search...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
            </button>

            {/* Keyboard shortcut hint */}
            {keySequence.length > 0 && (
              <span className="text-[10px] px-2 py-1 rounded-md bg-muted border border-border text-primary font-mono font-medium">
                {keySequence.map(k => k.toUpperCase()).join(' → ')} …
              </span>
            )}

            {/* Notifications */}
            <NotificationsPanel />

            {/* Activity Stream */}
            <Button variant="ghost" size="icon" onClick={() => setActivityDrawerOpen(true)} title="Activity">
              <Activity className="w-4 h-4" />
            </Button>

            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>

        <ActivityStreamDrawer
          open={activityDrawerOpen}
          onClose={() => setActivityDrawerOpen(false)}
        />

        {/* ── Session expiry warning ── */}
        {showSessionWarning && (
          <div className="flex items-center gap-3 px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Session expires in <strong>{sessionHours}h</strong>. Save your work and re-login.
            </span>
            <button
              onClick={() => setSessionWarningDismissed(true)}
              className="ml-auto p-1 rounded text-amber-600/70 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Scrollable View Area ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveView()}
          </div>
        </main>

        {/* ── Mobile Quick Action Sheet ── */}
        {mobileQuickActionOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 flex flex-col justify-end animate-fade-in" onClick={() => setMobileQuickActionOpen(false)}>
            <div className="bg-card border-t border-border rounded-t-2xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">Quick Actions</span>
                <button onClick={() => setMobileQuickActionOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Approvals Queue */}
                <button
                  onClick={() => {
                    setMobileQuickActionOpen(false);
                    setActiveView(pendingPaymentsCount > 0 ? 'payments' : 'pos');
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-lg bg-muted text-foreground text-xs font-medium transition-colors col-span-2"
                >
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>Approvals Queue</span>
                  {(pendingPaymentsCount + pendingPOsCount) > 0 && (
                    <span className="ml-auto text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {pendingPaymentsCount + pendingPOsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setMobileQuickActionOpen(false);
                    setActiveView('payments');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('lx:new-payment-request')), 100);
                  }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted text-foreground text-xs font-medium transition-colors"
                >
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <span>Payment</span>
                </button>

                <button
                  onClick={() => {
                    setMobileQuickActionOpen(false);
                    setActiveView('pos');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('lx:new-po')), 100);
                  }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted text-foreground text-xs font-medium transition-colors"
                >
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                  <span>New PO</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile Bottom Nav ── */}
        <div className="md:hidden fixed bottom-3 inset-x-3 z-30 pointer-events-none flex justify-center">
          <nav className="pointer-events-auto bg-card border border-border rounded-full px-3 py-2 flex items-center justify-between gap-1 shadow-elevated max-w-sm w-full">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-full text-[10px] font-medium transition-colors ${
                activeView === 'dashboard' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="mt-0.5">Home</span>
            </button>

            <button
              onClick={() => setActiveView('pos')}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-full text-[10px] font-medium transition-colors ${
                activeView === 'pos' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="mt-0.5">POs</span>
              {pendingPOsCount > 0 && (
                <span className="absolute -top-0.5 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>

            {/* Central FAB */}
            <button
              onClick={() => setMobileQuickActionOpen(true)}
              className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-elevated -mt-3 border-2 border-background"
              title="Quick Actions"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>

            <button
              onClick={() => setActiveView('payments')}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-full text-[10px] font-medium transition-colors ${
                activeView === 'payments' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="mt-0.5">Pay</span>
              {pendingPaymentsCount > 0 && (
                <span className="absolute -top-0.5 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center py-1 px-3 rounded-full text-[10px] font-medium text-muted-foreground transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
              <span className="mt-0.5">Menu</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
