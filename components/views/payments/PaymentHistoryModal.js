import React from 'react';
import { Dialog } from '../../ui/core';
import { Loader2 } from 'lucide-react';
import { ActivityTimeline } from '../../ui/ActivityTimeline';
import RecordDiscussionThread from '../../ui/RecordDiscussionThread';

export default function PaymentHistoryModal({
  historyModalOpen, setHistoryModalOpen, selectedRequest, loadingHistory, historyTrail
}) {
  // Normalize history to match ActivityTimeline props
  const events = historyTrail?.map(h => ({
    actionType: h.action_type || 'Workflow Action',
    timestamp: h.timestamp,
    user: h.user,
    details: h.details
  })) || [];

  return (
    <Dialog open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} 
      title={`Activity & Discussion Thread — Request #${selectedRequest?.id}`}
      maxWidth="max-w-3xl">
      {loadingHistory ? (
        <div className="p-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-gold" /> Loading timeline...
        </div>
      ) : (
        <div className="space-y-6 py-2">
          <div className="max-h-[220px] overflow-y-auto pr-1">
            <ActivityTimeline events={events} />
          </div>

          {selectedRequest?.id && (
            <RecordDiscussionThread
              recordType="Payment Request"
              recordId={selectedRequest.id}
            />
          )}
        </div>
      )}
    </Dialog>
  );
}
