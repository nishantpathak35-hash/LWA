import React, { useState, useMemo } from 'react';
import { useAppState } from '../StateProvider';
import { Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../ui/core';
import { Search, Receipt, PlusCircle, FileJson, Download, FileText } from 'lucide-react';
import InvoiceUploadModal from './payments/InvoiceUploadModal';
import { formatDate } from '../../app/lib/utils';
import { generateTallyXML } from '../../app/lib/ai/invoiceParser';

export default function InvoicesView() {
  const { invoices, user, call } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const roles = user?.roles || [];
  const isAdmin = roles.includes('admin');
  const isProcurement = roles.some(role => ['proc', 'procurement', 'maker'].includes(role));
  const canUpload = isProcurement || isAdmin;

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const q = searchQuery.toLowerCase();
      return (
        (inv.vendor_name || '').toLowerCase().includes(q) ||
        (inv.invoice_no || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, searchQuery]);

  const handleDownloadXML = (invoice) => {
    // Reconstruct the data structure since we only store top-level fields
    const data = {
      vendorName: invoice.vendor_name,
      invoiceNo: invoice.invoice_no,
      date: invoice.invoice_date,
      totalAmount: invoice.total_amount
    };
    const tallyXml = generateTallyXML(data);
    
    const dataStr = "data:text/xml;charset=utf-8," + encodeURIComponent(tallyXml);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `tally_import_${invoice.invoice_no || 'invoice'}.xml`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-32">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gold/10 text-gold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-light text-slate-100 font-serif">Invoices Report</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">History of AI scanned invoices and Tally exports.</p>
          </div>
        </div>

        {canUpload && (
          <Button variant="primary" size="sm" onClick={() => setInvoiceModalOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0">
            🤖 AI Invoice Upload
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-900/60 pb-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search vendor, invoice no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs py-1.5 h-8 bg-slate-950/40"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total Scanned: <span className="text-emerald-400">{filteredInvoices.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-950/30 border border-slate-900/60 rounded-xl overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-900/60 bg-slate-900/20 hover:bg-slate-900/20">
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Scanned At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="group hover:bg-slate-900/40 transition-colors border-b border-slate-900/40">
                  <TableCell className="font-mono text-xs text-slate-500">
                    #{inv.id}
                  </TableCell>
                  <TableCell className="font-medium text-slate-200">
                    {inv.vendor_name || <span className="text-slate-600 italic">Unknown</span>}
                  </TableCell>
                  <TableCell>
                    {inv.invoice_no ? (
                      <Badge variant="outline" className="font-mono bg-slate-950">{inv.invoice_no}</Badge>
                    ) : (
                      <span className="text-slate-600 italic text-xs">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {inv.invoice_date || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-400">
                    ₹{(inv.total_amount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {inv.created_by || 'System'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(inv.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDownloadXML(inv)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
                      title="Download Tally XML"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceUploadModal 
        open={invoiceModalOpen} 
        onClose={() => setInvoiceModalOpen(false)} 
      />

    </div>
  );
}
