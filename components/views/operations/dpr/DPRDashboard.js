import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../ui/core';
import { CheckCircle2, Clock, MapPin, FilePlus, Activity } from 'lucide-react';
import { useAppState } from '../../../StateProvider';

export default function DPRDashboard({ onNavigate }) {
  const { user, call } = useAppState();
  const [stats, setStats] = useState({
    todayCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    activeSites: 0
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

      setStats({
        todayCount: todayDPRs.length,
        pendingCount: pendingDPRs.length,
        approvedCount: approvedDPRs.length,
        activeSites: uniqueSites
      });

      setRecentDPRs(dprs.slice(0, 5));
    } catch (err) {
      console.error('Failed to load DPR dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <p className="text-3xl font-bold text-slate-100 mt-2">{value}</p>
          </div>
          <div className={`p-4 rounded-xl ${colorClass}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's DPRs" value={stats.todayCount} icon={Activity} colorClass="bg-blue-500/10 text-blue-400" />
        <StatCard title="Pending Approval" value={stats.pendingCount} icon={Clock} colorClass="bg-amber-500/10 text-amber-400" />
        <StatCard title="Approved DPRs" value={stats.approvedCount} icon={CheckCircle2} colorClass="bg-emerald-500/10 text-emerald-400" />
        <StatCard title="Active Sites" value={stats.activeSites} icon={MapPin} colorClass="bg-violet-500/10 text-violet-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent DPRs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">Recent Reports</h2>
            <button 
              onClick={() => onNavigate('history')}
              className="text-sm text-gold hover:text-gold/80 transition-colors"
            >
              View All
            </button>
          </div>
          <Card className="bg-slate-900/50 border-slate-800">
            <div className="divide-y divide-slate-800/50">
              {recentDPRs.length === 0 ? (
                <div className="p-6 text-center text-slate-400">No DPRs submitted yet.</div>
              ) : (
                recentDPRs.map((dpr) => (
                  <div key={dpr.id} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                    <div>
                      <h3 className="text-sm font-medium text-slate-200">{dpr.project} - {dpr.site}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Prepared by {dpr.prepared_by} • {new Date(dpr.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      dpr.approval_status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                      dpr.approval_status === 'Rejected' ? 'bg-red-500/10 text-red-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {dpr.approval_status || 'Draft'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Quick Actions</h2>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4 space-y-2">
              <button 
                onClick={() => onNavigate('new')}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 transition-colors text-sm font-medium"
              >
                <FilePlus className="w-4 h-4" />
                Create New DPR
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
