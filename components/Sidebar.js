'use client';

import React from 'react';
import { useAppState } from './StateProvider';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Receipt, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut,
  UserCircle
} from 'lucide-react';
import { Badge } from './ui/core';

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, activeView, setActiveView, logout, payments } = useAppState();

  const roles = user?.roles || [];
  const isAdmin = roles.includes('admin');
  const isDirector = roles.includes('director');
  const isFinance = roles.includes('finance');
  const isProcurement = roles.includes('procurement') || roles.includes('maker');

  // Compute pending counts dynamically
  const pendingPaymentsCount = payments.filter(p => {
    const isPending = String(p.status || '').toLowerCase() === 'pending';
    if (!isPending) return false;
    const stage = String(p.approval_stage || p.stage || '').toLowerCase();
    
    if (isProcurement && stage.includes('proc')) return true;
    if (isFinance && stage.includes('finance')) return true;
    if (isDirector && stage.includes('director')) return true;
    return false;
  }).length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'vendors', label: 'Vendors', icon: Users },
    { id: 'pos', label: 'Purchase Orders', icon: Receipt },
    { 
      id: 'payments', 
      label: 'Payments', 
      icon: CreditCard,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null 
    },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'director'] }
  ];

  const handleNavClick = (viewId) => {
    setActiveView(viewId);
    if (setMobileOpen) setMobileOpen(false);
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (item.roles) {
      return item.roles.some(role => roles.includes(role));
    }
    return true;
  });

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-64 bg-slate-950/80 backdrop-blur-md border-r border-slate-900/60 p-6 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 md:static md:h-screen
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="space-y-8">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-gold to-yellow-600 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-gold/10">
            LW
          </div>
          <span className="font-semibold tracking-wider text-slate-200 text-sm">LUXEWORX</span>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl flex items-center gap-3">
            <UserCircle className="w-10 h-10 text-slate-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 truncate">{user.name || user.email}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  {roles[0] || 'Member'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-all focus:outline-none relative group
                  ${isActive 
                    ? 'bg-gold/10 border border-gold/10 text-gold font-medium' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                  }
                `}
              >
                {/* Gold left border indicator for active view */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-gold" />
                )}
                
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 ${isActive ? 'text-gold' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <Badge variant={isActive ? 'pending' : 'default'} className="ml-2 font-semibold">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Log out section */}
      <div className="pt-6 border-t border-slate-900/60">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-950/10 transition-all focus:outline-none"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
