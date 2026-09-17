'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from './Toast';

export default function CopyButton({ text, label, className = '', showToast = true }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(String(text).trim());
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = String(text).trim();
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (showToast) {
        toast.success(`Copied ${label ? `"${label}"` : `"${text}"`} to clipboard.`);
      }
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      toast.error('Failed to copy to clipboard.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy ${label || text}`}
      className={`inline-flex items-center justify-center p-1 rounded-md transition-all duration-150 cursor-pointer ${
        copied
          ? 'text-emerald-500 bg-emerald-500/10 scale-110'
          : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 active:scale-95'
      } ${className}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500 transition-transform animate-in zoom-in-50 duration-150" />
      ) : (
        <Copy className="w-3.5 h-3.5 transition-transform" />
      )}
    </button>
  );
}
