'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, Button } from '../../ui/core';
import { ArrowRight, Plus } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

export default function ProjectsSidebar({ projectsList, selectedProject, handleProjectSelect, setShowNewProjectModal }) {
  return (
    <Card className="col-span-1 lg:col-span-1 border-slate-900/60 max-h-[80vh] flex flex-col">
      <CardHeader className="p-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-slate-400">PROJECTS LIST</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-xs text-slate-400 hover:text-gold"
          onClick={() => setShowNewProjectModal(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> New
        </Button>
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
  );
}
