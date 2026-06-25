import React from 'react';
import { Dialog } from '../../ui/core';
import { formatDate } from '../../../app/lib/utils';

export default function PaymentHistoryModal({
  historyModalOpen, setHistoryModalOpen, selectedRequest, loadingHistory, historyTrail
}) {
  return (
    <>
      {/* History Trail Dialog */}
      <Dialog open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} title={`Audit Trail for Request #${selectedRequest?.id}`}>
        {loadingHistory ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading history logs...</div>
        ) : historyTrail.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm font-light">No approval history logged for this request.</div>
        ) : (
          <div className="relative border-l border-slate-900 pl-6 ml-3 space-y-8 py-3 text-sm font-light text-slate-350">
            {historyTrail.map((h, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-gold border border-slate-950 ring-4 ring-slate-950" />
                <p className="text-[11px] text-slate-500">{formatDate(h.timestamp)}</p>
                <p className="text-slate-200 font-medium mt-1 uppercase text-xs tracking-wider">
                  {h.action_type || 'Workflow Action'} &middot; <span className="text-slate-400 normal-case font-light text-xs">{h.user}</span>
                </p>
                {h.details && <p className="text-slate-400 mt-1 bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60 leading-relaxed">{h.details}</p>}
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </>
  );
}
