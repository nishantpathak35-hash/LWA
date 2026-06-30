import React, { useState, useRef } from 'react';
import { Dialog, Button } from '../../ui/core';
import { UploadCloud, FileJson, CheckCircle, Loader2 } from 'lucide-react';
import { extractInvoiceData, generateTallyXML } from '../../../app/lib/ai/invoiceParser';
import { useAppState } from '../../StateProvider';

export default function InvoiceUploadModal({ open, onClose }) {
  const { call, refreshData, user } = useAppState();
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState(null);
  const [tallyXml, setTallyXml] = useState(null);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setExtractedData(null);
    setTallyXml(null);
    setError('');
    setScanning(true);
    setProgress(0);

    try {
      const data = await extractInvoiceData(selectedFile, (p) => setProgress(p));
      setExtractedData(data);
      setTallyXml(generateTallyXML(data));
      
      // Save to database
      await call('saveInvoice', 
        data.vendorName || '', 
        data.invoiceNo || '', 
        data.date || '', 
        data.totalAmount || 0, 
        data.rawText || '', 
        user?.name || user?.email || 'System'
      );
      
      // Refresh global state so it shows up in InvoicesView
      await refreshData();
    } catch (err) {
      setError(err.message || 'Failed to scan invoice.');
    } finally {
      setScanning(false);
    }
  };

  const handleDownloadXML = () => {
    if (!tallyXml) return;
    const dataStr = "data:text/xml;charset=utf-8," + encodeURIComponent(tallyXml);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `tally_import_${extractedData?.invoiceNo || 'invoice'}.xml`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleReset = () => {
    setFile(null);
    setExtractedData(null);
    setTallyXml(null);
    setProgress(0);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => { handleReset(); onClose(); }} 
      title="🤖 AI Invoice Upload (Tally Integration)"
      maxWidth="md"
    >
      <div className="space-y-6 pt-4">
        
        {/* Upload Zone */}
        {!file && (
          <div 
            className="border-2 border-dashed border-slate-700 rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-800/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-12 h-12 text-gold mb-4" />
            <h3 className="text-lg font-medium text-slate-200">Upload Invoice Image</h3>
            <p className="text-sm text-slate-400 mt-2">Drag and drop or click to browse (PNG, JPG)</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Scanning State */}
        {scanning && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 text-gold animate-spin" />
            <div className="text-lg font-medium text-slate-200 animate-pulse">
              AI is reading the invoice...
            </div>
            <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gold transition-all duration-300 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-slate-500">{Math.round(progress * 100)}%</div>
          </div>
        )}

        {/* Error State */}
        {error && !scanning && (
          <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-sm">
            {error}
            <Button variant="ghost" size="sm" onClick={handleReset} className="ml-4 text-red-300">Try Again</Button>
          </div>
        )}

        {/* Result State */}
        {extractedData && !scanning && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Extraction Complete</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>Upload Another</Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 mb-1">Vendor Name</div>
                <div className="font-medium text-slate-200">{extractedData.vendorName || <span className="text-slate-600 italic">Not found</span>}</div>
              </div>
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 mb-1">Invoice Number</div>
                <div className="font-medium text-slate-200">{extractedData.invoiceNo || <span className="text-slate-600 italic">Not found</span>}</div>
              </div>
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 mb-1">Date</div>
                <div className="font-medium text-slate-200">{extractedData.date || <span className="text-slate-600 italic">Not found</span>}</div>
              </div>
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-500 mb-1">Total Amount</div>
                <div className="font-medium text-emerald-400 text-lg">₹{extractedData.totalAmount.toLocaleString()}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { handleReset(); onClose(); }}>Cancel</Button>
              <Button variant="primary" onClick={handleDownloadXML} className="gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0">
                <FileJson className="w-4 h-4" />
                Download Tally XML
              </Button>
            </div>

            <details className="mt-4 text-xs text-slate-500 border-t border-slate-800/50 pt-4">
              <summary className="cursor-pointer hover:text-slate-300">Show Raw OCR Text (Debug)</summary>
              <pre className="mt-2 p-2 bg-slate-950/50 rounded overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-[10px]">
                {extractedData.rawText}
              </pre>
            </details>
          </div>
        )}
      </div>
    </Dialog>
  );
}
