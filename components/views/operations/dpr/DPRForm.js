import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '../../../ui/core';
import { Plus, Trash2, Save, Send, HardHat, FileText, CheckCircle } from 'lucide-react';
import { useAppState } from '../../../StateProvider';
import { calculateFloorManpower, calculateOverallManpower as calcOverall } from '../../../../src/modules/operations/utils/dprCalculations.js';

export default function DPRForm({ onNavigate, editData = null }) {
  const { user, projects, call } = useAppState();
  
  const [formData, setFormData] = useState({
    project: '',
    site: '',
    client: '',
    date: new Date().toISOString().split('T')[0],
    weather: 'Normal',
    shift: 'Day',
    start_time: '09:00',
    end_time: '18:00',
    status: 'Normal',
    remarks: '',
    data: {
      floors: [],
      materials: [],
      issues: [],
      visitors: [],
    }
  });

  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    if (editData) {
      setFormData({
        ...editData,
        data: typeof editData.data === 'string' ? JSON.parse(editData.data) : editData.data
      });
    }
  }, [editData]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const list = await call('listTemplates', {});
        setTemplates(list || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTemplates();
  }, []);

  const [dropdownOptions, setDropdownOptions] = useState({
    weather: ['Normal', 'Sunny', 'Cloudy', 'Rainy'],
    shift: ['Day', 'Night'],
    status: ['Normal', 'Delayed', 'Critical']
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const s = await call('getDPRSettings', {});
        if (s) {
          setDropdownOptions({
            weather: s.weatherOptions ? s.weatherOptions.split(',').map(x => x.trim()) : ['Normal', 'Sunny', 'Cloudy', 'Rainy'],
            shift: s.shiftOptions ? s.shiftOptions.split(',').map(x => x.trim()) : ['Day', 'Night'],
            status: s.statusOptions ? s.statusOptions.split(',').map(x => x.trim()) : ['Normal', 'Delayed', 'Critical']
          });
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleLoadTemplate = (templateId) => {
    if (!templateId) return;
    const t = templates.find(temp => temp.id === parseInt(templateId));
    if (!t) return;
    const parsedData = typeof t.data === 'string' ? JSON.parse(t.data) : t.data;
    setFormData(prev => ({
      ...prev,
      data: parsedData
    }));
    alert(`Loaded template: ${t.name}`);
  };

  const handleSaveAsTemplate = async () => {
    const name = prompt("Enter a name for this template:");
    if (!name) return;
    try {
      setLoading(true);
      await call('createTemplate', {
        name,
        description: `Template for project ${formData.project || 'General'}`,
        data: formData.data
      });
      alert("Template saved successfully!");
      const list = await call('listTemplates', {});
      setTemplates(list || []);
    } catch (err) {
      alert("Failed to save template: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  const handlePhotoUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      if (file.size > 3.5 * 1024 * 1024) {
        alert("File exceeds 3.5MB limit. Please select a smaller file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result.split(',')[1];
        setLoading(true);
        try {
          const res = await call('uploadAttachment', {
            entityType: 'dpr_photos',
            entityId: formData.project || 'general',
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: base64Data
          });
          if (res && res.url) {
            setFormData(prev => ({
              ...prev,
              data: {
                ...prev.data,
                photos: [...(prev.data.photos || []), { url: res.url, caption: '', floor: '' }]
              }
            }));
          }
        } catch (err) {
          alert("Photo upload failed: " + err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = null; // reset
  };

  const removePhoto = (idx) => {
    setFormData(prev => {
      const photos = [...(prev.data.photos || [])];
      photos.splice(idx, 1);
      return { ...prev, data: { ...prev.data, photos } };
    });
  };

  const updatePhotoField = (idx, field, value) => {
    setFormData(prev => {
      const photos = [...(prev.data.photos || [])];
      photos[idx][field] = value;
      return { ...prev, data: { ...prev.data, photos } };
    });
  };

  // --- Dynamic Floor Handlers ---
  const addFloor = () => {
    setFormData(prev => ({
      ...prev,
      data: {
        ...prev.data,
        floors: [...(prev.data.floors || []), { name: '', manpower: [], workDone: [], tomorrowPlan: [] }]
      }
    }));
  };

  const removeFloor = (index) => {
    setFormData(prev => {
      const floors = [...prev.data.floors];
      floors.splice(index, 1);
      return { ...prev, data: { ...prev.data, floors } };
    });
  };

  const updateFloorName = (index, name) => {
    setFormData(prev => {
      const floors = [...prev.data.floors];
      floors[index].name = name;
      return { ...prev, data: { ...prev.data, floors } };
    });
  };

  const addManpower = (floorIndex) => {
    setFormData(prev => {
      const floors = [...prev.data.floors];
      floors[floorIndex].manpower.push({ team: '', count: 0 });
      return { ...prev, data: { ...prev.data, floors } };
    });
  };

  const updateManpower = (floorIndex, mpIndex, field, value) => {
    setFormData(prev => {
      const floors = [...prev.data.floors];
      floors[floorIndex].manpower[mpIndex][field] = value;
      return { ...prev, data: { ...prev.data, floors } };
    });
  };

  const removeManpower = (floorIndex, mpIndex) => {
    setFormData(prev => {
      const floors = [...prev.data.floors];
      floors[floorIndex].manpower.splice(mpIndex, 1);
      return { ...prev, data: { ...prev.data, floors } };
    });
  };

  const addWork = (floorIndex, type) => {
    setFormData(prev => {
      const floors = [...prev.data.floors];
      floors[floorIndex][type].push({ task: '' });
      return { ...prev, data: { ...prev.data, floors } };
    });
  };

  const updateWork = (floorIndex, type, workIndex, field, value) => {
    setFormData(prev => {
      const floors = [...prev.data.floors];
      // If we don't pass a field, assume it was the old 'task' signature for backward compatibility
      if (value === undefined) {
        floors[floorIndex][type][workIndex].task = field;
      } else {
        floors[floorIndex][type][workIndex][field] = value;
      }
      return { ...prev, data: { ...prev.data, floors } };
    });
  };

  const removeWork = (floorIndex, type, workIndex) => {
    setFormData(prev => {
      const floors = [...prev.data.floors];
      floors[floorIndex][type].splice(workIndex, 1);
      return { ...prev, data: { ...prev.data, floors } };
    });
  };

  // --- Other Sections (Materials, Issues, etc.) ---
  const addDynamicRow = (section, initialObj) => {
    setFormData(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [section]: [...(prev.data[section] || []), initialObj]
      }
    }));
  };
  
  const updateDynamicRow = (section, index, field, value) => {
    setFormData(prev => {
      const list = [...prev.data[section]];
      list[index][field] = value;
      return { ...prev, data: { ...prev.data, [section]: list } };
    });
  };

  const removeDynamicRow = (section, index) => {
    setFormData(prev => {
      const list = [...prev.data[section]];
      list.splice(index, 1);
      return { ...prev, data: { ...prev.data, [section]: list } };
    });
  };

  // Calculations
  
  const handleSubmit = async (e, status = 'Draft') => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editData) {
        await call('updateDPR', editData.id, { ...formData, approval_status: status });
      } else {
        await call('submitDPR', { ...formData, approval_status: status });
      }
      onNavigate('history');
    } catch (err) {
      alert('Failed to save DPR: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, 'Draft')} className="space-y-6 pb-20">
      
      {/* SECTION 1: Project Details */}
      <Card className="bg-slate-900/50 border-slate-800">
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
          <h2 className="font-semibold text-slate-200">1. Project Details</h2>
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Load Template:</label>
              <select
                onChange={e => handleLoadTemplate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-gold"
                defaultValue=""
              >
                <option value="" disabled>Select Template</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Project Name</label>
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
            <label className="text-xs text-slate-400">Site / Location</label>
            <input
              type="text"
              value={formData.site}
              onChange={e => setFormData({ ...formData, site: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
              placeholder="e.g. Tower A"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Client</label>
            <input
              type="text"
              value={formData.client}
              onChange={e => setFormData({ ...formData, client: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Weather</label>
            <select
              value={formData.weather}
              onChange={e => setFormData({ ...formData, weather: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
            >
              {dropdownOptions.weather.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Shift</label>
            <select
              value={formData.shift}
              onChange={e => setFormData({ ...formData, shift: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
            >
              {dropdownOptions.shift.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Overall Site Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-gold"
            >
              {dropdownOptions.status.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* OVERALL MANPOWER SUMMARY */}
      <div className="flex items-center justify-between px-4 py-3 bg-gold/10 border border-gold/20 rounded-lg">
        <h3 className="text-gold font-medium">Overall Site Manpower</h3>
        <span className="text-2xl font-bold text-gold">{calculateOverallManpower()}</span>
      </div>

      {/* SECTION 2 & 3 & 4: Floor-wise Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Floor-wise Progress</h2>
          <Button type="button" variant="outline" size="sm" onClick={addFloor}>
            <Plus className="w-4 h-4 mr-2" /> Add Floor
          </Button>
        </div>

        {(formData.data.floors || []).map((floor, fIdx) => (
          <Card key={fIdx} className="bg-slate-900/30 border-slate-800">
            <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
              <input
                type="text"
                placeholder="Floor Name (e.g. 2nd Floor)"
                value={floor.name}
                onChange={e => updateFloorName(fIdx, e.target.value)}
                className="bg-transparent border-none text-slate-200 font-medium focus:outline-none placeholder-slate-500"
              />
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400">Total: <strong className="text-slate-200">{calculateFloorManpower(floor)}</strong></span>
                <button type="button" onClick={() => removeFloor(fIdx)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <CardContent className="p-4 space-y-6">
              {/* Manpower */}
              <div>
                <div className="flex justify-between mb-2">
                  <h4 className="text-sm font-medium text-slate-300 text-gold/80">Manpower Details</h4>
                  <button type="button" onClick={() => addManpower(fIdx)} className="text-xs text-gold hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Team
                  </button>
                </div>
                <div className="space-y-2">
                  {floor.manpower.map((mp, mpIdx) => (
                    <div key={mpIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Team Name (e.g. Electrician)"
                        value={mp.team}
                        onChange={e => updateManpower(fIdx, mpIdx, 'team', e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-200"
                      />
                      <input
                        type="number"
                        placeholder="Count"
                        value={mp.count}
                        onChange={e => updateManpower(fIdx, mpIdx, 'count', e.target.value)}
                        className="w-24 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-200"
                      />
                      <button type="button" onClick={() => removeManpower(fIdx, mpIdx)} className="p-1.5 text-slate-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {floor.manpower.length === 0 && <p className="text-xs text-slate-500">No manpower added to this floor.</p>}
                </div>
              </div>

              <div className="space-y-4">
                {/* Today Work */}
                <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-slate-300">Today's Work Progress</h4>
                    <button type="button" onClick={() => addWork(fIdx, 'workDone')} className="text-xs text-gold hover:underline flex items-center">
                      <Plus className="w-3 h-3 mr-1" /> Add Item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {floor.workDone.map((w, wIdx) => (
                      <div key={wIdx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Task description (e.g. Tile work in progress)"
                          value={w.task}
                          onChange={e => updateWork(fIdx, 'workDone', wIdx, 'task', e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-200 focus:border-gold"
                        />
                        <button type="button" onClick={() => removeWork(fIdx, 'workDone', wIdx)} className="text-slate-500 hover:text-red-400 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {floor.workDone.length === 0 && (
                      <div className="text-center py-4 border border-dashed border-slate-700 rounded-lg">
                        <p className="text-xs text-slate-500">No work progress added.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                {/* Tomorrow's Plan */}
                <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800 mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-slate-300">Tomorrow's Plan</h4>
                    <button type="button" onClick={() => addWork(fIdx, 'tomorrowPlan')} className="text-xs text-gold hover:underline flex items-center">
                      <Plus className="w-3 h-3 mr-1" /> Add Item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(floor.tomorrowPlan || []).map((w, wIdx) => (
                      <div key={wIdx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Task description (e.g. Start painting)"
                          value={w.task}
                          onChange={e => updateWork(fIdx, 'tomorrowPlan', wIdx, 'task', e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm text-slate-200 focus:border-gold"
                        />
                        <button type="button" onClick={() => removeWork(fIdx, 'tomorrowPlan', wIdx)} className="text-slate-500 hover:text-red-400 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!floor.tomorrowPlan || floor.tomorrowPlan.length === 0) && (
                      <div className="text-center py-4 border border-dashed border-slate-700 rounded-lg">
                        <p className="text-xs text-slate-500">No plan added for tomorrow.</p>
                      </div>
                    )}
                  </div>
                </div>

            </CardContent>
          </Card>
        ))}
      </div>



      {/* Site Photos Section */}
      <Card className="bg-slate-900/50 border-slate-800 mb-24">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-medium text-slate-200">Site Photos</h3>
            <label className="text-xs bg-gold hover:bg-gold/80 text-black font-semibold px-3 py-1.5 rounded cursor-pointer flex items-center">
              <Plus className="w-3 h-3 mr-1" /> Upload Photo
              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(formData.data.photos || []).map((photo, idx) => (
              <div key={idx} className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col gap-2 relative">
                <img src={photo.url} alt="Site" className="w-full h-40 object-cover rounded border border-slate-800" />
                <button type="button" onClick={() => removePhoto(idx)} className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full"><Trash2 className="w-4 h-4" /></button>
                <input type="text" placeholder="Caption" value={photo.caption} onChange={e => updatePhotoField(idx, 'caption', e.target.value)} className="w-full bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded px-2 py-1" />
                <select value={photo.floor || ''} onChange={e => updatePhotoField(idx, 'floor', e.target.value)} className="w-full bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded px-2 py-1">
                  <option value="">Select Floor (Optional)</option>
                  {(formData.data.floors || []).map((f, fIdx) => (
                    <option key={fIdx} value={f.name}>{f.name || `Floor ${fIdx + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {(!formData.data.photos || formData.data.photos.length === 0) && <p className="text-xs text-slate-500 text-center py-4 border border-dashed border-slate-700 rounded-lg">No site photos uploaded.</p>}
        </CardContent>
      </Card>

      {/* Global Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-24 mt-8">
        {/* Materials */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-slate-200">Materials</h3>
              <button type="button" onClick={() => addDynamicRow('materials', { item: '', quantity: '', unit: '' })} className="text-xs text-gold hover:underline flex items-center">
                <Plus className="w-3 h-3 mr-1" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {(formData.data.materials || []).map((mat, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-950 rounded border border-slate-800">
                  <div className="flex justify-between">
                    <input type="text" placeholder="Item Name" value={mat.item} onChange={e => updateDynamicRow('materials', idx, 'item', e.target.value)} className="flex-1 bg-transparent text-sm text-slate-200 border-b border-slate-800 px-1 py-1 focus:border-gold outline-none" />
                    <button type="button" onClick={() => removeDynamicRow('materials', idx)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Qty" value={mat.quantity} onChange={e => updateDynamicRow('materials', idx, 'quantity', e.target.value)} className="w-20 bg-slate-900 text-sm text-slate-200 border border-slate-800 rounded px-2 py-1" />
                    <input type="text" placeholder="Unit" value={mat.unit} onChange={e => updateDynamicRow('materials', idx, 'unit', e.target.value)} className="flex-1 bg-slate-900 text-sm text-slate-200 border border-slate-800 rounded px-2 py-1" />
                  </div>
                </div>
              ))}
              {(!formData.data.materials || formData.data.materials.length === 0) && <p className="text-xs text-slate-500 text-center py-2">No materials recorded.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Issues */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-slate-200">Site Issues</h3>
              <button type="button" onClick={() => addDynamicRow('issues', { issue: '' })} className="text-xs text-gold hover:underline flex items-center">
                <Plus className="w-3 h-3 mr-1" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {(formData.data.issues || []).map((issue, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-950 p-2 rounded border border-slate-800">
                  <input type="text" placeholder="Describe issue" value={issue.issue} onChange={e => updateDynamicRow('issues', idx, 'issue', e.target.value)} className="flex-1 bg-transparent text-sm text-slate-200 px-2 py-1 outline-none" />
                  <button type="button" onClick={() => removeDynamicRow('issues', idx)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {(!formData.data.issues || formData.data.issues.length === 0) && <p className="text-xs text-slate-500 text-center py-2">No issues recorded.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Visitors */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-slate-200">Visitors</h3>
              <button type="button" onClick={() => addDynamicRow('visitors', { visitor: '', purpose: '' })} className="text-xs text-gold hover:underline flex items-center">
                <Plus className="w-3 h-3 mr-1" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {(formData.data.visitors || []).map((visitor, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-950 rounded border border-slate-800">
                  <div className="flex justify-between">
                    <input type="text" placeholder="Visitor Name" value={visitor.visitor} onChange={e => updateDynamicRow('visitors', idx, 'visitor', e.target.value)} className="flex-1 bg-transparent text-sm text-slate-200 border-b border-slate-800 px-1 py-1 outline-none focus:border-gold" />
                    <button type="button" onClick={() => removeDynamicRow('visitors', idx)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <input type="text" placeholder="Purpose" value={visitor.purpose} onChange={e => updateDynamicRow('visitors', idx, 'purpose', e.target.value)} className="w-full bg-slate-900 text-sm text-slate-200 border border-slate-800 rounded px-2 py-1 mt-1" />
                </div>
              ))}
              {(!formData.data.visitors || formData.data.visitors.length === 0) && <p className="text-xs text-slate-500 text-center py-2">No visitors recorded.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions (Floating bottom) */}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur border-t border-slate-800 flex justify-end gap-3 z-30 ml-0 md:ml-64">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleSaveAsTemplate}
          disabled={loading}
          className="border-blue-500/30 hover:bg-blue-500/10 text-blue-400 mr-auto"
        >
          <FileText className="w-4 h-4 mr-2" /> Save as Template
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={(e) => handleSubmit(e, 'Draft')}
          disabled={loading}
        >
          <Save className="w-4 h-4 mr-2" /> Save as Draft
        </Button>
        <Button 
          type="button" 
          variant="primary"
          onClick={(e) => handleSubmit(e, 'Submitted')}
          disabled={loading}
        >
          <Send className="w-4 h-4 mr-2" /> Submit DPR
        </Button>
      </div>

    </form>
  );
}
