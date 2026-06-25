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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
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
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-red-400">Outflow (Paid)</div>
          <div className="text-lg font-light text-red-400 font-serif">{fmtLakhs(totOut)}</div>
          <div className="h-6"><Sparkline data={spOut} color="rgba(239,68,68,.95)" /></div>
        </Card>
        <Card className="p-4 flex flex-col justify-between h-24">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-amber-500">Pending Outflow</div>
          <div className="text-lg font-light text-amber-500 font-serif">{fmtLakhs(totPendOut)}</div>
          <div className="h-6"><Sparkline data={spPendOut} color="rgba(245,158,11,.95)" /></div>
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
            <TableHead className="text-right text-red-400">Outflow (Paid)</TableHead>
            <TableHead className="text-right text-amber-500">Pending Outflow</TableHead>
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
                  <TableCell className="font-semibold text-slate-200">{r.project}</TableCell>
                  <TableCell className="text-right">{fmtLakhs(boq)}</TableCell>
                  <TableCell className="text-right">{fmtLakhs(r.bcs)}</TableCell>
                  <TableCell className="text-right text-violet-400">{fmtLakhs(r.plannedGM)}</TableCell>
                  <TableCell className="text-right">{fmtLakhs(r.poIssued)}</TableCell>
                  <TableCell className="text-right text-emerald-400">{fmtLakhs(r.actualGM)}</TableCell>
                  <TableCell className="text-right text-emerald-400">{fmtPct(pct100(r.actualGMPct))}</TableCell>
                  <TableCell className="text-right text-red-400">{fmtLakhs(r.outflow)}</TableCell>
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
  );
}
