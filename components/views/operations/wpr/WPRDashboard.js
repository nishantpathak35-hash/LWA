import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../ui/core';
import { TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Calendar, Sparkles, PlusCircle } from 'lucide-react';
import { useAppState } from '../../../StateProvider';

export default function WPRDashboard({ onNavigate }) {
  const { call } = useAppState();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWPRs();
  }, []);

  const fetchWPRs = async () => {
    try {
      setLoading(true);
      const data = await call('listWPRReports', { filters: { limit: 10 } });
      setReports(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getVarianceBadge = (variance) => {
    const v = parseFloat(variance) || 0;
    if (v < -5) return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full text-xs font-bold">Behind ({v}%)</span>;
    if (v > 5) return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold">Ahead (+{v}%)</span>;
    return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-xs font-bold">On Track ({v > 0 ? '+' : ''}{v}%)</span>;
  };

  const stats = reports.reduce((acc, r) => {
    const v = parseFloat(r.variance) || 0;
    if (v < -5) acc.behind++;
    else if (v > 5) acc.ahead++;
    else acc.onTrack++;
    return acc;
  }, { ahead: 0, onTrack: 0, behind: 0 });

  const StatCard = ({ title, value, icon: Icon, gradient, badge }) => (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-slate-700 hover:shadow-2xl group`}>
      <div className={`absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-all group-hover:opacity-30`} />
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-slate-100 tabular-nums tracking-tight">{value}</h3>
          </div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-black/40`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border border-slate-800 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Weekly Progress Analytics
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">Weekly Milestone Command Center</h2>
            <p className="text-sm text-slate-400 max-w-xl">
              Track planned versus actual S-curves, milestone velocity, schedule variance, and weekly project health metrics.
            </p>
          </div>
          <button
            onClick={() => onNavigate('new')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-gold text-slate-950 font-bold text-sm shadow-lg shadow-gold/20 hover:brightness-110 active:scale-95 transition-all whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" /> Generate New WPR
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Ahead of Schedule" value={stats.ahead} icon={TrendingUp} gradient="from-emerald-600 to-teal-500" />
        <StatCard title="On Track" value={stats.onTrack} icon={CheckCircle} gradient="from-blue-600 to-cyan-500" />
        <StatCard title="Behind Schedule" value={stats.behind} icon={AlertTriangle} gradient="from-rose-600 to-red-500" />
      </div>

      {/* Recent WPRs */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl space-y-6 shadow-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gold" />
            <h3 className="text-lg font-bold text-slate-200">Recent Weekly Progress Reports</h3>
          </div>
          <button onClick={() => onNavigate('new')} className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-amber-400 transition-colors">
            Generate New <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Aggregating weekly performance metrics...</p>
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12 font-medium">No WPR reports generated yet. Click "Generate New WPR" to create your first report.</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {reports.map((r) => (
                <div key={r.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-800/30 transition-colors rounded-xl p-3">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-100 text-sm">{r.project}</h4>
                    <p className="text-xs text-slate-400 font-mono">Week: {r.week_start} to {r.week_end}</p>
                  </div>
                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right space-y-1">
                      <span className="text-xs text-slate-300 font-semibold block">Planned: <strong className="text-slate-100">{r.planned_progress}%</strong> • Actual: <strong className="text-emerald-400">{r.actual_progress}%</strong></span>
                      <div className="flex justify-end">{getVarianceBadge(r.variance)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
