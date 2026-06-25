'use client';
import React from 'react';
import { Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Input } from '../../ui/core';
import { Search, Edit2 } from 'lucide-react';
import { Sparkline, fmtLakhs, PaginationControls } from './dashboard-utils';

export default function DashboardCashflowSection({
  filteredCashflowProjects, cashflowSearchQ, setCashflowSearchQ, setCashflowPage,
  cashflowPagination, handleOpenEditModal,
  totPV, totInflow, totOut, totPendInflow,
  spPV, spIn, spOutCF, spPin
}) {
  return (
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="flex items-center justify-between p-5">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Project Value</div>
            <div className="text-xl font-light text-foreground mt-2 font-serif">{fmtLakhs(totPV)}</div>
          </div>
          <div className="w-20 h-10">
            <Sparkline data={spPV} color="rgba(200,164,90,.95)" />
          </div>
        </Card>
        <Card className="flex items-center justify-between p-5">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider text-emerald-400">Inflow</div>
            <div className="text-xl font-light text-emerald-400 mt-2 font-serif">{fmtLakhs(totInflow)}</div>
          </div>
          <div className="w-20 h-10">
            <Sparkline data={spIn} color="rgba(61,214,140,.95)" />
          </div>
        </Card>
        <Card className="flex items-center justify-between p-5">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider text-red-400">Outflow (Paid)</div>
            <div className="text-xl font-light text-red-400 mt-2 font-serif">{fmtLakhs(totOut)}</div>
          </div>
          <div className="w-20 h-10">
            <Sparkline data={spOutCF} color="rgba(239,68,68,.95)" />
          </div>
        </Card>
        <Card className="flex items-center justify-between p-5">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider text-amber-500">Pending Inflow</div>
            <div className="text-xl font-light text-amber-500 mt-2 font-serif">{fmtLakhs(totPendInflow)}</div>
          </div>
          <div className="w-20 h-10">
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
            <TableHead className="text-right text-red-400">Outflow (Paid)</TableHead>
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
                <TableCell className="text-right text-red-400">{fmtLakhs(r.outflow)}</TableCell>
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
              <TableCell colSpan={6} className="text-center py-10 text-slate-500">
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
  );
}
