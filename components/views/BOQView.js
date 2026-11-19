'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../ui/core';
import { FileSpreadsheet, Building2, FolderKanban, RefreshCw, Layers, TrendingUp } from 'lucide-react';
import { useAppState } from '../StateProvider';
import { toast } from '../ui/Toast';
import ProjectBOQModule from './projects/ProjectBOQModule';

export default function BOQView() {
  const { call } = useAppState();
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectName, setSelectedProjectName] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const projs = await call('getProjectDetails');
      const list = Array.isArray(projs) ? projs : [];
      setProjectsList(list);

      if (list.length > 0 && !selectedProjectName) {
        setSelectedProjectName(list[0].project);
      }
    } catch (err) {
      toast.error('Failed to load projects: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [call, selectedProjectName]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const activeProject = useMemo(() => {
    return projectsList.find(p => p.project === selectedProjectName) || projectsList[0] || null;
  }, [projectsList, selectedProjectName]);

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {/* Header & Project Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-500" />
            Sales & Estimation: BOQ Workspace
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Project scope, bill of quantities, rate analysis, BOM generation, and commercial margin controls.
          </p>
        </div>

        {/* Project Selector with Auto-Derived Client Mapping */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-lg shadow-xs">
            <FolderKanban className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Project:</label>
            <select
              value={selectedProjectName}
              onChange={(e) => setSelectedProjectName(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              {projectsList.map((p) => (
                <option key={p.project} value={p.project} className="bg-card text-foreground">
                  {p.project} {p.client ? `(Client: ${p.client})` : ''}
                </option>
              ))}
            </select>
          </div>

          {activeProject && (
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1.5 py-1.5 px-3">
              <Building2 className="w-3.5 h-3.5" />
              <span>Client: <strong>{activeProject.client || 'Direct Client'}</strong></span>
            </Badge>
          )}

          <Button variant="outline" size="sm" onClick={loadProjects} className="h-8">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main BOQ Module Workspace */}
      {activeProject ? (
        <ProjectBOQModule selectedProject={activeProject} />
      ) : loading ? (
        <div className="py-20 text-center text-muted-foreground text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
          Loading project estimation workspace...
        </div>
      ) : (
        <Card className="border-border p-12 text-center text-muted-foreground text-xs">
          No projects found. Please create a project under Operations &rarr; Projects first.
        </Card>
      )}
    </div>
  );
}
