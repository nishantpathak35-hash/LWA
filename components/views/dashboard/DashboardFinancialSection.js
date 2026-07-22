'use client';
import React from 'react';
import { Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Input } from '../../ui/core';
import { Search, Edit2 } from 'lucide-react';
import { cn } from '../../../app/lib/utils';
import { Sparkline, fmtLakhs, fmtPct, pct100, PaginationControls } from './dashboard-utils';

export default function DashboardFinancialSection({
  filteredFinancialProjects, financialSearchQ, setFinancialSearchQ, setFinancialPage,
  financialPagination, handleOpenEditModal,
  totBCS, totPGM, totPO, totAGM, totOut, totPendOut, totBal,
  spBCS, spPGM, spPO, spAGM, spOut, spPendOut, spBal
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold text-foreground tracking-tight">Financial Performance Metrics</h3>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            className="w-56 h-8 text-xs bg-card"
            placeholder="Search financial metrics..."
            value={financialSearchQ}
            onChange={e => {
              setFinancialSearchQ(e.target.value);
              setFinancialPage(1);
            }}
          />
          <span className="text-[11px] font-bold text-amber-700 dark:text-gold uppercase tracking-wider">
            {filteredFinancialProjects.length} MATCHING PROJECTS
          </span>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <Card className="p-3.5 flex flex-col justify-between h-24 shadow-2xs">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">BCS</div>
          <div className="text-lg font-bold text-foreground tabular-nums">{fmtLakhs(totBCS)}</div>
          <div className="h-5"><Sparkline data={spBCS} color="rgba(34,211,238,.95)" /></div>
        </Card>
        <Card className="p-3.5 flex flex-col justify-between h-24 shadow-2xs">
          <div className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">Planned GM</div>
          <div className="text-lg font-bold text-violet-700 dark:text-violet-400 tabular-nums">{fmtLakhs(totPGM)}</div>
          <div className="h-5"><Sparkline data={spPGM} color="rgba(155,114,248,.95)" /></div>
        </Card>
        <Card className="p-3.5 flex flex-col justify-between h-24 shadow-2xs">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">PO Issued</div>
          <div className="text-lg font-bold text-foreground tabular-nums">{fmtLakhs(totPO)}</div>
          <div className="h-5"><Sparkline data={spPO} color="rgba(200,164,90,.95)" /></div>
        </Card>
        <Card className="p-3.5 flex flex-col justify-between h-24 shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Actual GM</div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtLakhs(totAGM)}</div>
          <div className="h-5"><Sparkline data={spAGM} color="rgba(61,214,140,.95)" /></div>
        </Card>
        <Card className="p-3.5 flex flex-col justify-between h-24 shadow-2xs">
          <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Outflow (Paid)</div>
          <div className="text-lg font-bold text-rose-700 dark:text-rose-400 tabular-nums">{fmtLakhs(totOut)}</div>
          <div className="h-5"><Sparkline data={spOut} color="rgba(239,68,68,.95)" /></div>
        </Card>
        <Card className="p-3.5 flex flex-col justify-between h-24 shadow-2xs">
          <div className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Pending Outflow</div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-500 tabular-nums">{fmtLakhs(totPendOut)}</div>
          <div className="h-5"><Sparkline data={spPendOut} color="rgba(245,158,11,.95)" /></div>
        </Card>
        <Card className="p-3.5 flex flex-col justify-between h-24 shadow-2xs">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Balance Available</div>
          <div className={cn("text-lg font-bold tabular-nums", totBal < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
            {fmtLakhs(totBal)}
          </div>
          <div className="h-5">
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
            <TableHead className="text-right text-violet-700 dark:text-violet-400">Planned GM</TableHead>
            <TableHead className="text-right">P.O Issued</TableHead>
            <TableHead className="text-right text-emerald-700 dark:text-emerald-400">Actual GM</TableHead>
            <TableHead className="text-right text-emerald-700 dark:text-emerald-400">Achieved GM %</TableHead>
            <TableHead className="text-right text-rose-700 dark:text-rose-400">Outflow (Paid)</TableHead>
            <TableHead className="text-right text-amber-700 dark:text-amber-500">Pending Outflow</TableHead>
            <TableHead className="text-right">Balance Available</TableHead>
            <TableHead className="text-center w-10">Edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredFinancialProjects.length > 0 ? (
            financialPagination.pageItems.map((r, idx) => {
              const boq = Number((r.projectValueTax || r.projectValue) || 0);
              const bal = Number(r.balanceAvailable || 0);
              return (
                <TableRow key={r.project || idx}>
                  <TableCell className="font-bold text-foreground text-sm">{r.project}</TableCell>
                  <TableCell className="text-right font-medium text-foreground tabular-nums">{fmtLakhs(boq)}</TableCell>
                  <TableCell className="text-right font-medium text-foreground tabular-nums">{fmtLakhs(r.bcs)}</TableCell>
                  <TableCell className="text-right font-bold text-violet-700 dark:text-violet-400 tabular-nums">{fmtLakhs(r.plannedGM)}</TableCell>
                  <TableCell className="text-right font-medium text-foreground tabular-nums">{fmtLakhs(r.poIssued)}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtLakhs(r.actualGM)}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtPct(pct100(r.actualGMPct))}</TableCell>
                  <TableCell className="text-right font-bold text-rose-700 dark:text-rose-400 tabular-nums">{fmtLakhs(r.outflow)}</TableCell>
                  <TableCell className="text-right font-bold text-amber-700 dark:text-amber-500 tabular-nums">{fmtLakhs(r.pendingOutflow)}</TableCell>
                  <TableCell className={cn("text-right font-bold tabular-nums", bal < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                    {fmtLakhs(bal)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEditModal(r)}
                      title={`Edit financials for ${r.project}`}
                      className="text-amber-700 dark:text-gold hover:bg-muted"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-10 text-muted-foreground font-medium">
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
  );
}
