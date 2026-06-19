'use client';

import React, { useState } from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, Select, Dialog } from '../ui/core';
import { formatCurrency } from '../../app/lib/utils';
import { PlusCircle, Search, Receipt, Mail, Send, ShieldAlert, Plus, Trash2 } from 'lucide-react';

export default function POsView() {
  const { pos, vendors, projects, user, call, refreshData } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // PO creation form state
  const [poNo, setPoNo] = useState('');
  const [project, setProject] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().substring(0, 10));
  const [category, setCategory] = useState('Goods');
  
  // Line items state
  const [items, setItems] = useState([
    { description: '', hsnSac: '', quantity: 1, rate: 0 }
  ]);
  
  // Taxes and TDS
  const [gstPct, setGstPct] = useState(18);
  const [tdsSection, setTdsSection] = useState('194C');
  const [tdsPct, setTdsPct] = useState(2);

  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const roles = user?.roles || [];
  const isProcurement = roles.includes('procurement') || roles.includes('maker');
  const isAdmin = roles.includes('admin');
  const canCreate = isProcurement || isAdmin;

  // Filtered POs
  const filteredPOs = pos.filter(po => {
    const q = searchQuery.toLowerCase();
    return (po.po_no || '').toLowerCase().includes(q) || 
           (po.vendor_name || '').toLowerCase().includes(q) || 
           (po.project || '').toLowerCase().includes(q);
  });

  const handleOpenModal = () => {
    setPoNo(`PO-${Math.floor(100000 + Math.random() * 900000)}`);
    setProject(projects[0]?.name || '');
    setVendorCode(vendors[0]?.code || '');
    setPoDate(new Date().toISOString().substring(0, 10));
    setCategory('Goods');
    setItems([{ description: '', hsnSac: '', quantity: 1, rate: 0 }]);
    setGstPct(18);
    setTdsSection('194C');
    setTdsPct(2);
    setFormError(null);
    setModalOpen(true);
  };

  const handleAddItemLine = () => {
    setItems([...items, { description: '', hsnSac: '', quantity: 1, rate: 0 }]);
  };

  const handleRemoveItemLine = (idx) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    const newItems = [...items];
    newItems[idx][field] = value;
    setItems(newItems);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.rate) || 0), 0);
  const gstAmount = Math.round(subtotal * (gstPct / 100));
  const tdsAmount = Math.round(subtotal * (tdsPct / 100));
  const totalValue = subtotal + gstAmount - tdsAmount;

  const handleSendVendorEmail = async (poNumber) => {
    try {
      await call('sendPOToVendor', poNumber, '');
      alert(`PO ${poNumber} has been successfully sent to the vendor's email address.`);
      await refreshData();
    } catch (e) {
      alert(`Failed to send PO: ${e.message}`);
    }
  };

  const handleCreatePOSubmit = async (e) => {
    e.preventDefault();
    if (!poNo) {
      setFormError('PO Number is required.');
      return;
    }
    const hasEmptyItem = items.some(item => !item.description || Number(item.rate) <= 0);
    if (hasEmptyItem) {
      setFormError('All items must have a description and a rate greater than 0.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const selectedVendor = vendors.find(v => v.code === vendorCode);
      const payload = {
        po_no: poNo.trim(),
        project,
        po_date: poDate,
        category,
        vendor_key: vendorCode,
        vendor_name: selectedVendor ? selectedVendor.name : '',
        po_value: totalValue,
        tax_type: 'GST',
        tax_pct: gstPct,
        tds_section: tdsSection,
        tds_pct: tdsPct,
        status: 'Active',
        items: items.map(item => ({
          description: item.description,
          hsn_sac: item.hsnSac,
          qty: Number(item.quantity),
          rate: Number(item.rate),
          amt: Number(item.quantity) * Number(item.rate)
        }))
      };

      await call('createPOFull', payload);
      await refreshData();
      setModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create Purchase Order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gold/10 text-gold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-light text-slate-100 font-serif">Purchase Orders</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Track, generate, and email purchase orders to vendors.</p>
          </div>
        </div>

        {canCreate && (
          <Button variant="primary" size="sm" onClick={handleOpenModal}>
            <PlusCircle className="w-4 h-4" />
            Create Purchase Order
          </Button>
        )}
      </div>

      {/* PO Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4">
          <CardTitle className="text-sm font-semibold text-slate-400">PO DATABASE ({filteredPOs.length})</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search PO, Project, Vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs py-1.5 h-8 bg-slate-950/40"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPOs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-light">
              No purchase orders found matching your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO No</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-slate-200">{po.po_no}</TableCell>
                    <TableCell>{po.project}</TableCell>
                    <TableCell>{po.vendor_name || po.vendor_key}</TableCell>
                    <TableCell>
                      <Badge variant={String(po.status || '').toLowerCase() === 'active' || String(po.status || '').toLowerCase() === 'approved' ? 'success' : 'default'}>
                        {po.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-200">{formatCurrency(po.po_value)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleSendVendorEmail(po.po_no)} title="Email PO to Vendor">
                        <Send className="w-3.5 h-3.5" />
                        Email
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create PO Dialog */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Create Purchase Order">
        <form onSubmit={handleCreatePOSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PO NUMBER *</label>
              <Input
                type="text"
                required
                value={poNo}
                onChange={(e) => setPoNo(e.target.value)}
                placeholder="e.g. PO-123456"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PROJECT *</label>
              <Select value={project} onChange={(e) => setProject(e.target.value)}>
                {projects.map((p, idx) => (
                  <option key={idx} value={p.name}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">VENDOR *</label>
              <Select value={vendorCode} onChange={(e) => setVendorCode(e.target.value)}>
                {vendors.map((v, idx) => (
                  <option key={idx} value={v.code}>{v.name} ({v.code})</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">PO DATE</label>
              <Input
                type="date"
                required
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">CATEGORY</label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Goods">Goods</option>
                <option value="Services">Services</option>
                <option value="Consulting">Consulting</option>
                <option value="IT">IT</option>
                <option value="Admin">Admin</option>
              </Select>
            </div>
          </div>

          {/* Line items Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">PO LINE ITEMS</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleAddItemLine} className="h-7 text-xs text-gold">
                <Plus className="w-3.5 h-3.5" /> Add Line
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-end">
                  <div className="flex-1 min-w-0">
                    {idx === 0 && <label className="text-[9px] font-medium text-slate-500 block mb-1">DESCRIPTION *</label>}
                    <Input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder="Line item description"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="w-24">
                    {idx === 0 && <label className="text-[9px] font-medium text-slate-500 block mb-1">HSN/SAC</label>}
                    <Input
                      type="text"
                      value={item.hsnSac}
                      onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                      placeholder="Code"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="w-20">
                    {idx === 0 && <label className="text-[9px] font-medium text-slate-500 block mb-1">QTY *</label>}
                    <Input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="w-24">
                    {idx === 0 && <label className="text-[9px] font-medium text-slate-500 block mb-1">RATE (INR) *</label>}
                    <Input
                      type="number"
                      required
                      min="0"
                      value={item.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveItemLine(idx)}
                      className="h-9 w-9 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Taxes & Summary Panel */}
          <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">GST PERCENTAGE (%)</label>
                <Select value={gstPct} onChange={(e) => setGstPct(Number(e.target.value))}>
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TDS SECTION</label>
                  <Input type="text" value={tdsSection} onChange={(e) => setTdsSection(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-400 tracking-wider block mb-1.5">TDS PERCENT (%)</label>
                  <Input type="number" step="0.1" value={tdsPct} onChange={(e) => setTdsPct(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-sm font-light flex flex-col justify-end">
              <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                <span className="text-slate-450">Subtotal:</span>
                <span className="text-slate-200">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                <span className="text-slate-455">GST ({gstPct}%):</span>
                <span className="text-slate-200">+{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                <span className="text-slate-455">TDS Deduction ({tdsPct}%):</span>
                <span className="text-red-400">-{formatCurrency(tdsAmount)}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-medium">
                <span className="text-slate-200">Total Net PO Value:</span>
                <span className="text-gold">{formatCurrency(totalValue)}</span>
              </div>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-900/60 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Purchase Order'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
