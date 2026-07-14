import React, { useState, useEffect } from 'react';
import { Dialog, Button, Input, Badge } from '../../ui/core';
import { useAppState } from '../../StateProvider';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from '../../ui/Toast';

export default function SettingsWorkflowEditorModal({
  open,
  onClose,
  workflowId,
  onSave
}) {
  const { call } = useAppState();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [workflow, setWorkflow] = useState({
    name: '',
    description: '',
    is_active: 0,
    module_type: '',
    stages: []
  });

  useEffect(() => {
    if (open && workflowId) {
      loadWorkflow(workflowId);
    }
  }, [open, workflowId, call]);

  const loadWorkflow = async (id) => {
    setLoading(true);
    try {
      const data = await call('getApprovalWorkflow', id);
      if (data) {
        setWorkflow({
          name: data.name || '',
          description: data.description || '',
          is_active: data.is_active || 0,
          module_type: data.module_type || '',
          stages: data.stages || []
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load workflow details.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setWorkflow(prev => ({ ...prev, [field]: value }));
  };

  const handleStageChange = (index, field, value) => {
    const updatedStages = [...workflow.stages];
    updatedStages[index] = { ...updatedStages[index], [field]: value };
    setWorkflow(prev => ({ ...prev, stages: updatedStages }));
  };

  const addStage = () => {
    const newStage = {
      stage_name: '',
      approver_role: '',
      min_approval_count: 1,
      approval_type: 'any_one'
    };
    setWorkflow(prev => ({ ...prev, stages: [...prev.stages, newStage] }));
  };

  const removeStage = (index) => {
    const updatedStages = workflow.stages.filter((_, i) => i !== index);
    setWorkflow(prev => ({ ...prev, stages: updatedStages }));
  };

  const handleSave = async () => {
    if (!workflow.name.trim()) {
      toast.error('Workflow name is required.');
      return;
    }
    
    // Validation
    const stageNames = new Set();
    for (const stage of workflow.stages) {
      if (!stage.stage_name?.trim()) {
        toast.error('All stages must have a name.');
        return;
      }
      if (stageNames.has(stage.stage_name)) {
        toast.error(`Duplicate stage name: ${stage.stage_name}`);
        return;
      }
      stageNames.add(stage.stage_name);
    }

    setSubmitting(true);
    try {
      const payload = {
        name: workflow.name,
        description: workflow.description,
        is_active: workflow.is_active ? 1 : 0,
        stages: workflow.stages.map((s, i) => ({
          ...s,
          sequence: i + 1
        }))
      };

      await call('updateApprovalWorkflow', workflowId, payload);
      toast.success('Workflow updated successfully.');
      if (onSave) onSave();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update workflow: ' + (e.message || String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Edit Workflow`} size="lg">
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading workflow...
        </div>
      ) : (
        <div className="flex flex-col h-full max-h-[80vh] overflow-y-auto px-1 py-2">
          
          <div className="space-y-4 mb-6">
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-slate-400 font-light">Workflow Name</label>
                <Input
                  value={workflow.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="e.g. Default PO Approval"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-slate-400 font-light">Module Type (Read-only)</label>
                <Input
                  value={workflow.module_type.replace('_', ' ')}
                  disabled
                  className="capitalize opacity-70"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-light">Description</label>
              <Input
                value={workflow.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Brief description..."
              />
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={!!workflow.is_active}
                onChange={(e) => handleFieldChange('is_active', e.target.checked ? 1 : 0)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-gold focus:ring-gold focus:ring-offset-slate-950"
              />
              <label htmlFor="is_active" className="text-sm text-slate-300 select-none">
                Active Workflow
              </label>
              <span className="text-xs text-slate-500 ml-2">(Only one active workflow per module)</span>
            </div>
          </div>

          <div className="flex justify-between items-end mb-4 pt-4 border-t border-slate-800">
            <div>
              <h3 className="text-sm font-medium text-slate-200">Approval Stages</h3>
              <p className="text-xs text-slate-500">Stages are executed sequentially.</p>
            </div>
            <Button variant="outline" size="sm" onClick={addStage} className="gap-2">
              <Plus className="w-3.5 h-3.5" /> Add Stage
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            {workflow.stages.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
                No stages configured.
              </div>
            ) : (
              workflow.stages.map((stage, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 relative group">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => removeStage(idx)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                      title="Remove Stage"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="bg-slate-800/50">Stage {idx + 1}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-light">Stage Name</label>
                      <Input
                        value={stage.stage_name}
                        onChange={(e) => handleStageChange(idx, 'stage_name', e.target.value)}
                        placeholder="e.g. Director Approval"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-light">Approver Role</label>
                      <select
                        value={stage.approver_role || ''}
                        onChange={(e) => handleStageChange(idx, 'approver_role', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                      >
                        <option value="">-- Any Admin/Director --</option>
                        <option value="director">Director</option>
                        <option value="finance">Finance</option>
                        <option value="procurement">Procurement</option>
                        <option value="accountant">Accountant</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-light">Min Approval Count</label>
                      <Input
                        type="number"
                        min="1"
                        value={stage.min_approval_count}
                        onChange={(e) => handleStageChange(idx, 'min_approval_count', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-light">Approval Type</label>
                      <select
                        value={stage.approval_type || 'any_one'}
                        onChange={(e) => handleStageChange(idx, 'approval_type', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                      >
                        <option value="any_one">Any One (First wins)</option>
                        <option value="all_required">All Required</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-auto border-t border-slate-800 bg-slate-950 sticky bottom-0">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
