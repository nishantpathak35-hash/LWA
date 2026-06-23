'use client';

import React, { useState, useEffect, useId, useCallback } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Dialog } from '../ui/core';
import { PlusCircle, Search, Edit2, TrendingUp, AlertCircle, CheckCircle, XCircle, FileText, ArrowRight, DollarSign, Activity } from 'lucide-react';
import { cn } from '../../app/lib/utils';

const ITEMS_PER_PAGE = 10;

// Math/Number converters
const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const pct100 = (v) => num(v) * 100;

// Formatters
const fmtLakhs = (amount) => {
  const lakhs = num(amount) / 100000;
  return lakhs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' L';
};

const fmtRupees = (amount) => {
  return '₹' + num(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const fmtPct = (amount) => {
  return num(amount).toFixed(1) + '%';
};

// React component version of Sparkline SVG
function Sparkline({ data = [], color = 'rgba(197, 168, 106, 0.95)' }) {
  const gradId = useId();
  const cleanData = data.map(num);
  if (cleanData.length < 2) return null;
  
  let min = cleanData[0];
  let max = cleanData[0];
  for (let i = 0; i < cleanData.length; i++) {
    if (cleanData[i] < min) min = cleanData[i];
    if (cleanData[i] > max) max = cleanData[i];
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const w = 92;
  const h = 34;
  const pad = 2;
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
      <polyline
        points={pointsStr}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.95}
      />
      <path
        d={`M ${pts[0]} L ${pts.join(' L ')} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`}
        fill={`url(#${gradId})`}
        opacity={0.9}
      />
    </svg>
  );
}

// React component version of Donut SVG
function DonutChart({ slices = [], totalVal = 0 }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const visibleSlices = slices.reduce((acc, s) => {
    const v = num(s.value);
    const len = c * (v / totalVal);
    const strokeOffset = -acc.offset;
    return {
      offset: acc.offset + len,
      items: [
        ...acc.items,
        {
          ...s,
          len,
          strokeOffset,
        },
      ],
    };
  }, { offset: 0, items: [] }).items;

  return (
    <svg viewBox="0 0 132 132" width={132} height={132} className="relative z-10">
      <circle cx="66" cy="66" r={r} fill="transparent" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="12" />
      {visibleSlices.map((s, idx) => {
        return (
          <circle
            key={idx}
            cx="66"
            cy="66"
            r={r}
            fill="transparent"
            stroke={s.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${s.len.toFixed(2)} ${(c - s.len).toFixed(2)}`}
            strokeDashoffset={s.strokeOffset.toFixed(2)}
            opacity={0.95}
          />
        );
      })}
    </svg>
  );
}

function paginateItems(items, page) {
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * ITEMS_PER_PAGE;
  return {
    pageItems: items.slice(start, start + ITEMS_PER_PAGE),
    totalPages,
    currentPage: safePage
  };
}

function PaginationControls({ currentPage, totalPages, totalItems, label, onPageChange }) {
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

export default function DashboardView() {
  const { kpis, user, setActiveView, call } = useAppState();

  const [projectsList, setProjectsList] = useState([]);
  const [approvalMetrics, setApprovalMetrics] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, overBudget: 0, tdsApplicable: 0 });
  const [vendorsList, setVendorsList] = useState([]);
  
  const [cashflowSearchQ, setCashflowSearchQ] = useState('');
  const [financialSearchQ, setFinancialSearchQ] = useState('');
  const [cashflowPage, setCashflowPage] = useState(1);
  const [financialPage, setFinancialPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Edit financials state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [boqVal, setBoqVal] = useState(0);
  const [bcsVal, setBcsVal] = useState(0);
  const [inflowVal, setInflowVal] = useState(0);
  const [clientDebitVal, setClientDebitVal] = useState(0);
  const [tdsVal, setTdsVal] = useState(0);
  const [savingFinancials, setSavingFinancials] = useState(false);

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Project details (financial performance)
      const projs = await call('getProjectDetails');
      setProjectsList(projs || []);

      // 2. Approval Queue Metrics
      const queue = await call('getApprovalQueue', {});
      if (queue) {
        setApprovalMetrics({
          total: queue.length,
          pending: queue.filter(r => r.approval_status === 'pending').length,
          approved: queue.filter(r => r.approval_status === 'approved').length,
          rejected: queue.filter(r => r.approval_status === 'rejected').length,
          overBudget: queue.filter(r => r.is_overbudget_approval || r.overbudget === 1).length,
          tdsApplicable: queue.filter(r => num(r.tds_amount) > 0).length
        });
      }

      // 3. Vendors summary
      const vSummary = await call('getVendorSummary', '');
      setVendorsList(vSummary || []);
    } catch (e) {
      console.error('Failed to load dashboard detailed statistics:', e);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDashboardData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboardData]);

  const filterProjects = (query) => projectsList.filter(r => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = [r.project, r.projectName, r.clientName, r.category].join(' ').toLowerCase();
    return haystack.includes(q);
  });

  const filteredCashflowProjects = filterProjects(cashflowSearchQ);
  const filteredFinancialProjects = filterProjects(financialSearchQ);

  const cashflowPagination = paginateItems(filteredCashflowProjects, cashflowPage);
  const financialPagination = paginateItems(filteredFinancialProjects, financialPage);

  // Calculate Totals
  let totPV = 0, totInflow = 0, totPendInflow = 0;
  let totBCS = 0, totPGM = 0, totPO = 0, totAGM = 0, totPendOut = 0, totBal = 0;

  filteredCashflowProjects.forEach(r => {
    totPV += num(r.projectValue);
    totInflow += num(r.inflow);
    totPendInflow += num(r.pendingInflow);
  });

  filteredFinancialProjects.forEach(r => {
    totBCS += num(r.bcs);
    totPGM += num(r.plannedGM);
    totPO += num(r.poIssued);
    totAGM += num(r.actualGM);
    totPendOut += num(r.pendingOutflow);
    totBal += num(r.balanceAvailable);
  });

  // Generate sparklines datasets
  const spPV = filteredCashflowProjects.map(r => num(r.projectValueTax || r.projectValue));
  const spIn = filteredCashflowProjects.map(r => num(r.inflow));
  const spPin = filteredCashflowProjects.map(r => num(r.pendingInflow));
  const spBCS = filteredFinancialProjects.map(r => num(r.bcs));
  const spPGM = filteredFinancialProjects.map(r => num(r.plannedGM));
  const spPO = filteredFinancialProjects.map(r => num(r.poIssued));
  const spAGM = filteredFinancialProjects.map(r => num(r.actualGM));
  const spOut = filteredFinancialProjects.map(r => num(r.pendingOutflow));
  const spBal = filteredFinancialProjects.map(r => num(r.balanceAvailable));

  // Payment pipeline segments calculation
  const p = kpis?.payments || {};
  const stageParts = [
    { k: 'Procurement', v: num(p.pendingProc || 0), c: 'rgba(245,158,11,.95)' },
    { k: 'Finance', v: num(p.pendingFinance || 0), c: 'rgba(155,114,248,.95)' },
    { k: 'Director', v: num(p.pendingDirector || 0), c: 'rgba(91,141,239,.95)' },
    { k: 'Ready to Remit', v: num(p.readyToRemit || 0), c: 'rgba(34,211,238,.95)' },
    { k: 'Remitted', v: num(p.remitted || 0), c: 'rgba(61,214,140,.95)' }
  ];
  const stageTotal = stageParts.reduce((a, s) => a + s.v, 0) || 1;

  // Top vendors payables calculations
  const sortedVendors = [...vendorsList]
    .sort((a, b) => num(b.totalPayable) - num(a.totalPayable))
    .slice(0, 5);
  const totalVendorPayable = vendorsList.reduce((a, v) => a + num(v.totalPayable), 0);

  const vendorPalette = [
    'rgba(200,164,90,.95)',
    'rgba(34,211,238,.95)',
    'rgba(155,114,248,.95)',
    'rgba(245,158,11,.95)',
    'rgba(61,214,140,.95)'
  ];
  const vendorSlices = sortedVendors.map((v, i) => ({
    label: v.vendor,
    value: num(v.totalPayable),
    color: vendorPalette[i % vendorPalette.length]
  })).filter(s => s.value > 0);

  const handleOpenEditModal = (proj) => {
    setEditProject(proj);
    setBoqVal(num(proj.projectValue));
    setBcsVal(num(proj.bcs));
    setInflowVal(num(proj.inflow));
    setClientDebitVal(num(proj.invoiceValue));
    setTdsVal(num(proj.tds));
    setEditModalOpen(true);
  };

  const handleSaveFinancials = async (e) => {
    e.preventDefault();
    setSavingFinancials(true);
    try {
      const payload = {
        project: editProject.project,
        projectValue: boqVal,
        bcs: bcsVal,
        inflow: inflowVal,
        clientDebit: clientDebitVal,
        tds: tdsVal
      };
      await call('updateProjectFinancials', payload);
      alert('Project financial performance updated successfully.');
      setEditModalOpen(false);
      loadDashboardData();
    } catch (e) {
      alert('Error updating project details: ' + (e.message || String(e)));
    } finally {
      setSavingFinancials(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-foreground">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-gradient-to-r from-card to-card/20 border border-border rounded-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-gold/5 rounded-full blur-[80px]" />
        <div>
          <h2 className="text-2xl font-light tracking-tight font-serif text-foreground">
            Welcome back, <span className="font-normal text-gold">{user?.name || user?.email}</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-light">
            Real-time Project Balances, Outflow Ledger, Approvals and Studio Performance Metrics.
          </p>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <button
            onClick={() => setActiveView('payments')}
            className="flex flex-col items-center justify-center p-6 bg-card border border-border hover:border-gold/30 rounded-xl transition-all hover:-translate-y-0.5 group"
          >
            <span className="text-xs text-gold font-semibold uppercase tracking-wider">New Payment Request</span>
            <div className="text-3xl my-3 text-gold group-hover:scale-110 transition-transform">+</div>
            <span className="text-[11px] text-muted-foreground font-light">Initiate a vendor payment request</span>
          </button>
          <button
            onClick={() => setActiveView('pos')}
            className="flex flex-col items-center justify-center p-6 bg-card border border-border hover:border-gold/30 rounded-xl transition-all hover:-translate-y-0.5 group"
          >
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">New Purchase Order</span>
            <div className="text-3xl my-3 text-emerald-400 group-hover:scale-110 transition-transform">📄</div>
          </button>
          <button
            onClick={() => setActiveView('payments')}
            className="flex flex-col items-center justify-center p-6 bg-card border border-border hover:border-gold/30 rounded-xl transition-all hover:-translate-y-0.5 group"
          >
            <span className="text-xs text-gold font-semibold uppercase tracking-wider">Approvals Queue</span>
            <div className="text-3xl my-3 text-gold group-hover:scale-110 transition-transform">✓</div>
            <span className="text-[11px] text-muted-foreground font-light">Review pending workflow stages</span>
          </button>
        </div>
      </div>

      {/* ── Approval Queue KPIs ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Approval Queue Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Requests</div>
            <div className="text-2xl font-light text-foreground mt-2 font-serif">{approvalMetrics.total}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider text-gold">Pending</div>
            <div className="text-2xl font-light text-gold mt-2 font-serif">{approvalMetrics.pending}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider text-emerald-400">Approved</div>
            <div className="text-2xl font-light text-emerald-400 mt-2 font-serif">{approvalMetrics.approved}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider text-red-400">Rejected</div>
            <div className="text-2xl font-light text-red-400 mt-2 font-serif">{approvalMetrics.rejected}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider text-amber-500">Over-Budget</div>
            <div className="text-2xl font-light text-amber-500 mt-2 font-serif">{approvalMetrics.overBudget}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider text-violet-400">TDS Applicable</div>
            <div className="text-2xl font-light text-violet-400 mt-2 font-serif">{approvalMetrics.tdsApplicable}</div>
          </div>
        </div>
      </div>

      {/* ── Project Level Details (Cashflow) ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-md font-light text-foreground font-serif">Project Level Cashflow Details</h3>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              className="w-56 h-8 text-xs"
              placeholder="Search project name..."
              value={cashflowSearchQ}
              onChange={e => {
                setCashflowSearchQ(e.target.value);
                setCashflowPage(1);
              }}
            />
            <span className="text-[11px] font-semibold text-gold">
              {filteredCashflowProjects.length} MATCHING PROJECTS
            </span>
          </div>
        </div>

        {/* Project Cashflow Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="flex items-center justify-between p-6">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Project Value</div>
              <div className="text-2xl font-light text-foreground mt-2 font-serif">{fmtLakhs(totPV)}</div>
            </div>
            <div className="w-24 h-10">
              <Sparkline data={spPV} color="rgba(200,164,90,.95)" />
            </div>
          </Card>
          <Card className="flex items-center justify-between p-6">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider text-emerald-400">Inflow</div>
              <div className="text-2xl font-light text-emerald-400 mt-2 font-serif">{fmtLakhs(totInflow)}</div>
            </div>
            <div className="w-24 h-10">
              <Sparkline data={spIn} color="rgba(61,214,140,.95)" />
            </div>
          </Card>
          <Card className="flex items-center justify-between p-6">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider text-amber-500">Pending Inflow</div>
              <div className="text-2xl font-light text-amber-500 mt-2 font-serif">{fmtLakhs(totPendInflow)}</div>
            </div>
            <div className="w-24 h-10">
              <Sparkline data={spPin} color="rgba(245,158,11,.95)" />
            </div>
          </Card>
        </div>

        {/* Cashflow Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client Name</TableHead>
              <TableHead className="text-right">BOQ Value with Tax</TableHead>
              <TableHead className="text-right text-emerald-400">Inflow</TableHead>
              <TableHead className="text-right text-amber-500">Pending Inflow</TableHead>
              <TableHead className="text-center w-20">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCashflowProjects.length > 0 ? (
              cashflowPagination.pageItems.map((r, idx) => (
                <TableRow key={r.project || idx}>
                  <TableCell className="font-semibold text-slate-200">{r.project}</TableCell>
                  <TableCell className="text-right">{fmtLakhs(r.projectValueTax || r.projectValue)}</TableCell>
                  <TableCell className="text-right text-emerald-400">{fmtLakhs(r.inflow)}</TableCell>
                  <TableCell className="text-right text-amber-500">{fmtLakhs(r.pendingInflow)}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditModal(r)}>
                      <Edit2 className="w-3 h-3 text-gold" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                  No projects found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationControls
          currentPage={cashflowPagination.currentPage}
          totalPages={cashflowPagination.totalPages}
          totalItems={filteredCashflowProjects.length}
          label="projects"
          onPageChange={setCashflowPage}
        />
      </div>

      {/* ── Business Summary Charts (Stacked Pipeline + Vendor Donut) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Flow stacked bar */}
        <Card className="p-6">
          <div className="space-y-1 mb-6">
            <h4 className="font-bold text-slate-200 text-sm">Payment Flow</h4>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Approval pipeline distribution</p>
          </div>
          
          {/* Stacked bar */}
          <div className="w-full h-4 bg-muted rounded-full overflow-hidden flex mb-6">
            {stageParts.map((s, idx) => {
              const pct = (s.v / stageTotal) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={idx}
                  style={{ width: `${pct}%`, backgroundColor: s.c }}
                  className="h-full transition-all duration-300"
                  title={`${s.k}: ${s.v}`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-4">
            {stageParts.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.c }} />
                <span className="text-slate-400 font-light flex-1">{s.k}</span>
                <span className="font-bold text-slate-200">{s.v}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Vendor Exposure donut */}
        <Card className="p-6">
          <div className="space-y-1 mb-6">
            <h4 className="font-bold text-slate-200 text-sm">Vendor Exposure</h4>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-light">Top Payables Liability</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative flex justify-center items-center">
              <DonutChart slices={vendorSlices} totalVal={totalVendorPayable} />
              <div className="absolute text-center">
                <div className="text-base font-bold text-slate-100 font-serif">{fmtLakhs(totalVendorPayable)}</div>
                <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Total Payable</div>
              </div>
            </div>

            {/* List of top vendors */}
            <div className="flex-1 space-y-2.5 w-full">
              {vendorSlices.length > 0 ? (
                vendorSlices.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-400 font-light truncate">{s.label}</span>
                    </div>
                    <span className="font-bold text-slate-200 whitespace-nowrap">{fmtLakhs(s.value)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-slate-500 py-6">
                  No payables exposure logged.
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Financial Performance Details ── */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-md font-light text-foreground font-serif">Financial Performance Metrics</h3>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              className="w-56 h-8 text-xs"
              placeholder="Search financial metrics..."
              value={financialSearchQ}
              onChange={e => {
                setFinancialSearchQ(e.target.value);
                setFinancialPage(1);
              }}
            />
            <span className="text-[11px] font-semibold text-gold">
              {filteredFinancialProjects.length} MATCHING PROJECTS
            </span>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <Card className="p-4 flex flex-col justify-between h-24">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">BCS</div>
            <div className="text-lg font-light text-foreground font-serif">{fmtLakhs(totBCS)}</div>
            <div className="h-6"><Sparkline data={spBCS} color="rgba(34,211,238,.95)" /></div>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-violet-400">Planned GM</div>
            <div className="text-lg font-light text-violet-400 font-serif">{fmtLakhs(totPGM)}</div>
            <div className="h-6"><Sparkline data={spPGM} color="rgba(155,114,248,.95)" /></div>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">PO Issued</div>
            <div className="text-lg font-light text-foreground font-serif">{fmtLakhs(totPO)}</div>
            <div className="h-6"><Sparkline data={spPO} color="rgba(200,164,90,.95)" /></div>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-emerald-400">Actual GM</div>
            <div className="text-lg font-light text-emerald-400 font-serif">{fmtLakhs(totAGM)}</div>
            <div className="h-6"><Sparkline data={spAGM} color="rgba(61,214,140,.95)" /></div>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-amber-500">Pending Outflow</div>
            <div className="text-lg font-light text-amber-500 font-serif">{fmtLakhs(totPendOut)}</div>
            <div className="h-6"><Sparkline data={spOut} color="rgba(245,158,11,.95)" /></div>
          </Card>
          <Card className="p-4 flex flex-col justify-between h-24">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance Available</div>
            <div className={cn("text-lg font-serif font-light", totBal < 0 ? "text-red-400" : "text-emerald-400")}>
              {fmtLakhs(totBal)}
            </div>
            <div className="h-6">
              <Sparkline data={spBal} color={totBal < 0 ? "rgba(241,86,106,.95)" : "rgba(61,214,140,.95)"} />
            </div>
          </Card>
        </div>

        {/* Detailed Performance Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client Name</TableHead>
              <TableHead className="text-right">BOQ Value</TableHead>
              <TableHead className="text-right">BCS</TableHead>
              <TableHead className="text-right text-violet-400">Planned GM</TableHead>
              <TableHead className="text-right">P.O Issued</TableHead>
              <TableHead className="text-right text-emerald-400">Actual GM</TableHead>
              <TableHead className="text-right text-emerald-400">Achieved GM %</TableHead>
              <TableHead className="text-right text-amber-500">Pending Outflow</TableHead>
              <TableHead className="text-right">Balance Available</TableHead>
              <TableHead className="text-center w-10">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFinancialProjects.length > 0 ? (
              financialPagination.pageItems.map((r, idx) => {
                const boq = num(r.projectValueTax || r.projectValue);
                const bal = num(r.balanceAvailable);
                return (
                  <TableRow key={r.project || idx}>
                    <TableCell className="font-semibold text-slate-200">{r.project}</TableCell>
                    <TableCell className="text-right">{fmtLakhs(boq)}</TableCell>
                    <TableCell className="text-right">{fmtLakhs(r.bcs)}</TableCell>
                    <TableCell className="text-right text-violet-400">{fmtLakhs(r.plannedGM)}</TableCell>
                    <TableCell className="text-right">{fmtLakhs(r.poIssued)}</TableCell>
                    <TableCell className="text-right text-emerald-400">{fmtLakhs(r.actualGM)}</TableCell>
                    <TableCell className="text-right text-emerald-400">{fmtPct(pct100(r.actualGMPct))}</TableCell>
                    <TableCell className="text-right text-amber-500">{fmtLakhs(r.pendingOutflow)}</TableCell>
                    <TableCell className={cn("text-right font-bold", bal < 0 ? "text-red-400" : "text-emerald-400")}>
                      {fmtLakhs(bal)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditModal(r)}
                        title={`Edit financials for ${r.project}`}
                        className="text-gold/60 hover:text-gold hover:bg-gold/10"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                  No projects details found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <PaginationControls
          currentPage={financialPagination.currentPage}
          totalPages={financialPagination.totalPages}
          totalItems={filteredFinancialProjects.length}
          label="projects"
          onPageChange={setFinancialPage}
        />
      </div>

      {/* Edit Financials Dialog */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Project Financials">
        <form onSubmit={handleSaveFinancials} className="space-y-4">
          <div className="text-xs text-slate-400">
            Project: <strong className="text-slate-200">{editProject?.project}</strong>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-light">Total Project Value / BOQ (₹)</label>
              <Input
                type="number"
                value={boqVal}
                onChange={e => setBoqVal(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-light">Budgeted Cost Summary (BCS) (₹)</label>
              <Input
                type="number"
                value={bcsVal}
                onChange={e => setBcsVal(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-light">Total Inflow Received (₹)</label>
              <Input
                type="number"
                value={inflowVal}
                onChange={e => setInflowVal(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-light">Client Debit / Invoice Value (₹)</label>
              <Input
                type="number"
                value={clientDebitVal}
                onChange={e => setClientDebitVal(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-slate-400 font-light">Total TDS (₹)</label>
              <Input
                type="number"
                value={tdsVal}
                onChange={e => setTdsVal(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
            <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={savingFinancials}>
              {savingFinancials ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
