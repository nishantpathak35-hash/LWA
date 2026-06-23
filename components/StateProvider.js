'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
  }, []);

  // Cached data state
  const [kpis, setKpis] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [pos, setPos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [featurePermissions, setFeaturePermissions] = useState({});

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
      if (msg.includes('AUTH:') || msg.includes('Not signed in') || msg.includes('expired') || msg.includes('session')) {
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
      if (msg.includes('AUTH:') || msg.includes('Not signed in') || msg.includes('expired') || msg.includes('session')) {
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
        if (bundle.kpis) setKpis(bundle.kpis);
        if (bundle.master) {
          setVendors(bundle.master.vendors || []);
          setPos(bundle.master.pos || []);
          setProjects(bundle.master.projects || []);
        }
      }
      // Load payment requests
      const prList = await call('listPaymentRequests');
      setPayments(prList || []);
      // Load feature permissions for access control
      try {
        const perms = await call('getFeaturePermissions');
        if (perms && typeof perms === 'object') setFeaturePermissions(perms);
      } catch (e) { /* non-fatal */ }
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
        const sess = await callDirect('getMySession', token);
        if (!active) return;
        if (sess) {
          setUser(sess);
          // Pre-fetch bundle
          const bundle = await call('getBootBundle');
          if (bundle) {
            if (bundle.kpis) setKpis(bundle.kpis);
            if (bundle.master) {
              setVendors(bundle.master.vendors || []);
              setPos(bundle.master.pos || []);
              setProjects(bundle.master.projects || []);
            }
          }
          const prList = await call('listPaymentRequests');
          setPayments(prList || []);
          // Load feature permissions for access control
          try {
            const perms = await call('getFeaturePermissions');
            if (perms && typeof perms === 'object') setFeaturePermissions(perms);
          } catch (e) { /* non-fatal */ }
        } else {
          logout();
        }
      } catch (e) {
        if (active) {
          logout();
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
  }, [token, callDirect, call, logout]);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await callDirect('loginUser', email, password);
      if (res && res.token) {
        localStorage.setItem('lx_auth_token', res.token);
        setToken(res.token);
        return true;
      }
      return false;
    } catch (e) {
      setError(e.message || 'Login failed');
      throw e;
    }
  }, [callDirect]);

  // Periodic auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshData();
    }, 60000);
    return () => clearInterval(interval);
  }, [user, refreshData]);

  const hasPermission = useCallback((feature) => {
    if (!user) return false;
    if (user.email === 'admin@luxeworx.com') return true;
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
  }, [user, featurePermissions]);

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
    projects,
    payments,
    featurePermissions,
    hasPermission,
    login,
    logout,
    call,
    callDirect,
    refreshData
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
