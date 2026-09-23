import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../app/lib/utils';
import { X } from 'lucide-react';

// --- CARD ---
export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground border border-border rounded-lg overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("px-5 py-3.5 border-b border-border flex items-center justify-between", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5", className)} {...props} />;
}

// --- BADGE ---
export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: "bg-muted text-muted-foreground",
    ok: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    remitted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    err: "bg-red-500/10 text-red-600 dark:text-red-400",
    error: "bg-red-500/10 text-red-600 dark:text-red-400",
    rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    processing: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    inactive: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium select-none cursor-default",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

// --- BUTTON ---
export function Button({ className, variant = 'default', size = 'default', ...props }) {
  const base = "inline-flex items-center justify-center rounded-md font-medium text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none gap-2 cursor-pointer";
  
  const variants = {
    default: "bg-card hover:bg-muted border border-border text-foreground",
    primary: "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold",
    destructive: "bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium",
    ghost: "hover:bg-muted text-muted-foreground hover:text-foreground",
    link: "underline-offset-4 hover:underline text-primary p-0 font-medium",
  };

  const sizes = {
    default: "h-8 px-3.5 py-1.5 text-xs",
    sm: "h-7 rounded-md px-2.5 text-xs",
    lg: "h-9 rounded-md px-5 text-sm",
    icon: "h-7 w-7 p-0 rounded-md",
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
        "w-full px-3 py-1.5 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors",
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
        "w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors resize-y",
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
        "w-full px-3 py-1.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// --- TABLE ---
export const Table = React.forwardRef(function Table({ className, containerClassName, containerRef, ...props }, ref) {
  return (
    <div ref={containerRef} className={cn("w-full overflow-x-auto border border-border rounded-lg bg-card", containerClassName)}>
      <table ref={ref} className={cn("w-full border-collapse text-left text-xs", className)} {...props} />
    </div>
  );
});

export function TableHeader({ className, ...props }) {
  return <thead className={cn("sticky top-0 z-10 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground select-none", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-border/50 bg-card", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("hover:bg-muted/40 transition-colors group", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th className={cn("px-3.5 py-2.5 font-medium text-xs text-muted-foreground", className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td className={cn("px-3.5 py-2.5 text-foreground/90 align-middle text-xs", className)} {...props} />;
}

// --- METRIC CARD ---
export function MetricCard({ label, value, sub, trend, trendUp, icon: Icon, className }) {
  return (
    <div className={cn("bg-card border border-border rounded-lg p-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground/60" />}
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-foreground tabular-nums">{value}</div>
      <div className="mt-1 flex items-center gap-2">
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        {trend && (
          <span className={cn("text-xs font-medium", trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>
    </div>
  );
}

// --- STATUS PILL ---
export function StatusPill({ status, className }) {
  if (!status) return null;
  const s = String(status).toLowerCase();

  const styles = {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    "on-hold": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
    draft: "bg-muted text-muted-foreground",
    paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    overdue: "bg-red-500/10 text-red-600 dark:text-red-400",
    suspended: "bg-red-500/10 text-red-600 dark:text-red-400",
    inactive: "bg-muted text-muted-foreground",
  };

  const labels = {
    "on-hold": "On Hold",
  };

  const formattedLabel = labels[s] || s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium select-none cursor-default", styles[s] || "bg-muted text-muted-foreground", className)}>
      {formattedLabel}
    </span>
  );
}

// --- PRIORITY PILL ---
export function PriorityPill({ priority, className }) {
  if (!priority) return null;
  const p = String(priority).toLowerCase();
  const colors = { high: "text-red-600 dark:text-red-400", medium: "text-amber-700 dark:text-amber-400", low: "text-muted-foreground" };
  const dots = { high: "bg-red-500", medium: "bg-amber-500", low: "bg-zinc-400" };

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium capitalize select-none", colors[p] || "text-muted-foreground", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dots[p] || "bg-zinc-400")} />
      {priority}
    </span>
  );
}

// --- DIALOG / MODAL ---
const dialogStack = [];
let bodyOverflowBeforeDialogs = '';
const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ open, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  const dialogRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = React.useId();
  React.useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    if (dialogStack.length === 0) {
      bodyOverflowBeforeDialogs = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    dialogStack.push(dialog);
    dialog.parentElement.style.zIndex = String(50 + dialogStack.length);
    const focusable = () => Array.from(dialog.querySelectorAll(focusableSelector)).filter(el => el.getClientRects().length > 0 && !el.closest('[inert]'));
    const focusFirst = () => (focusable()[0] || dialog).focus();
    focusFirst();
    const handleKeyDown = (e) => {
      if (dialogStack.at(-1) !== dialog) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
      } else if (e.key === 'Tab') {
        const elements = focusable();
        const first = elements[0];
        const last = elements.at(-1);
        if (!first) { e.preventDefault(); dialog.focus(); }
        else if (e.shiftKey && (document.activeElement === first || !elements.includes(document.activeElement))) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !elements.includes(document.activeElement))) {
          e.preventDefault(); first.focus();
        }
      }
    };
    const handleFocus = (e) => {
      if (dialogStack.at(-1) === dialog && !dialog.contains(e.target)) focusFirst();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocus);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocus);
      const wasTop = dialogStack.at(-1) === dialog;
      const index = dialogStack.indexOf(dialog);
      if (index !== -1) dialogStack.splice(index, 1);
      if (dialogStack.length === 0) document.body.style.overflow = bodyOverflowBeforeDialogs;
      if (wasTop && previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay — clean dark scrim, no blur */}
      <div 
        className="fixed inset-0 bg-black/60" 
        onClick={() => { if (dialogStack.at(-1) === dialogRef.current) onClose?.(); }}
      />
      
      {/* Content */}
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Dialog'}
        tabIndex={-1}
        className={cn("relative w-full bg-card border border-border rounded-lg shadow-elevated overflow-hidden z-10 flex flex-col text-foreground", maxWidth)}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 id={titleId} className="text-sm font-semibold text-foreground">{title}</h3>
          <button 
            type="button"
            aria-label="Close dialog"
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-md transition-colors cursor-pointer"
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
