import { PORepository } from '../repositories/PORepository';
import { IPOInput, IPO, IPOItem } from '../types/PO';
import { logAudit } from '../../../../app/lib/api.js';

export class POService {
  static async getAllPOs(options?: { limit?: number; offset?: number }): Promise<IPO[]> {
    return PORepository.findAll(options);
  }

  static async getPO(poNo: string): Promise<IPO | null> {
    if (!poNo) throw new Error("PO Number is required");
    return PORepository.findById(poNo);
  }

  static async getPOItems(poNo: string): Promise<IPOItem[]> {
    if (!poNo) throw new Error("PO Number is required");
    return PORepository.findItemsByPoNo(poNo);
  }

  static async createPO(payload: IPOInput, userEmail: string): Promise<{ ok: boolean, poNo: string }> {
    const poNo = String(payload.poNo || `PO-${Date.now()}`).trim();
    if (!poNo) throw new Error('PO Number is required');

    const duplicate = await PORepository.findById(poNo);
    if (duplicate) {
      throw new Error(`PO Number "${poNo}" already exists. Please use a unique PO Number.`);
    }

    let totalVal = payload.grandTotal || payload.poValue || 0;
    let gstTotal = Number(payload.gst_total || payload.gstTotal) || 0;
    
    if (!totalVal && payload.items && payload.items.length) {
      let subt = 0;
      let gstSum = 0;
      payload.items.forEach(item => {
        const q = Number(item.qty || item.quantity) || 0;
        const r = Number(item.rate) || 0;
        const tPct = Number(item.tax_pct || item.gstPct || item.tax || 0);
        const gross = q * r;
        const gstAmt = Math.round(gross * tPct / 100);
        subt += gross;
        gstSum += gstAmt;
      });
      gstTotal = gstSum;
      const tdsPct = Number(payload.tds_pct || payload.tdsPct || 0);
      const tdsAmt = Math.round(subt * tdsPct / 100);
      totalVal = subt + gstSum - tdsAmt;
    }

    const vendorName = payload.vendorName || payload.vendor || 'Unknown';
    const vendorKey = payload.vendorCode || payload.vendor_key || 'UNKNOWN';

    const newPO: Omit<IPO, 'created_at' | 'paid'> = {
      po_no: poNo,
      vendor_key: vendorKey,
      vendor_name: vendorName,
      project: payload.project || '',
      po_value: totalVal,
      revised_po_value: totalVal,
      approval_status: 'Draft',
      status: 'Draft',
      po_date: payload.poDate || new Date().toISOString().split('T')[0],
      terms: payload.terms || '',
      tds_section: payload.tds_section || payload.tdsSection || '',
      tds_pct: Number(payload.tds_pct || payload.tdsPct || 0),
      tds_amount: Number(payload.tds_amount || 0),
      gst_total: gstTotal,
      gst_mode: payload.gst_mode || payload.gstMode || 'inter',
      category: payload.category || 'Goods',
      notes: payload.notes || '',
      expected_delivery_date: payload.expectedDeliveryDate || ''
    };

    await PORepository.create(newPO);

    if (payload.items && payload.items.length) {
      for (const item of payload.items) {
        const itemGstPct = Number(item.tax_pct || item.gstPct || item.tax || 0);
        const itemQty = Number(item.qty || item.quantity || 0);
        const itemRate = Number(item.rate || 0);
        const itemGross = itemQty * itemRate;
        const itemGstAmt = item.gst_amount !== undefined ? Number(item.gst_amount) : Math.round(itemGross * itemGstPct / 100);
        const itemTotal = item.amount !== undefined ? Number(item.amount) : (itemGross + itemGstAmt);
        
        await PORepository.createItem({
          po_no: poNo,
          description: item.description || item.desc || '',
          hsn_sac: item.hsn_sac || item.hsn || '',
          qty: itemQty,
          unit: item.unit || item.uom || 'Nos',
          rate: itemRate,
          disc_pct: item.disc_pct || item.disc || item.discount || 0,
          tax_pct: itemGstPct,
          amount: itemTotal
        });
      }
    }

    await logAudit(userEmail, 'PO Created', `PO#${poNo} vendor:${vendorName} value:${totalVal}`, 'Procurement');
    
    try {
      const { NumberSeriesService } = await import('../../core/services/NumberSeriesService');
      const expectedNext = await NumberSeriesService.peekNextNumber('purchase_order');
      if (poNo === expectedNext) {
        await NumberSeriesService.getNextNumber('purchase_order', userEmail);
      }
    } catch (e) {
      console.error('Failed to consume number series:', e);
    }

    return { ok: true, poNo };
  }

