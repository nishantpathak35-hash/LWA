'use client';

import React, { useState } from 'react';
import { StateProvider, useAppState } from '../components/StateProvider';
import LoginScreen from '../components/LoginScreen';
import MainLayout from '../components/MainLayout';
import { Loader2 } from 'lucide-react';

import Image from 'next/image';

function readInviteToken() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('invite') || '';
}

function AppContent() {
  const { token, loading } = useAppState();
  const [inviteToken, setInviteToken] = useState(readInviteToken);

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
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground select-none">
        <div className="flex flex-col items-center gap-4 animate-logo-beat">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border shadow-sm overflow-hidden p-2.5">
            <Image
              src="/api/brand-logo"
              alt="Luxeworx Atelier"
              width={64}
              height={64}
              unoptimized
              priority
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold tracking-wider text-primary font-display">LUXEWORX ATELIER</span>
            <span className="text-[11px] text-muted-foreground font-medium">Payment Tracking System</span>
          </div>
        </div>
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
