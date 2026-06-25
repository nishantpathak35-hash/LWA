import React from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../../ui/core';
import { fmtRupees, fmtLakhs, stageBadge, wfSteps } from './report-utils';

export default function ReportsTables({
  loading, data, reportType, isAdmin, isFinance, isDirector, canRemit,
  handleSendPaymentAdvice, sendingAdviceId, handleOpenRemitModal, handleDeleteRemittedPayment
}) {
    return (
    <>
      {(() => {
        if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
          <span className="text-sm font-light">Loading report data...</span>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="text-center py-12 text-slate-500">
          No data available or error loading report.
        </div>
      );
    }

    if (reportType === 'TDS_Register') {
      const entries = data.entries || [];
      const summary = data.summary || {};
      const summaryKeys = Object.keys(summary);

      return (
        <div className="space-y-6">
          <Table id="tblReports">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>PO</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Req. Amount</TableHead>
                <TableHead className="text-right">App. Amount</TableHead>
                <TableHead className="text-right font-semibold text-violet-400">TDS Amount</TableHead>
                <TableHead className="text-right">TDS %</TableHead>
                <TableHead>TDS Section</TableHead>
                <TableHead>Govt Status</TableHead>
                <TableHead>Deducted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length > 0 ? (
                entries.map((e, idx) => (
                  <TableRow key={e.id || idx}>
                    <TableCell className="font-semibold text-gold">{e.id}</TableCell>
                    <TableCell>{e.project_id}</TableCell>
                    <TableCell className="font-mono text-xs">{e.po_id}</TableCell>
                    <TableCell>{e.vendor_id}</TableCell>
                    <TableCell className="text-right text-slate-400 line-through">{fmtLakhs(e.amount_requested)}</TableCell>
                    <TableCell className="text-right text-emerald-400">{fmtLakhs(e.approved_amount ?? e.gross_amount)}</TableCell>
                    <TableCell className="text-right text-violet-400 font-medium">{fmtLakhs(e.tds_amount)}</TableCell>
                    <TableCell className="text-right">{Number(e.tds_percentage || 0).toFixed(1)}%</TableCell>
                    <TableCell><Badge variant="default">{e.tds_section}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={e.government_payment_status === 'paid' ? 'success' : 'warning'}>
                        {e.government_payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {e.deducted_at ? new Date(e.deducted_at).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                    No TDS deductions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {summaryKeys.length > 0 && (
            <Card className="bg-slate-950/40 border-slate-900">
              <CardHeader>
                <CardTitle className="text-gold font-medium">TDS Summary by Section</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {summaryKeys.map(sec => {
                  const s = summary[sec];
                  return (
                    <div key={sec} className="p-4 rounded-lg bg-slate-900/30 border border-slate-900 space-y-2">
                      <div className="font-bold text-slate-200">{s.section}</div>
                      <div className="text-xs text-slate-400">Count: <span className="text-slate-200">{s.count}</span></div>
                      <div className="text-xs text-slate-400">Total TDS: <span className="text-violet-400 font-medium">{fmtLakhs(s.total_tds)}</span></div>
                      <div className="text-xs text-slate-400">Paid: <span className="text-emerald-400">{fmtLakhs(s.paid)}</span></div>
                      <div className="text-xs text-slate-400">Pending: <span className="text-amber-400">{fmtLakhs(s.pending)}</span></div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    if (reportType === 'Vendor_TDS') {
      const vData = data.vendors || [];
      return (
        <Table id="tblReports">
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Total Gross</TableHead>
              <TableHead className="text-right font-semibold text-violet-400">Total TDS</TableHead>
              <TableHead className="text-right text-emerald-400">Total Paid</TableHead>
              <TableHead className="text-right text-amber-400">Total Pending</TableHead>
              <TableHead className="text-right">Entries</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vData.length > 0 ? (
              vData.map((v, idx) => (
                <TableRow key={v.vendor_id || idx}>
                  <TableCell className="font-semibold text-slate-200">{v.vendor_id}</TableCell>
                  <TableCell className="text-right">{fmtLakhs(v.total_gross)}</TableCell>
                  <TableCell className="text-right text-violet-400 font-medium">{fmtLakhs(v.total_tds)}</TableCell>
                  <TableCell className="text-right text-emerald-400 font-medium">{fmtLakhs(v.total_paid)}</TableCell>
                  <TableCell className="text-right text-amber-400 font-medium">{fmtLakhs(v.total_pending)}</TableCell>
                  <TableCell className="text-right">{v.entries?.length || 0}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                  No Vendor TDS data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      );
    }

    if (reportType === 'Project_TDS') {
      const pData = data.projects || [];
      return (
        <Table id="tblReports">
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Total Gross</TableHead>
              <TableHead className="text-right font-semibold text-violet-400">Total TDS</TableHead>
              <TableHead className="text-right text-emerald-400">Total Paid</TableHead>
              <TableHead className="text-right text-amber-400">Total Pending</TableHead>
              <TableHead className="text-right">Entries</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pData.length > 0 ? (
              pData.map((p, idx) => (
                <TableRow key={p.project_id || idx}>
                  <TableCell className="font-semibold text-slate-200">{p.project_id}</TableCell>
                  <TableCell className="text-right">{fmtLakhs(p.total_gross)}</TableCell>
                  <TableCell className="text-right text-violet-400 font-medium">{fmtLakhs(p.total_tds)}</TableCell>
                  <TableCell className="text-right text-emerald-400 font-medium">{fmtLakhs(p.total_paid)}</TableCell>
                  <TableCell className="text-right text-amber-400 font-medium">{fmtLakhs(p.total_pending)}</TableCell>
                  <TableCell className="text-right">{p.entries?.length || 0}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                  No Project TDS data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      );
    }

    if (reportType === 'Approval_Audit') {
      const entries = data.entries || [];
      return (
        <Table id="tblReports">
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Req. Amount</TableHead>
              <TableHead className="text-right">App. Amount</TableHead>
              <TableHead className="text-right text-violet-400">TDS</TableHead>
              <TableHead className="text-right text-emerald-400">Net</TableHead>
              <TableHead>Override</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length > 0 ? (
              entries.map((e, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs text-slate-400">
                    {e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    {e.action === 'approve' ? (
                      <Badge variant="success">Approved</Badge>
                    ) : e.action === 'reject' ? (
                      <Badge variant="rejected">Rejected</Badge>
                    ) : (
                      <Badge variant="default">{e.action}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{e.performed_by}</TableCell>
                  <TableCell>{e.project_id}</TableCell>
                  <TableCell>{e.vendor_id}</TableCell>
                  <TableCell className="text-right text-slate-400 line-through">{fmtLakhs(e.amount_requested)}</TableCell>
                  <TableCell className="text-right text-emerald-400">{fmtLakhs(e.approved_amount ?? e.gross_amount)}</TableCell>
                  <TableCell className="text-right text-violet-400">{fmtLakhs(e.tds_amount)}</TableCell>
                  <TableCell className="text-right text-emerald-400 font-semibold">{fmtLakhs(e.net_amount)}</TableCell>
                  <TableCell>{e.override_flag ? <Badge variant="warning">Yes</Badge> : '—'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                  No audit entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      );
    }

    if (reportType === 'Day_Wise') {
      const dates = data.dates || [];
      const summary = data.summary || { total_count: 0, total_gross: 0, total_tds: 0, total_net: 0 };
      
      return (
        <div className="space-y-6">
          <Card className="bg-slate-950/40 border-slate-900">
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Total Approved</div>
                <div className="text-2xl font-semibold text-slate-200">{summary.total_count}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Total Gross</div>
                <div className="text-2xl font-semibold text-slate-200">{fmtRupees(summary.total_gross)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Total TDS</div>
                <div className="text-2xl font-semibold text-violet-400">{fmtRupees(summary.total_tds)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Total Net Payable</div>
                <div className="text-2xl font-semibold text-emerald-400">{fmtRupees(summary.total_net)}</div>
              </div>
            </CardContent>
          </Card>

          {dates.length > 0 ? (
            dates.map((day, idx) => (
              <div key={idx} className="space-y-0 rounded-lg overflow-hidden border border-slate-900 bg-slate-950/40">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-slate-900/40 border-b border-slate-900 gap-2">
                  <div className="font-semibold text-gold text-sm">{day.displayDate}</div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-slate-400">{day.count} entries</span>
                    <span className="text-slate-350">Gross: {fmtRupees(day.gross)}</span>
                    <span className="text-violet-400">TDS: {fmtRupees(day.tds)}</span>
                    <span className="text-emerald-400">Net: {fmtRupees(day.net)}</span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>PO</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right text-violet-400">TDS</TableHead>
                      <TableHead className="text-right text-emerald-400">Net</TableHead>
                      <TableHead>Approved By</TableHead>
                      <TableHead>Bank Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {day.entries.map((e, eIdx) => (
                      <TableRow key={e.sNo || eIdx}>
                        <TableCell className="font-semibold text-gold text-xs">{e.sNo}</TableCell>
                        <TableCell>{e.vendor}</TableCell>
                        <TableCell className="text-slate-400">{e.project}</TableCell>
                        <TableCell className="font-mono text-xs">{e.poNo}</TableCell>
                        <TableCell className="text-right">{fmtRupees(e.grossAmount)}</TableCell>
                        <TableCell className="text-right text-violet-400">{fmtRupees(e.tdsAmount)}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-semibold">{fmtRupees(e.netAmount)}</TableCell>
                        <TableCell className="text-xs">{e.approvedBy}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{e.bankRef}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-500">
              No approved payments found in this range.
            </div>
          )}
        </div>
      );
    }

    // Legacy payment reports
    const rows = data || [];
    return (
      <Table id="tblReports">
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>PO</TableHead>
            <TableHead className="text-right">Gross Amount</TableHead>
            <TableHead className="text-right text-violet-400">TDS</TableHead>
            <TableHead className="text-right text-emerald-400 font-semibold">Net Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Workflow</TableHead>
            <TableHead>Rejected By</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((p, idx) => {
              const gross = Number(p.amountRequested || 0);
              const tds = Number(p.tdsAmount || p.tds_amount || 0);
              const net = gross - tds;
              const rejBy = p.rejectedBy ? ({ proc: 'Procurement', finance: 'Finance', director: 'Director' }[p.rejectedBy] || p.rejectedBy) : '—';
              
              const canSendAdvice = p.can_send_payment_advice || String(p.stage || '').toLowerCase() === 'remitted' || String(p.remittance || '').toLowerCase() === 'remitted';

              return (
                <TableRow key={p.rowNumber || idx}>
                  <TableCell className="font-semibold text-gold">{p.sNo}</TableCell>
                  <TableCell className="font-semibold text-slate-200">{p.vendor}</TableCell>
                  <TableCell>{p.project || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{p.poNo || '—'}</TableCell>
                  <TableCell className="text-right">{fmtRupees(gross)}</TableCell>
                  <TableCell className="text-right text-violet-400">{fmtRupees(tds)}</TableCell>
                  <TableCell className="text-right text-emerald-400 font-semibold">{fmtRupees(net)}</TableCell>
                  <TableCell>{stageBadge(p.stage)}</TableCell>
                  <TableCell>{wfSteps(p)}</TableCell>
                  <TableCell className={p.rejectedBy ? 'text-red-400' : 'text-slate-550'}>{rejBy}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canRemit && (String(p.stage || '').toLowerCase() === 'approved' || String(p.stage || '').toLowerCase().includes('remit')) && !String(p.stage || '').toLowerCase().includes('remitted') && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-7 text-[10px] px-2"
                          onClick={() => handleOpenRemitModal(p)}
                        >
                          Remit
                        </Button>
                      )}
                      {canSendAdvice && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSendPaymentAdvice(p)}
                          title="Send Payment Advice Email"
                          disabled={sendingAdviceId === p.id}
                          className="text-gold hover:text-gold/80"
                        >
                          {sendingAdviceId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                      {(isAdmin || isDirector) && String(p.stage || '').toLowerCase() === 'remitted' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 text-[10px] px-2"
                          onClick={() => handleDeleteRemittedPayment(p)}
                          title="Delete Remitted Payment"
                        >
                          Delete
                        </Button>
                      )}
                      {!canSendAdvice && !(canRemit && (String(p.stage || '').toLowerCase() === 'approved' || String(p.stage || '').toLowerCase().includes('remit')) && !String(p.stage || '').toLowerCase().includes('remitted')) && !((isAdmin || isDirector) && String(p.stage || '').toLowerCase() === 'remitted') && (
                        <span className="text-slate-700">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-10 text-slate-500">
                No items match your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  })()}
    </>
  );
}