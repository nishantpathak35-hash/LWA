import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../ui/core';
import { CheckCircle2, Clock, MapPin, FilePlus, Activity, Sun, Users, AlertTriangle, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { useAppState } from '../../../StateProvider';

export default function DPRDashboard({ onNavigate }) {
  const { user, call } = useAppState();
  const [stats, setStats] = useState({
    todayCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    activeSites: 0,
    totalManpower: 0,
    criticalIssues: 0
  });
  const [recentDPRs, setRecentDPRs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const dprs = await call('listDPRs', {});
      
      const today = new Date().toISOString().split('T')[0];
      const todayDPRs = dprs.filter(d => d.date === today);
      const pendingDPRs = dprs.filter(d => d.approval_status === 'Draft' || d.approval_status === 'Submitted');
      const approvedDPRs = dprs.filter(d => d.approval_status === 'Approved');
      const uniqueSites = new Set(dprs.map(d => d.site).filter(Boolean)).size;

      let manpower = 0;
      let issues = 0;
      dprs.slice(0, 10).forEach(d => {
        if (d.manpower_summary && typeof d.manpower_summary === 'object') {
          manpower += (Number(d.manpower_summary.engineers || 0) + Number(d.manpower_summary.supervisors || 0) + Number(d.manpower_summary.skilled || 0) + Number(d.manpower_summary.unskilled || 0));
        } else if (d.total_manpower) {
          manpower += Number(d.total_manpower || 0);
        }
        if (d.issues && d.issues.length) issues += d.issues.length;
      });

      setStats({
        todayCount: todayDPRs.length,
        pendingCount: pendingDPRs.length,
        approvedCount: approvedDPRs.length,
        activeSites: uniqueSites,
        totalManpower: manpower,
        criticalIssues: issues
      });

      setRecentDPRs(dprs.slice(0, 6));
    } catch (err) {
      console.error('Failed to load DPR dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, gradient, badge }) => (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-slate-700 hover:shadow-2xl hover:shadow-gold/5 group`}>
      <div className={`absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-all group-hover:opacity-30`} />
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-slate-100 tabular-nums tracking-tight">{value}</h3>
            {badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-black/40`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400 animate-pulse">Loading DPR Intelligence Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border border-slate-800 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Site Operations Pulse
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Daily Progress Command Center</h2>
            <p className="text-sm text-slate-400 max-w-xl">
              Track real-time site productivity, manpower utilization, site weather conditions, and critical issue escalations across all active projects.
            </p>
          </div>
          <button
            onClick={() => onNavigate('new')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-gold text-slate-950 font-bold text-sm shadow-lg shadow-gold/20 hover:brightness-110 active:scale-95 transition-all whitespace-nowrap"
          >
            <FilePlus className="w-4 h-4" /> Create New DPR
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's DPRs" value={stats.todayCount} subtitle="Filed for today" icon={Activity} gradient="from-blue-600 to-cyan-500" />
        <StatCard title="Pending Review" value={stats.pendingCount} subtitle="Requires supervisor check" icon={Clock} gradient="from-amber-600 to-yellow-500" badge="Action Req" />
        <StatCard title="Active Manpower" value={stats.totalManpower} subtitle="Total workforce logged" icon={Users} gradient="from-emerald-600 to-teal-500" />
        <StatCard title="Active Projects" value={stats.activeSites} subtitle="Sites reporting live" icon={MapPin} gradient="from-violet-600 to-purple-500" />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" />
              <h3 className="text-lg font-bold text-slate-200">Recent Site Reports</h3>
            </div>
            <button 
              onClick={() => onNavigate('history')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-amber-400 transition-colors"
            >
              View Full History <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
            <div className="divide-y divide-slate-800/50">
              {recentDPRs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium">No DPR reports recorded yet. Click "Create New DPR" to file your first daily report.</div>
              ) : (
                recentDPRs.map((dpr) => (
                  <div key={dpr.id} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">{dpr.project || 'Project'}</span>
                        {dpr.site && <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">{dpr.site}</span>}
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <span>Prepared by <strong className="text-slate-300">{dpr.prepared_by || 'Site Engineer'}</strong></span>
                        <span>•</span>
                        <span>{dpr.date ? new Date(dpr.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        dpr.approval_status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        dpr.approval_status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {dpr.approval_status || 'Draft'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Weather / Manpower Card */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Quick Operations</h3>
            <div className="space-y-2">
              <button 
                onClick={() => onNavigate('new')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all font-semibold text-sm group"
              >
                <span className="flex items-center gap-3">
                  <FilePlus className="w-5 h-5" /> File Daily Report
                </span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button 
                onClick={() => onNavigate('history')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-200 hover:bg-slate-800 transition-all font-semibold text-sm group"
              >
                <span className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" /> DPR Audit Log
                </span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          {/* Manpower Distribution Card */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> Manpower Distribution
              </h3>
              <span className="text-xs font-bold text-emerald-400 tabular-nums">{stats.totalManpower} Active</span>
            </div>
            
            <div className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between font-semibold text-slate-300">
                  <span>Engineers & Staff</span>
                  <span>15%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-[15%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-semibold text-slate-300">
                  <span>Supervisors</span>
                  <span>25%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full w-[25%]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-semibold text-slate-300">
                  <span>Skilled & Trade Masons</span>
                  <span>60%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[60%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
