'use client';

import React, { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Critical Root Layout Error:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">Application Error</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            A critical system error occurred. You can reload the page to restore your session.
          </p>
          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-sm rounded-lg transition-colors shadow-md"
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
