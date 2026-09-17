'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, Button, Input, Select } from './core';
import { useAppState } from '../StateProvider';
import { toast } from './Toast';
import { CheckSquare, UserCheck, Calendar, AlertCircle, Link2, FileText, Send } from 'lucide-react';

export default function AllocateTaskModal({ isOpen, onClose, onTaskCreated, defaultRecordType = '', defaultRecordId = '' }) {
  const { call, user } = useAppState();

  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState('');
  const [recordType, setRecordType] = useState(defaultRecordType);
  const [recordId, setRecordId] = useState(defaultRecordId);
  const [description, setDescription] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingUsers(true);
      call('listActiveUsers')
        .then(res => setAvailableUsers(res || []))
        .catch(err => console.error('Failed to load active users:', err))
        .finally(() => setLoadingUsers(false));

      if (defaultRecordType) setRecordType(defaultRecordType);
      if (defaultRecordId) setRecordId(defaultRecordId);
    }
  }, [isOpen, call, defaultRecordType, defaultRecordId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    if (!assignedTo) {
      toast.error('Please select an assignee or team role');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        assignedTo: assignedTo.trim().toLowerCase(),
        priority,
        dueDate,
        recordType,
        recordId: recordId.trim(),
        description: description.trim()
      };

      const res = await call('allocateTask', payload);
      if (res?.ok) {
        toast.success('Task allocated successfully!');
        // Reset form
        setTitle('');
        setAssignedTo('');
        setPriority('normal');
        setDueDate('');
        setRecordType('');
        setRecordId('');
        setDescription('');
        onClose();
        if (onTaskCreated) onTaskCreated();
      } else {
        toast.error(res?.message || 'Failed to allocate task');
      }
    } catch (err) {
      toast.error(err.message || 'Error allocating task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Allocate Task / Action Assignment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
            Task Title / Action Required *
          </label>
          <Input
            className="w-full text-xs bg-background"
            placeholder="e.g. Verify physical site receipt of cement consignment"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Assignee & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
              Assign To *
            </label>
            <select
              className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              required
            >
              <option value="">-- Select Team Member or Role --</option>
              <optgroup label="🏢 Department / Team Roles">
                <option value="procurement">Procurement / Maker Team</option>
                <option value="finance">Finance & Accounts Team</option>
                <option value="director">Director / Executive Level</option>
                <option value="all">Entire Team (Broadcast)</option>
              </optgroup>
              {availableUsers.length > 0 && (
                <optgroup label="👤 Specific Team Members">
                  {availableUsers.map(u => {
                    const roleLabel = (u.roles || []).join(', ') || u.department || '';
                    return (
                      <option key={u.email} value={u.email}>
                        {u.name || u.email} ({u.email}){roleLabel ? ` — ${roleLabel}` : ''}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
              Priority Level
            </label>
            <select
              className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              <option value="urgent">🔴 Urgent (Immediate Action)</option>
              <option value="high">🟠 High Priority</option>
              <option value="normal">🟢 Normal</option>
              <option value="low">⚪ Low Priority</option>
            </select>
          </div>
        </div>

        {/* Due Date & Optional Linked Record */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
              Target Due Date
            </label>
            <Input
              type="date"
              className="w-full text-xs bg-background"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
              Related Record Type
            </label>
            <select
              className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              value={recordType}
              onChange={e => setRecordType(e.target.value)}
            >
              <option value="">None (General Task)</option>
              <option value="Payment Request">Payment Request (PR)</option>
              <option value="Purchase Order">Purchase Order (PO)</option>
              <option value="Invoice">Vendor Invoice</option>
              <option value="Project">Project Site</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Record Reference / ID</label>
            <Input
              className="w-full text-xs bg-background font-mono"
              placeholder="e.g. 102 or PO-2026-04"
              value={recordId}
              onChange={e => setRecordId(e.target.value)}
              disabled={!recordType}
            />
          </div>
        </div>

        {/* Description / Instructions */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
            Detailed Instructions / Context (Optional)
          </label>
          <textarea
            className="w-full h-20 rounded-md border border-border bg-background p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-amber-500 resize-none"
            placeholder="Add relevant notes, checklist items, or background context for the assignee..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs" disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting} className="text-xs font-bold gap-1.5">
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Allocating...' : 'Allocate Task'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
