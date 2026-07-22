'use client';

import React, { useState, useEffect } from 'react';
import { useAppState } from './StateProvider';
import { isSuperAdmin } from '../app/lib/config';
import BrandIdentity from './BrandIdentity';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Receipt, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut,
  UserCircle,
  Repeat,
  HardHat,
  Package,
  Wallet,
  ChevronDown
} from 'lucide-react';
import { Badge } from './ui/core';

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, activeView, setActiveView, logout, payments, hasPermission, activeRole, setActiveRole } = useAppState();

  const dbRoles = user?.roles || [];
  const isSuper = user && isSuperAdmin(user.email);
  
  // If Super Admin is impersonating, use only the active role for the UI
  const roles = isSuper 
    ? (activeRole ? [activeRole] : (!dbRoles.includes('admin') ? [...dbRoles, 'admin'] : dbRoles))
    : dbRoles;
  
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
    { id: 'pos', label: 'Purchase Orders', icon: Receipt, feature: 'purchase_orders' },
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
    if (isAdmin || isDirector) {
      if (item.roles) return item.roles.some(r => roles.includes(r));
      return true;
    }
    if (item.roles && !item.roles.some(r => roles.includes(r))) return false;
    if (item.feature && !hasPermission(item.feature)) return false;
    return true;
  });

  // Group Configurations
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

  const allowMultipleExpanded = false;
  const [expandedGroups, setExpandedGroups] = useState({});

  // Auto-expand group of the active route
  useEffect(() => {
    const activeGroup = GROUPS.find(g => 
      g.items.some(itemId => filteredMenuItems.some(i => i.id === itemId && i.id === activeView))
    );
    if (activeGroup) {
      setExpandedGroups(prev => {
        if (allowMultipleExpanded) {
          return { ...prev, [activeGroup.id]: true };
        } else {
          return { [activeGroup.id]: true };
        }
      });
    }
  }, [activeView]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const isExpanded = !!prev[groupId];
      if (allowMultipleExpanded) {
        return { ...prev, [groupId]: !isExpanded };
      } else {
        return { [groupId]: !isExpanded };
      }
    });
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

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 dark:bg-slate-950 text-slate-300 border-r border-slate-800 p-5 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 md:static md:h-screen shadow-md select-none
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Scrollable Navigation Wrapper */}
      <div className="flex flex-col flex-1 min-h-0 space-y-5 overflow-hidden">
        {/* Branding (Fixed Top) */}
        <BrandIdentity
          title="LUXEWORX ATELIER INTERIOR PRIVATE LIMITED"
          subtitle="Payment Tracking System"
          size="md"
          wrapTitle
          titleClassName="text-[11px] text-slate-100 font-semibold"
          subtitleClassName="text-[9px] text-slate-400"
        />

        {/* User Card (Fixed Top) */}
        {user && (
          <div className="p-3 bg-slate-800/70 border border-slate-700/60 rounded-xl flex items-center gap-3 shadow-xs">
            <UserCircle className="w-9 h-9 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-100 truncate">{user.name || user.email}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">
                  {roles[0] || 'Member'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Groups (Scrollable Middle) */}
        <nav className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {GROUPS.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = !!expandedGroups[group.id];
            
            // Filter items in this group that the user has permission to see
            const visibleItems = group.items
              .map(itemId => filteredMenuItems.find(i => i.id === itemId))
              .filter(Boolean);

            if (visibleItems.length === 0) return null;

            const groupBadgeCount = getGroupBadgeCount(group);

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Header Button */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`nav-group-${group.id}`}
                  className="w-full flex items-center justify-between py-1.5 px-1 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none group/header"
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="w-3.5 h-3.5 text-slate-400 group-hover/header:text-slate-300" />
                    <span className="text-[11px] font-bold tracking-wider text-left uppercase text-slate-400">
                      {group.label}
                    </span>
                    {!isExpanded && groupBadgeCount > 0 && (
                      <Badge variant="pending" className="px-1.5 py-0.5 text-[9px] font-bold scale-90">
                        {groupBadgeCount}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Sub-Items Container with smooth height transition */}
                <div
                  id={`nav-group-${group.id}`}
                  className={`overflow-hidden transition-all duration-200 ease-in-out pl-3.5 border-l border-slate-800 ml-2 space-y-1 ${
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
                          w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all focus:outline-none relative group
                          ${isActive 
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold shadow-xs' 
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                          }
                        `}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-sm bg-amber-500" />
                        )}
                        
                        <div className="flex items-center gap-2.5">
                          <ItemIcon className={`w-4 h-4 transition-transform group-hover:scale-105 ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                          <span>{item.label}</span>
                        </div>

                        {item.badge && (
                          <Badge variant={isActive ? 'pending' : 'default'} className="ml-2 font-semibold scale-90">
                            {item.badge}
                          </Badge>
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

      {/* Footer Area (Fixed Bottom) */}
      <div className="mt-5 pt-3 border-t border-slate-800 space-y-3">
        {/* Relocated Role Switcher for Super Admin */}
        {user && isSuperAdmin(user.email) && (
          <div className="p-2.5 bg-violet-950/40 border border-violet-800/50 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] text-violet-300 font-bold uppercase tracking-wider">
              <Repeat className="w-3 h-3" />
              Role Impersonation
            </div>
            <select
              value={activeRole || ''}
              onChange={(e) => setActiveRole(e.target.value || null)}
              className="w-full text-[11px] bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500/40 cursor-pointer"
            >
              <option value="">Super Admin (Full Access)</option>
              <option value="procurement">Procurement</option>
              <option value="finance">Finance</option>
              <option value="director">Director</option>
              <option value="accountant">Accountant</option>
            </select>
            {activeRole && (
              <div className="text-[9px] text-amber-300 flex items-center gap-1 font-medium">
                ⚡ Viewing as: <span className="font-semibold capitalize">{activeRole}</span>
              </div>
            )}
          </div>
        )}

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-all focus:outline-none"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