  static async updatePO(poNo: string, payload: IPOInput, userEmail: string): Promise<{ ok: boolean, poNo: string }> {
    if (!poNo) throw new Error("PO Number missing");
    
    const originalPoNo = String(poNo).trim();
    const nextPoNo = String(payload.poNo || originalPoNo).trim();
    if (!nextPoNo) throw new Error('PO Number is required');

    const existing = await PORepository.findById(originalPoNo);
    if (!existing) throw new Error(`Purchase Order not found: ${originalPoNo}`);
    
    if (nextPoNo !== originalPoNo) {
      const duplicate = await PORepository.findById(nextPoNo);
      if (duplicate) throw new Error(`PO Number "${nextPoNo}" already exists.`);
    }

    const st = String(existing.approval_status || existing.status || 'Draft').toLowerCase();
    if (st === 'pending approval' || st === 'pending_approval') {
      throw new Error(`Cannot edit a PO that is Pending Approval. Withdraw or wait for approval decision first.`);
    }

    let totalVal = payload.grandTotal || payload.poValue || 0;
    let gstTotal = Number(payload.gst_total || payload.gstTotal) || 0;
    
    if (!totalVal && payload.items && payload.items.length) {
      let subt = 0;
      let gstSum = 0;
      payload.items.forEach(item => {
        const q = Number(item.qty || item.quantity) || 0;
        const r = Number(item.rate) || 0;
        const tPct = Number(item.tax_pct || item.gstPct || item.tax || 0);
        const gross = q * r;
        const gstAmt = Math.round(gross * tPct / 100);
        subt += gross;
        gstSum += gstAmt;
      });
      gstTotal = gstSum;
      const tdsPct = Number(payload.tds_pct || payload.tdsPct || 0);
      const tdsAmt = Math.round(subt * tdsPct / 100);
      totalVal = subt + gstSum - tdsAmt;
    }

    // Financial edit logic - reset status if financial fields change and not Draft
    let newStatus = existing.status;
    let newApprovalStatus = existing.approval_status;
    const oldVal = Number(existing.po_value || 0);
    const hasFinancialEdit = (totalVal !== oldVal) || 
                             (existing.vendor_key !== (payload.vendorCode || payload.vendor_key));

    if (hasFinancialEdit && (st === 'approved' || st === 'active')) {
      newStatus = 'Draft';
      newApprovalStatus = 'Draft';
      await logAudit(userEmail, 'PO Reset to Draft', `PO#${originalPoNo} value changed from ${oldVal} to ${totalVal}`, 'Procurement');
    }

    await PORepository.update(originalPoNo, {
      po_no: nextPoNo,
      vendor_key: payload.vendorCode || payload.vendor_key || existing.vendor_key,
      vendor_name: payload.vendorName || payload.vendor || existing.vendor_name,
      project: payload.project || existing.project,
      po_value: totalVal,
      revised_po_value: totalVal,
      approval_status: newApprovalStatus,
      status: newStatus,
      po_date: payload.poDate || existing.po_date,
      terms: payload.terms !== undefined ? payload.terms : existing.terms,
      tds_section: payload.tds_section || payload.tdsSection !== undefined ? payload.tdsSection : existing.tds_section,
      tds_pct: Number(payload.tds_pct || payload.tdsPct !== undefined ? payload.tdsPct : existing.tds_pct),
      tds_amount: Number(payload.tds_amount !== undefined ? payload.tds_amount : existing.tds_amount),
      gst_total: gstTotal,
      gst_mode: payload.gst_mode || payload.gstMode || existing.gst_mode,
      category: payload.category || existing.category,
      notes: payload.notes !== undefined ? payload.notes : existing.notes,
      expected_delivery_date: payload.expectedDeliveryDate || existing.expected_delivery_date
    });

    if (payload.items && payload.items.length) {
      // Re-create items to simplify updates
      await PORepository.deleteItemsByPoNo(originalPoNo);
      
      for (const item of payload.items) {
        const itemGstPct = Number(item.tax_pct || item.gstPct || item.tax || 0);
        const itemQty = Number(item.qty || item.quantity || 0);
        const itemRate = Number(item.rate || 0);
        const itemGross = itemQty * itemRate;
        const itemGstAmt = item.gst_amount !== undefined ? Number(item.gst_amount) : Math.round(itemGross * itemGstPct / 100);
        const itemTotal = item.amount !== undefined ? Number(item.amount) : (itemGross + itemGstAmt);
        
        await PORepository.createItem({
          po_no: nextPoNo,
          description: item.description || item.desc || '',
          hsn_sac: item.hsn_sac || item.hsn || '',
          qty: itemQty,
          unit: item.unit || item.uom || 'Nos',
          rate: itemRate,
          disc_pct: item.disc_pct || item.disc || item.discount || 0,
          tax_pct: itemGstPct,
          amount: itemTotal
        });
      }
    }

    await logAudit(userEmail, 'PO Updated', `PO#${originalPoNo} edited`, 'Procurement');
    return { ok: true, poNo: nextPoNo };
  }
}
