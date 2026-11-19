'use client';

import React, { useState } from 'react';
import { Dialog, Button } from '../../ui/core';
import { Upload, FileSpreadsheet, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('excel'); // 'excel' | 'csv'
  const [targetSectionId, setTargetSectionId] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [excelBase64, setExcelBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [sheetName, setSheetName] = useState('DETAILED BOQ-R2');
  const [importing, setImporting] = useState(false);

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result || '';
      setExcelBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleCsvUpload = (e) => {
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

    if (activeTab === 'excel') {
      if (!excelBase64) {
        toast.error('Please upload an Excel (.xlsx) BOQ file');
        return;
      }

      setImporting(true);
      try {
        const res = await call('importBoqFromExcel', {
          boq_version_id: boqVersionId,
          fileBase64: excelBase64,
          sheetName: sheetName.trim() || undefined,
          clearExisting: true
        });

        toast.success(
          `Successfully imported ${res.items_count || 0} line items across ${res.sections_count || 0} work packages!`
        );
        setExcelBase64('');
        setFileName('');
        onImportSuccess?.();
      } catch (err) {
        toast.error('Excel Import failed: ' + err.message);
      } finally {
        setImporting(false);
      }
    } else {
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
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose} title="Import BOQ Items & Packages">
      {/* Tabs */}
      <div className="flex border-b border-border mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('excel')}
          className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'excel'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Commercial Excel (.xlsx)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('csv')}
          className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'csv'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" />
          Simple CSV / Text
        </button>
      </div>

      <form onSubmit={handleExecuteImport} className="space-y-4">
        {activeTab === 'excel' ? (
          <>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
              <div className="font-semibold flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Full Commercial Fit-out Excel Support
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Auto-detects work package sections (Part A Furniture, Part B Civil & Plumbing, HVAC, etc.), technical specifications, locations, makes, quantities, selling rates, and base cost sheet (BCS) rates without double-counting subtotals.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Select Client Excel BOQ (.xlsx, .xls)
              </label>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelUpload}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-700 dark:file:text-amber-400 hover:file:bg-amber-500/20 cursor-pointer"
              />
              {fileName && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  ✓ Selected: {fileName}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Sheet Name in Workbook
              </label>
              <input
                type="text"
                value={sheetName}
                onChange={e => setSheetName(e.target.value)}
                placeholder="e.g. DETAILED BOQ-R2 or DETAILED BOQ"
                className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500"
              />
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Default: <code className="font-mono bg-muted px-1 rounded">DETAILED BOQ-R2</code> (auto-falls back to <code className="font-mono bg-muted px-1 rounded">DETAILED BOQ</code>)
              </p>
            </div>
          </>
        ) : (
          <>
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
                onChange={handleCsvUpload}
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
                rows={5}
                value={csvContent}
                onChange={e => setCsvContent(e.target.value)}
                placeholder={`description,unit,quantity,selling_rate,cost_rate,make,item_code\n12mm Toughened Glass Partition,Sqft,1200,310,220,Saint-Gobain,GL-001\nArmstrong Mineral Fiber Tile Ceiling,Sqft,3400,120,85,Armstrong,FC-004`}
                className="w-full text-xs font-mono p-2.5 bg-card border border-border rounded-lg text-foreground focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={importing || (activeTab === 'excel' ? !excelBase64 : !csvContent.trim())}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            {importing ? 'Processing Import...' : activeTab === 'excel' ? 'Import Full Excel BOQ' : 'Import to BOQ'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
