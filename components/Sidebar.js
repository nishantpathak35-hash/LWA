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
  Sparkles
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
      items: ['dashboard', 'payments']
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
      fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-slate-300 border-r border-slate-800/80 p-4 flex flex-col justify-between transition-all duration-300 md:translate-x-0 md:static md:h-screen shadow-2xl select-none backdrop-blur-xl
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Scrollable Navigation Wrapper */}
      <div className="flex flex-col flex-1 min-h-0 space-y-4 overflow-hidden">
        
        {/* Brand Header */}
        <div className="px-2.5 py-2.5 bg-gradient-to-br from-[#060b16] via-slate-950 to-[#0b1220] border border-[#d4af37]/40 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.6)]">
          <BrandIdentity
            title="LWA PTS"
            subtitle="LUXEWORX ATELIER"
            size="sm"
            showDivider={true}
          />
        </div>

        {/* User Card */}
        {user && (
          <div className="p-2.5 bg-slate-900/80 border border-slate-800/90 rounded-xl flex items-center gap-3 shadow-xs hover:border-slate-700/80 transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30 flex items-center justify-center text-xs shrink-0 shadow-xs">
              {getUserInitials(user.name || user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-100 truncate">{user.name || user.email}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  {roles[0] || 'Member'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Accordion Menu */}
        <nav className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3 custom-scrollbar">
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
              <div key={group.id} className="space-y-1">
                {/* Group Header Button */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between py-1.5 px-2.5 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none group/header rounded-lg hover:bg-slate-900/40 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className={`w-3.5 h-3.5 transition-colors ${hasActiveChild ? 'text-amber-400' : 'text-slate-500 group-hover/header:text-slate-300'}`} />
                    <span className={`text-[10px] font-extrabold tracking-widest uppercase ${hasActiveChild ? 'text-slate-200' : 'text-slate-400'}`}>
                      {group.label}
                    </span>
                    {!isExpanded && groupBadgeCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {groupBadgeCount}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Sub-Items Container */}
                <div
                  id={`nav-group-${group.id}`}
                  className={`overflow-hidden transition-all duration-200 ease-in-out pl-2 border-l border-slate-800/80 ml-3 space-y-1 ${
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
                          w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-200 focus:outline-none relative group/item cursor-pointer
                          ${isActive 
                            ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 text-amber-400 border border-amber-500/35 font-semibold shadow-[0_2px_12px_rgba(212,175,55,0.12)]' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-900/60 hover:scale-[1.02] active:scale-[0.98] border border-transparent'
                          }
                        `}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-md bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                        )}
                        
                        <div className="flex items-center gap-2.5">
                          <ItemIcon className={`w-4 h-4 transition-transform duration-200 group-hover/item:scale-110 ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover/item:text-slate-200'}`} />
                          <span>{item.label}</span>
                        </div>

                        {item.badge && (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
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
      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
        {/* Role Switcher for Super Admin */}
        {user && isSuperAdmin(user.email) && (
          <div className="p-2.5 bg-slate-900/70 border border-violet-500/30 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-violet-300 font-bold uppercase tracking-wider">
              <Repeat className="w-3 h-3 text-violet-400" />
              Role Impersonation
            </div>
            <select
              value={activeRole || ''}
              onChange={(e) => setActiveRole(e.target.value || null)}
              className="w-full text-[11px] bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all cursor-pointer"
            >
              <option value="">Super Admin (Full Access)</option>
              <option value="procurement">Procurement</option>
              <option value="finance">Finance</option>
              <option value="director">Director</option>
              <option value="accountant">Accountant</option>
            </select>
            {activeRole && (
              <div className="text-[9px] text-amber-300 flex items-center gap-1 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <Sparkles className="w-3 h-3 text-amber-400" /> Viewing as: <span className="font-semibold capitalize text-slate-100">{activeRole}</span>
              </div>
            )}
          </div>
        )}

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
