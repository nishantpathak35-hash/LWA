import React from 'react';
import { CheckCircle, XCircle, Clock, FileText, Send, User, MessageSquare } from 'lucide-react';
import { formatDate } from '../../app/lib/utils';

export function ActivityTimeline({ events = [] }) {
  if (!events || events.length === 0) {
    return <div className="text-sm text-slate-500 text-center py-6">No activity recorded yet.</div>;
  }

  const getIconForAction = (actionType) => {
    const action = String(actionType || '').toLowerCase();
    if (action.includes('approve')) return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (action.includes('reject')) return <XCircle className="w-4 h-4 text-red-500" />;
    if (action.includes('remit')) return <Send className="w-4 h-4 text-blue-500" />;
    if (action.includes('comment')) return <MessageSquare className="w-4 h-4 text-gold" />;
    if (action.includes('create') || action.includes('submit')) return <FileText className="w-4 h-4 text-slate-400" />;
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  const getBgColorForAction = (actionType) => {
    const action = String(actionType || '').toLowerCase();
    if (action.includes('approve')) return 'bg-emerald-500/10 border-emerald-500/20';
    if (action.includes('reject')) return 'bg-red-500/10 border-red-500/20';
    if (action.includes('remit')) return 'bg-blue-500/10 border-blue-500/20';
    if (action.includes('comment')) return 'bg-gold/10 border-gold/20';
    return 'bg-slate-800 border-slate-700';
  };

  return (
    <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
      {events.map((event, idx) => (
        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          {/* Icon */}
          <div className={`flex items-center justify-center w-6 h-6 rounded-full border shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${getBgColorForAction(event.actionType || event.action)}`}>
            {getIconForAction(event.actionType || event.action)}
          </div>
          
          {/* Card */}
          <div className="w-[calc(100%-2rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm text-slate-200 capitalize tracking-wide">{event.actionType || event.action || 'Update'}</span>
              <span className="text-[10px] text-slate-500">{formatDate(event.timestamp || event.date)}</span>
            </div>
            <div className="text-xs text-slate-400 mt-2 whitespace-pre-wrap">
              {event.details || event.remarks || event.comment || 'No additional details provided.'}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
              <User className="w-3 h-3" />
              <span>{event.user || event.actor || 'System'}</span>
              {event.department && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                  <span className="uppercase tracking-wider">{event.department}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
