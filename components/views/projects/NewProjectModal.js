'use client';
import React from 'react';
import { Dialog, Button, Input } from '../../ui/core';

export default function NewProjectModal({ 
  showNewProjectModal, setShowNewProjectModal, newProjectName, setNewProjectName, 
  newProjectRef, setNewProjectRef, newClient, setNewClient, newSiteAddress, setNewSiteAddress,
  creating, handleCreateProject 
}) {
  return (
    <Dialog
      open={showNewProjectModal}
      onClose={() => setShowNewProjectModal(false)}
      title="Create New Project"
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 font-light mb-1 block">Project Name *</label>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="e.g. Magnum Towers Phase 2"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 font-light mb-1 block">Project Reference</label>
          <Input
            value={newProjectRef}
            onChange={(e) => setNewProjectRef(e.target.value)}
            placeholder="e.g. MT-PH2-001"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 font-light mb-1 block">Client</label>
          <Input
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            placeholder="e.g. Acme Corp"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 font-light mb-1 block">Site Address</label>
          <textarea
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all resize-none"
            rows="3"
            value={newSiteAddress}
            onChange={(e) => setNewSiteAddress(e.target.value)}
            placeholder="Enter full site address..."
          />
        </div>
        <div className="flex justify-end pt-4 border-t border-slate-900/60">
          <Button
            variant="ghost"
            onClick={() => setShowNewProjectModal(false)}
            className="mr-3"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateProject}
            disabled={!newProjectName.trim() || creating}
          >
            {creating ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
