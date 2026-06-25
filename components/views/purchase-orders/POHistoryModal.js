import React from 'react';
import { Dialog } from '../../ui/core';
import { Loader2 } from 'lucide-react';
import { formatDate } from '../../../app/lib/utils';

export default function POHistoryModal({
  historyModalOpen, setHistoryModalOpen, historyTarget, loadingHistory, historyTrail
}) {
  return (
    <>
      {/* ── History Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={historyModalOpen} onClose={() => setHistoryModalOpen(false)}
        title={`Audit Trail — ${historyTarget?.po_no}`}>
        {loadingHistory ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading...</div>
        ) : historyTrail.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm font-light">No history logged for this PO.</div>
        ) : (
          <div className="relative border-l border-slate-900 pl-6 ml-3 space-y-8 py-3 text-sm font-light">
            {historyTrail.map((h, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-gold border border-slate-950 ring-4 ring-slate-950" />
                <p className="text-[11px] text-slate-500">{h.timestamp}</p>
                <p className="text-slate-200 font-medium mt-1 uppercase text-xs tracking-wider">
                  {h.action} · <span className="text-slate-400 normal-case font-light text-xs">{h.performed_by}</span>
                </p>
                {h.remarks && <p className="text-slate-400 mt-1 bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60 leading-relaxed text-xs">{h.remarks}</p>}
              </div>
            ))}
          </div>
        )}
      </Dialog>

    </>
  );
}
