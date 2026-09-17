'use client';
import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { toast } from '../ui/Toast';

import ProjectCommandCenter from './projects/ProjectCommandCenter';
import NewProjectModal from './projects/NewProjectModal';

export default function ProjectsView() {
  const { call, projects: stateProjects, pos, refresh } = useAppState();
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
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

  // Find POs linked to the selected project (flexible normalized comparison)
  const projectPOs = selectedProject
    ? pos.filter(po => {
        if (!po) return false;
        const pName = String(po.project || po.project_name || po.project_id || '').trim().toLowerCase();
        const targetName = String(selectedProject.project || selectedProject.name || '').trim().toLowerCase();
        if (!pName || !targetName) return false;
        return pName === targetName || pName.includes(targetName) || targetName.includes(pName);
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
