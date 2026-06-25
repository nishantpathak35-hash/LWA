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
    // Log to console in dev; swap for a real error reporting service (Sentry etc.) in prod
    console.error(`[ErrorBoundary] Uncaught error in "${this.props.label || 'view'}":`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const label = this.props.label || 'this section';

    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-5 text-center p-8">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Something went wrong in {label}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            An unexpected error occurred. Your data is safe — try refreshing this section.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-3 text-left text-xs bg-slate-900 border border-slate-800 rounded-lg p-4 max-w-lg overflow-auto text-red-300 whitespace-pre-wrap">
              {this.state.error.toString()}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
        </div>
        <button
          onClick={this.handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }
}
