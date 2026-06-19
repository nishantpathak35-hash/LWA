'use client';

import React from 'react';
import { StateProvider, useAppState } from '../components/StateProvider';
import LoginScreen from '../components/LoginScreen';
import MainLayout from '../components/MainLayout';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { token, loading } = useAppState();

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-gold" />
        <span className="text-sm font-light uppercase tracking-widest text-gold/80 animate-pulse">Booting up system...</span>
      </div>
    );
  }

  if (!token) {
    return <LoginScreen />;
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
