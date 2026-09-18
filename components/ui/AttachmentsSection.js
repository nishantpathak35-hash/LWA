import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './core';
import { Paperclip, Download, Trash2, Loader2, UploadCloud, X, AlertTriangle } from 'lucide-react';
import { toast } from './Toast';

export default function AttachmentsSection({ entityType, entityId }) {
  const { call } = useAppState();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchAttachments() {
      if (!entityId) return;
      setLoadError(null);
      try {
        setLoading(true);
        const data = await call('getAttachments', { entityType, entityId });
        if (active) setAttachments(data || []);
      } catch (err) {
        console.error('Failed to load attachments:', err);
        if (active) setLoadError('Could not load attachments. ' + (err.message || ''));
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchAttachments();
    return () => { active = false; };
  }, [entityType, entityId, call]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3.5 * 1024 * 1024) {
      toast.error("File exceeds 3.5MB limit. Please select a smaller file.");
      e.target.value = null; // reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result.split(',')[1];
      setUploading(true);
      try {
        await call('uploadAttachment', {
          entityType,
          entityId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: base64Data
        });
        // Refresh attachments list
        const updated = await call('getAttachments', { entityType, entityId });
        setAttachments(updated || []);
        toast.success(`Attached "${file.name}" successfully.`);
      } catch (err) {
        toast.error("Upload failed: " + (err.message || 'Unknown error'));
      } finally {
        setUploading(false);
        e.target.value = null;
      }
    };
    reader.onerror = () => {
      toast.error("Error reading file.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmDelete = async (attachmentId) => {
    setDeleting(true);
    try {
      await call('deleteAttachment', attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast.success("Attachment deleted.");
    } catch (err) {
      toast.error("Failed to delete attachment: " + (err.message || 'Unknown error'));
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const handleDownload = async (att) => {
    setDownloadingId(att.id);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('lx_auth_token') : '';
      const downloadUrl = `/api/attachments/${att.id}?token=${encodeURIComponent(token || '')}&disposition=attachment`;
      
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`Download failed (${res.status}): ${res.statusText}`);
      
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = att.file_name || `attachment-${att.id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      toast.error("Download failed: " + (err.message || 'Network error'));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" /> Attachments
        </h4>
        <div className="relative">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <Button variant="ghost" size="sm" className="h-7 text-xs flex items-center gap-1.5 text-primary hover:text-amber-500 hover:bg-gold/10">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
            {uploading ? "Uploading..." : "Upload File"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-slate-500 italic p-4 text-center">Loading attachments...</div>
      ) : loadError ? (
        <div className="p-4 border border-red-900/40 border-dashed rounded-lg text-center text-xs text-red-400 font-light">
          {loadError}
        </div>
      ) : attachments.length === 0 ? (
        <div className="p-4 border border-slate-800 border-dashed rounded-lg text-center text-xs text-slate-500 font-light">
          No attachments added yet.
        </div>
      ) : (
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-800 hover:bg-transparent">
                <TableHead className="h-8 text-[10px] text-slate-500">File Name</TableHead>
                <TableHead className="h-8 text-[10px] text-slate-500">Size</TableHead>
                <TableHead className="h-8 text-[10px] text-slate-500">Uploaded</TableHead>
                <TableHead className="h-8 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attachments.map(att => (
                <TableRow key={att.id} className="border-b border-slate-800 hover:bg-slate-900/40">
                  <TableCell className="py-2 text-xs text-slate-300 font-medium break-all">{att.file_name}</TableCell>
                  <TableCell className="py-2 text-xs text-slate-500 whitespace-nowrap">
                    {(att.file_size / 1024).toFixed(1)} KB
                  </TableCell>
                  <TableCell className="py-2 text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(att.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-2 text-right whitespace-nowrap space-x-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(att)}
                      disabled={downloadingId === att.id}
                      className="inline-flex items-center text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                      title="Download Attachment"
                    >
                      {downloadingId === att.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                    {confirmDeleteId === att.id ? (
                      <span className="inline-flex items-center gap-1.5 bg-red-950/70 border border-red-800/80 px-2 py-0.5 rounded text-[11px]">
                        <span className="text-red-300">Delete?</span>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(att.id)}
                          disabled={deleting}
                          className="font-bold text-red-400 hover:text-red-200 underline"
                        >
                          {deleting ? '...' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-slate-400 hover:text-slate-200"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(att.id)}
                        className="inline-flex items-center text-red-400 hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
