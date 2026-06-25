'use client';
import React, { useId } from 'react';
import { Button } from '../../ui/core';

const ITEMS_PER_PAGE = 10;

export const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const pct100 = (v) => num(v) * 100;

export const fmtLakhs = (amount) => {
  const lakhs = num(amount) / 100000;
  return lakhs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' L';
};

export const fmtRupees = (amount) => {
  return '₹' + num(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const fmtPct = (amount) => {
  return num(amount).toFixed(1) + '%';
};

export function paginateItems(items, page) {
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * ITEMS_PER_PAGE;
  return {
    pageItems: items.slice(start, start + ITEMS_PER_PAGE),
    totalPages,
    currentPage: safePage
  };
}

export function PaginationControls({ currentPage, totalPages, totalItems, label, onPageChange }) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[11px] font-semibold text-gold">
        {totalItems === 0 ? `Showing 0 ${label}` : `Showing ${startItem}-${endItem} of ${totalItems} ${label}`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="min-w-20 text-center text-[11px] text-muted-foreground">
          Page {currentPage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function Sparkline({ data = [], color = 'rgba(197, 168, 106, 0.95)' }) {
  const gradId = useId();
  const cleanData = data.map(num);
  if (cleanData.length < 2) return null;

  let min = cleanData[0];
  let max = cleanData[0];
  for (let i = 0; i < cleanData.length; i++) {
    if (cleanData[i] < min) min = cleanData[i];
    if (cleanData[i] > max) max = cleanData[i];
  }
  if (min === max) { min -= 1; max += 1; }

  const w = 92, h = 34, pad = 2;
  const pts = [];
  for (let i = 0; i < cleanData.length; i++) {
    const x = pad + (i * (w - 2 * pad)) / (cleanData.length - 1);
    const y = pad + (1 - (cleanData[i] - min) / (max - min)) * (h - 2 * pad);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  const pointsStr = pts.join(' ');

  return (
    <svg className="overflow-visible" viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline points={pointsStr} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
      <path d={`M ${pts[0]} L ${pts.join(' L ')} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`}
        fill={`url(#${gradId})`} opacity={0.9} />
    </svg>
  );
}

export function DonutChart({ slices = [], totalVal = 0 }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const visibleSlices = slices.reduce((acc, s) => {
    const v = num(s.value);
    const len = c * (v / totalVal);
    const strokeOffset = -acc.offset;
    return { offset: acc.offset + len, items: [...acc.items, { ...s, len, strokeOffset }] };
  }, { offset: 0, items: [] }).items;

  return (
    <svg viewBox="0 0 132 132" width={132} height={132} className="relative z-10">
      <circle cx="66" cy="66" r={r} fill="transparent" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="12" />
      {visibleSlices.map((s, idx) => (
        <circle key={idx} cx="66" cy="66" r={r} fill="transparent"
          stroke={s.color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${s.len.toFixed(2)} ${(c - s.len).toFixed(2)}`}
          strokeDashoffset={s.strokeOffset.toFixed(2)} opacity={0.95} />
      ))}
    </svg>
  );
}
