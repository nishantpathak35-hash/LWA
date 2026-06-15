import { supabase } from '../../api/db';
import { Search, Plus, Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function VendorsPage() {
  const { data: vendors } = await supabase.from('vendors').select('*');
  const { data: pos } = await supabase.from('purchase_orders').select('*');
  const { data: prs } = await supabase.from('payment_requests').select('*');
  const { data: sys } = await supabase.from('system_payments').select('*');

  // Map system payments
  const sysPaidMap = {};
  (sys || []).forEach(s => {
    sysPaidMap[s.po_no] = (sysPaidMap[s.po_no] || 0) + (Number(s.amount) || 0);
  });

  // Map PRs per PO
  const poPrMap = {};
  (prs || []).forEach(pr => {
    if (!poPrMap[pr.po_no]) {
      poPrMap[pr.po_no] = { remitted: 0, pending: 0 };
    }
    const isRemitted = String(pr.remittance || '').toLowerCase().includes('remitted');
    const amt = Number(pr.amount_requested) || 0;
    if (isRemitted) poPrMap[pr.po_no].remitted += amt;
    else poPrMap[pr.po_no].pending += amt;
  });

  // Aggregate by Vendor
  const summaryMap = {};
  
  (vendors || []).forEach(v => {
    summaryMap[v.vendor_code || v.legal_name] = {
      vendor: v.legal_name,
      code: v.vendor_code,
      poCount: 0,
      totalPOValue: 0,
      totalPaid: 0,
      totalPayable: 0,
    };
  });

  (pos || []).forEach(po => {
    const vKey = po.vendor_key || po.vendor_name;
    if (!summaryMap[vKey]) {
      summaryMap[vKey] = { vendor: po.vendor_name, poCount:0, totalPOValue:0, totalPaid:0, totalPayable:0 };
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
  });

  const result = Object.values(summaryMap);
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '32px', color: 'var(--text-main)', marginBottom: '8px' }}>Vendors</h1>
          <p className="text-muted">Manage your vendors and view payment health.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline"><Download size={16} /> Export CSV</button>
          <button className="btn btn-primary"><Plus size={16} /> New Vendor</button>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '24px' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search vendors..." className="input-field" style={{ paddingLeft: '36px', background: 'rgba(0,0,0,0.2)' }} />
          </div>
          <div className="text-muted" style={{ fontSize: '12px', fontWeight: '500' }}>
            Showing {result.length} vendors
          </div>
        </div>

        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Code</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>POs</th>
                <th style={{ textAlign: 'right' }}>Paid %</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Payable</th>
              </tr>
            </thead>
            <tbody>
              {result.map((v, idx) => {
                const ratio = v.totalPOValue > 0 ? (v.totalPaid / v.totalPOValue) : 0;
                const pct = Math.round(ratio * 100);
                
                let statusBadge;
                if (v.totalPayable <= 0.01 || ratio >= 0.999) {
                  statusBadge = <span className="badge badge-success">Paid</span>;
                } else if (v.totalPaid > 0.01) {
                  statusBadge = <span className="badge badge-warning">Partial</span>;
                } else {
                  statusBadge = <span className="badge badge-info">Pending</span>;
                }

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: '500', color: 'var(--text-main)' }}>{v.vendor}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{v.code || 'N/A'}</td>
                    <td>{statusBadge}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{v.poCount}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600' }}>{pct}%</div>
                        <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(v.totalPaid)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: v.totalPayable > 0 ? 'var(--accent-warning)' : 'var(--text-muted)' }}>{formatCurrency(v.totalPayable)}</td>
                  </tr>
                );
              })}
              {result.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No vendors found. Please ensure data is loaded into the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
