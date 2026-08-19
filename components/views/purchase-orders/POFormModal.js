import React from 'react';
import { Dialog, Button, Input, Select, Textarea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import AttachmentsSection from '../../ui/AttachmentsSection';
import RecordDiscussionThread from '../../ui/RecordDiscussionThread';
import POInvoicesTab from './POInvoicesTab';
import { Plus, Trash2, AlertTriangle, Send, Wallet, ChevronUp, ChevronDown, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { GST_RATES, UOM_OPTIONS } from './po-constants';
import { useAppState } from '../../StateProvider';

export default function POFormModal(props) {
  const {
    modalOpen, setModalOpen, editingPoNo, poNo, setPoNo, project, setProject,
    vendorCode, setVendorCode, vendors, poDate, setPoDate, expectedDelivery, setExpectedDelivery,
    category, setCategory, items, handleItemChange, handleRemoveItemLine, handleAddItemLine,
    tdsSection, setTdsSection, gstMode, setGstMode, terms, setTerms,
    paymentDeliveryTerms, setPaymentDeliveryTerms, generalTerms, setGeneralTerms,
    handleApplyDefaultGeneralTerms, handleSaveGlobalGeneralTerms, savingGlobalTerms,
    notes, setNotes,
    formError, submitting, handleSavePO, summaryTotals, tdsAmount, netPayable,
    showPayments, setShowPayments, loadingPayments, paymentData, getVendorSelectValue,
    findVendorBySelection, projects, editingPO, calcItem, tdsPct, setTdsPct, getPaymentStatusBadge, tdsSections
  } = props;

  const handleTdsSectionChange = (code) => {
    setTdsSection(code);
    setTdsPct(tdsSections?.find(s => s.section_code === code)?.rate || 0);
  };

  const selectedProjectData = projects.find(p => p?.name === project);

  const { activeLocks, user, call } = useAppState();
  const lockKey = `po:${editingPoNo}`;
  const currentLock = editingPoNo ? activeLocks[lockKey] : null;
  const isLockedByOthers = currentLock && currentLock.email !== user?.email;

  React.useEffect(() => {
    if (!modalOpen || !editingPoNo) return;

    let active = true;
    let intervalId = null;

    async function lockDocument() {
      try {
        const res = await call('acquireDocumentLock', 'po', editingPoNo);
        if (res && res.ok) {
          intervalId = setInterval(async () => {
            if (!active) return;
            try {
              const refreshRes = await call('acquireDocumentLock', 'po', editingPoNo);
              if (!refreshRes.ok) {
                clearInterval(intervalId);
              }
            } catch (e) {
              console.error('Lock refresh failed:', e);
            }
          }, 15000);
        }
      } catch (err) {
        console.error('Failed to acquire document lock:', err);
      }
    }

    lockDocument();

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
      call('releaseDocumentLock', 'po', editingPoNo).catch(() => {});
    };
  }, [modalOpen, editingPoNo, call]);

  return (
    <>
      {/* ── Create / Edit PO Dialog ────────────────────────────────────────── */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}
        maxWidth="max-w-[95vw]"
        title={editingPoNo ? `Edit Purchase Order — ${editingPoNo}` : 'Create Purchase Order'}>
        <form onSubmit={handleSavePO} className="space-y-6">

          {isLockedByOthers && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs font-medium">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Collaborative Edit Lock</div>
                <div className="text-xs text-rose-600 dark:text-rose-300 mt-1">
                  This Purchase Order is currently being edited by <strong>{currentLock.name}</strong> ({currentLock.email}).
                  Your inputs are set to read-only, and saving changes is disabled.
                </div>
              </div>
            </div>
          )}

          <fieldset disabled={isLockedByOthers} className="space-y-6 border-0 p-0 m-0">

          {/* Status warning for approved PO edits */}
          {editingPO && String(editingPO.approval_status || editingPO.status || '').toLowerCase() === 'approved' && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 text-amber-800 dark:text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>This PO is <strong>Approved</strong>. Saving changes to an approved PO will re-submit it for approval again.</span>
            </div>
          )}

          {/* Status info for pending approval PO edits */}
          {editingPO && ['pending approval', 'pending_approval'].includes(String(editingPO.approval_status || editingPO.status || '').toLowerCase()) && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 text-blue-800 dark:text-blue-400 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>This PO is currently <strong>Under Approval</strong>. You can update details before approvers finalize their decision.</span>
            </div>
          )}

          {/* Header row — all 5 fields in one line on wide screens */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">PO NUMBER *</label>
              <Input type="text" required value={poNo} onChange={e => setPoNo(e.target.value)} className="bg-background text-foreground text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">PROJECT *</label>
              <Select value={project} onChange={e => setProject(e.target.value)} required className="bg-background text-foreground text-xs font-semibold">
                <option value="">-- Select Project --</option>
                {projects.map((p, i) => <option key={i} value={p?.name}>{p?.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">VENDOR *</label>
              <Select value={vendorCode} onChange={e => setVendorCode(e.target.value)} className="bg-background text-foreground text-xs font-semibold">
                {vendors.map((v, i) => <option key={getVendorSelectValue(v, i)} value={getVendorSelectValue(v, i)}>{v?.name} ({v?.code || 'No Code'})</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">CATEGORY</label>
              <Select value={category} onChange={e => setCategory(e.target.value)} className="bg-background text-foreground text-xs font-semibold">
                {['Goods','Services','Consulting','IT','Marketing','Admin','Capex','Opex'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">GST TYPE</label>
              <Select value={gstMode} onChange={e => setGstMode(e.target.value)} className="bg-background text-foreground text-xs font-semibold">
                <option value="inter">Inter-State (IGST)</option>
                <option value="intra">Intra-State (CGST+SGST)</option>
              </Select>
            </div>
          </div>

          {/* Project Details Info Box */}
          {selectedProjectData && (
            <div className="bg-amber-50/50 dark:bg-slate-900/40 border border-amber-200/60 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-2xs">
              <div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider block mb-1">Project Ref</span>
                <span className="text-xs text-slate-900 dark:text-slate-200 font-mono font-bold">{selectedProjectData.project_ref || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider block mb-1">Client</span>
                <span className="text-xs text-slate-900 dark:text-slate-200 font-bold">{selectedProjectData.client || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider block mb-1">Site Address</span>
                <span className="text-xs text-slate-800 dark:text-slate-300 whitespace-pre-line leading-relaxed block max-h-24 overflow-y-auto font-medium">{selectedProjectData.site_address || '—'}</span>
              </div>
            </div>
          )}

          {/* PO Terms Architecture: Box 1 (Payment & Delivery) + Internal Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border/80 rounded-xl p-3 bg-card/60 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  1. PAYMENT &amp; DELIVERY TERMS
                </label>
                <span className="text-[9px] text-muted-foreground font-medium">PO-specific terms</span>
              </div>
              <Textarea
                value={paymentDeliveryTerms}
                onChange={e => setPaymentDeliveryTerms(e.target.value)}
                placeholder="e.g.&#10;• Payment: 50% advance against PO, 40% against dispatch inspection, 10% after site installation within 15 days.&#10;• Delivery: Site address as per PO. Delivery timeline: 2-3 weeks."
                className="bg-background text-foreground text-xs leading-relaxed"
                style={{ minHeight: '95px', height: '95px', resize: 'vertical' }}
              />
            </div>
            <div className="border border-border/80 rounded-xl p-3 bg-card/60 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  INTERNAL NOTES / REMARKS
                </label>
                <span className="text-[9px] text-muted-foreground font-medium">Internal reference only</span>
              </div>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Internal notes, approver remarks, or special instructions..."
                className="bg-background text-foreground text-xs leading-relaxed"
                style={{ minHeight: '95px', height: '95px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* PO Terms Architecture: Box 2 (General Terms & Conditions - Global 1-Pager Contract) */}
          <div className="border border-border/80 rounded-xl p-3 bg-card/60 shadow-2xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  2. GENERAL TERMS &amp; CONDITIONS (GLOBAL / 1-PAGER CONTRACT)
                </label>
                <p className="text-[10px] text-muted-foreground">
                  Saved across all POs. Supports full 1-page detailed legal clauses, quality, warranty, and statutory compliance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {handleApplyDefaultGeneralTerms && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApplyDefaultGeneralTerms}
                    className="h-7 text-[10px] font-semibold"
                  >
                    Load Global Default
                  </Button>
                )}
                {handleSaveGlobalGeneralTerms && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={savingGlobalTerms}
                    onClick={handleSaveGlobalGeneralTerms}
                    className="h-7 text-[10px] font-semibold text-amber-700 dark:text-gold border border-amber-300/60"
                  >
                    {savingGlobalTerms ? 'Saving Default...' : 'Save as Global Default'}
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              value={generalTerms}
              onChange={e => setGeneralTerms(e.target.value)}
              placeholder="Enter standard contract clauses (1-page contract terms, quality specifications, inspection, rejection, warranty, dispute jurisdiction, etc.)"
              className="bg-background text-foreground text-xs font-mono leading-relaxed"
              style={{ minHeight: '120px', height: '140px', resize: 'vertical' }}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Line Items</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleAddItemLine} className="h-7 text-xs text-amber-700 dark:text-gold font-bold">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
              </Button>
            </div>

            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[minmax(200px,1fr)_90px_70px_100px_100px_80px_100px_36px] gap-2 px-3">
              {['Description *','HSN/SAC','Qty','UOM','Rate (₹)','GST %','Amount',''].map((h,i) => (
                <span key={i} className="text-[9px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">{h}</span>
              ))}
            </div>

            {items.map((item, idx) => {
              const { total } = calcItem(item);
              return (
                <div key={idx} style={{ minHeight: '56px' }} className="grid grid-cols-1 md:grid-cols-[minmax(200px,1fr)_90px_70px_100px_100px_80px_100px_36px] gap-2 items-center p-2.5 rounded-xl bg-card border border-border shadow-2xs">
                  <Input
                    required
                    type="text"
                    value={item.description}
                    onChange={e => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Item description"
                    className="h-10 text-xs bg-background text-foreground"
                  />
                  <Input type="text" value={item.hsnSac}
                    onChange={e => handleItemChange(idx, 'hsnSac', e.target.value)}
                    placeholder="Code" className="h-10 text-xs font-mono bg-background text-foreground" />
                  <Input type="number" required min="0.001" step="0.001" value={item.quantity}
                    onChange={e => handleItemChange(idx, 'quantity', e.target.value)} className="h-10 text-xs font-mono bg-background text-foreground" />
                  <Input type="text" list={`uom-options-${idx}`} value={item.unit || 'Nos'} onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                    className="h-10 text-xs bg-background text-foreground" />
                  <datalist id={`uom-options-${idx}`}>
                    {UOM_OPTIONS.map(u => <option key={u.value} value={u.label} />)}
                  </datalist>
                  <Input type="number" required min="0" step="0.01" value={item.rate}
                    onChange={e => handleItemChange(idx, 'rate', e.target.value)} className="h-10 text-xs font-mono bg-background text-foreground" />
                  <Select value={item.gstPct} onChange={e => handleItemChange(idx, 'gstPct', Number(e.target.value))}
                    className="h-10 text-xs bg-background text-foreground font-semibold">
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </Select>
                  <div className="h-10 flex items-center px-2 text-xs font-bold text-amber-700 dark:text-gold font-mono">
                    {formatCurrency(total)}
                  </div>
                  {items.length > 1
                    ? <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveItemLine(idx)} className="h-8 w-8">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    : <div />
                  }
                </div>
              );
            })}
          </div>

          {/* TDS */}
          <div className="p-4 bg-amber-50/50 dark:bg-slate-900/40 border border-amber-200/60 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-800 dark:text-gold tracking-wider uppercase block">TDS Deduction</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">TDS SECTION</label>
                <Select value={tdsSection} onChange={e => handleTdsSectionChange(e.target.value)} className="bg-background text-foreground text-xs font-semibold">
                  <option value="">None</option>
                  {tdsSections?.map(s => <option key={s.section_code} value={s.section_code}>{s.section_code} ({s.rate}%)</option>)}
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">TDS RATE (%)</label>
                <Input type="number" min="0" max="100" step="0.1" value={tdsPct}
                  onChange={e => setTdsPct(Number(e.target.value))} className="h-9 text-xs font-mono bg-background text-foreground" />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-card border border-border rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-amber-800 dark:text-gold tracking-wider uppercase block mb-3">Order Summary</span>
            <div className="space-y-2 text-xs font-medium">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">{formatCurrency(summaryTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-slate-600 dark:text-slate-400">GST ({gstMode === 'intra' ? 'CGST+SGST' : 'IGST'}):</span>
                <span className="font-mono text-slate-900 dark:text-slate-100 font-bold">+{formatCurrency(summaryTotals.gstTotal)}</span>
              </div>
              {tdsAmount > 0 && (
                <div className="flex justify-between border-b border-border pb-2 text-rose-600 dark:text-rose-400">
                  <span>TDS ({tdsSection} @ {tdsPct}%):</span>
                  <span className="font-mono font-bold">−{formatCurrency(tdsAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-sm font-bold">
                <span className="text-slate-900 dark:text-slate-100">Net PO Value:</span>
                <span className="text-amber-700 dark:text-gold font-mono text-base">{formatCurrency(netPayable)}</span>
              </div>
            </div>
          </div>

          {/* ── Payment Summary (Edit Mode only) ──────────────────────────── */}
          {editingPoNo && paymentData && (
            <div className="border border-border rounded-xl shadow-2xs overflow-hidden">
              <button type="button"
                onClick={() => setShowPayments(p => !p)}
                className="w-full flex items-center justify-between p-4 bg-muted/40 hover:bg-muted/60 transition-colors text-left">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-600 dark:text-gold" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Payment Summary</span>
                  {paymentData.summary && (
                    <span className="ml-2">{getPaymentStatusBadge(paymentData.summary.payment_status)}</span>
                  )}
                </div>
                {showPayments ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {showPayments && (
                <div className="p-4 space-y-4">
                  {/* KPI chips */}
                  {paymentData.summary && (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'PO Value', value: paymentData.summary.po_value, color: 'text-slate-900 dark:text-slate-100 font-bold' },
                        { label: 'Total Paid', value: paymentData.summary.total_paid, color: 'text-emerald-700 dark:text-emerald-400 font-bold' },
                        { label: 'Outstanding', value: paymentData.summary.outstanding, color: 'text-amber-700 dark:text-amber-400 font-bold' },
                      ].map(kpi => (
                        <div key={kpi.label} className="p-3 bg-card rounded-xl border border-border text-center shadow-2xs">
                          <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</div>
                          <div className={`text-xs font-mono ${kpi.color}`}>{formatCurrency(kpi.value)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Payment history table */}
                  {loadingPayments ? (
                    <div className="text-center text-muted-foreground text-xs py-4 font-medium">Loading payments...</div>
                  ) : paymentData.payments?.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/40 text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          <tr>
                            {['Date','Amount','Mode','UTR / Ref','Type','By'].map(h => (
                              <th key={h} className="px-3 py-2 font-bold text-[10px]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paymentData.payments?.map((p, i) => (
                            <tr key={i} className="hover:bg-muted/40 transition-colors">
                              <td className="px-3 py-2 font-mono">{p.payment_date}</td>
                              <td className="px-3 py-2 font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(p.amount)}</td>
                              <td className="px-3 py-2 font-medium">{p.payment_mode}</td>
                              <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{p.utr_ref || p.reference_no || '—'}</td>
                              <td className="px-3 py-2">
                                <Badge variant={p.payment_type === 'manual' ? 'info' : 'success'} className="font-bold">
                                  {p.payment_type === 'manual' ? 'Manual' : 'Remittance'}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{p.recorded_by || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs py-4 font-medium">No payments recorded yet.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {poNo ? (
            <div className="pt-4 border-t border-border mt-4 space-y-4">
              <POInvoicesTab poNo={poNo} poValue={summaryTotals?.grandTotal || netPayable || editingPO?.po_value || 0} vendorName={editingPO?.vendor_name} />
              <AttachmentsSection entityType="po" entityId={poNo} />
              <RecordDiscussionThread recordType="PO" recordId={poNo} />
            </div>
          ) : (
            <div className="pt-4 border-t border-border mt-4 p-4 text-center border border-border border-dashed rounded-xl text-xs text-muted-foreground font-medium">
              Save Purchase Order first to enable attachments.
            </div>
          )}

          </fieldset>

          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" /><span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="text-xs">Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting || isLockedByOthers} className="text-xs font-bold">
              {submitting ? (editingPoNo ? 'Saving...' : 'Creating...') : (editingPoNo ? 'Save Changes' : 'Create PO')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
