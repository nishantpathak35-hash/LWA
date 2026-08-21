'use client';

import React, { useState } from 'react';
import { StateProvider, useAppState } from '../../components/StateProvider';
import LoginScreen from '../../components/LoginScreen';
import MainLayout from '../../components/MainLayout';
import { Loader2 } from 'lucide-react';

function readInviteToken() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('invite') || '';
}

function LoginAppContent() {
  const { token, loading } = useAppState();
  const [inviteToken, setInviteToken] = useState(readInviteToken);

  const handleClearInvite = () => {
    setInviteToken('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3 font-mono">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
        <span className="text-xs uppercase tracking-widest text-cyan-400/80 animate-pulse">
          Authenticating Construct-O-Genie Session...
        </span>
      </div>
    );
  }

  if (!token) {
    return <LoginScreen inviteToken={inviteToken} clearInvite={handleClearInvite} />;
  }

  return <MainLayout />;
}

export default function LoginPage() {
  return (
    <StateProvider>
      <LoginAppContent />
    </StateProvider>
  );
}
