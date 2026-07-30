'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-100">Something went wrong</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          An unexpected error occurred while loading this view. The rest of the application remains intact.
        </p>
        {error?.message && (
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-amber-400/90 text-left overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-sm rounded-lg transition-colors shadow-md"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-lg transition-colors text-center border border-slate-700"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
