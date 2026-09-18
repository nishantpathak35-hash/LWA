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
  Receipt,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Badge } from './ui/core';

export default function Sidebar({ mobileOpen, setMobileOpen, collapsed = false, onToggleCollapse }) {
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
    { id: 'operations', label: 'Operations', items: ['dashboard', 'projects', 'vendors', 'pos'] },
    { id: 'finance', label: 'Finance', items: ['invoices', 'payments'] },
    { id: 'admin', label: 'Admin', items: ['reports', 'settings'] }
  ];

  const [expandedGroups, setExpandedGroups] = useState({
    operations: true,
    finance: true,
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

  const getUserInitials = (nameOrEmail) => {
    if (!nameOrEmail) return 'U';
    const clean = String(nameOrEmail).replace(/@.*/, '').trim();
    const parts = clean.split(/[\s._-]+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 bg-sidebar text-sidebar-foreground border-r border-border flex flex-col justify-between select-none
      transition-all duration-200 ease-out
      ${mobileOpen ? 'translate-x-0 w-56 p-3' : '-translate-x-full md:translate-x-0'}
      ${collapsed ? 'md:w-14 md:p-2' : 'md:w-56 md:p-3'}
      md:static md:h-screen
    `}>
      {/* Navigation Wrapper */}
      <div className="flex flex-col flex-1 min-h-0 space-y-3 overflow-hidden">
        
        {/* Brand Header */}
        <div className={`flex items-center ${collapsed ? 'justify-center py-1' : 'justify-between'}`}>
          {collapsed ? (
            <button 
              onClick={onToggleCollapse}
              title="Expand Sidebar (Ctrl+B)"
              className="focus:outline-none cursor-pointer"
            >
              <BrandIdentity title="" subtitle="" size="sm" showDivider={false} className="justify-center" />
            </button>
          ) : (
            <>
              <BrandIdentity title="LWA PTS" subtitle="LUXEWORX ATELIER" size="sm" showDivider={true} />
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  title="Collapse Sidebar (Ctrl+B)"
                  className="hidden md:flex p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* User Card */}
        {user && (
          <div className={`flex items-center ${collapsed ? 'justify-center py-1' : 'gap-2.5 py-1.5'}`}
            title={`${user.name || user.email} (${roles[0] || 'Member'})`}
          >
            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary font-medium flex items-center justify-center text-[11px] shrink-0">
              {getUserInitials(user.name || user.email)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{user.name || user.email}</p>
                <p className="text-[11px] text-muted-foreground capitalize truncate">
                  {roles[0] || 'Member'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Separator */}
        <div className="h-px bg-border" />

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-0.5">
          {collapsed ? (
            /* Collapsed Icon Rail */
            <div className="space-y-1 flex flex-col items-center">
              {filteredMenuItems.map(item => {
                const ItemIcon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    title={item.label}
                    className={`
                      relative w-9 h-9 rounded-md flex items-center justify-center transition-colors cursor-pointer
                      ${isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }
                    `}
                  >
                    <ItemIcon className="w-4 h-4" />
                    {item.badge && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Expanded Menu with Groups */
            GROUPS.map((group) => {
              const isExpanded = !!expandedGroups[group.id];
              
              const visibleItems = group.items
                .map(itemId => filteredMenuItems.find(i => i.id === itemId))
                .filter(Boolean);

              if (visibleItems.length === 0) return null;

              const hasActiveChild = visibleItems.some(i => i.id === activeView);

              return (
                <div key={group.id} className="space-y-0.5">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between py-1.5 px-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none rounded-md cursor-pointer"
                  >
                    <span className={`text-[11px] font-medium tracking-wide ${hasActiveChild ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {group.label}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Sub-Items */}
                  <div
                    className={`overflow-hidden transition-all duration-150 ease-out space-y-0.5 ${
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
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
                            w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer
                            ${isActive 
                              ? 'bg-primary/10 text-primary font-medium' 
                              : 'text-sidebar-foreground hover:text-foreground hover:bg-muted/50'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2.5">
                            <ItemIcon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : ''}`} />
                            <span>{item.label}</span>
                          </div>

                          {item.badge && (
                            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </nav>
      </div>

      {/* Footer Area */}
      <div className={`mt-2 pt-2 border-t border-border space-y-1.5 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {/* Role Switcher for Super Admin */}
        {user && isSuperAdmin(user.email) && (
          collapsed ? (
            <button
              onClick={() => {
                const rolesList = ['', 'procurement', 'finance', 'director', 'accountant'];
                const nextIdx = (rolesList.indexOf(activeRole || '') + 1) % rolesList.length;
                setActiveRole(rolesList[nextIdx] || null);
              }}
              title={`Switch Role (Current: ${activeRole || 'Super Admin'})`}
              className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
            </button>
          ) : (
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium px-2">Role</span>
              <select
                value={activeRole || ''}
                onChange={(e) => setActiveRole(e.target.value || null)}
                className="w-full text-[11px] bg-background border border-border text-foreground rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring/30 cursor-pointer"
              >
                <option value="">Super Admin</option>
                <option value="procurement">Procurement</option>
                <option value="finance">Finance</option>
                <option value="director">Director</option>
                <option value="accountant">Accountant</option>
              </select>
            </div>
          )
        )}

        {/* Sign Out */}
        {collapsed ? (
          <button
            onClick={logout}
            title="Sign out"
            className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        )}

        {/* Collapse toggle */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className={`
              hidden md:flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer
              ${collapsed ? 'w-9 h-8' : 'w-full py-1 text-[11px] gap-1.5'}
            `}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
