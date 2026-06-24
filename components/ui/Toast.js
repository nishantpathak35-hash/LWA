'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../app/lib/utils';

let toastCount = 0;
const listeners = new Set();

export const toast = (message, options = {}) => {
  const id = ++toastCount;
  const t = { id, message, type: options.type || 'info', duration: options.duration || 3000 };
  listeners.forEach(fn => fn(t));
};

toast.success = (msg, opts) => toast(msg, { ...opts, type: 'success' });
toast.error = (msg, opts) => toast(msg, { ...opts, type: 'error' });

export function Toaster() {
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleToast = (t) => {
      setToasts(prev => [...prev, t]);
      if (t.duration !== Infinity) {
        setTimeout(() => {
          setToasts(prev => prev.filter(item => item.id !== t.id));
        }, t.duration);
      }
    };
    listeners.add(handleToast);
    return () => listeners.delete(handleToast);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div 
          key={t.id} 
          className={cn(
            "pointer-events-auto flex items-center gap-3 bg-slate-950/90 backdrop-blur-md border px-4 py-3 rounded-xl shadow-2xl min-w-[320px] transition-all transform animate-in slide-in-from-bottom-5 fade-in duration-300",
            t.type === 'success' ? "border-emerald-500/30" : 
            t.type === 'error' ? "border-red-500/30" : "border-slate-800"
          )}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
          {t.type === 'error' && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-sky-500 flex-shrink-0" />}
          
          <span className="text-sm font-medium text-slate-100">{t.message}</span>
          
          <button 
            onClick={() => setToasts(prev => prev.filter(i => i.id !== t.id))} 
            className="ml-auto text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
             <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
