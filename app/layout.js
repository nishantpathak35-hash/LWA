import './globals.css';
import Link from 'next/link';
import { Home, Users, FileText, Settings, Bell, Search } from 'lucide-react';

export const metadata = {
  title: 'LuxeWorx Ledger',
  description: 'Premium payment and vendor management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="text-gradient" style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                LUXEWORX
              </div>
              <div className="text-muted" style={{ fontSize: '11px', letterSpacing: '0.1em', marginTop: '4px' }}>
                ATELIER LEDGER
              </div>
            </div>
            
            <nav style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/" className="sidebar-link">
                <Home size={18} /> Dashboard
              </Link>
              <Link href="/vendors" className="sidebar-link">
                <Users size={18} /> Vendors
              </Link>
              <Link href="/pos" className="sidebar-link">
                <FileText size={18} /> PO Ledger
              </Link>
              <Link href="/prs" className="sidebar-link">
                <FileText size={18} /> Payments
              </Link>
            </nav>
            
            <div style={{ marginTop: 'auto', padding: '24px' }}>
              <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>System Active</div>
                <div className="badge badge-success">Online</div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            {/* Topbar */}
            <header className="topbar">
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '1200px', margin: '0 auto', gap: '24px' }}>
                <div style={{ position: 'relative', width: '320px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" placeholder="Search POs, Vendors..." className="input-field" style={{ paddingLeft: '36px', background: 'rgba(255,255,255,0.05)' }} />
                </div>
                
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <button className="btn btn-outline" style={{ padding: '8px', borderRadius: '50%' }}>
                    <Bell size={18} />
                  </button>
                  <button className="btn btn-outline" style={{ padding: '8px', borderRadius: '50%' }}>
                    <Settings size={18} />
                  </button>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))' }}></div>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
