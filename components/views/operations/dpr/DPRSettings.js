import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '../../../ui/core';
import { Save, RefreshCw } from 'lucide-react';
import { useAppState } from '../../../StateProvider';

export default function DPRSettings() {
  const { call } = useAppState();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    weatherOptions: 'Normal, Rainy, Windy, Extreme Heat',
    shiftOptions: 'Day, Night',
    statusOptions: 'Normal, Delayed, Critical',
    autoNumbering: false,
    numberingFormat: 'DPR-{project}-{date}-{seq}'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await call('getDPRSettings', {});
      if (res) {
        setSettings(res);
      }
    } catch (err) {
      console.error("Failed to load DPR settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await call('saveDPRSettings', settings);
      alert("DPR settings saved successfully!");
    } catch (err) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading settings...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl mx-auto">
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">DPR Configuration Settings</h2>
            <p className="text-xs text-slate-400 mt-1 font-normal">Customize daily progress report variables and export format defaults.</p>
          </div>

          <div className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800/60 pt-4">
              {/* Weather Options */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Weather Dropdown Options</label>
                <textarea
                  value={settings.weatherOptions}
                  onChange={e => handleChange('weatherOptions', e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:border-gold outline-none font-mono"
                />
                <p className="text-[10px] text-slate-500 font-normal">Comma-separated values.</p>
              </div>

              {/* Shift Options */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Shift Dropdown Options</label>
                <textarea
                  value={settings.shiftOptions}
                  onChange={e => handleChange('shiftOptions', e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:border-gold outline-none font-mono"
                />
                <p className="text-[10px] text-slate-500 font-normal">Comma-separated values.</p>
              </div>

              {/* Status Options */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Status Dropdown Options</label>
                <textarea
                  value={settings.statusOptions}
                  onChange={e => handleChange('statusOptions', e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:border-gold outline-none font-mono"
                />
                <p className="text-[10px] text-slate-500 font-normal">Comma-separated values.</p>
              </div>
            </div>

            {/* Auto Numbering settings */}
            <div className="border-t border-slate-800/60 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Enable DPR Auto-Numbering</label>
                  <p className="text-[10px] text-slate-500 font-normal">Generates a unique sequential identifier for exports.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoNumbering}
                  onChange={e => handleChange('autoNumbering', e.target.checked)}
                  className="w-4 h-4 accent-gold cursor-pointer"
                />
              </div>

              {settings.autoNumbering && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Numbering Format Template</label>
                  <input
                    type="text"
                    value={settings.numberingFormat}
                    onChange={e => handleChange('numberingFormat', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:border-gold outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500 font-normal">Use placeholders: `{`{project}`}`, `{`{date}`}`, `{`{seq}`}`.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-800/60 pt-4">
            <Button type="submit" variant="primary" disabled={saving} className="font-semibold text-black bg-gold hover:bg-gold/90">
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
