import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '../../../ui/core';
import { Search, Eye, Edit2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppState } from '../../../StateProvider';

export default function DPRHistory({ onNavigate, onEdit, onView }) {
  const { call, projects } = useAppState();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedProject, setSelectedProject] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [page, setPage] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchHistory();
  }, [selectedProject, dateFrom, dateTo, approvalStatus, page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const filters = {
        limit,
        offset: page * limit
      };
      if (selectedProject) filters.project = selectedProject;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (approvalStatus) filters.approval_status = approvalStatus;

      const data = await call('listDPRs', { filters });
      setReports(data || []);
    } catch (err) {
      console.error("Failed to load DPR history:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtering Section */}
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-200">Filters</h3>
          <Button variant="primary" size="sm" onClick={() => onNavigate('new')}>Create DPR</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Project dropdown */}
          <select 
            value={selectedProject} 
            onChange={(e) => { setSelectedProject(e.target.value); setPage(0); }}
            className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-gold outline-none"
          >
            <option value="">All Projects</option>
            {(projects || []).map((p, idx) => (
              <option key={idx} value={p.name}>{p.name}</option>
            ))}
          </select>

          {/* Status dropdown */}
          <select 
            value={approvalStatus} 
            onChange={(e) => { setApprovalStatus(e.target.value); setPage(0); }}
            className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-gold outline-none"
          >
            <option value="">All Approval Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Date from */}
          <input 
            type="date" 
            value={dateFrom} 
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            placeholder="From Date"
            className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-gold outline-none"
          />

          {/* Date to */}
          <input 
            type="date" 
            value={dateTo} 
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            placeholder="To Date"
            className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:border-gold outline-none"
          />
        </div>
      </div>

      {/* History table */}
      <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Project</th>
                <th className="px-6 py-4 font-medium">Site</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Approval</th>
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
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No reports found.</td>
                </tr>
              ) : (
                reports.map((dpr) => (
                  <tr key={dpr.id} className="hover:bg-slate-800/20">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                      {new Date(dpr.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-200 font-medium">{dpr.project}</td>
                    <td className="px-6 py-4 text-slate-400">{dpr.site || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        dpr.status === 'Delayed' || dpr.status === 'Critical' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {dpr.status || 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        dpr.approval_status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        dpr.approval_status === 'Rejected' ? 'bg-red-500/10 text-red-400' :
                        dpr.approval_status === 'Checked' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {dpr.approval_status || 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => onView(dpr)} className="p-1.5 text-slate-400 hover:bg-slate-400/10 rounded" title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => onEdit(dpr)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded" title="Edit DPR">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="bg-slate-900/40 px-6 py-3 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">Page {page + 1}</span>
          <div className="flex gap-2">
            <button 
              disabled={page === 0} 
              onClick={() => setPage(p => p - 1)}
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              disabled={reports.length < limit} 
              onClick={() => setPage(p => p + 1)}
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
