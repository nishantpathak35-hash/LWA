'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../ui/core';
import { Download, FileSpreadsheet, FileText, Printer, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAppState } from '../../StateProvider';
import { toast } from '../../ui/Toast';

export default function BOQReports({ boqVersionId, project }) {
  const { call } = useAppState();
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async (view) => {
    if (!boqVersionId) return;
    setExporting(true);
    try {
      const res = await call('exportBoqToExcel', boqVersionId, { view });
      if (res?.base64) {
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.base64}`;
        link.download = res.filename || `BOQ_${view}_${Date.now()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Excel ${view} sheet generated successfully!`);
      } else {
        toast.error('Failed to generate export file');
      }
    } catch (err) {
      toast.error('Export error: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-muted/40 p-4 rounded-xl border border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-amber-500" />
          Executive Reports & Custom Format Exports
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Generate client-facing tender documents, quantity surveyor cost models, or procurement BOM schedules
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Client Tender Export */}
        <Card className="border-border p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all bg-card">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-2">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Client Tender Quotation</h4>
            <p className="text-xs text-muted-foreground">
              Clean client-facing format with Item specifications, quantities, approved brands, selling rates and contract amounts. Internal costs and gross margins are strictly hidden.
            </p>
          </div>
          <Button
            size="sm"
            disabled={exporting}
            onClick={() => handleExportExcel('client')}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 w-full"
          >
            <Download className="w-3.5 h-3.5" /> Export Client Excel
          </Button>
        </Card>

        {/* Card 2: Internal QS & Costing */}
        <Card className="border-border p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all bg-card">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 mb-2">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Internal Cost Analysis Sheet</h4>
            <p className="text-xs text-muted-foreground">
              Comprehensive quantity surveyor view with dual-ledger costing: Direct Cost Rate, Budget Amount, Client Selling Rate, Unit Markup and Gross Margin %.
            </p>
          </div>
          <Button
            size="sm"
            disabled={exporting}
            onClick={() => handleExportExcel('internal')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 w-full"
          >
            <Download className="w-3.5 h-3.5" /> Export Internal Sheet
          </Button>
        </Card>

        {/* Card 3: Procurement & Vendor Schedule */}
        <Card className="border-border p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all bg-card">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 mb-2">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Procurement & Order Schedule</h4>
            <p className="text-xs text-muted-foreground">
              Designed for supply chain teams. Displays BOQ quantities alongside committed PO quantities, uncommitted balances, and target procurement unit costs.
            </p>
          </div>
          <Button
            size="sm"
            disabled={exporting}
            onClick={() => handleExportExcel('procurement')}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 w-full"
          >
            <Download className="w-3.5 h-3.5" /> Export Procurement Sheet
          </Button>
        </Card>
      </div>
    </div>
  );
}
