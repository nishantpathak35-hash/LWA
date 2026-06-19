import React from 'react';
import { cn } from '../../app/lib/utils';
import { X } from 'lucide-react';

// --- CARD ---
export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-900 bg-slate-950/60 shadow-xl shadow-black/10 backdrop-blur-md overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("p-6 border-b border-slate-900/60 flex items-center justify-between", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-lg font-light tracking-tight text-slate-100 font-serif", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-6", className)} {...props} />;
}

// --- BADGE ---
export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: "border-slate-800 bg-slate-900/40 text-slate-400",
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
    inactive: "border-slate-800 bg-slate-900/40 text-slate-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide",
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
    default: "bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 active:bg-slate-950",
    primary: "bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-600 hover:to-gold active:from-yellow-700 text-slate-950 font-semibold shadow-md shadow-gold/5",
    destructive: "bg-red-950/20 hover:bg-red-950/40 border border-red-900/50 text-red-400 active:bg-red-950/60",
    ghost: "hover:bg-slate-900/60 text-slate-400 hover:text-slate-200",
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
        "w-full px-3.5 py-2 bg-slate-950 border border-slate-900 rounded-lg text-slate-200 placeholder-slate-650 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all",
        className
      )}
      {...props}
    />
  );
}

// --- SELECT ---
export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "w-full px-3.5 py-2 bg-slate-950 border border-slate-900 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all cursor-pointer",
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
    <div className="w-full overflow-x-auto border border-slate-900 rounded-lg bg-slate-950/40">
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("bg-slate-950 border-b border-slate-900 text-xs font-semibold text-slate-400 uppercase tracking-wider", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("divide-y divide-slate-900/60 bg-transparent", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn("hover:bg-slate-900/30 transition-colors group", className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return <th className={cn("px-6 py-4 font-semibold", className)} {...props} />;
}

export function TableCell({ className, ...props }) {
  return <td className={cn("px-6 py-4 text-slate-300 font-light", className)} {...props} />;
}

// --- DIALOG / MODAL ---
export function Dialog({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Content wrapper */}
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-900 rounded-xl shadow-2xl overflow-hidden z-10 animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-900/60 flex items-center justify-between">
          <h3 className="text-lg font-light tracking-tight text-slate-100 font-serif">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-900 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
