'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — catches any render or lifecycle error in child components
 * and renders a graceful fallback instead of crashing the whole app.
 *
 * Usage:
 *   <ErrorBoundary label="Payments">
 *     <PaymentsView />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary] Uncaught error in "${this.props.label || 'view'}":`, error, errorInfo);

    // If chunk failed to load (new Vercel deployment), auto-reload once to fetch fresh assets
    const errText = String(error?.message || error?.name || error || '');
    const isChunkError = /ChunkLoadError|Loading chunk|Failed to load chunk|Failed to fetch dynamically imported module/i.test(errText);
    if (isChunkError && typeof window !== 'undefined') {
      const lastReload = Number(sessionStorage.getItem('pts_chunk_reload_ts') || 0);
      const now = Date.now();
      // Only auto-reload if we haven't reloaded in the last 15 seconds (prevents loops)
      if (now - lastReload > 15000) {
        sessionStorage.setItem('pts_chunk_reload_ts', String(now));
        window.location.reload();
      }
    }
  }

  handleReset = () => {
    const errText = String(this.state.error?.message || this.state.error?.name || this.state.error || '');
    const isChunkError = /ChunkLoadError|Loading chunk|Failed to load chunk|Failed to fetch dynamically imported module/i.test(errText);
    if (isChunkError && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const label = this.props.label || 'this section';
    const errText = String(this.state.error?.message || this.state.error?.name || this.state.error || '');
    const isChunkError = /ChunkLoadError|Loading chunk|Failed to load chunk|Failed to fetch dynamically imported module/i.test(errText);

    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-5 text-center p-8">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {isChunkError ? 'New Version Available' : `Something went wrong in ${label}`}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            {isChunkError
              ? 'A new system update was deployed. Please reload the page to load the latest version.'
              : 'An unexpected error occurred. Your data is safe — try refreshing this section.'}
          </p>
          {this.state.error && (
            <details className="mt-3 text-left text-xs bg-slate-900/90 border border-slate-800 rounded-lg p-3 max-w-lg overflow-auto text-slate-400">
              <summary className="font-mono text-[11px] text-amber-500/90 hover:text-amber-400 cursor-pointer select-none">
                Show technical error details
              </summary>
              <pre className="mt-2 text-[11px] font-mono whitespace-pre-wrap text-rose-300">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
        <button
          onClick={this.handleReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          {isChunkError ? 'Reload Latest Version' : 'Retry'}
        </button>
      </div>
    );
  }
}
