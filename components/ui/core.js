import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../app/lib/utils';
import { X } from 'lucide-react';

// --- CARD ---
export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground border border-border rounded-xl overflow-hidden transition-colors duration-150",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/40 dark:bg-slate-950/40", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5", className)} {...props} />;
}

// --- BADGE ---
export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/50",
    ok: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 font-medium",
    success: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 font-medium",
    remitted: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 font-medium",
    approved: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 font-medium",
    paid: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 font-medium",
    err: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 font-medium",
    error: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 font-medium",
    rejected: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 font-medium",
    pending: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 font-medium",
    warning: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 font-medium",
    info: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20 font-medium",
    processing: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20 font-medium",
    active: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 font-medium",
    inactive: "bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border tracking-tight select-none cursor-default",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

// --- BUTTON ---
export function Button({ className, variant = 'default', size = 'default', ...props }) {
  const base = "inline-flex items-center justify-center rounded-lg font-medium text-xs transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none gap-2 cursor-pointer";
  
  const variants = {
    default: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200",
    primary: "bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-2xs border border-transparent",
    destructive: "bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 font-medium",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
    link: "underline-offset-4 hover:underline text-amber-600 dark:text-amber-500 p-0",
  };

  const sizes = {
    default: "h-8 px-3.5 py-1.5 text-xs",
    sm: "h-7 rounded-md px-2.5 text-xs",
    lg: "h-9 rounded-lg px-5 text-sm font-semibold",
    icon: "h-7 w-7 p-0 rounded-lg",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

// --- INPUT ---
export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "w-full px-3 py-1.5 bg-card border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors shadow-2xs",
        className
      )}
      {...props}
    />
  );
}

// --- TEXTAREA ---
export function Textarea({ className, style, ...props }) {
  return (
    <textarea
      className={cn(
        "w-full px-3 py-2 bg-card border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors shadow-2xs resize-y",
        className
      )}
      style={{ minHeight: '80px', ...style }}
      {...props}
    />
  );
}

// --- SELECT ---
export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "w-full px-3 py-1.5 bg-card border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors cursor-pointer shadow-2xs",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// --- TABLE ---
export function Table({ className, ...props }) {
  return (
    <div 
      className="w-full overflow-x-auto border border-border rounded-xl bg-card transition-colors duration-150"
    >
      <table className={cn("w-full border-collapse text-left text-xs", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("sticky top-0 z-10 bg-slate-100 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-slate-200/80 dark:divide-slate-800/40 bg-card", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th className={cn("px-3.5 py-2.5 font-semibold tracking-wider text-[11px] text-slate-700 dark:text-slate-400", className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td className={cn("px-3.5 py-3 text-slate-800 dark:text-slate-300 font-normal align-middle text-xs tabular-nums", className)} {...props} />;
}

// --- METRIC CARD ---
export function MetricCard({ label, value, sub, trend, trendUp, icon: Icon, color = "blue", className }) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-4 flex flex-col justify-between transition-colors duration-150", className)}>
      <div className="flex items-start justify-between">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700/50">
            <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
        )}
        {trend && (
          <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border", trendUp ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20")}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">{value}</div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{label}</div>
        {sub && <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// --- STATUS PILL ---
export function StatusPill({ status, className }) {
  if (!status) return null;
  const s = String(status).toLowerCase();

  const styles = {
    active: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    completed: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
    "on-hold": "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    pending: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    approved: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    rejected: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
    draft: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50",
    paid: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    overdue: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
    suspended: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
    inactive: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/50",
  };

  const labels = {
    "on-hold": "On Hold",
  };

  const formattedLabel = labels[s] || s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border tracking-tight select-none cursor-default", styles[s] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50", className)}>
      {formattedLabel}
    </span>
  );
}

// --- PRIORITY PILL ---
export function PriorityPill({ priority, className }) {
  if (!priority) return null;
  const p = String(priority).toLowerCase();
  const colors = { high: "text-rose-700 dark:text-rose-400", medium: "text-amber-700 dark:text-amber-400", low: "text-slate-600 dark:text-slate-400" };
  const dots = { high: "bg-rose-500", medium: "bg-amber-500", low: "bg-slate-400" };

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium capitalize select-none", colors[p] || "text-slate-500", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dots[p] || "bg-slate-400")} />
      {priority}
    </span>
  );
}

// --- DIALOG / MODAL ---
export function Dialog({ open, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />
      
      {/* Content wrapper */}
      <div 
        className={cn("relative w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col transition-colors duration-150 text-foreground", maxWidth)}
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}


