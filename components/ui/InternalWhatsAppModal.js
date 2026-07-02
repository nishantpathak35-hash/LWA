import React, { useState } from 'react';
import { Dialog, Button, Select } from './core';
import { Loader2 } from 'lucide-react';
import { useAppState } from '../StateProvider';
import { toast } from './Toast';

export default function InternalWhatsAppModal({ isOpen, onClose, selectedRecords = [], moduleName = '' }) {
  const { call } = useAppState();
  const [targetUserId, setTargetUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);

  React.useEffect(() => {
    if (isOpen) {
      call('listActiveUsers')
        .then(res => setAvailableUsers(res || []))
        .catch(err => console.error('Failed to load active users', err));
    }
  }, [isOpen, call]);

  const handleSend = async () => {
    if (!targetUserId) {
      toast.error('Please select a user');
      return;
    }

    setSubmitting(true);
    try {
      const targetUser = availableUsers.find(u => u.email === targetUserId);
      const recipientNumber = targetUser?.whatsapp_number || targetUser?.mobile_number;

      if (!recipientNumber) {
        throw new Error('Selected user does not have a registered WhatsApp number. Please update the User Master.');
      }

      await call('sendInternalWhatsApp', 
        targetUser.email,
        selectedRecords,
        moduleName,
        selectedRecords.map(r => r.id || r.po_no || r.pr_id || r.vendor_code).filter(Boolean)
      );

      toast.success('WhatsApp message queued successfully');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send WhatsApp message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Send Internal WhatsApp">
      <div className="space-y-4">
        <div className="text-sm text-slate-300">
          Sending {selectedRecords.length} record(s) from {moduleName}
        </div>
        
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">SELECT RECIPIENT</label>
          <Select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}>
            <option value="">-- Choose User --</option>
            {availableUsers.map(u => (
              <option key={u.email} value={u.email}>
                {u.name || u.email} {u.department ? `(${u.department})` : ''}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSend} disabled={submitting || !targetUserId}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send to WhatsApp'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
