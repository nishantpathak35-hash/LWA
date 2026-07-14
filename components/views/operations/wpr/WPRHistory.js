import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '../../../ui/core';
import { Eye, Trash2, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatWPRToText } from '../../../../src/modules/operations/utils/wprFormatter';
import { useAppState } from '../../../StateProvider';

export default function WPRHistory({ onNavigate, onView }) {
  const { call, projects, user } = useAppState();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProject, setSelectedProject] = useState('');
  const [page, setPage] = useState(0);
  const limit = 10;

  const isApprover = user?.role === 'admin' || user?.role === 'approver' || user?.is_admin;

  useEffect(() => {
    fetchHistory();
  }, [selectedProject, page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const filters = {
        limit,
        offset: page * limit
      };
      if (selectedProject) filters.project = selectedProject;

      const data = await call('listWPRReports', { filters });
      setReports(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyWhatsApp = (wpr) => {
    const text = formatWPRToText(wpr);
    try {
      navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy WPR:', err);
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDelete = async (wpr) => {
    if (!confirm(`Are you sure you want to delete this Weekly Progress Report for "${wpr.project}"?`)) return;
    try {
      setLoading(true);
      await call('deleteWPRReport', { id: wpr.id });
      alert("WPR deleted successfully.");
      await fetchHistory();
    } catch (err) {
      alert("Failed to delete WPR: " + err.message);
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="w-full sm:w-72">
          <select 
            value={selectedProject} 
            onChange={(e) => { setSelectedProject(e.target.value); setPage(0); }}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-gold outline-none"
          >
            <option value="">All Projects</option>
            {(projects || []).map((p, idx) => (
              <option key={idx} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
        <Button variant="primary" size="sm" onClick={() => onNavigate('new')}>Generate WPR</Button>
      </div>

      {/* List */}
      <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Period</th>
                <th className="px-6 py-4 font-medium">Project</th>
                <th className="px-6 py-4 font-medium">Planned</th>
                <th className="px-6 py-4 font-medium">Actual</th>
                <th className="px-6 py-4 font-medium">Variance</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading history...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No WPR reports found.</td>
                </tr>
              ) : (
                reports.map((wpr) => (
                  <tr key={wpr.id} className="hover:bg-slate-800/20">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                      {wpr.week_start} to {wpr.week_end}
                    </td>
                    <td className="px-6 py-4 text-slate-200 font-medium">{wpr.project}</td>
                    <td className="px-6 py-4 text-slate-400">{wpr.planned_progress}%</td>
                    <td className="px-6 py-4 text-slate-400">{wpr.actual_progress}%</td>
                    <td className="px-6 py-4">{getVarianceBadge(wpr.variance)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => copyWhatsApp(wpr)} className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded" title="Copy for WhatsApp">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => onView(wpr)} className="p-1.5 text-slate-400 hover:bg-slate-400/10 rounded" title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {isApprover && (
                          <button onClick={() => handleDelete(wpr)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded" title="Delete Report">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-900/40 px-6 py-3 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">Page {page + 1}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={reports.length < limit} onClick={() => setPage(p => p + 1)} className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
