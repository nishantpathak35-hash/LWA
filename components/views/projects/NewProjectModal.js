'use client';
import React from 'react';
import { Dialog, Button, Input } from '../../ui/core';

export default function NewProjectModal({ showNewProjectModal, setShowNewProjectModal, newProjectName, setNewProjectName, creating, handleCreateProject }) {
  return (
    <Dialog
      open={showNewProjectModal}
      onClose={() => setShowNewProjectModal(false)}
      title="Create New Project"
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 font-light mb-1 block">Project Name</label>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="e.g. Magnum Towers Phase 2"
            autoFocus
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
