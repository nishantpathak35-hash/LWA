'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const StateContext = createContext(null);

export function StateProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [booting, setBooting] = useState(false);
  const [error, setError] = useState(null);

  // Cached data state
  const [kpis, setKpis] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [pos, setPos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);

  // Load token from localStorage on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('lx_auth_token') || '';
      if (savedToken) {
        setToken(savedToken);
      } else {
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
    }
  }, []);

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
    } catch (e) {
      console.error('Data refresh failed:', e);
    }
  }, [token, call]);

  // Validate session when token changes
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
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
