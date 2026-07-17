'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isSuperAdmin } from '../app/lib/config';

const StateContext = createContext(null);

function readStoredToken() {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('lx_auth_token') || '';
  } catch {
    return '';
  }
}

export function StateProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [booting, setBooting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = readStoredToken();
    if (stored) {
      setToken(stored);
    } else {
      setLoading(false);
    }
    
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view) {
        setActiveView(view);
      }
      const targetPo = params.get('po');
      if (targetPo) {
        setTargetPo(targetPo);
      }
    }
  }, []);

  // Cached data state
  const [kpis, setKpis] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [pos, setPos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tdsSections, setTdsSections] = useState([]);
  const [featurePermissions, setFeaturePermissions] = useState({});
  // Role switching: when Super Admin selects a specific role to impersonate
  const [activeRole, setActiveRole] = useState(null);
  // Command-palette deep-link: when set, POsView highlights/scrolls to this PO
  const [targetPo, setTargetPo] = useState(null);

  const logout = useCallback(async () => {
    const currentToken = token || localStorage.getItem('lx_auth_token');
    try {
      localStorage.removeItem('lx_auth_token');
      setToken('');
      setUser(null);
      setKpis(null);
      setVendors([]);
      setPos([]);
      setProjects([]);
      setPayments([]);
      setActiveView('dashboard');
      if (currentToken) {
        // Silent logout
        fetch('/api/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'logoutUser', args: [currentToken] })
        }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  // Direct un-gated server call (no x-lwa-token header required, e.g., loginUser, getMySession)
  const callDirect = useCallback(async (method, ...args) => {
    try {
      const response = await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, args })
      });
      const data = await response.json();
      if (!response.ok || (data && data.error)) {
        throw new Error((data && data.error) || 'API Error');
      }
      return data;
    } catch (e) {
      const msg = e.message || String(e);
      if (msg.includes('AUTH:') || msg.includes('Not signed in') || msg.includes('session expired') || msg.includes('invalid session')) {
        logout();
      }
      throw e;
    }
  }, [logout]);

  // Standard API call with token
  const call = useCallback(async (method, ...args) => {
    const currentToken = token || localStorage.getItem('lx_auth_token');
    if (!currentToken) {
      logout();
      throw new Error('AUTH:Not signed in.');
    }
    try {
      const response = await fetch('/api/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lwa-token': currentToken
        },
        body: JSON.stringify({ method, args })
      });
      const data = await response.json();
      if (!response.ok || (data && data.error)) {
        throw new Error((data && data.error) || 'API Error');
      }
      return data;
    } catch (e) {
      const msg = e.message || String(e);
      if (msg.includes('AUTH:') || msg.includes('Not signed in') || msg.includes('session expired') || msg.includes('invalid session')) {
        logout();
      }
      throw e;
    }
  }, [token, logout]);

  // Load all app data (boot bundle)
  const refreshData = useCallback(async () => {
    if (!token) return;
    try {
      const bundle = await call('getBootBundle');
      if (bundle) {
        if (bundle.user || bundle.session) {
          const u = bundle.user || bundle.session;
          if (u && isSuperAdmin(u.email)) {
            if (!u.roles) u.roles = [];
            if (!u.roles.includes('admin')) u.roles = [...u.roles, 'admin'];
          }
          setUser(u);
        }
        if (bundle.kpis) setKpis(bundle.kpis);
        if (bundle.master) {
          setVendors(bundle.master.vendors || []);
          setPos(bundle.master.pos || []);
          setProjects(bundle.master.projects || []);
          setTdsSections(bundle.master.tdsSections || []);
        }
        setPayments(bundle.payments || []);
        if (bundle.featurePermissions && typeof bundle.featurePermissions === 'object') {
          setFeaturePermissions(bundle.featurePermissions);
        }
        if (bundle.invoices) {
          if (Array.isArray(bundle.invoices)) {
            setInvoices(bundle.invoices);
          } else if (Array.isArray(bundle.invoices.data)) {
            setInvoices(bundle.invoices.data);
          }
        }
      }
    } catch (e) {
      console.error('Data refresh failed:', e);
    }
  }, [token, call]);

  // Validate session when token changes
  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    async function validate() {
      setBooting(true);
      try {
        const bundle = await call('getBootBundle');
        if (!active) return;
        if (bundle?.user || bundle?.session) {
          const u = bundle.user || bundle.session;
          if (u && isSuperAdmin(u.email)) {
            if (!u.roles) u.roles = [];
            if (!u.roles.includes('admin')) u.roles = [...u.roles, 'admin'];
          }
          setUser(u);
          if (bundle.kpis) setKpis(bundle.kpis);
          if (bundle.master) {
            setVendors(bundle.master.vendors || []);
            setPos(bundle.master.pos || []);
            setProjects(bundle.master.projects || []);
            setTdsSections(bundle.master.tdsSections || []);
          }
          setPayments(bundle.payments || []);
          if (bundle.featurePermissions && typeof bundle.featurePermissions === 'object') {
            setFeaturePermissions(bundle.featurePermissions);
          }
          if (bundle.invoices) {
            if (Array.isArray(bundle.invoices)) {
              setInvoices(bundle.invoices);
            } else if (Array.isArray(bundle.invoices.data)) {
              setInvoices(bundle.invoices.data);
            }
          }
        } else {
          logout();
        }
      } catch (e) {
        if (active) {
          // Only logout on actual auth failures — not on network/DB errors
          const msg = e.message || String(e);
          const isAuthError = msg.includes('AUTH:') || msg.includes('Not signed in') || msg.includes('session expired') || msg.includes('invalid session');
          if (isAuthError) {
            logout();
          } else {
            // Non-auth error (network blip, DB error, etc.) — don't kick the user out
            console.error('Boot bundle failed (non-auth):', e);
            setLoading(false);
            setBooting(false);
          }
        }
      } finally {
        if (active) {
          setLoading(false);
          setBooting(false);
        }
      }
    }

    validate();
    return () => { active = false; };
  }, [token, call, logout]);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await callDirect('loginUser', email, password);
      if (res && res.token) {
        localStorage.setItem('lx_auth_token', res.token);
        // Store login timestamp so session-expiry warning can compute time remaining
        localStorage.setItem('lx_login_time', Date.now().toString());
        setToken(res.token);
        return true;
      }
      return false;
    } catch (e) {
      setError(e.message || 'Login failed');
      throw e;
    }
  }, [callDirect]);

  // Periodic auto-refresh and focus-based sync
  useEffect(() => {
    if (!user) return;
    
    // Auto-refresh every 30 seconds — but only when the tab is visible (P2 fix)
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    }, 30000);

    // Refresh immediately when window gains focus or tab becomes visible
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, [user, refreshData]);

  const hasPermission = useCallback((feature) => {
    if (!user) return false;

    // When Super Admin is impersonating a specific role, use ONLY that role's permissions
    if (isSuperAdmin(user.email) && activeRole) {
      // Canonical role-alias mapping: DB value → featurePermissions key
      const ROLE_MAP = {
        'procurement': 'proc',
        'maker':       'proc',
        'proc':        'proc',
        'finance':     'finance',
        'accountant':  'accountant',
        'director':    'director',
      };
      const roleKey = ROLE_MAP[activeRole] ?? activeRole;
      // Director always has full access even when impersonated
      if (activeRole === 'director') return true;
      if (featurePermissions[roleKey] && featurePermissions[roleKey].includes(feature)) {
        return true;
      }
      return false;
    }

    // Super Admin with no impersonation — full access
    if (isSuperAdmin(user.email)) return true;
    const roles = user.roles || [];
    // Admin and Director always have full access
    if (roles.includes('admin') || roles.includes('director')) return true;
    // Canonical role-alias mapping: DB value → featurePermissions key
    const ROLE_MAP = {
      'procurement': 'proc',
      'maker':       'proc',
      'proc':        'proc',
      'finance':     'finance',
      'accountant':  'accountant',
    };
    // Check each role the user has against the permissions matrix
    for (const role of roles) {
      const roleKey = ROLE_MAP[role] ?? role;
      if (featurePermissions[roleKey] && featurePermissions[roleKey].includes(feature)) {
        return true;
      }
    }
    return false;
  }, [user, featurePermissions, activeRole]);

  const value = {
    token,
    user,
    activeView,
    setActiveView,
    loading,
    booting,
    error,
    setError,
    kpis,
    vendors,
    pos,
    setPos,
    projects,
    setProjects,
    payments,
    setPayments,
    invoices,
    setInvoices,
    tdsSections,
    setTdsSections,
    featurePermissions,
    setFeaturePermissions,
    hasPermission,
    activeRole,
    setActiveRole,
    login,
    logout,
    call,
    callDirect,
    refreshData,
    targetPo,
    setTargetPo,
  };

  return <StateContext.Provider value={value}>{children}</StateContext.Provider>;
}

export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
}
