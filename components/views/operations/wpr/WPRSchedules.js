import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '../../../ui/core';
import { Plus, Trash2, Calendar, Save, RefreshCw } from 'lucide-react';
import { useAppState } from '../../../StateProvider';

export default function WPRSchedules() {
  const { call, projects } = useAppState();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    project: '',
    milestone_name: '',
    floor_zone: '',
    planned_start: '',
    planned_end: '',
    render_image_url: '',
    planned_progress_curve: {}
  });

  // Curve entry state
  const [curveDate, setCurveDate] = useState('');
  const [curvePct, setCurvePct] = useState('');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const data = await call('listSchedules', {});
      setSchedules(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCurvePoint = () => {
    if (!curveDate || !curvePct) return;
    setFormData(prev => ({
      ...prev,
      planned_progress_curve: {
        ...prev.planned_progress_curve,
        [curveDate]: parseFloat(curvePct) || 0
      }
    }));
    setCurveDate('');
    setCurvePct('');
  };

  const handleRemoveCurvePoint = (date) => {
    setFormData(prev => {
      const curve = { ...prev.planned_progress_curve };
      delete curve[date];
      return { ...prev, planned_progress_curve: curve };
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3.5 * 1024 * 1024) {
      alert("File exceeds 3.5MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result.split(',')[1];
      setSaving(true);
      try {
        const res = await call('uploadAttachment', {
          entityType: 'schedule_renders',
          entityId: formData.project || 'general',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: base64Data
        });
        if (res && res.url) {
          setFormData(prev => ({ ...prev, render_image_url: res.url }));
        }
      } catch (err) {
        alert("Upload failed: " + err.message);
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project || !formData.milestone_name) {
      alert("Please fill in project name and milestone name.");
      return;
    }

    try {
      setSaving(true);
      await call('saveSchedule', formData);
      alert("Schedule saved successfully!");
      setShowAddForm(false);
      setFormData({
        project: '',
        milestone_name: '',
        floor_zone: '',
        planned_start: '',
        planned_end: '',
        render_image_url: '',
        planned_progress_curve: {}
      });
      await fetchSchedules();
    } catch (err) {
      alert("Failed to save schedule: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-md font-semibold text-slate-200">Project Schedules & Milestones</h2>
          <p className="text-xs text-slate-400 mt-0.5">Define target project progress and upload 3D renders to reconcile in WPR.</p>
        </div>
        {!showAddForm && (
          <Button variant="primary" size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Milestone Schedule
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-md font-semibold text-slate-200">Create Milestone Schedule</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <label className="text-xs text-slate-400">Milestone Name</label>
                  <input
                    type="text"
                    value={formData.milestone_name}
                    onChange={e => setFormData({ ...formData, milestone_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
                    placeholder="e.g. Civil and Structure"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Floor / Zone (Optional)</label>
                  <input
                    type="text"
                    value={formData.floor_zone}
                    onChange={e => setFormData({ ...formData, floor_zone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
                    placeholder="e.g. Floor 1-5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Planned Start Date</label>
                  <input
                    type="date"
                    value={formData.planned_start}
                    onChange={e => setFormData({ ...formData, planned_start: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Planned End Date</label>
                  <input
                    type="date"
                    value={formData.planned_end}
                    onChange={e => setFormData({ ...formData, planned_end: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">3D Design Render Image</label>
                  <div className="flex items-center gap-2">
                    <label className="w-full text-center bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded px-3 py-2 text-xs text-slate-400 cursor-pointer">
                      {formData.render_image_url ? "Image Uploaded" : "Select & Upload Render"}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Planned Curve */}
              <div className="border-t border-slate-800/60 pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-300">Planned Progress Curve (Milestone Targets)</h4>
                <div className="flex gap-2 items-end max-w-md">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-slate-500">Target Date</span>
                    <input type="date" value={curveDate} onChange={e => setCurveDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200" />
                  </div>
                  <div className="w-28 space-y-1">
                    <span className="text-[10px] text-slate-500">Progress (%)</span>
                    <input type="number" min="0" max="100" value={curvePct} onChange={e => setCurvePct(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200" />
                  </div>
                  <Button type="button" size="sm" onClick={handleAddCurvePoint}>Add Point</Button>
                </div>

                {Object.keys(formData.planned_progress_curve).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {Object.entries(formData.planned_progress_curve).map(([date, pct]) => (
                      <span key={date} className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-1 rounded-full flex items-center gap-2">
                        {date} :- {pct}%
                        <button type="button" onClick={() => handleRemoveCurvePoint(date)} className="text-red-400 hover:text-red-500 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/60">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" /> Save Schedule
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Schedules List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-6 text-slate-400 flex justify-center items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading schedules...
            </div>
          ) : schedules.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No milestone schedules configured. Click "Add Milestone Schedule" to configure target curves.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {schedules.map((s) => (
                <div key={s.id} className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex gap-4">
                  {s.render_image_url && (
                    <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded overflow-hidden flex-shrink-0">
                      <img src={s.render_image_url} alt="Render" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="text-[10px] text-gold font-semibold uppercase">{s.project}</span>
                    <h3 className="text-sm font-bold text-slate-200 truncate">{s.milestone_name}</h3>
                    {s.floor_zone && <p className="text-xs text-slate-400 font-normal">Zone: {s.floor_zone}</p>}
                    <p className="text-[10px] text-slate-500 font-normal">Period: {s.planned_start || "N/A"} to {s.planned_end || "N/A"}</p>
                    {s.planned_progress_curve && Object.keys(s.planned_progress_curve).length > 0 && (
                      <div className="pt-2">
                        <span className="text-[9px] text-slate-500 font-bold block">Milestone Target Points:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(s.planned_progress_curve).map(([date, pct]) => (
                            <span key={date} className="bg-slate-900 border border-slate-800/80 rounded px-1.5 py-0.5 text-[9px] text-slate-400">
                              {date}: {pct}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
