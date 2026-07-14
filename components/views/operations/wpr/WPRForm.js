import React, { useState } from 'react';
import { Card, CardContent, Button } from '../../../ui/core';
import { RefreshCw, Play, Save, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useAppState } from '../../../StateProvider';

export default function WPRForm({ onNavigate }) {
  const { call, projects } = useAppState();
  const [loading, setLoading] = useState(false);
  const [aggregating, setAggregating] = useState(false);
  const [aggResult, setAggResult] = useState(null);

  const [formData, setFormData] = useState({
    project: '',
    week_start: '',
    week_end: '',
    planned_progress: 0,
    actual_progress: 0,
    render_image_url: '',
    actual_image_url: '',
    summary_text: ''
  });

  const handleFetchAggregation = async () => {
    if (!formData.project || !formData.week_start || !formData.week_end) {
      alert("Please select a project, start date, and end date.");
      return;
    }

    try {
      setAggregating(true);
      const res = await call('getWPRAggregation', {
        project: formData.project,
        weekStart: formData.week_start,
        weekEnd: formData.week_end
      });

      if (res) {
        setAggResult(res);
        setFormData(prev => ({
          ...prev,
          planned_progress: res.suggestedPlannedProgress || 0,
          actual_progress: res.suggestedActualProgress || 0,
          render_image_url: res.renderImageUrl || '',
          actual_image_url: res.photos && res.photos.length > 0 ? res.photos[0].url : ''
        }));
      }
    } catch (err) {
      alert("Failed to aggregate data: " + err.message);
    } finally {
      setAggregating(false);
    }
  };

  const handleImageUpload = (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3.5 * 1024 * 1024) {
      alert("File exceeds 3.5MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result.split(',')[1];
      setLoading(true);
      try {
        const res = await call('uploadAttachment', {
          entityType: 'wpr_photos',
          entityId: formData.project || 'general',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: base64Data
        });
        if (res && res.url) {
          setFormData(prev => ({ ...prev, [field]: res.url }));
        }
      } catch (err) {
        alert("Upload failed: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.project || !formData.week_start || !formData.week_end) {
      alert("Please fill in project, week start, and week end.");
      return;
    }

    try {
      setLoading(true);
      await call('createWPRReport', formData);
      alert("WPR saved successfully!");
      onNavigate('history');
    } catch (err) {
      alert("Failed to save WPR: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const variance = formData.actual_progress - formData.planned_progress;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Configure WPR Range</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Select Project</label>
              <select
                value={formData.project}
                onChange={e => setFormData({ ...formData, project: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
                required
              >
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Week Start</label>
              <input
                type="date"
                value={formData.week_start}
                onChange={e => setFormData({ ...formData, week_start: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Week End</label>
              <input
                type="date"
                value={formData.week_end}
                onChange={e => setFormData({ ...formData, week_end: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
                required
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={aggregating}
              onClick={handleFetchAggregation}
              className="border-gold/30 hover:bg-gold/10 text-gold"
            >
              {aggregating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Fetch Weekly Aggregates
            </Button>
          </div>
        </CardContent>
      </Card>

      {aggResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Warning if 0 DPRs */}
            {aggResult.dprsCount === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-xs">No Underlying DPRs Found</h4>
                  <p className="text-[10px] mt-1 font-normal">There are 0 DPRs recorded for this project during the selected week. Aggregated actual progress defaults to 0%.</p>
                </div>
              </div>
            )}

            {/* Metrics */}
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-md font-semibold text-slate-200">Progress Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Planned Progress (%)</label>
                    <input
                      type="number"
                      value={formData.planned_progress}
                      onChange={e => setFormData({ ...formData, planned_progress: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
                    />
                    <p className="text-[10px] text-slate-500 font-normal">Suggested from schedule milestones.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Actual Progress (%)</label>
                    <input
                      type="number"
                      value={formData.actual_progress}
                      onChange={e => setFormData({ ...formData, actual_progress: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
                    />
                    <p className="text-[10px] text-slate-500 font-normal">Suggested average from floor task progress.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Variance</label>
                    <div className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-300 font-semibold">
                      {variance > 0 ? `+${variance}` : variance}% 
                      <span className={`ml-2 text-xs font-normal ${variance < -5 ? 'text-red-400' : variance > 5 ? 'text-emerald-400' : 'text-blue-400'}`}>
                        ({variance < -5 ? 'Behind' : variance > 5 ? 'Ahead' : 'On Track'})
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Narrative summary */}
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-5 space-y-2">
                <label className="text-xs font-semibold text-slate-300">Narrative Summary</label>
                <textarea
                  placeholder="Explain weekly delays, milestones achieved, or specific requirements..."
                  value={formData.summary_text}
                  onChange={e => setFormData({ ...formData, summary_text: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:border-gold outline-none"
                />
              </CardContent>
            </Card>

            {/* Photo Pairing (3D Render vs Site Photo) */}
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-md font-semibold text-slate-200">Paired Media Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 3D Render Image */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-300">3D Design Render</span>
                      <label className="text-[10px] text-gold cursor-pointer hover:underline">
                        Upload Render
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'render_image_url')} className="hidden" />
                      </label>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 h-48 flex justify-center items-center overflow-hidden relative">
                      {formData.render_image_url ? (
                        <img src={formData.render_image_url} alt="3D Render" className="w-full h-full object-cover rounded" />
                      ) : (
                        <span className="text-xs text-slate-500">No 3D Render Image selected or uploaded</span>
                      )}
                    </div>
                  </div>

                  {/* Actual Site Photo */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-300">Actual Site Photo</span>
                      <label className="text-[10px] text-gold cursor-pointer hover:underline">
                        Upload Photo
                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'actual_image_url')} className="hidden" />
                      </label>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 h-48 flex justify-center items-center overflow-hidden relative">
                      {formData.actual_image_url ? (
                        <img src={formData.actual_image_url} alt="Site Progress" className="w-full h-full object-cover rounded" />
                      ) : (
                        <span className="text-xs text-slate-500">No Site Photo selected</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* DPR Photos list to choose from */}
                {aggResult.photos && aggResult.photos.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400 block">Select from this week's DPR photo uploads:</span>
                    <div className="flex overflow-x-auto gap-3 py-2 hide-scrollbar">
                      {aggResult.photos.map((ph, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, actual_image_url: ph.url }))}
                          className={`flex-shrink-0 w-24 h-24 rounded overflow-hidden border-2 relative ${
                            formData.actual_image_url === ph.url ? 'border-gold' : 'border-slate-800'
                          }`}
                        >
                          <img src={ph.url} alt="DPR Log" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-md font-semibold text-slate-200 border-b border-slate-800 pb-2">Generate Report</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div>
                    <span className="block text-slate-500">Underlying DPRs Fetched</span>
                    <span className="text-slate-200 font-semibold text-sm">{aggResult.dprsCount} reports</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Target period</span>
                    <span className="text-slate-200 font-medium">{formData.week_start} to {formData.week_end}</span>
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="w-full font-semibold text-black bg-gold hover:bg-gold/90 mt-2"
                >
                  <Save className="w-4 h-4 mr-2" /> Save & Generate WPR
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </form>
  );
}
