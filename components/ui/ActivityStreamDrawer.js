'use client';
import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { Activity, X, User, MessageSquare, CheckCircle2, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { cn } from '../../app/lib/utils';

export default function ActivityStreamDrawer({ open, onClose }) {
  const { call } = useAppState();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadStream = async () => {
    setLoading(true);
    try {
      const res = await call('getActivityStream', 30);
      setActivities(res || []);
    } catch (e) {
      console.error('Failed to load activity stream:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const getActionIcon = (action) => {
    const a = (action || '').toLowerCase();
    if (a.includes('comment')) return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
    if (a.includes('approve') || a.includes('remit')) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (a.includes('reject')) return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    if (a.includes('clarification') || a.includes('query')) return <HelpCircle className="w-3.5 h-3.5 text-amber-500" />;
    return <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background/80 backdrop-blur-xs animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-gold">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Team Activity Stream</h3>
                <p className="text-[10px] text-muted-foreground font-medium">Real-time team audit log & actions</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Activity Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-xs text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-amber-600 dark:text-gold" />
                <span>Loading team stream...</span>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-16 text-xs text-muted-foreground font-medium">
                No recent activity logged.
              </div>
            ) : (
              activities.map((item) => (
                <div key={item.id} className="p-3 rounded-lg bg-muted/20 border border-border space-y-1 text-xs hover:border-amber-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      {getActionIcon(item.action)}
                      <span>{item.user_name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <p className="text-muted-foreground text-xs font-medium">
                    <span className="font-semibold text-foreground">{item.action}</span> {item.target_type} <span className="font-mono font-bold text-amber-700 dark:text-gold">#{item.target_id}</span>
                  </p>

                  {item.details && (
                    <p className="text-[11px] text-foreground/80 italic bg-card p-2 rounded border border-border/40 mt-1">
                      "{item.details}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
