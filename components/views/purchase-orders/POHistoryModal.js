import React, { useState } from 'react';
import { Dialog, Button } from '../../ui/core';
import { Loader2, Send } from 'lucide-react';
import { ActivityTimeline } from '../../ui/ActivityTimeline';
import { useAppState } from '../../StateProvider';

export default function POHistoryModal({
  historyModalOpen, setHistoryModalOpen, historyTarget, loadingHistory, historyTrail
}) {
  const { call, refresh } = useAppState();
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await call('addPOComment', historyTarget.po_no, commentText.trim());
      setCommentText('');
      if (refresh) refresh(); // This will ideally refresh the history trail
      setHistoryModalOpen(false); // Quick hack to force a refresh on next open
    } catch (e) {
      alert("Failed to add comment: " + e.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Normalize history to match ActivityTimeline props
  const events = historyTrail?.map(h => ({
    actionType: h.action,
    timestamp: h.timestamp,
    user: h.performed_by,
    details: h.remarks
  })) || [];

  return (
    <>
      <Dialog open={historyModalOpen} onClose={() => setHistoryModalOpen(false)}
        title={`Activity Feed — ${historyTarget?.po_no}`}
        size="md">
        {loadingHistory ? (
          <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading timeline...
          </div>
        ) : (
          <div className="py-2 flex flex-col h-full max-h-[60vh]">
            <div className="flex-1 overflow-y-auto px-2 mb-4">
              <ActivityTimeline events={events} />
            </div>
            
            {/* Comment Box */}
            <div className="mt-auto pt-4 border-t border-slate-800 bg-slate-950/50 -mx-6 -mb-6 px-6 pb-6">
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">ADD COMMENT</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question or leave a note..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  disabled={submittingComment}
                />
                <Button 
                  variant="primary" 
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || submittingComment}
                  className="shrink-0"
                >
                  {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
