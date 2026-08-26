const { supabase } = require('./db');

module.exports = async (req, res) => {
  try {
    // 1. Fetch all vendors
    const { data: vendors, error: vErr } = await supabase.from('vendors').select('*');
    if (vErr) throw vErr;

    // 2. Fetch all POs
    const { data: pos, error: pErr } = await supabase.from('purchase_orders').select('*');
    if (pErr) throw pErr;

    // 3. Fetch aggregated PRs per PO
    const { data: prs, error: prErr } = await supabase.from('payment_requests').select('*');
    if (prErr) throw prErr;

    // 4. Fetch System Payments
    const { data: sys, error: sysErr } = await supabase.from('system_payments').select('*');
    if (sysErr) throw sysErr;

    // Map system payments
    const sysPaidMap = {};
    sys.forEach(s => {
      sysPaidMap[s.po_no] = (sysPaidMap[s.po_no] || 0) + (Number(s.amount) || 0);
    });

    // Map PRs per PO
    const poPrMap = {};
    prs.forEach(pr => {
      if (!poPrMap[pr.po_no]) {
        poPrMap[pr.po_no] = { remitted: 0, pending: 0, rejected: 0 };
      }
      const isRemitted = String(pr.remittance || '').toLowerCase().includes('remitted');
      const amt = Number(pr.amount_requested) || 0;
      if (isRemitted) poPrMap[pr.po_no].remitted += amt;
      else poPrMap[pr.po_no].pending += amt;
    });

    // Aggregate by Vendor
    const summaryMap = {};
    
    // Initialize vendors
    vendors.forEach(v => {
      summaryMap[v.vendor_code || v.legal_name] = {
        vendor: v.legal_name,
        code: v.vendor_code,
        poCount: 0,
        totalPOValue: 0,
        totalPaid: 0,
        totalPayable: 0,
        sumRemitted: 0,
        sumPending: 0,
        pos: []
      };
    });

    // Assign POs to vendors
    pos.forEach(po => {
      const vKey = po.vendor_key || po.vendor_name;
      if (!summaryMap[vKey]) {
        summaryMap[vKey] = { vendor: po.vendor_name, poCount:0, totalPOValue:0, totalPaid:0, totalPayable:0, sumRemitted:0, sumPending:0, pos:[] };
      }
      
      const poPrs = poPrMap[po.po_no] || { remitted: 0, pending: 0 };
      const sPaid = sysPaidMap[po.po_no] || 0;
      const sysTotal = poPrs.remitted + sPaid;
      
      const finalPaid = Math.max(Number(po.legacy_paid) || 0, sysTotal);
      const val = Number(po.po_value) || 0;
      const payable = val - finalPaid;

      summaryMap[vKey].poCount += 1;
      summaryMap[vKey].totalPOValue += val;
      summaryMap[vKey].totalPaid += finalPaid;
      summaryMap[vKey].totalPayable += Math.max(0, payable);
      summaryMap[vKey].sumRemitted += sysTotal;
      summaryMap[vKey].sumPending += poPrs.pending;
      
      summaryMap[vKey].pos.push({
        poNo: po.po_no,
        value: val,
        paid: finalPaid,
        payable: Math.max(0, payable),
        status: po.status
      });
    });

    const result = Object.values(summaryMap);
    res.status(200).json(result);

  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: error.message });
  }
};
