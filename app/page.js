'use client';

import React, { useState, useEffect } from 'react';
import { StateProvider, useAppState } from '../components/StateProvider';
import LoginScreen from '../components/LoginScreen';
import MainLayout from '../components/MainLayout';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { token, loading } = useAppState();
  const [inviteToken, setInviteToken] = useState('');

  // Extract invite token on client side mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const invite = params.get('invite');
      if (invite) {
        setInviteToken(invite);
      }
    }
  }, []);

  const handleClearInvite = () => {
    setInviteToken('');
    if (typeof window !== 'undefined') {
      // Clear URL parameter without reloading
      const url = new URL(window.location);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-gold" />
        <span className="text-sm font-light uppercase tracking-widest text-gold/80 animate-pulse">Booting up system...</span>
      </div>
    );
  }

  if (!token) {
    return <LoginScreen inviteToken={inviteToken} clearInvite={handleClearInvite} />;
  }

  return <MainLayout />;
}

export default function Home() {
  return (
    <StateProvider>
      <AppContent />
    </StateProvider>
  );
}
