import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, Button, Input } from '../../ui/core';
import { ArrowRight, Plus, Search, Download, ArrowUpDown } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { exportToCSV, sortData } from '../../../app/lib/exportUtils';

export default function ProjectsSidebar({ projectsList, selectedProject, handleProjectSelect, setShowNewProjectModal }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('project');
  const [sortDir, setSortDir] = useState('asc');

  const processedProjects = useMemo(() => {
    let result = projectsList.filter(p => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (p.project && p.project.toLowerCase().includes(term)) ||
        (p.project_ref && p.project_ref.toLowerCase().includes(term)) ||
        (p.client && p.client.toLowerCase().includes(term))
      );
    });

    return sortData(result, sortField, sortDir);
  }, [projectsList, searchTerm, sortField, sortDir]);

  const handleExportCSV = () => {
    const columns = [
      { label: 'Project Name', key: 'project' },
      { label: 'Reference Code', key: 'project_ref' },
      { label: 'Client', key: 'client' },
      { label: 'PO Issued Amount', key: 'poIssued' },
      { label: 'Total Outflow', key: 'outflow' },
      { label: 'Pending Outflow', key: 'pendingOutflow' }
    ];
    exportToCSV('Projects_Ledger.csv', columns, processedProjects);
  };

  return (
    <Card className="col-span-1 lg:col-span-1 border-border max-h-[85vh] flex flex-col bg-card shadow-xs">
      <CardHeader className="p-3.5 border-b border-border/60 flex flex-col gap-2.5">
        <div className="flex flex-row items-center justify-between w-full">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            PROJECTS ({processedProjects.length})
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleExportCSV}
              title="Export Projects CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs text-amber-600 dark:text-gold hover:bg-amber-500/10 font-bold"
              onClick={() => setShowNewProjectModal(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Project
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/20 border-border"
            />
          </div>
          <select
            value={`${sortField}:${sortDir}`}
            onChange={e => {
              const [f, d] = e.target.value.split(':');
              setSortField(f);
              setSortDir(d);
            }}
            className="px-2 py-1 bg-muted/20 border border-border rounded-md text-[11px] font-semibold text-foreground"
          >
            <option value="project:asc">Name (A-Z)</option>
            <option value="project:desc">Name (Z-A)</option>
            <option value="poIssued:desc">PO Value (High)</option>
            <option value="poIssued:asc">PO Value (Low)</option>
          </select>
        </div>
      </CardHeader>

      <div className="overflow-y-auto divide-y divide-border/60 flex-1">
        {processedProjects.length === 0 ? (
          <div className="p-6 text-xs text-muted-foreground text-center font-medium">No projects found</div>
        ) : (
          processedProjects.map((p, idx) => {
            const isSelected = selectedProject?.project === p.project;
            return (
              <button
                key={idx}
                onClick={() => handleProjectSelect(p)}
                className={`
                  w-full flex items-center justify-between p-3.5 text-left transition-colors relative
                  ${isSelected ? 'bg-amber-500/10 text-amber-700 dark:text-gold font-bold' : 'hover:bg-muted/40 text-foreground'}
                `}
              >
                {isSelected && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-amber-600 dark:bg-gold" />
                )}
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold uppercase tracking-wider truncate text-foreground">
                    {p.project}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
                    PO Issued: <span className="tabular-nums">{formatCurrency(p.poIssued)}</span>
                  </p>
                </div>
                <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isSelected ? 'text-amber-600 dark:text-gold translate-x-0.5' : 'text-muted-foreground/40'}`} />
              </button>
            );
          })
        )}
      </div>
    </Card>
  );
}
