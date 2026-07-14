import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '../../../ui/core';
import { Trash2, Edit2, Eye, FileText, X } from 'lucide-react';
import { useAppState } from '../../../StateProvider';

export default function DPRTemplates() {
  const { call } = useAppState();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const list = await call('listTemplates', {});
      setTemplates(list || []);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (template) => {
    const newName = prompt("Rename template to:", template.name);
    if (!newName || newName === template.name) return;
    try {
      setLoading(true);
      await call('updateTemplate', {
        id: template.id,
        updates: { name: newName }
      });
      alert("Template renamed successfully!");
      await fetchTemplates();
    } catch (err) {
      alert("Failed to rename template: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (template) => {
    if (!confirm(`Are you sure you want to delete template "${template.name}"?`)) return;
    try {
      setLoading(true);
      await call('deleteTemplate', { id: template.id });
      alert("Template deleted successfully.");
      await fetchTemplates();
    } catch (err) {
      alert("Failed to delete template: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-200">DPR Templates</h2>
              <p className="text-xs text-slate-400 mt-1">Manage and preview templates saved from DPR forms.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loading}>Refresh</Button>
          </div>

          <div className="space-y-4">
            {loading && templates.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Loading templates...</p>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No templates found.</p>
                <p className="text-xs text-slate-600 mt-1">Save a template from the "New DPR" creation tab.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((temp) => (
                  <div key={temp.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-200">{temp.name}</h3>
                      <p className="text-xs text-slate-400">{temp.description || 'No description provided'}</p>
                      {temp.created_at && (
                        <p className="text-[10px] text-slate-600">Created: {new Date(temp.created_at).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setPreviewTemplate(temp)} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded" title="Preview Template">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRename(temp)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded" title="Rename Template">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(temp)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded" title="Delete Template">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <Card className="bg-slate-900 border-slate-800 max-w-2xl w-full max-h-[85vh] flex flex-col">
            <CardContent className="p-6 overflow-y-auto space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Template Preview: {previewTemplate.name}</h3>
                  <p className="text-xs text-slate-400">{previewTemplate.description}</p>
                </div>
                <button onClick={() => setPreviewTemplate(null)} className="p-1.5 text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                {(() => {
                  const data = typeof previewTemplate.data === 'string' ? JSON.parse(previewTemplate.data) : previewTemplate.data;
                  const floors = data?.floors || [];
                  if (floors.length === 0) {
                    return <p className="text-xs text-slate-500 text-center py-4">No floor data in this template.</p>;
                  }
                  return floors.map((f, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
                      <h4 className="text-xs font-semibold text-gold">{f.name || `Floor ${idx + 1}`}</h4>
                      {f.manpower && f.manpower.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-1">Manpower Config:</span>
                          <div className="flex flex-wrap gap-2">
                            {f.manpower.map((mp, mpIdx) => (
                              <span key={mpIdx} className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-300">
                                {mp.team}: {mp.count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {f.workDone && f.workDone.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-1">Pre-filled Work Done Tasks:</span>
                          <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5">
                            {f.workDone.map((w, wIdx) => (
                              <li key={wIdx}>{w.task}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
