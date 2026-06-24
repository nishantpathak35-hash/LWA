'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '../StateProvider';
import { Search, FileText, Building2, Briefcase, ChevronRight, X } from 'lucide-react';

export function CommandPalette() {
  const { pos, vendors, projects, setActiveView, setTargetPo } = useAppState();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!mounted || !open) return null;

  const normalizedQuery = query.toLowerCase().trim();
  
  let results = [];
  if (normalizedQuery) {
    // Search POs
    const matchedPOs = pos.filter(po => 
      po.po_no.toLowerCase().includes(normalizedQuery) || 
      (po.project && po.project.toLowerCase().includes(normalizedQuery)) ||
      (po.vendor_name && po.vendor_name.toLowerCase().includes(normalizedQuery))
    ).slice(0, 5).map(po => ({
      id: po.po_no,
      type: 'PO',
      title: po.po_no,
      subtitle: `${po.vendor_name || 'Unknown Vendor'} • ${po.project || 'No Project'}`,
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      action: () => {
        setTargetPo(po.po_no);
        setActiveView('pos');
        setOpen(false);
      }
    }));

    // Search Vendors
    const matchedVendors = vendors.filter(v => 
      v.name.toLowerCase().includes(normalizedQuery) ||
      (v.vendor_type && v.vendor_type.toLowerCase().includes(normalizedQuery))
    ).slice(0, 3).map(v => ({
      id: `vendor-${v.id}`,
      type: 'Vendor',
      title: v.name,
      subtitle: v.vendor_type || 'Vendor',
      icon: <Building2 className="w-4 h-4 text-sky-400" />,
      action: () => {
        // We don't have a specific vendor expander yet, but we can jump to vendors tab
        setActiveView('vendors');
        setOpen(false);
      }
    }));

    // Search Projects
    const matchedProjects = projects.filter(p => 
      p.project.toLowerCase().includes(normalizedQuery)
    ).slice(0, 3).map(p => ({
      id: `project-${p.project}`,
      type: 'Project',
      title: p.project,
      subtitle: `Value: ₹${Number(p.projectValue || 0).toLocaleString()}`,
      icon: <Briefcase className="w-4 h-4 text-amber-400" />,
      action: () => {
        setActiveView('dashboard');
        setOpen(false);
      }
    }));

    results = [...matchedPOs, ...matchedVendors, ...matchedProjects];
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) {
        results[activeIndex].action();
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setOpen(false)} />
      
      <div className="relative w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-200">
        <div className="flex items-center px-4 py-3 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-lg focus:outline-none"
            placeholder="Search POs, Vendors, Projects..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <button onClick={() => setOpen(false)} className="p-1 rounded-md text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query && (
            <div className="p-8 text-center text-slate-500 text-sm">
              <p>Type to search across the entire application.</p>
              <p className="mt-2 text-xs">Try searching for a PO number, vendor name, or project.</p>
            </div>
          )}
          
          {query && results.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              No results found for "{query}"
            </div>
          )}

          {results.map((res, idx) => (
            <div
              key={res.id}
              onClick={res.action}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${idx === activeIndex ? 'bg-slate-800/80 text-white' : 'text-slate-300 hover:bg-slate-900/50'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg bg-slate-900 shadow-sm border border-slate-800 ${idx === activeIndex ? 'border-slate-700' : ''}`}>
                  {res.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm">{res.title}</div>
                  <div className={`text-xs ${idx === activeIndex ? 'text-slate-400' : 'text-slate-500'}`}>{res.subtitle}</div>
                </div>
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded-md ${idx === activeIndex ? 'bg-slate-700 text-slate-300' : 'bg-slate-900 border border-slate-800 text-slate-500'}`}>
                {res.type}
              </div>
            </div>
          ))}
        </div>
        
        <div className="px-4 py-3 border-t border-slate-800/50 bg-slate-900/50 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">↓</kbd> to navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">↵</kbd> to select</span>
          </div>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">esc</kbd> to close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
