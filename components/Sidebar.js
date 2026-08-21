'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from './StateProvider';
import { isSuperAdmin } from '../app/lib/config';
import BrandIdentity from './BrandIdentity';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  ScrollText, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut,
  Repeat,
  HardHat,
  Package,
  Wallet,
  ChevronDown,
  Sparkles,
  Receipt
} from 'lucide-react';
import { Badge } from './ui/core';

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, activeView, setActiveView, logout, payments, hasPermission, activeRole, setActiveRole } = useAppState();

  const dbRoles = user?.roles || [];
  const isSuper = user && isSuperAdmin(user.email);
  
  // If Super Admin is impersonating, use activeRole; otherwise grant full admin & director privileges
  const roles = isSuper 
    ? (activeRole ? [activeRole] : Array.from(new Set([...dbRoles, 'admin', 'director', 'finance', 'procurement'])))
    : (dbRoles.length > 0 ? dbRoles : ['admin']);
  
  const isAdmin = roles.includes('admin');
  const isDirector = roles.includes('director');
  const isFinance = roles.includes('finance');
  const isProcurement = roles.some(role => ['proc', 'procurement', 'maker'].includes(role));

  // Compute pending counts
  const pendingPaymentsCount = payments.filter(p => {
    const stage = String(p.stage || p.approval_stage || '').toLowerCase().trim();
    const remittance = String(p.remittance || '').toLowerCase();
    if (remittance.includes('remit') || stage.includes('remit')) return false;
    if (stage.includes('reject') || stage.includes('cancel')) return false;
    if (!stage.includes('pending') && !stage.includes('procurement') && !stage.includes('finance') && !stage.includes('director') && !stage.includes('ready')) return false;
    if (isProcurement && (stage.includes('proc') || stage.includes('procurement') || stage === 'pending')) return true;
    if (isFinance && (stage.includes('finance') || stage.includes('pending finance'))) return true;
    if (isDirector && (stage.includes('director') || stage.includes('ready to remit'))) return true;
    if (isAdmin) return true;
    return false;
  }).length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, feature: 'dashboard' },
    { id: 'projects', label: 'Projects', icon: FolderKanban, feature: 'projects' },
    { id: 'vendors', label: 'Vendors', icon: Users, feature: 'vendors' },
    { id: 'pos', label: 'Purchase Orders', icon: ScrollText, feature: 'purchase_orders' },
    { id: 'invoices', label: 'Invoices', icon: Receipt, feature: 'payments' },
    { id: 'site_dpr', label: 'Site DPR', icon: HardHat, feature: 'operations' },
    { id: 'site_wpr', label: 'Site WPR', icon: HardHat, feature: 'operations' },
    { 
      id: 'payments', 
      label: 'Payments', 
      icon: CreditCard,
      feature: 'payments',
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null 
    },
    { id: 'reports', label: 'Reports', icon: BarChart3, feature: 'reports' },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'director'], feature: 'settings' }
  ];

  const handleNavClick = (viewId) => {
    setActiveView(viewId);
    if (setMobileOpen) setMobileOpen(false);
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (isSuper || isAdmin || isDirector || !user) return true;
    if (item.roles && item.roles.length > 0 && !item.roles.some(r => roles.includes(r))) return false;
    if (item.feature && hasPermission && !hasPermission(item.feature)) return false;
    return true;
  });

  const GROUPS = [
    {
      id: 'procurement',
      label: 'PROCUREMENT',
      icon: Package,
      items: ['projects', 'vendors', 'pos']
    },
    {
      id: 'finance',
      label: 'FINANCE',
      icon: Wallet,
      items: ['dashboard', 'invoices', 'payments']
    },
    {
      id: 'site_ops',
      label: 'SITE OPS',
      icon: HardHat,
      items: ['site_dpr', 'site_wpr']
    },
    {
      id: 'admin',
      label: 'ADMIN',
      icon: Settings,
      items: ['reports', 'settings']
    }
  ];

  const [expandedGroups, setExpandedGroups] = useState({
    procurement: true,
    finance: true,
    site_ops: true,
    admin: true
  });

  useEffect(() => {
    const activeGroup = GROUPS.find(g => 
      g.items.some(itemId => filteredMenuItems.some(i => i.id === itemId && i.id === activeView))
    );
    if (activeGroup) {
      setExpandedGroups(prev => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [activeView]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const getGroupBadgeCount = (group) => {
    return group.items.reduce((acc, itemId) => {
      const item = filteredMenuItems.find(i => i.id === itemId);
      if (item && item.badge) {
        return acc + (parseInt(item.badge) || 0);
      }
      return acc;
    }, 0);
  };

  const getUserInitials = (nameOrEmail) => {
    if (!nameOrEmail) return 'U';
    const clean = String(nameOrEmail).replace(/@.*/, '').trim();
    const parts = clean.split(/[\s._-]+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-60 bg-slate-950 text-slate-300 border-r border-slate-800/80 p-3.5 flex flex-col justify-between transition-transform duration-200 md:translate-x-0 md:static md:h-screen select-none
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Scrollable Navigation Wrapper */}
      <div className="flex flex-col flex-1 min-h-0 space-y-3 overflow-hidden">
        
        {/* Brand Header */}
        <div className="px-3 py-2 bg-slate-900/40 border border-slate-800/80 rounded-xl">
          <BrandIdentity
            title="LWA PTS"
            subtitle="LUXEWORX ATELIER"
            size="sm"
            showDivider={true}
          />
        </div>

        {/* User Card */}
        {user && (
          <div className="px-3 py-2 bg-slate-900/30 border border-slate-800/60 rounded-lg flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 flex items-center justify-center text-[11px] shrink-0">
              {getUserInitials(user.name || user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name || user.email}</p>
              <p className="text-[10px] text-slate-400 font-medium capitalize truncate">
                {roles[0] || 'Member'}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Accordion Menu */}
        <nav className="flex-1 overflow-y-auto min-h-0 space-y-3 custom-scrollbar pr-0.5">
          {GROUPS.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = !!expandedGroups[group.id];
            
            const visibleItems = group.items
              .map(itemId => filteredMenuItems.find(i => i.id === itemId))
              .filter(Boolean);

            if (visibleItems.length === 0) return null;

            const groupBadgeCount = getGroupBadgeCount(group);
            const hasActiveChild = visibleItems.some(i => i.id === activeView);

            return (
              <div key={group.id} className="space-y-0.5">
                {/* Group Header Button */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between py-1 px-2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none rounded-md hover:bg-slate-900/30 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className={`w-3.5 h-3.5 ${hasActiveChild ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className={`text-[10px] font-medium tracking-wider uppercase ${hasActiveChild ? 'text-slate-200' : 'text-slate-400'}`}>
                      {group.label}
                    </span>
                    {!isExpanded && groupBadgeCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[9px] font-medium rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {groupBadgeCount}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Sub-Items Container */}
                <div
                  id={`nav-group-${group.id}`}
                  className={`overflow-hidden transition-all duration-150 ease-in-out pl-2 border-l border-slate-800/60 ml-2.5 space-y-0.5 ${
                    isExpanded ? 'max-h-96 opacity-100 py-1' : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  {visibleItems.map(item => {
                    const ItemIcon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`
                          w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150 focus:outline-none cursor-pointer
                          ${isActive 
                            ? 'bg-slate-800/80 text-slate-100 font-medium border-l-2 border-amber-500 pl-2' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <ItemIcon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>

                        {item.badge && (
                          <span className={`px-1.5 py-0.2 text-[10px] font-medium rounded ${isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer Area */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/60 space-y-2">
        {/* Role Switcher for Super Admin */}
        {user && isSuperAdmin(user.email) && (
          <div className="p-2 bg-slate-900/40 border border-slate-800/60 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              <Repeat className="w-3 h-3 text-slate-400" />
              Role Impersonation
            </div>
            <select
              value={activeRole || ''}
              onChange={(e) => setActiveRole(e.target.value || null)}
              className="w-full text-[11px] bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1 focus:outline-none focus:border-slate-700 cursor-pointer"
            >
              <option value="">Super Admin (Full Access)</option>
              <option value="procurement">Procurement</option>
              <option value="finance">Finance</option>
              <option value="director">Director</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>
        )}

        {/* Install App Button */}
        <button
          type="button"
          onClick={() => {
            if (setMobileOpen) setMobileOpen(false);
            window.dispatchEvent(new CustomEvent('lx:open-install-pwa'));
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 text-gold hover:bg-amber-500/20 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
            <span>Install Mobile App</span>
          </div>
          <span className="text-[9px] bg-amber-500/20 text-gold px-1.5 py-0.5 rounded font-mono font-bold">PWA</span>
        </button>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
