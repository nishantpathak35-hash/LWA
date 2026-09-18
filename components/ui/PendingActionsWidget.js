'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from './core';
import {
  CheckSquare,
  Clock,
  HelpCircle,
  Check,
  Loader2,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  FileCheck,
  CreditCard,
  AlertTriangle,
  UserCheck,
  Send,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { toast } from './Toast';
import AllocateTaskModal from './AllocateTaskModal';
import { cn } from '../../app/lib/utils';

export default function PendingActionsWidget({ className = '', onSelectRecord }) {
  const { call, user, setActiveView } = useAppState();
  const [tasks, setTasks] = useState([]);
  const [allocatedByMe, setAllocatedByMe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned'); // 'assigned' | 'allocated'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'approvals' | 'queries' | 'tasks'
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);

  const userEmail = user?.email || '';

  useEffect(() => {
    if (!userEmail) return;
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  const loadTasks = async (showLoader = false) => {
    if (showLoader || tasks.length === 0) {
      setLoading(true);
    }
    try {
      const res = await call('getUserTasks', { email: userEmail, roles: user?.roles || [] });
      if (Array.isArray(res)) {
        setTasks(res);
        if (res.allocatedByMe && Array.isArray(res.allocatedByMe)) {
          setAllocatedByMe(res.allocatedByMe);
        }
      } else if (res && typeof res === 'object') {
        setTasks(res.tasks || res.assignedToMe || []);
        setAllocatedByMe(res.allocatedByMe || []);
      }
    } catch (e) {
      console.error('Failed to load user tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await call('updateTaskStatus', taskId, 'completed');
      toast.success('Action marked as completed');
      // Optimistic update
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setAllocatedByMe(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
      loadTasks();
    } catch (e) {
      toast.error('Failed to update action status');
    }
  };

  const handleActionClick = (item) => {
    const recType = String(item.record_type || '').toLowerCase();
    const recId = item.record_id;

    if (onSelectRecord && recId) {
      onSelectRecord(item.record_type, recId);
    } else if (recType.includes('payment')) {
      if (setActiveView) setActiveView('payments');
    } else if (recType.includes('po') || recType.includes('purchase')) {
      if (setActiveView) setActiveView('pos');
    } else if (recType.includes('invoice')) {
      if (setActiveView) setActiveView('invoices');
    }
  };

  const pendingAssigned = useMemo(() => {
    return tasks.filter(t => t.status !== 'completed');
  }, [tasks]);

  const filteredItems = useMemo(() => {
    const list = activeTab === 'assigned' ? pendingAssigned : allocatedByMe;
    if (filterType === 'all') return list;
    if (filterType === 'approvals') {
      return list.filter(t => t.task_type?.includes('approval') || t.task_type?.includes('remit'));
    }
    if (filterType === 'queries') {
      return list.filter(t => t.task_type === 'query_hold');
    }
    if (filterType === 'tasks') {
      return list.filter(t => !t.is_workflow);
    }
    return list;
  }, [activeTab, pendingAssigned, allocatedByMe, filterType]);

  const renderBadge = (item) => {
    if (item.task_type === 'query_hold') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
          <HelpCircle className="w-3 h-3" /> Clarification Hold
        </span>
      );
    }
    if (item.task_type === 'payment_approval') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-primary bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          <ShieldAlert className="w-3 h-3" /> Payment Approval
        </span>
      );
    }
    if (item.task_type === 'po_approval') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
          <FileCheck className="w-3 h-3" /> PO Approval
        </span>
      );
    }
    if (item.task_type === 'payment_remittance') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
          <CreditCard className="w-3 h-3" /> Remittance Ready
        </span>
      );
    }
    // Custom Allocated Task
    const prioColor = item.priority === 'urgent'
      ? 'text-rose-600 bg-rose-500/10 border-rose-500/20'
      : item.priority === 'high'
      ? 'text-amber-600 bg-amber-500/10 border-amber-500/20'
      : 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';

    return (
      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", prioColor)}>
        <CheckSquare className="w-3 h-3" /> Task
      </span>
    );
  };

  return (
    <>
      <Card className={`border-border bg-card shadow-xs rounded-2xl overflow-hidden ${className}`}>
        <CardHeader className="py-3.5 px-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-primary border border-amber-500/20">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold tracking-tight text-foreground">
                  My Pending Actions & Tasks
                </CardTitle>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-primary border border-amber-500/20 font-mono">
                  {pendingAssigned.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time approvals, clarification holds, and allocated team assignments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tab switch */}
            <div className="flex items-center p-0.5 bg-muted/60 border border-border/70 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('assigned')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  activeTab === 'assigned'
                    ? "bg-card text-foreground shadow-xs font-bold border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Waiting on Me ({pendingAssigned.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('allocated')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  activeTab === 'allocated'
                    ? "bg-card text-foreground shadow-xs font-bold border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Allocated by Me ({allocatedByMe.length})
              </button>
            </div>

            {/* Allocate Task Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAllocateModalOpen(true)}
              className="h-8 text-xs font-bold gap-1.5 border-amber-500/30 text-amber-700 dark:text-primary hover:bg-amber-500/10"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Allocate Task</span>
            </Button>
          </div>
        </CardHeader>

        {/* Filter Pills */}
        {activeTab === 'assigned' && pendingAssigned.length > 0 && (
          <div className="flex items-center gap-1.5 px-5 py-2 border-b border-border/50 bg-background/50 text-xs overflow-x-auto">
            <span className="text-[11px] text-muted-foreground font-semibold mr-1">Filter:</span>
            {['all', 'approvals', 'queries', 'tasks'].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterType(f)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors capitalize",
                  filterType === f
                    ? "bg-amber-500/15 text-amber-700 dark:text-primary border border-amber-500/30 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {f === 'all' ? `All (${pendingAssigned.length})` : f}
              </button>
            ))}
          </div>
        )}

        <CardContent className="p-4 space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-xs text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-primary" />
              <span>Loading pending actions and workflow items...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground space-y-2">
              {activeTab === 'assigned' ? (
                <>
                  <div className="text-2xl">🎉</div>
                  <div className="font-bold text-foreground">All clear! No pending actions or queries waiting for you.</div>
                  <p className="text-muted-foreground max-w-md mx-auto text-[11px]">
                    You are all caught up on approvals, clarification responses, and assigned tasks.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl">📋</div>
                  <div className="font-bold text-foreground">No tasks allocated to teammates yet.</div>
                  <p className="text-muted-foreground max-w-md mx-auto text-[11px]">
                    Click <strong className="text-amber-700 dark:text-primary cursor-pointer" onClick={() => setAllocateModalOpen(true)}>+ Allocate Task</strong> above to assign an action item to a colleague or team.
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredItems.map((t) => {
              const isWorkflow = t.is_workflow;
              const isAllocatedByMeTab = activeTab === 'allocated';

              return (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-background/70 border border-border/70 text-xs gap-3 hover:border-amber-500/30 hover:shadow-xs transition-all"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderBadge(t)}
                      {t.record_id && (
                        <span className="font-mono text-xs text-amber-700 dark:text-primary font-bold">
                          #{t.record_id}
                        </span>
                      )}
                      {t.due_date && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" /> Due: {t.due_date}
                        </span>
                      )}
                      {isAllocatedByMeTab && (
                        <Badge variant={t.status === 'completed' ? 'success' : 'outline'} className="text-[9px] uppercase">
                          {t.status}
                        </Badge>
                      )}
                    </div>

                    <p className="font-bold text-foreground text-xs leading-relaxed">
                      {t.title}
                    </p>

                    {t.details && (
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {t.details}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium pt-0.5">
                      <span>
                        {isAllocatedByMeTab
                          ? `Assigned to: ${t.assigned_to}`
                          : `Initiated by: ${t.assigned_by?.split('@')[0] || t.assigned_by}`}
                      </span>
                      {t.created_at && (
                        <span>• {new Date(t.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Action Navigation Button */}
                    {(t.record_id || isWorkflow) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2.5 font-bold text-amber-700 dark:text-primary hover:bg-amber-500/10 gap-1"
                        onClick={() => handleActionClick(t)}
                      >
                        <span>{t.task_type === 'query_hold' ? 'Respond' : isWorkflow ? 'Review & Act' : 'View'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {/* Mark Done for custom tasks */}
                    {!isWorkflow && t.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 gap-1"
                        onClick={() => handleCompleteTask(t.id)}
                        title="Mark Completed"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <AllocateTaskModal
        isOpen={allocateModalOpen}
        onClose={() => setAllocateModalOpen(false)}
        onTaskCreated={() => loadTasks(true)}
      />
    </>
  );
}
