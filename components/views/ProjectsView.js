'use client';
import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';

import ProjectsSidebar from './projects/ProjectsSidebar';
import ProjectDetails from './projects/ProjectDetails';
import NewProjectModal from './projects/NewProjectModal';

export default function ProjectsView() {
  const { call, projects: stateProjects, pos, refresh } = useAppState();
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Project State
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadDetails() {
    try {
      const details = await call('getProjectDetails');
      setProjectsList(details || []);
      if (details && details.length > 0 && !selectedProject) {
        setSelectedProject(details[0]);
      }
    } catch (e) {
      console.error(e);
      // Fall back to state projects list
      setProjectsList(stateProjects.map(p => ({
        project: p.name,
        name: p.name,
        poIssued: 0,
        outflow: 0,
        pendingOutflow: 0
      })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateProjects, call]);

  // Find POs linked to the selected project
  const projectPOs = selectedProject
    ? pos.filter(po => po.project === selectedProject.project)
    : [];

  const handleProjectSelect = (p) => {
    setSelectedProject(p);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      await call('updateProjectFinancials', { project: newProjectName.trim(), projectValue: 0 });
      setNewProjectName('');
      setShowNewProjectModal(false);
      await loadDetails();
      if (refresh) refresh(); // Trigger global state refresh if available
    } catch (e) {
      alert("Failed to create project: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading && projectsList.length === 0) {
    return (
      <div className="flex items-center justify-center p-20 text-sm text-slate-500">
        Loading projects ledger...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start animate-fade-in">
      {/* Projects selection list (Left column) */}
      <ProjectsSidebar
        projectsList={projectsList}
        selectedProject={selectedProject}
        handleProjectSelect={handleProjectSelect}
        setShowNewProjectModal={setShowNewProjectModal}
      />

      {/* Selected project details (Right columns) */}
      <div className="col-span-1 lg:col-span-3 space-y-8">
        <ProjectDetails
          selectedProject={selectedProject}
          projectPOs={projectPOs}
        />
      </div>

      <NewProjectModal
        showNewProjectModal={showNewProjectModal}
        setShowNewProjectModal={setShowNewProjectModal}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        creating={creating}
        handleCreateProject={handleCreateProject}
      />
    </div>
  );
}
