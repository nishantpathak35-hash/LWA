'use client';

import React, { useState } from 'react';
import { Dialog, Button, Input } from '../../ui/core';
import { Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

export default function BOQImportModal({
  open,
  onClose,
  boqVersionId,
  sections = [],
  onImportSuccess
}) {
  const { call } = useAppState();
  const [targetSectionId, setTargetSectionId] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result || '');
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async (e) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      toast.error('Please upload or paste CSV contents');
      return;
    }

    setImporting(true);
    try {
      const res = await call('importBoqFromCsv', {
        boq_version_id: boqVersionId,
        section_id: targetSectionId || null,
        csv_data: csvContent
      });

      toast.success(`Successfully imported ${res.imported || 0} line items into BOQ!`);
      setCsvContent('');
      onImportSuccess?.();
    } catch (err) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose} title="Import BOQ Items from CSV">
      <form onSubmit={handleExecuteImport} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            Target Section / Work Package
          </label>
          <select
            value={targetSectionId}
            onChange={e => setTargetSectionId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Default / Auto Section</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            Upload CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-700 dark:file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            Or Paste CSV Content
          </label>
          <p className="text-[11px] text-muted-foreground mb-1">
            Expected headers: <code className="bg-muted px-1 rounded font-mono">description,unit,quantity,selling_rate,cost_rate,make,item_code</code>
          </p>
          <textarea
            rows={6}
            value={csvContent}
            onChange={e => setCsvContent(e.target.value)}
            placeholder={`description,unit,quantity,selling_rate,cost_rate,make,item_code\n12mm Toughened Glass Partition,Sqft,1200,310,220,Saint-Gobain,GL-001\nArmstrong Mineral Fiber Tile Ceiling,Sqft,3400,120,85,Armstrong,FC-004`}
            className="w-full text-xs font-mono p-2.5 bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={importing || !csvContent.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            {importing ? 'Processing Import...' : 'Import to BOQ'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
