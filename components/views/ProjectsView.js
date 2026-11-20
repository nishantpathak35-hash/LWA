'use client';
import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { toast } from '../ui/Toast';

import ProjectCommandCenter from './projects/ProjectCommandCenter';
import NewProjectModal from './projects/NewProjectModal';

export default function ProjectsView() {
  const { call, projects: stateProjects, pos, refresh, viewTarget } = useAppState();
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(() => viewTarget?.project ? { project: viewTarget.project } : null);
  const [loading, setLoading] = useState(true);

  // New Project State
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectRef, setNewProjectRef] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadDetails() {
    try {
      const details = await call('getProjectDetails');
      setProjectsList(details || []);
      // Sync selectedProject if one is already open so edits reflect in real time
      setSelectedProject(prev => {
        if (!prev) return null;
        const targetName = String(prev.project || prev.name || '').trim().toLowerCase();
        const updated = (details || []).find(p => String(p.project || p.name || '').trim().toLowerCase() === targetName);
        return updated || prev;
      });
    } catch (e) {
      console.error(e);
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

  // Find POs linked to the selected project (strict normalized comparison)
  const projectPOs = selectedProject
    ? pos.filter(po => {
        if (!po) return false;
        const pName = po.project || po.project_name || po.project_id;
        const targetName = selectedProject.project || selectedProject.name;
        if (!pName || !targetName) return false;

        const p = String(pName).trim().toLowerCase();
        const t = String(targetName).trim().toLowerCase();
        if (p === t) return true;

        const normP = p.replace(/[\-_]/g, ' ').replace(/\s+/g, ' ').trim();
        const normT = t.replace(/[\-_]/g, ' ').replace(/\s+/g, ' ').trim();
        return normP === normT;
      })
    : [];

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      await call('updateProjectFinancials', {
        project: newProjectName.trim(),
        projectValue: 0,
        project_ref: newProjectRef.trim(),
        client: newClient.trim(),
        site_address: newSiteAddress.trim()
      });
      setNewProjectName('');
      setNewProjectRef('');
      setNewClient('');
      setNewSiteAddress('');
      setShowNewProjectModal(false);
      toast.success('Project created successfully!');
      await loadDetails();
      if (refresh) refresh();
    } catch (e) {
      toast.error('Failed to create project: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <ProjectCommandCenter
        projectsList={projectsList}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        projectPOs={projectPOs}
        setShowNewProjectModal={setShowNewProjectModal}
        onUpdateProject={() => { loadDetails(); if (refresh) refresh(); }}
        loading={loading}
        pos={pos}
      />

      <NewProjectModal
        showNewProjectModal={showNewProjectModal}
        setShowNewProjectModal={setShowNewProjectModal}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        newProjectRef={newProjectRef}
        setNewProjectRef={setNewProjectRef}
        newClient={newClient}
        setNewClient={setNewClient}
        newSiteAddress={newSiteAddress}
        setNewSiteAddress={setNewSiteAddress}
        creating={creating}
        handleCreateProject={handleCreateProject}
      />
    </>
  );
}
