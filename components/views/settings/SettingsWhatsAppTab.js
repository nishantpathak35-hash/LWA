import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../../ui/core';
import { Smartphone, RefreshCw, QrCode } from 'lucide-react';
import { toast } from '../../ui/Toast';

const StatusBadge = ({ status, loading }) => {
  if (loading) return <Badge variant="warning" className="animate-pulse">Checking...</Badge>;
  if (status === 'authorized' || status === 'connected') {
    return <Badge variant="success">Connected</Badge>;
  } else if (status === 'starting') {
    return <Badge variant="warning" className="bg-amber-900/50 text-amber-500 border border-amber-900/50">Starting / Connecting...</Badge>;
  } else {
    return <Badge variant="error">Not Authorized</Badge>;
  }
};

export default function SettingsWhatsAppTab() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('offline');
  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      if (res.ok) {
        setQrCode(data.qr);
        setStatus(data.status);
      } else {
        setError(data.error || 'Failed to connect');
        setStatus('offline');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStatus('offline');
      toast.error('Failed to fetch WhatsApp status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto refresh every 5 seconds if not connected and not starting
    const int = setInterval(() => {
      setStatus((currentStatus) => {
        if (currentStatus !== 'connected' && currentStatus !== 'starting' && currentStatus !== 'authorized') {
          fetchStatus();
        }
        return currentStatus;
      });
    }, 5000);
    return () => clearInterval(int);
  }, []);

  return (
    <Card className="max-w-2xl border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-200 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-green-500" />
          WhatsApp Integration (Green-API)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800">
          <div>
            <h3 className="text-sm font-medium text-slate-300">Connection Status</h3>
            <p className="text-xs text-slate-500 mt-1">Live status from Green-API</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} loading={loading} />
            <Button variant="ghost" size="icon" onClick={fetchStatus} disabled={loading} title="Refresh Status">
              <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {(!loading && status !== 'authorized' && status !== 'connected' && status !== 'starting') && (
          <div className="p-6 bg-slate-800/30 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
            <QrCode className="w-12 h-12 text-slate-400 mb-3 opacity-50" />
            <h3 className="text-lg font-medium text-slate-200 mb-2">Device Not Linked</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-sm">
              Please link your device to enable automated WhatsApp alerts. Scan the QR code below using your WhatsApp mobile app.
            </p>
            
            {qrCode ? (
              <div className="p-2 bg-white rounded-xl shadow-lg inline-block">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
              </div>
            ) : (
              <p className="text-sm text-amber-500/90 font-medium bg-amber-500/10 px-4 py-2 rounded-lg">
                QR Code not available. Please ensure your API credentials are correct in Vercel settings.
              </p>
            )}
          </div>
        )}

        {(!loading && (status === 'authorized' || status === 'connected')) && (
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
             <p className="text-sm text-green-400 font-medium">
               Your ERP is successfully connected to WhatsApp! Automated PO & Payment alerts will be delivered instantly.
             </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
