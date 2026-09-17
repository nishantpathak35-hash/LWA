import React, { useMemo } from 'react';
import { Card } from '../../ui/core';
import { CheckCircle2, Clock, Send, TrendingDown, IndianRupee, AlertTriangle } from 'lucide-react';
import { num, fmtLakhs, Sparkline } from '../dashboard/dashboard-utils';

/**
 * ReportsSummaryStrip — shows at all times, computed from payments context.
 * No API call needed. Eliminates blank screen on report page load.
 */
export default function ReportsSummaryStrip({ payments = [], onTabClick }) {
  const stats = useMemo(() => {
    let totalApproved = 0, totalRemitted = 0, totalPendingRemit = 0;
    let totalTDS = 0, approvedCount = 0, pendingRemitCount = 0;

    payments.forEach(p => {
      const stage = String(p.stage || p.approval_stage || '').toLowerCase();
      const status = String(p.status || '').toLowerCase();
      const isRemitted = stage.includes('remit') && !stage.includes('ready') && !stage.includes('pending');
      const isReadyToRemit = stage.includes('ready') || stage === 'approved' && !isRemitted;
      const isApproved = status === 'approved' || stage.includes('approved');

      const gross = num(p.approved_amount || p.amount_requested || p.gross_amount || 0);
      const tds = num(p.tds_amount || 0);

      if (isRemitted) {
        totalRemitted += gross;
      }
      if (isReadyToRemit) {
        totalPendingRemit += gross;
        pendingRemitCount++;
      }
      if (isApproved && !stage.includes('reject')) {
        totalApproved += gross;
        approvedCount++;
      }
      if (tds > 0) {
        totalTDS += tds;
      }
    });

    // Sparkline data: last 10 payments by creation order
    const recent = [...payments].slice(-10);
    const approvedSpark = recent.map(p => num(p.approved_amount || p.amount_requested || 0));
    const tdsSpark = recent.map(p => num(p.tds_amount || 0));

    return {
      totalApproved, totalRemitted, totalPendingRemit,
      totalTDS, approvedCount, pendingRemitCount,
      approvedSpark, tdsSpark,
      totalPayments: payments.length,
    };
  }, [payments]);

  const kpis = [
    {
      label: 'Total Approved',
      value: fmtLakhs(stats.totalApproved),
      sub: `${stats.approvedCount} payment${stats.approvedCount !== 1 ? 's' : ''}`,
      subColor: 'text-emerald-500',
      icon: <CheckCircle2 className="w-4 h-4" />,
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      hover: 'hover:border-emerald-500/30',
      spark: stats.approvedSpark,
      sparkColor: 'rgba(61,214,140,.95)',
      tab: 'Approved',
    },
    {
      label: 'Pending Remittance',
      value: fmtLakhs(stats.totalPendingRemit),
      sub: `${stats.pendingRemitCount} awaiting transfer`,
      subColor: stats.pendingRemitCount > 0 ? 'text-amber-500' : 'text-muted-foreground',
      icon: <Clock className="w-4 h-4" />,
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-gold border-amber-500/20',
      hover: 'hover:border-amber-500/30',
      spark: null,
      tab: 'Remit',
    },
    {
      label: 'Total Remitted',
      value: fmtLakhs(stats.totalRemitted),
      sub: 'Payments Settled',
      subColor: 'text-sky-500',
      icon: <Send className="w-4 h-4" />,
      iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      hover: 'hover:border-sky-500/30',
      spark: null,
      tab: 'Remitted',
    },
    {
      label: 'TDS Deducted',
      value: fmtLakhs(stats.totalTDS),
      sub: 'Total Tax at Source',
      subColor: 'text-violet-500',
      icon: <IndianRupee className="w-4 h-4" />,
      iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
      hover: 'hover:border-violet-500/30',
      spark: stats.tdsSpark,
      sparkColor: 'rgba(167,139,250,.95)',
      tab: 'TDS_Register',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k, i) => (
        <button
          key={i}
          onClick={() => k.tab && onTabClick && onTabClick(k.tab)}
          className={`text-left p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-200 cursor-pointer ${k.hover}`}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{k.label}</span>
              <div className="text-xl font-bold text-foreground font-mono mt-1 tabular-nums">{k.value}</div>
            </div>
            <div className={`p-2 rounded-xl border shrink-0 ml-2 ${k.iconBg}`}>{k.icon}</div>
          </div>
          <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/60">
            <span className={`text-[11px] font-semibold ${k.subColor}`}>{k.sub}</span>
            {k.spark && <div className="w-16 h-7"><Sparkline data={k.spark} color={k.sparkColor} /></div>}
          </div>
        </button>
      ))}
    </div>
  );
}
