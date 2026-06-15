const { supabase } = require('./db');

module.exports = async (req, res) => {
  try {
    const { data: pos, error } = await supabase.from('purchase_orders').select('*');
    if (error) throw error;
    
    // Return mapped POs
    const result = pos.map(p => ({
      poNo: p.po_no,
      vendor: p.vendor_name,
      value: p.po_value,
      poValue: p.po_value,
      project: p.project,
      status: p.status,
      poDate: p.po_date,
      revisedPOValue: p.revised_po_value,
      certifiedValue: p.certified_value,
      amountPaid: p.legacy_paid,
      legacyPaid: p.legacy_paid,
      systemPaid: 0,
      pendingPaid: 0,
      approvedPendingRemit: 0,
      advance: p.advance,
      finalPayables: p.final_payable
    }));
    
    res.status(200).json(JSON.stringify(result));
  } catch (error) {
    console.error(error);
    res.status(500).json(JSON.stringify([]));
  }
};
