import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../app/lib/utils';
import { X } from 'lucide-react';

// --- CARD ---
export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground border border-border/80 rounded-xl overflow-hidden shadow-2xs transition-colors duration-150",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("px-6 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20 dark:bg-slate-950/20", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-6", className)} {...props} />;
}

// --- BADGE ---
export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/50 font-medium",
    ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium",
    remitted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium",
    approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium",
    paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium",
    err: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-medium",
    error: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-medium",
    rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-medium",
    pending: "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20 font-medium",
    warning: "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20 font-medium",
    info: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20 font-medium",
    processing: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20 font-medium",
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium",
    inactive: "bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/50 font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] border tracking-tight select-none cursor-default transition-colors",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

// --- BUTTON ---
export function Button({ className, variant = 'default', size = 'default', ...props }) {
  const base = "inline-flex items-center justify-center rounded-lg font-medium text-xs transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none gap-2 cursor-pointer active:scale-[0.98]";
  
  const variants = {
    default: "bg-card hover:bg-muted/80 border border-border text-foreground shadow-2xs",
    primary: "bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 font-semibold shadow-2xs border border-transparent",
    destructive: "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-700 dark:text-rose-400 font-medium",
    ghost: "hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-transparent",
    link: "underline-offset-4 hover:underline text-amber-600 dark:text-amber-400 p-0 font-medium",
  };

  const sizes = {
    default: "h-8 px-3.5 py-1.5 text-xs",
    sm: "h-7 rounded-md px-2.5 text-xs",
    lg: "h-9 rounded-lg px-5 text-sm font-medium",
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
        "w-full px-3 py-1.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors shadow-2xs",
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
        "w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors shadow-2xs resize-y",
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
        "w-full px-3 py-1.5 bg-card border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors cursor-pointer shadow-2xs",
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
      className="w-full overflow-x-auto border border-border/80 rounded-xl bg-card shadow-2xs transition-colors duration-150"
    >
      <table className={cn("w-full border-collapse text-left text-xs", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("sticky top-0 z-10 bg-slate-100/70 dark:bg-slate-900/60 border-b border-border/80 text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide select-none", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-border/40 bg-card", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group duration-150", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th className={cn("px-3.5 py-3 font-medium tracking-wide text-[11px] text-slate-500 dark:text-slate-400", className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td className={cn("px-3.5 py-3 text-slate-700 dark:text-slate-300 font-normal align-middle text-xs tabular-nums", className)} {...props} />;
}

// --- METRIC CARD ---
export function MetricCard({ label, value, sub, trend, trendUp, icon: Icon, color = "blue", className }) {
  return (
    <div className={cn("bg-card border border-border/80 rounded-xl p-5 flex flex-col justify-between shadow-2xs transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-700", className)}>
      <div className="flex items-start justify-between">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center border border-border/60">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        {trend && (
          <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border", trendUp ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20")}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>
      <div className="mt-3.5">
        <div className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</div>
        <div className="text-xs font-medium text-muted-foreground mt-1">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground/80 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// --- STATUS PILL ---
export function StatusPill({ status, className }) {
  if (!status) return null;
  const s = String(status).toLowerCase();

  const styles = {
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    completed: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    "on-hold": "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20",
    pending: "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    draft: "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/40",
    paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    overdue: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    suspended: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    inactive: "bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/50",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />
      
      {/* Content wrapper */}
      <div 
        className={cn("relative w-full bg-card border border-border/80 rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col transition-colors duration-150 text-foreground", maxWidth)}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/80 bg-muted/20 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}



