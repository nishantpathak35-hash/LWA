'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, Loader2, Paperclip, RefreshCw, UploadCloud } from 'lucide-react';
import { loadInvoiceDocument } from '../../app/lib/invoicePreview';
import { toast } from '../ui/Toast';

export default function InvoiceDocumentPreview({ invoiceId, refreshKey, call }) {
  const [files, setFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [document, setDocument] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [previewRevision, setPreviewRevision] = useState(0);
  const selected = files.find(file => String(file.id) === String(selectedId));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    call('getAttachments', { entityType: 'invoice', entityId: invoiceId })
      .then(result => {
        if (!active) return;
        if (!Array.isArray(result)) throw new Error('Invalid attachment response');
        setFiles(result);
        setSelectedId(current => result.some(file => String(file.id) === String(current)) ? current : result[0]?.id ?? null);
      })
      .catch(() => { if (active) setError('Could not load attachments. Please retry.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [invoiceId, refreshKey, call, revision]);

  useEffect(() => {
    const controller = new AbortController();
    let url;
    setDocument(null);
    setPreviewError('');
    if (selected) {
      const token = localStorage.getItem('lx_auth_token') || localStorage.getItem('auth_token') || '';
      loadInvoiceDocument(selected, token, controller.signal).then(blob => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setDocument({ url, type: blob.type });
      }).catch(err => { if (!controller.signal.aborted) setPreviewError(err.message); });
    }
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [selected, previewRevision]);

  const upload = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Please choose a file smaller than 10 MB.'); return; }
    setUploading(true);
    try {
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('Could not read this file.'));
        reader.readAsDataURL(file);
      });
      await call('uploadAttachment', { entityType: 'invoice', entityId: invoiceId, fileName: file.name, fileType: file.type, fileSize: file.size, fileData });
      setSelectedId(null);
      setRevision(value => value + 1);
      toast.success('Invoice document attached.');
    } catch (err) { toast.error(err.message || 'Upload failed.'); }
    finally { setUploading(false); }
  };

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden" aria-label="Original invoice document">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold">Original invoice</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Paperclip size={12} />
            {loading ? 'Loading attachments…' : error ? 'Attachments unavailable' : `${files.length} attachment${files.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {document && <>
            <a href={document.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary"><ExternalLink size={14} /> Open / Print</a>
            <a href={document.url} download={selected?.file_name || 'invoice'} className="flex items-center gap-1 text-primary"><Download size={14} /> Download</a>
          </>}
          <label className={`flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 ${uploading ? 'opacity-50' : 'cursor-pointer hover:bg-muted'}`}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            {uploading ? 'Uploading…' : 'Attach file'}
            <input type="file" accept="application/pdf,image/*" disabled={uploading} onChange={upload} className="sr-only" />
          </label>
        </div>
      </div>
      {!loading && !error && files.length > 0 && (
        <div className="p-3 border-b border-border">
          <label htmlFor="invoice-document" className="sr-only">Select invoice attachment</label>
          <select id="invoice-document" value={selectedId ?? ''} onChange={event => setSelectedId(event.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-xs">
            {files.map(file => <option key={file.id} value={file.id}>{file.file_name || `Document ${file.id}`}</option>)}
          </select>
        </div>
      )}
      {loading ? <div role="status" className="p-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 animate-spin" />Loading original invoice…</div>
        : error ? <div role="alert" className="p-12 text-center text-sm"><p>{error}</p><button onClick={() => setRevision(value => value + 1)} className="mt-3 text-primary">Retry attachments</button></div>
        : !files.length ? <div className="p-12 text-center"><Paperclip className="mx-auto mb-3 text-muted-foreground" /><p className="font-medium">No invoice document attached</p><p className="text-sm text-muted-foreground mt-1">Attach the original PDF or image to preview it here.</p></div>
        : previewError ? <div role="alert" className="p-12 text-center text-sm"><p>{previewError}</p><button onClick={() => setPreviewRevision(value => value + 1)} className="inline-flex items-center gap-1 mt-3 text-primary"><RefreshCw size={14} /> Retry preview</button></div>
        : !document ? <div role="status" className="p-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 animate-spin" />Loading document…</div>
        : document.type === 'application/pdf' ? <iframe src={document.url} title="Original invoice PDF" className="w-full h-[65vh] min-h-[400px] bg-slate-100" />
        : ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'].includes(document.type) ? <div className="max-h-[70vh] overflow-auto bg-slate-100 p-3"><img src={document.url} alt={selected?.file_name || 'Original invoice'} className="mx-auto max-w-full h-auto" onError={() => setPreviewError('This image could not be displayed. Try downloading the original file.')} /></div>
        : <div className="p-12 text-center text-sm">Preview is unavailable for this file type. Use Download to open the original.</div>}
    </section>
  );
}
