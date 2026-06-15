const { supabase } = require('./db');

module.exports = async (req, res) => {
  try {
    const { data: pos, error } = await supabase.from('purchase_orders').select('*');
    if (error) throw error;
    
    let totalPoValue = 0;
    pos.forEach(p => { totalPoValue += (Number(p.po_value) || 0); });

    res.status(200).json({
      kpis: {
        totalPOValue: totalPoValue,
        totalCertified: 0,
        totalPaid: 0,
        totalPending: 0
      },
      projects: [],
      approvalQueue: [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
