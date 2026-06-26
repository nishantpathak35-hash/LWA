import React, { useState, useEffect } from 'react';
import { useAppState } from '../StateProvider';
import { Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './core';
import { Paperclip, Download, Trash2, Loader2, UploadCloud } from 'lucide-react';

export default function AttachmentsSection({ entityType, entityId }) {
  const { call } = useAppState();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [uploading, setUploading] = useState(false);

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
      alert("File exceeds 3.5MB limit. Please select a smaller file.");
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
      } catch (err) {
        alert("Upload failed: " + err.message);
      } finally {
        setUploading(false);
        e.target.value = null;
      }
    };
    reader.onerror = () => {
      alert("Error reading file.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (attachmentId) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    try {
      await call('deleteAttachment', attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      alert("Failed to delete attachment: " + err.message);
    }
  };

  const getDownloadUrl = (id) => {
    // Assuming x-lwa-token is stored in localStorage or handled by fetch
    // But since this opens in a new tab, we pass it in query params
    const token = localStorage.getItem('lwa_token');
    return `/api/attachments/${id}?token=${encodeURIComponent(token)}`;
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
          <Button variant="ghost" size="sm" className="h-7 text-xs flex items-center gap-1.5 text-gold hover:text-amber-500 hover:bg-gold/10">
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
                    <a
                      href={getDownloadUrl(att.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                      title="View/Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(att.id)}
                      className="inline-flex items-center text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
