import React from 'react';
import { Dialog, Button, Input, Select, Textarea, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '../../ui/core';
import AttachmentsSection from '../../ui/AttachmentsSection';
import { Plus, Trash2, AlertTriangle, Send, Wallet, ChevronUp, ChevronDown, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '../../../app/lib/utils';
import { GST_RATES, UOM_OPTIONS } from './po-constants';

export default function POFormModal(props) {
  const {
    modalOpen, setModalOpen, editingPoNo, poNo, setPoNo, project, setProject,
    vendorCode, setVendorCode, vendors, poDate, setPoDate, expectedDelivery, setExpectedDelivery,
    category, setCategory, items, handleItemChange, handleRemoveItemLine, handleAddItemLine,
    tdsSection, setTdsSection, gstMode, setGstMode, terms, setTerms, notes, setNotes,
    formError, submitting, handleSavePO, summaryTotals, tdsAmount, netPayable,
    showPayments, setShowPayments, loadingPayments, paymentData, getVendorSelectValue,
    findVendorBySelection, projects, editingPO, calcItem, tdsPct, setTdsPct, getPaymentStatusBadge, tdsSections
  } = props;

  const handleTdsSectionChange = (code) => {
    setTdsSection(code);
    setTdsPct(tdsSections?.find(s => s.section_code === code)?.rate || 0);
  };

  const selectedProjectData = projects.find(p => p?.name === project);

  return (
    <>
      {/* ── Create / Edit PO Dialog ────────────────────────────────────────── */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}
        maxWidth="max-w-[95vw]"
        title={editingPoNo ? `Edit Purchase Order — ${editingPoNo}` : 'Create Purchase Order'}>
        <form onSubmit={handleSavePO} className="space-y-6">

          {/* Status warning for approved PO edits */}
          {editingPO && String(editingPO.approval_status || editingPO.status || '').toLowerCase() === 'approved' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>This PO is <strong>Approved</strong>. Editing financial fields (value, vendor, line items) will reset it to <strong>Draft</strong> and require re-approval.</span>
            </div>
          )}

          {/* Header row — all 5 fields in one line on wide screens */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PO NUMBER *</label>
              <Input type="text" required value={poNo} onChange={e => setPoNo(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PROJECT *</label>
              <Select value={project} onChange={e => setProject(e.target.value)} required>
                <option value="">-- Select Project --</option>
                {projects.map((p, i) => <option key={i} value={p?.name}>{p?.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR *</label>
              <Select value={vendorCode} onChange={e => setVendorCode(e.target.value)}>
                {vendors.map((v, i) => <option key={getVendorSelectValue(v, i)} value={getVendorSelectValue(v, i)}>{v?.name} ({v?.code || 'No Code'})</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">CATEGORY</label>
              <Select value={category} onChange={e => setCategory(e.target.value)}>
                {['Goods','Services','Consulting','IT','Marketing','Admin','Capex','Opex'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">GST TYPE</label>
              <Select value={gstMode} onChange={e => setGstMode(e.target.value)}>
                <option value="inter">Inter-State (IGST)</option>
                <option value="intra">Intra-State (CGST+SGST)</option>
              </Select>
            </div>
          </div>

          {/* Project Details Info Box */}
          {selectedProjectData && (
            <div className="bg-slate-900/30 border border-slate-900 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] font-medium text-slate-500 tracking-wider uppercase block mb-1">Project Ref</span>
                <span className="text-sm text-slate-300">{selectedProjectData.project_ref || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-500 tracking-wider uppercase block mb-1">Client</span>
                <span className="text-sm text-slate-300">{selectedProjectData.client || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-500 tracking-wider uppercase block mb-1">Site Address</span>
                <span className="text-sm text-slate-300 whitespace-pre-line leading-relaxed block max-h-24 overflow-y-auto">{selectedProjectData.site_address || '—'}</span>
              </div>
            </div>
          )}



          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TERMS & CONDITIONS</label>
              <Textarea
                value={terms}
                onChange={e => setTerms(e.target.value)}
                placeholder="e.g. 50% advance, balance on delivery"
                style={{ minHeight: '100px', height: '100px', resize: 'vertical' }}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">NOTES / REMARKS</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Internal notes or special instructions"
                style={{ minHeight: '100px', height: '100px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">Line Items</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleAddItemLine} className="h-7 text-xs text-gold">
                <Plus className="w-3.5 h-3.5" /> Add Line
              </Button>
            </div>

            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[minmax(200px,1fr)_90px_70px_100px_100px_80px_100px_36px] gap-2 px-3">
              {['Description *','HSN/SAC','Qty','UOM','Rate (₹)','GST %','Amount',''].map((h,i) => (
                <span key={i} className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{h}</span>
              ))}
            </div>

            {items.map((item, idx) => {
              const { total } = calcItem(item);
              return (
                <div key={idx} style={{ minHeight: '56px' }} className="grid grid-cols-1 md:grid-cols-[minmax(200px,1fr)_90px_70px_100px_100px_80px_100px_36px] gap-2 items-center p-2 rounded-lg bg-slate-950/20 border border-slate-900/60">
                  <Input
                    required
                    type="text"
                    value={item.description}
                    onChange={e => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Item description"
                    className="h-10 text-xs"
                  />
                  <Input type="text" value={item.hsnSac}
                    onChange={e => handleItemChange(idx, 'hsnSac', e.target.value)}
                    placeholder="Code" className="h-10 text-xs" />
                  <Input type="number" required min="0.001" step="0.001" value={item.quantity}
                    onChange={e => handleItemChange(idx, 'quantity', e.target.value)} className="h-10 text-xs" />
                  <Input type="text" list={`uom-options-${idx}`} value={item.unit || 'Nos'} onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                    className="h-10 text-xs" />
                  <datalist id={`uom-options-${idx}`}>
                    {UOM_OPTIONS.map(u => <option key={u.value} value={u.label} />)}
                  </datalist>
                  <Input type="number" required min="0" step="0.01" value={item.rate}
                    onChange={e => handleItemChange(idx, 'rate', e.target.value)} className="h-10 text-xs" />
                  <Select value={item.gstPct} onChange={e => handleItemChange(idx, 'gstPct', Number(e.target.value))}
                    className="h-10 text-xs">
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </Select>
                  <div className="h-10 flex items-center px-2 text-xs font-semibold text-gold">
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
          <div className="p-4 bg-slate-900/20 border border-slate-900/60 rounded-xl space-y-3">
            <span className="text-[10px] font-semibold text-gold tracking-wider uppercase block">TDS Deduction</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TDS SECTION</label>
                <Select value={tdsSection} onChange={e => handleTdsSectionChange(e.target.value)}>
                  <option value="">None</option>
                  {tdsSections?.map(s => <option key={s.section_code} value={s.section_code}>{s.section_code} ({s.rate}%)</option>)}
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TDS RATE (%)</label>
                <Input type="number" min="0" max="100" step="0.1" value={tdsPct}
                  onChange={e => setTdsPct(Number(e.target.value))} className="h-9 text-xs" />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase block mb-3">Order Summary</span>
            <div className="space-y-2 text-sm font-light">
              <div className="flex justify-between border-b border-slate-900/60 pb-2">
                <span className="text-slate-400">Subtotal:</span>
                <span>{formatCurrency(summaryTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/60 pb-2">
                <span className="text-slate-400">GST ({gstMode === 'intra' ? 'CGST+SGST' : 'IGST'}):</span>
                <span>+{formatCurrency(summaryTotals.gstTotal)}</span>
              </div>
              {tdsAmount > 0 && (
                <div className="flex justify-between border-b border-slate-900/60 pb-2 text-red-400">
                  <span>TDS ({tdsSection} @ {tdsPct}%):</span>
                  <span>−{formatCurrency(tdsAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base font-semibold">
                <span className="text-slate-200">Net PO Value:</span>
                <span className="text-gold">{formatCurrency(netPayable)}</span>
              </div>
            </div>
          </div>

          {/* ── Payment Summary (Edit Mode only) ──────────────────────────── */}
          {editingPoNo && paymentData && (
            <div className="border border-slate-900 rounded-xl overflow-hidden">
              <button type="button"
                onClick={() => setShowPayments(p => !p)}
                className="w-full flex items-center justify-between p-4 bg-slate-900/20 hover:bg-slate-900/40 transition-colors text-left">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-gold" />
                  <span className="text-sm font-medium text-slate-200">Payment Summary</span>
                  {paymentData.summary && (
                    <span className="ml-2">{getPaymentStatusBadge(paymentData.summary.payment_status)}</span>
                  )}
                </div>
                {showPayments ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {showPayments && (
                <div className="p-4 space-y-4">
                  {/* KPI chips */}
                  {paymentData.summary && (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'PO Value', value: paymentData.summary.po_value, color: 'text-slate-200' },
                        { label: 'Total Paid', value: paymentData.summary.total_paid, color: 'text-emerald-400' },
                        { label: 'Outstanding', value: paymentData.summary.outstanding, color: 'text-amber-400' },
                      ].map(kpi => (
                        <div key={kpi.label} className="p-3 bg-slate-900/30 rounded-lg border border-slate-900/60 text-center">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{kpi.label}</div>
                          <div className={`text-sm font-semibold ${kpi.color}`}>{formatCurrency(kpi.value)}</div>
                        </div>
                      ))}
                    </div>
                  )}



                  {/* Payment history table */}
                  {loadingPayments ? (
                    <div className="text-center text-slate-500 text-sm py-4">Loading...</div>
                  ) : paymentData.payments?.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-900/60">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900/40 text-slate-500 uppercase tracking-wider">
                          <tr>
                            {['Date','Amount','Mode','UTR / Ref','Type','By'].map(h => (
                              <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/60">
                          {paymentData.payments?.map((p, i) => (
                            <tr key={i} className="hover:bg-slate-900/20">
                              <td className="px-3 py-2">{p.payment_date}</td>
                              <td className="px-3 py-2 font-semibold text-emerald-400">{formatCurrency(p.amount)}</td>
                              <td className="px-3 py-2">{p.payment_mode}</td>
                              <td className="px-3 py-2 font-mono text-slate-400">{p.utr_ref || p.reference_no || '—'}</td>
                              <td className="px-3 py-2">
                                <Badge variant={p.payment_type === 'manual' ? 'info' : 'success'}>
                                  {p.payment_type === 'manual' ? 'Manual' : 'Remittance'}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-slate-500">{p.recorded_by || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 text-sm py-4">No payments recorded yet.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {poNo ? (
            <div className="pt-4 border-t border-slate-900/60 mt-4">
              <AttachmentsSection entityType="po" entityId={poNo} />
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-900/60 mt-4 p-4 text-center border border-slate-800 border-dashed rounded-lg text-xs text-slate-500 font-light">
              Save Purchase Order first to enable attachments.
            </div>
          )}

          {formError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" /><span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (editingPoNo ? 'Saving...' : 'Creating...') : (editingPoNo ? 'Save Changes' : 'Create PO')}
            </Button>
          </div>
        </form>
      </Dialog>

    </>
  );
}
