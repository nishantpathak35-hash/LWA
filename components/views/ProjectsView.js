'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../ui/core';
import { formatCurrency } from '../../app/lib/utils';
import { Folder, ArrowRight, TrendingUp, DollarSign, Wallet, Percent } from 'lucide-react';

export default function ProjectsView() {
  const { call, projects: stateProjects, pos } = useAppState();
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadDetails() {
      try {
        const details = await call('getProjectDetails');
        if (active) {
          setProjectsList(details || []);
          if (details && details.length > 0) {
            setSelectedProject(details[0]);
          }
        }
      } catch (e) {
        console.error(e);
        // Fall back to state projects list
        if (active) {
          setProjectsList(stateProjects.map(p => ({
            project: p.name,
            name: p.name,
            poIssued: 0,
            outflow: 0,
            pendingOutflow: 0
          })));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDetails();
    return () => { active = false; };
  }, [stateProjects, call]);

  // Find POs linked to the selected project
  const projectPOs = selectedProject
    ? pos.filter(po => po.project === selectedProject.project)
    : [];

  const handleProjectSelect = (p) => {
    setSelectedProject(p);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-sm text-slate-500">
        Loading projects ledger...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start animate-fade-in">
      {/* Projects selection list (Left column) */}
      <Card className="col-span-1 lg:col-span-1 border-slate-900/60 max-h-[80vh] flex flex-col">
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-semibold text-slate-400">PROJECTS LIST</CardTitle>
        </CardHeader>
        <div className="overflow-y-auto divide-y divide-slate-900/40 flex-1">
          {projectsList.length === 0 ? (
            <div className="p-4 text-xs text-slate-500 text-center">No projects found</div>
          ) : (
            projectsList.map((p, idx) => {
              const isSelected = selectedProject?.project === p.project;
              return (
                <button
                  key={idx}
                  onClick={() => handleProjectSelect(p)}
                  className={`
                    w-full flex items-center justify-between p-4 text-left transition-colors relative
                    ${isSelected ? 'bg-gold/5 text-gold' : 'hover:bg-slate-900/30 text-slate-300'}
                  `}
                >
                  {isSelected && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gold" />
                  )}
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-semibold uppercase tracking-wider truncate">
                      {p.project}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                      PO Issued: {formatCurrency(p.poIssued)}
                    </p>
                  </div>
                  <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isSelected ? 'text-gold translate-x-0.5' : 'text-slate-600'}`} />
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* Selected project details (Right columns) */}
      <div className="col-span-1 lg:col-span-3 space-y-8">
        {selectedProject ? (
          <>
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
          </>
        ) : (
          <div className="p-12 text-center text-slate-500 text-sm font-light Card rounded-xl border border-slate-900/60">
            Select a project from the left panel to inspect its ledger.
          </div>
        )}
      </div>
    </div>
  );
}
