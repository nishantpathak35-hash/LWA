'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import { formatCurrency } from '../../../app/lib/utils';
import { Folder, TrendingUp, DollarSign, Wallet } from 'lucide-react';

export default function ProjectDetails({ selectedProject, projectPOs }) {
  if (!selectedProject) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm font-light Card rounded-xl border border-slate-900/60">
        Select a project from the left panel to inspect its ledger.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-900 bg-slate-950/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-gold/10 text-gold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total PO Committed</p>
              <p className="text-lg font-light text-slate-200 mt-1">{formatCurrency(selectedProject.poIssued)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-900 bg-slate-950/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Paid Outflow</p>
              <p className="text-lg font-light text-slate-200 mt-1">{formatCurrency(selectedProject.outflow)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-900 bg-slate-950/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Unspent Balance</p>
              <p className="text-lg font-light text-slate-200 mt-1">{formatCurrency(selectedProject.pendingOutflow)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* POs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-gold" />
            <CardTitle>POs Linked to {selectedProject.project}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {projectPOs.length === 0 ? (
            <div className="p-12 text-slate-500 text-center text-sm font-light">
              No purchase orders registered under this project.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO No</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">PO Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectPOs.map((po, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-slate-200">{po.po_no}</TableCell>
                    <TableCell>{po.vendor_name || 'Legacy Vendor'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          String(po.status || '').toLowerCase().includes('approved') || String(po.status || '').toLowerCase().includes('active')
                            ? 'success'
                            : String(po.status || '').toLowerCase().includes('draft')
                            ? 'default'
                            : 'pending'
                        }
                      >
                        {po.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-200">
                      {formatCurrency(po.po_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
