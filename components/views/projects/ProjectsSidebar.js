'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, Button } from '../../ui/core';
import { ArrowRight, Plus } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';

export default function ProjectsSidebar({ projectsList, selectedProject, handleProjectSelect, setShowNewProjectModal }) {
  return (
    <Card className="col-span-1 lg:col-span-1 border-border max-h-[80vh] flex flex-col">
      <CardHeader className="p-4 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">PROJECTS LIST</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground font-medium"
          onClick={() => setShowNewProjectModal(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> New
        </Button>
      </CardHeader>
      <div className="overflow-y-auto divide-y divide-border flex-1">
        {projectsList.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground text-center font-medium">No projects found</div>
        ) : (
          projectsList.map((p, idx) => {
            const isSelected = selectedProject?.project === p.project;
            return (
              <button
                key={idx}
                onClick={() => handleProjectSelect(p)}
                className={`
                  w-full flex items-center justify-between p-4 text-left transition-colors relative
                  ${isSelected ? 'bg-amber-500/10 dark:bg-amber-900/20 text-amber-700 dark:text-gold font-bold' : 'hover:bg-muted text-foreground'}
                `}
              >
                {isSelected && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-amber-600 dark:bg-gold" />
                )}
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold uppercase tracking-wider truncate">
                    {p.project}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-1 truncate">
                    PO Issued: {formatCurrency(p.poIssued)}
                  </p>
                </div>
                <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isSelected ? 'text-amber-600 dark:text-gold translate-x-0.5' : 'text-muted-foreground'}`} />
              </button>
            );
          })
        )}
      </div>
    </Card>
  );
}
