import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Activity, RefreshCw, Search, Clock, User, Shield, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppState } from '../StateProvider';
import { Button, Input, Badge } from './core';
import { cn } from '../../app/lib/utils';

export default function ActivityStreamDrawer({ open, onClose }) {
  const { call } = useAppState();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call('getActivityStream', 50);
      if (Array.isArray(data)) {
        setActivities(data);
      } else if (data?.rows && Array.isArray(data.rows)) {
        setActivities(data.rows);
      } else {
        setActivities([]);
      }
    } catch (err) {
      console.error('Failed to load activity stream:', err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    if (open) {
      fetchActivities();
    }
  }, [open, fetchActivities]);

  if (!open) return null;

  const filteredActivities = activities.filter(act => {
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || 
      (act.user || '').toLowerCase().includes(query) ||
      (act.action_type || act.action || '').toLowerCase().includes(query) ||
      (act.details || act.description || '').toLowerCase().includes(query);
    
    const matchesFilter = filterType === 'all' || 
      (act.department || act.module || '').toLowerCase() === filterType.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const getActionIcon = (actionType = '') => {
    const act = actionType.toLowerCase();
    if (act.includes('login') || act.includes('user')) return <User className="w-4 h-4 text-blue-500" />;
    if (act.includes('po') || act.includes('order')) return <FileText className="w-4 h-4 text-amber-500" />;
    if (act.includes('approve') || act.includes('success')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (act.includes('security') || act.includes('role')) return <Shield className="w-4 h-4 text-purple-500" />;
    if (act.includes('reject') || act.includes('delete') || act.includes('error')) return <AlertCircle className="w-4 h-4 text-rose-500" />;
    return <Activity className="w-4 h-4 text-amber-600 dark:text-gold" />;
  };

  const drawerContent = (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose} 
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-gold">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground tracking-wide uppercase">Activity Stream</h2>
                <p className="text-xs text-muted-foreground">Real-time system events & user actions</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={fetchActivities} 
                disabled={loading}
                title="Refresh feed"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 border-b border-border bg-background flex flex-col gap-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search activity by user, action, details..."
                className="pl-8 bg-muted/30 text-xs h-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {['all', 'procurement', 'payments', 'auth', 'settings', 'system'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterType(tab)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap transition-colors",
                    filterType === tab 
                      ? "bg-amber-600 dark:bg-gold text-slate-950 shadow-xs" 
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Feed Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-600 dark:text-gold" />
                <span className="text-xs font-medium">Loading activity stream...</span>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                <Activity className="w-10 h-10 text-muted-foreground/40" />
                <span className="text-sm font-semibold text-foreground">No activities found</span>
                <span className="text-xs text-muted-foreground">Try clearing filters or search query</span>
              </div>
            ) : (
              filteredActivities.map((item, idx) => {
                const timestamp = item.timestamp || item.created_at || item.created_on;
                const timeStr = timestamp ? new Date(timestamp).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                }) : 'Just now';

                return (
                  <div 
                    key={item.id || idx}
                    className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-colors flex gap-3 text-xs"
                  >
                    <div className="mt-0.5 p-2 rounded-lg bg-muted/60 flex-shrink-0 self-start">
                      {getActionIcon(item.action_type || item.action)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground truncate">
                          {item.action_type || item.action || 'System Action'}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timeStr}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed break-words">
                        {item.details || item.description || item.message || 'No additional details.'}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono">
                          {item.user || item.performed_by || 'System'}
                        </Badge>
                        {item.department && (
                          <Badge variant="default" className="text-[10px] py-0 px-2">
                            {item.department}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
            <span>Showing {filteredActivities.length} activity records</span>
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
          </div>

        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(drawerContent, document.body);
}