import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../app/lib/utils';
import { X } from 'lucide-react';

// --- CARD ---
export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/60 shadow-xl shadow-black/5 backdrop-blur-md overflow-hidden transition-colors duration-200",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("p-6 border-b border-border/60 flex items-center justify-between", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-lg font-light tracking-tight text-foreground font-serif", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-6", className)} {...props} />;
}

// --- BADGE ---
export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: "border-border bg-muted/40 text-muted-foreground",
    ok: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    success: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    remitted: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    err: "border-red-500/20 bg-red-500/5 text-red-400",
    error: "border-red-500/20 bg-red-500/5 text-red-400",
    rejected: "border-red-500/20 bg-red-500/5 text-red-400",
    pending: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    warning: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    info: "border-sky-500/20 bg-sky-500/5 text-sky-400",
    active: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    inactive: "border-border bg-muted/20 text-muted-foreground/60",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide transition-colors duration-200",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

// --- BUTTON ---
export function Button({ className, variant = 'default', size = 'default', ...props }) {
  const base = "inline-flex items-center justify-center rounded-lg font-medium text-sm transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none gap-2";
  
  const variants = {
    default: "bg-muted hover:bg-muted/80 border border-border text-foreground active:bg-background/85",
    primary: "bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-600 hover:to-gold active:from-yellow-700 text-slate-950 font-semibold shadow-md shadow-gold/5",
    destructive: "bg-red-950/20 hover:bg-red-950/40 border border-red-900/50 text-red-400 active:bg-red-950/60",
    ghost: "hover:bg-muted text-muted-foreground hover:text-foreground",
    link: "underline-offset-4 hover:underline text-primary p-0",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-11 rounded-lg px-8",
    icon: "h-9 w-9 p-0",
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
        "w-full px-3.5 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all duration-200",
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
        "w-full px-3.5 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all duration-200 resize-y",
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
        "w-full px-3.5 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all duration-200 cursor-pointer",
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
    <div className="w-full overflow-x-auto border border-border rounded-lg bg-card/40 transition-colors duration-200">
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-border/60 bg-transparent", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("hover:bg-muted/30 transition-colors duration-200 group", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th className={cn("px-6 py-4 font-semibold", className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td className={cn("px-6 py-4 text-foreground/90 font-light", className)} {...props} />;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Content wrapper */}
      <div 
        className={cn("relative w-full bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-10 animate-fade-in flex flex-col transition-colors duration-200", maxWidth)}
        style={{ maxHeight: '95vh' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between">
          <h3 className="text-lg font-light tracking-tight text-foreground font-serif">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-all"
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
