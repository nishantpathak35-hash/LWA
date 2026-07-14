import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../ui/core';
import { TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
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
    if (v < -5) return <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs">Behind ({v}%)</span>;
    if (v > 5) return <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-semibold">Ahead (+{v}%)</span>;
    return <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs">On Track ({v > 0 ? '+' : ''}{v}%)</span>;
  };

  const stats = reports.reduce((acc, r) => {
    const v = parseFloat(r.variance) || 0;
    if (v < -5) acc.behind++;
    else if (v > 5) acc.ahead++;
    else acc.onTrack++;
    return acc;
  }, { ahead: 0, onTrack: 0, behind: 0 });

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/40 border-slate-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">AHEAD OF SCHEDULE</span>
              <span className="text-3xl font-bold text-emerald-400 mt-1 block">{stats.ahead}</span>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">ON TRACK</span>
              <span className="text-3xl font-bold text-blue-400 mt-1 block">{stats.onTrack}</span>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-full text-blue-400">
              <CheckCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">BEHIND SCHEDULE</span>
              <span className="text-3xl font-bold text-red-400 mt-1 block">{stats.behind}</span>
            </div>
            <div className="bg-red-500/10 p-3 rounded-full text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent WPRs */}
      <Card className="bg-slate-900/40 border-slate-800">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-md font-semibold text-slate-200">Recent Weekly Reports</h3>
            <button onClick={() => onNavigate('new')} className="text-xs text-gold flex items-center gap-1 hover:underline">
              Generate New <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-slate-500 text-center py-6">Loading dashboard data...</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No WPR reports generated yet.</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {reports.map((r) => (
                  <div key={r.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="font-semibold text-slate-200">{r.project}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Week: {r.week_start} to {r.week_end}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-normal">Planned: {r.planned_progress}% | Actual: {r.actual_progress}%</span>
                        <div className="mt-1">{getVarianceBadge(r.variance)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
