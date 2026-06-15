import { supabase } from '../api/db';
import { ArrowUpRight, DollarSign, Activity, FileCheck, AlertCircle } from 'lucide-react';

// Force dynamic rendering to avoid static caching of DB queries
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const { data: pos } = await supabase.from('purchase_orders').select('*');
  const { data: prs } = await supabase.from('payment_requests').select('*');
  const { data: sys } = await supabase.from('system_payments').select('*');

  let totalPOValue = 0;
  let totalPaid = 0;
  let pendingRemit = 0;
  let pendingApproval = 0;

  // Calculate totals
  (pos || []).forEach(p => {
    totalPOValue += Number(p.po_value) || 0;
  });

  (sys || []).forEach(s => {
    totalPaid += Number(s.amount) || 0;
  });

  (prs || []).forEach(pr => {
    const isRemitted = String(pr.remittance || '').toLowerCase().includes('remitted');
    const amt = Number(pr.amount_requested) || 0;
    if (isRemitted) totalPaid += amt;
    else pendingApproval += amt;
  });

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '32px', color: 'var(--text-main)', marginBottom: '8px' }}>Command Center</h1>
          <p className="text-muted">Overview of LuxeWorx financial health and pending actions.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline">Export Report</button>
          <button className="btn btn-primary">+ New Payment Request</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginTop: '24px' }}>
        
        {/* KPI 1 */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
              <DollarSign size={24} />
            </div>
            <div className="badge badge-success">+12% this month</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total PO Value</div>
            <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>{formatCurrency(totalPOValue)}</div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: 'var(--accent-success)' }}>
              <Activity size={24} />
            </div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid</div>
            <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)', color: 'var(--accent-success)' }}>{formatCurrency(totalPaid)}</div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: 'var(--accent-warning)' }}>
              <AlertCircle size={24} />
            </div>
            <div className="badge badge-warning">{Math.ceil(pendingApproval/50000)} actions</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Approval</div>
            <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)', color: 'var(--accent-warning)' }}>{formatCurrency(pendingApproval)}</div>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Recent Activity</h2>
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Activity size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <p>Activity timeline will appear here.</p>
          </div>
        </div>
        
        <div className="glass-card">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="btn btn-outline" style={{ justifyContent: 'flex-start' }}><FileCheck size={16} /> Review Approvals</button>
            <button className="btn btn-outline" style={{ justifyContent: 'flex-start' }}><ArrowUpRight size={16} /> Generate PO</button>
          </div>
        </div>
      </div>
    </>
  );
}
