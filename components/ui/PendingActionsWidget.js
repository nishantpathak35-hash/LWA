'use client';
import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Button } from './core';
import { CheckSquare, Clock, HelpCircle, Check, Loader2 } from 'lucide-react';
import { toast } from './Toast';

export default function PendingActionsWidget({ className = '', onSelectRecord }) {
  const { call, user } = useAppState();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setTasks(res || []);
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
      loadTasks();
    } catch (e) {
      toast.error('Failed to update action status');
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');

  return (
    <Card className={`border-border bg-card shadow-xs ${className}`}>
      <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-amber-600 dark:text-gold" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
            My Pending Actions ({pendingTasks.length})
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-gold" />
            <span>Loading pending actions...</span>
          </div>
        ) : pendingTasks.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground font-medium">
            🎉 All clear! No pending tasks or queries assigned to you.
          </div>
        ) : (
          pendingTasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border text-xs gap-3 hover:border-amber-500/30 transition-colors"
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{t.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                  <span>Assigned by {t.assigned_by?.split('@')[0]}</span>
                  {t.record_type && (
                    <span className="font-mono text-amber-700 dark:text-gold font-bold">
                      #{t.record_id}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {t.record_id && onSelectRecord && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px] px-2 font-semibold"
                    onClick={() => onSelectRecord(t.record_type, t.record_id)}
                  >
                    View
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 p-0"
                  onClick={() => handleCompleteTask(t.id)}
                  title="Mark Completed"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
