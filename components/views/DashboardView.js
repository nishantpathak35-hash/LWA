'use client';

import React from 'react';
import { useAppState } from '../StateProvider';
import { Card, CardContent } from '../ui/core';
import { formatCurrency } from '../../app/lib/utils';
import { 
  FileText, 
  Coins, 
  Clock, 
  Hourglass,
  PlusCircle,
  TrendingUp,
  Activity
} from 'lucide-react';

export default function DashboardView() {
  const { kpis, user, setActiveView } = useAppState();

  const posCount = kpis?.pos || 0;
  const prsCount = kpis?.prs || 0;
  const totalPO = kpis?.totalPOValue || 0;
  const totalPaid = kpis?.totalPaid || 0;
  const pendingRemit = kpis?.pendingRemit || 0;
  const pendingApproval = kpis?.pendingApproval || 0;

  const roles = user?.roles || [];
  const isProcurement = roles.includes('procurement') || roles.includes('maker');
  const isAdmin = roles.includes('admin');

  // Stats definition for rendering
  const stats = [
    {
      title: 'Total Purchase Orders',
      value: formatCurrency(totalPO),
      sub: `${posCount} Active POs`,
      icon: FileText,
      color: 'text-sky-400 bg-sky-500/10'
    },
    {
      title: 'Total Paid Outflow',
      value: formatCurrency(totalPaid),
      sub: 'Zoho matched transactions',
      icon: Coins,
      color: 'text-emerald-400 bg-emerald-500/10'
    },
    {
      title: 'Pending Remittance',
      value: formatCurrency(pendingRemit),
      sub: 'Approved by Director',
      icon: Clock,
      color: 'text-amber-400 bg-amber-500/10'
    },
    {
      title: 'Pending Approval',
      value: formatCurrency(pendingApproval),
      sub: `${prsCount} requests in workflow`,
      icon: Hourglass,
      color: 'text-pink-400 bg-pink-500/10'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-gradient-to-r from-slate-900/60 to-slate-950/20 border border-slate-900 rounded-xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-gold/5 rounded-full blur-[80px]" />
        
        <div>
          <h2 className="text-2xl font-light tracking-tight text-slate-100 font-serif">
            Welcome back, <span className="font-normal text-gold">{user?.name || user?.email}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-light">
            Here's an overview of Luxeworx's finance and payment tracking operations.
          </p>
        </div>

        {(isProcurement || isAdmin) && (
          <div className="flex gap-3">
            <button
              onClick={() => setActiveView('pos')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-600 hover:to-gold active:from-yellow-700 text-slate-950 font-medium text-xs rounded-lg shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              New Purchase Order
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="relative group hover:border-gold/20 transition-all hover:-translate-y-0.5">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.title}</p>
                    <h3 className="text-2xl font-light text-slate-100 mt-3 font-serif truncate">{stat.value}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">{stat.sub}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${stat.color} transition-transform group-hover:scale-105`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Visual Progress / Quick Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Health Card */}
        <Card className="col-span-1 lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gold/10 text-gold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="text-md font-light text-slate-100 font-serif">Capital Utilization</h4>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">Paid outflow vs. Total Committed POs</span>
                  <span className="text-slate-200 font-medium">
                    {totalPO > 0 ? Math.round((totalPaid / totalPO) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-gold to-yellow-600 rounded-full transition-all duration-500" 
                    style={{ width: `${totalPO > 0 ? Math.min((totalPaid / totalPO) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-900/60 text-center">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Committed</p>
                  <p className="text-sm font-medium text-slate-300 mt-1">{formatCurrency(totalPO)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Remitted</p>
                  <p className="text-sm font-medium text-slate-300 mt-1">{formatCurrency(totalPaid)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Unspent Balance</p>
                  <p className="text-sm font-medium text-slate-300 mt-1">{formatCurrency(Math.max(totalPO - totalPaid, 0))}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Activity Card */}
        <Card className="col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gold/10 text-gold">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-md font-light text-slate-100 font-serif">Quick Stats</h4>
            </div>

            <div className="space-y-4 text-sm font-light">
              <div className="flex justify-between py-2 border-b border-slate-900/60">
                <span className="text-slate-450">Active Users</span>
                <span className="text-slate-200">5 Registered</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-900/60">
                <span className="text-slate-450">System Logs</span>
                <span className="text-slate-200">Automated Audit Trails</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-450">Email Notifications</span>
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  Active (Brevo)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
