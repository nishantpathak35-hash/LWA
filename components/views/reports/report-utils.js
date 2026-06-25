import React from 'react';
import { Badge } from '../../ui/core';
import { cn } from '../../../app/lib/utils';

export function fmtRupees(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function fmtLakhs(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00 L';
  const lakhs = Number(amount) / 100000;
  return lakhs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' L';
}

export function stageBadge(stage) {
  const s = String(stage || '').toLowerCase();
  if (s === 'remitted') return <Badge variant="remitted">Remitted</Badge>;
  if (s === 'rejected') return <Badge variant="rejected">Rejected</Badge>;
  if (s === 'approved') return <Badge variant="success">Approved</Badge>;
  if (s === 'pending') return <Badge variant="pending">Pending</Badge>;
  return <Badge variant="default">{stage}</Badge>;
}

export function wfSteps(p) {
  const steps = [];
  const roles = p.stageRoles || [];
  const current = String(p.stage || '').toLowerCase();

  const isProc = roles.includes('proc');
  const isFin = roles.includes('finance');
  const isDir = roles.includes('director');

  return (
    <div className="flex gap-1">
      <span className={cn("text-[10px] px-1 rounded border", isProc ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-slate-800 text-slate-600")}>P</span>
      <span className={cn("text-[10px] px-1 rounded border", isFin ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-slate-800 text-slate-600")}>F</span>
      <span className={cn("text-[10px] px-1 rounded border", isDir ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-slate-800 text-slate-600")}>D</span>
    </div>
  );
}
