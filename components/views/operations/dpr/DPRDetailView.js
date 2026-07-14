import React, { useState } from 'react';
import { Card, CardContent, Button } from '../../../ui/core';
import { ArrowLeft, MessageCircle, Edit2, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { formatDPRToText } from '../../../../src/modules/operations/utils/dprFormatter';
import { useAppState } from '../../../StateProvider';

export default function DPRDetailView({ dpr, onNavigate, onEdit }) {
  const { user, call } = useAppState();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(dpr);

  const isApprover = user?.role === 'admin' || user?.role === 'approver' || user?.is_admin;

  const copyWhatsApp = () => {
    const text = formatDPRToText(report);
    try {
      navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleUpdateStatus = async (status) => {
    if (!confirm(`Are you sure you want to change the status of this report to ${status}?`)) return;
    setLoading(true);
    try {
      await call('updateDPR', {
        id: report.id,
        updates: {
          approval_status: status,
          expected_updated_at: report.updated_at
        }
      });
      // Fetch latest
      const fresh = await call('getDPR', { id: report.id });
      if (fresh) {
        setReport(fresh);
      }
      alert(`DPR status updated to ${status}`);
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to DELETE this daily progress report? This cannot be undone.")) return;
    setLoading(true);
    try {
      await call('deleteDPR', { id: report.id });
      alert("DPR deleted successfully.");
      onNavigate('history');
    } catch (err) {
      alert("Failed to delete DPR: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const dprData = typeof report.data === 'string' ? JSON.parse(report.data) : (report.data || {});
  const floors = dprData.floors || [];
  const materials = dprData.materials || [];
  const issues = dprData.issues || [];
  const visitors = dprData.visitors || [];
  const photos = dprData.photos || [];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <button onClick={() => onNavigate('history')} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </button>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={copyWhatsApp} className="border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400">
            <MessageCircle className="w-4 h-4 mr-2" /> Share via WhatsApp
          </Button>
          <Button variant="outline" onClick={() => onEdit(report)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit DPR
          </Button>
          {isApprover && (
            <Button variant="outline" onClick={handleDelete} className="border-red-500/30 hover:bg-red-500/10 text-red-400">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Floors Progression */}
          {floors.map((floor, fIdx) => (
            <Card key={fIdx} className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-lg font-semibold text-gold border-b border-slate-800 pb-2">{floor.name || `Floor ${fIdx + 1}`}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Manpower */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Manpower</h4>
                    <div className="space-y-1 bg-slate-950 p-3 rounded border border-slate-800">
                      {(floor.manpower || []).map((mp, mIdx) => (
                        <div key={mIdx} className="flex justify-between text-xs text-slate-400">
                          <span>{mp.team}</span>
                          <span className="font-semibold text-slate-200">{mp.count}</span>
                        </div>
                      ))}
                      {(!floor.manpower || floor.manpower.length === 0) && <p className="text-xs text-slate-500">No manpower logged.</p>}
                    </div>
                  </div>

                  {/* Work Done */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Work Done</h4>
                    <ul className="space-y-1.5 list-disc list-inside text-xs text-slate-400 bg-slate-950 p-3 rounded border border-slate-800">
                      {(floor.workDone || []).map((w, wIdx) => (
                        <li key={wIdx}>
                          {w.task} {w.progress ? <span className="text-gold font-medium ml-1">[{w.progress}%]</span> : ''}
                        </li>
                      ))}
                      {(!floor.workDone || floor.workDone.length === 0) && <p className="text-xs text-slate-500">No work done logged.</p>}
                    </ul>
                  </div>
                </div>

                {/* Tomorrow's Plan */}
                {floor.tomorrowPlan && floor.tomorrowPlan.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Tomorrow's Plan</h4>
                    <ul className="space-y-1 list-disc list-inside text-xs text-slate-400 bg-slate-950 p-3 rounded border border-slate-800">
                      {floor.tomorrowPlan.map((p, pIdx) => (
                        <li key={pIdx}>{p.task}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Photos */}
          {photos.length > 0 && (
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-5">
                <h3 className="text-md font-semibold text-slate-200 mb-4">Site Photos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {photos.map((ph, pIdx) => (
                    <div key={pIdx} className="bg-slate-950 p-2 rounded border border-slate-800">
                      <img src={ph.url} alt={ph.caption || "Site Photo"} className="w-full h-48 object-cover rounded" />
                      {ph.caption && <p className="text-xs text-slate-400 mt-2 text-center italic">"{ph.caption}"</p>}
                      {ph.floor && <p className="text-[10px] text-gold mt-1 text-center font-semibold uppercase">{ph.floor}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info & Workflow */}
        <div className="space-y-6">
          {/* Metadata details */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-md font-semibold text-slate-200 border-b border-slate-800 pb-2">Details</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Project</span>
                  <span className="text-slate-200 font-medium">{report.project}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Site</span>
                  <span className="text-slate-200">{report.site || 'N/A'}</span>
                </div>
                {dprData.seqId && (
                  <div>
                    <span className="text-xs text-slate-500 block">DPR Serial ID</span>
                    <span className="text-slate-200 font-mono font-semibold">{dprData.seqId}</span>
                  </div>
                )}
                {report.client && (
                  <div>
                    <span className="text-xs text-slate-500 block">Client</span>
                    <span className="text-slate-200">{report.client}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-slate-500 block">Weather</span>
                    <span className="text-slate-200">{report.weather || 'Normal'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Shift</span>
                    <span className="text-slate-200">{report.shift || 'Day'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Status</span>
                  <span className={`px-2 py-0.5 rounded text-xs inline-block mt-1 font-semibold ${
                    report.status === 'Delayed' || report.status === 'Critical' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {report.status || 'Normal'}
                  </span>
                </div>
                {report.remarks && (
                  <div>
                    <span className="text-xs text-slate-500 block">Remarks</span>
                    <span className="text-slate-300 text-xs italic">"{report.remarks}"</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Materials, Issues, Visitors summary */}
          {(materials.length > 0 || issues.length > 0 || visitors.length > 0) && (
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-md font-semibold text-slate-200 border-b border-slate-800 pb-2">Logs Summary</h3>
                
                {materials.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 mb-1">Materials</h4>
                    <div className="space-y-1 text-xs">
                      {materials.map((m, idx) => (
                        <div key={idx} className="flex justify-between border-b border-slate-800/40 py-1 text-slate-300">
                          <span>{m.item}</span>
                          <span>{m.quantity} {m.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {issues.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-slate-400 mb-1">Issues</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-red-400 bg-red-950/20 p-2 rounded border border-red-900/30">
                      {issues.map((i, idx) => (
                        <li key={idx}>{i.issue || i.description}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {visitors.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-slate-400 mb-1">Visitors</h4>
                    <div className="space-y-1 text-xs text-slate-300">
                      {visitors.map((v, idx) => (
                        <div key={idx} className="bg-slate-950 p-1.5 rounded border border-slate-800 mt-1">
                          <span className="font-medium">{v.visitor}</span>
                          {v.purpose && <span className="text-slate-500 block text-[10px]">Purpose: {v.purpose}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Workflow Status / Signatures */}
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-md font-semibold text-slate-200 border-b border-slate-800 pb-2">Approval Workflow</h3>
              
              <div className="space-y-2 text-xs text-slate-400">
                <div>
                  <span className="block text-slate-500">Prepared By</span>
                  <span className="text-slate-200 font-medium text-sm">{report.prepared_by || 'Unknown'}</span>
                </div>
                {report.checked_by && (
                  <div>
                    <span className="block text-slate-500">Checked By</span>
                    <span className="text-slate-200 font-medium">{report.checked_by}</span>
                  </div>
                )}
                {report.approved_by && (
                  <div>
                    <span className="block text-slate-500">Approved By</span>
                    <span className="text-emerald-400 font-medium">{report.approved_by}</span>
                  </div>
                )}
                <div>
                  <span className="block text-slate-500">Current Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] inline-block font-semibold mt-1 uppercase ${
                    report.approval_status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                    report.approval_status === 'Rejected' ? 'bg-red-500/10 text-red-400' :
                    report.approval_status === 'Checked' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>
                    {report.approval_status || 'Draft'}
                  </span>
                </div>
              </div>

              {isApprover && report.approval_status !== 'Approved' && (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-500 font-semibold mb-1">Actions</span>
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={() => handleUpdateStatus('Approved')} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-black text-xs font-semibold py-2">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button variant="outline" onClick={() => handleUpdateStatus('Rejected')} disabled={loading} className="flex-1 border-red-500/30 text-red-400 text-xs font-semibold py-2">
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                  <Button variant="outline" onClick={() => handleUpdateStatus('Draft')} disabled={loading} className="w-full text-xs font-semibold py-2">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Send Back to Draft
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
