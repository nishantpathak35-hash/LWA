import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../app/lib/utils';
import { X } from 'lucide-react';

// --- CARD ---
export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "bg-card border border-border shadow-xs rounded-xl overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-800/90",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-base font-semibold tracking-tight text-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-6", className)} {...props} />;
}

// --- BADGE ---
export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300",
    ok: "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold",
    success: "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold",
    remitted: "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold",
    approved: "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold",
    paid: "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold",
    err: "border-rose-200 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold",
    error: "border-rose-200 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold",
    rejected: "border-rose-200 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold",
    pending: "border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold",
    warning: "border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold",
    info: "border-sky-200 dark:border-sky-800/80 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold",
    processing: "border-sky-200 dark:border-sky-800/80 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold",
    active: "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold",
    inactive: "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40 text-slate-500 font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide transition-all duration-200 hover:scale-[1.04] select-none cursor-default",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

// --- BUTTON ---
export function Button({ className, variant = 'default', size = 'default', ...props }) {
  const base = "inline-flex items-center justify-center rounded-lg font-medium text-sm transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:focus:ring-gold/30 disabled:opacity-50 disabled:cursor-not-allowed select-none gap-2 cursor-pointer";
  
  const variants = {
    default: "bg-card hover:bg-muted border border-border text-foreground shadow-2xs hover:scale-[1.02] active:scale-[0.97]",
    primary: "bg-amber-700 hover:bg-amber-800 dark:bg-gold dark:hover:bg-gold/90 text-white dark:text-slate-950 font-semibold shadow-xs hover:shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.97] border border-amber-800/20 dark:border-transparent",
    destructive: "bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:scale-[1.02] active:scale-[0.97] font-medium",
    ghost: "hover:bg-muted text-muted-foreground hover:text-foreground hover:scale-[1.02] active:scale-[0.97]",
    link: "underline-offset-4 hover:underline text-primary p-0 hover:scale-105 active:scale-95",
  };

  const sizes = {
    default: "h-9 px-4 py-2 text-sm",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-lg px-6 text-sm font-semibold",
    icon: "h-8 w-8 p-0 rounded-lg",
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
        "w-full px-3.5 py-2 bg-card border border-slate-300 dark:border-slate-800 rounded-lg text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-amber-600 dark:focus:border-gold focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-gold/20 focus:scale-[1.002] transition-all duration-200 shadow-2xs",
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
        "w-full px-3.5 py-2 bg-card border border-slate-300 dark:border-slate-800 rounded-lg text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:border-amber-600 dark:focus:border-gold focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-gold/20 focus:scale-[1.002] transition-all duration-200 shadow-2xs resize-y",
        className
      )}
      style={{ minHeight: '90px', ...style }}
      {...props}
    />
  );
}

// --- SELECT ---
export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "w-full px-3.5 py-2 bg-card border border-slate-300 dark:border-slate-800 rounded-lg text-foreground text-sm focus:outline-none focus:border-amber-600 dark:focus:border-gold focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-gold/20 focus:scale-[1.002] transition-all duration-200 cursor-pointer shadow-2xs",
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
      className="w-full overflow-x-auto border border-border rounded-xl bg-card shadow-xs transition-colors duration-200"
    >
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("sticky top-0 z-10 bg-[hsl(var(--table-header-bg))] border-b border-border text-[11px] font-bold text-[hsl(var(--table-header-text))] uppercase tracking-wider", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-border/70 bg-card", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("hover:bg-[hsl(var(--table-hover))] transition-all duration-150 group", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th className={cn("px-4 py-3.5 font-bold tracking-wider text-[11px]", className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td className={cn("px-4 py-3.5 text-foreground font-medium align-middle text-sm", className)} {...props} />;
}

// --- METRIC CARD ---
export function MetricCard({ label, value, sub, trend, trendUp, icon: Icon, color = "blue", className }) {
  const iconColors = {
    blue: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40",
    green: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40",
    amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40",
    red: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40",
    purple: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40",
    gold: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40",
  };

  return (
    <div className={cn("bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 hover:-translate-y-0.5", className)}>
      <div className="flex items-start justify-between">
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-transform hover:scale-110", iconColors[color] || iconColors.blue)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
        {trend && (
          <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border transition-all hover:scale-105", trendUp ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60" : "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60")}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-foreground font-mono">{value}</div>
        <div className="text-xs font-medium text-muted-foreground mt-1">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground/75 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// --- STATUS PILL ---
export function StatusPill({ status, className }) {
  if (!status) return null;
  const s = String(status).toLowerCase();

  const styles = {
    active: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
    completed: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
    "on-hold": "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
    pending: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
    approved: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
    rejected: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
    draft: "bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800",
    paid: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
    overdue: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
    suspended: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
    inactive: "bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800",
  };

  const labels = {
    "on-hold": "On Hold",
  };

  const formattedLabel = labels[s] || s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-tight transition-all duration-200 hover:scale-105 select-none cursor-default", styles[s] || "bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800", className)}>
      {formattedLabel}
    </span>
  );
}

// --- PRIORITY PILL ---
export function PriorityPill({ priority, className }) {
  if (!priority) return null;
  const p = String(priority).toLowerCase();
  const colors = { high: "text-rose-600 dark:text-rose-400", medium: "text-amber-600 dark:text-amber-400", low: "text-slate-500 dark:text-slate-400" };
  const dots = { high: "bg-rose-500", medium: "bg-amber-400", low: "bg-slate-400" };

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium capitalize select-none transition-transform hover:scale-105", colors[p] || "text-slate-500", className)}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Content wrapper */}
      <div 
        className={cn("relative w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col transition-colors duration-200 text-foreground", maxWidth)}
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
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


