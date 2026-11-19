'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, Button, Input } from '../../ui/core';
import { useAppState } from '../../StateProvider';
import { Building2 } from 'lucide-react';

export default function NewProjectModal({ 
  showNewProjectModal, setShowNewProjectModal, newProjectName, setNewProjectName, 
  newProjectRef, setNewProjectRef, newClient, setNewClient, newSiteAddress, setNewSiteAddress,
  creating, handleCreateProject, clients = [] 
}) {
  const { call } = useAppState();
  const [clientsList, setClientsList] = useState(clients);

  useEffect(() => {
    if (showNewProjectModal && call) {
      call('listClients')
        .then(res => {
          if (Array.isArray(res)) setClientsList(res);
        })
        .catch(err => console.warn('Failed to load clients list:', err.message));
    }
  }, [showNewProjectModal, call]);

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
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400 font-light flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              Client
            </label>
            {clientsList.length > 0 && (
              <span className="text-[10px] text-slate-400">
                {clientsList.length} clients available
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <select
              value={clientsList.some(c => c.name === newClient) ? newClient : ''}
              onChange={(e) => {
                if (e.target.value) setNewClient(e.target.value);
              }}
              className="w-full text-xs h-9 bg-slate-900/60 border border-slate-700/60 rounded-lg px-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="">-- Select Existing Client --</option>
              {clientsList.map(c => (
                <option key={c.id || c.name} value={c.name} className="bg-slate-900 text-slate-200">
                  {c.name} {c.company_name && c.company_name !== c.name ? `(${c.company_name})` : ''}
                </option>
              ))}
            </select>
            <Input
              value={newClient}
              onChange={(e) => setNewClient(e.target.value)}
              placeholder="Or type custom/new client name..."
              list="new-project-clients-list"
            />
            <datalist id="new-project-clients-list">
              {clientsList.map(c => (
                <option key={c.id || c.name} value={c.name} />
              ))}
            </datalist>
          </div>
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
