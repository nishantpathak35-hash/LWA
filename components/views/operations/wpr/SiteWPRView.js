import React, { useState } from 'react';
import { HardHat, LayoutDashboard, FilePlus, History, Calendar } from 'lucide-react';
import { Card, CardContent } from '../../../ui/core';

// Sub-components
import WPRDashboard from './WPRDashboard';
import WPRForm from './WPRForm';
import WPRHistory from './WPRHistory';
import WPRSchedules from './WPRSchedules';
import WPRDetailView from './WPRDetailView';

export default function SiteWPRView() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewWPR, setViewWPR] = useState(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new', label: 'Generate WPR', icon: FilePlus },
    { id: 'history', label: 'WPR History', icon: History },
    { id: 'schedules', label: 'Project Schedules', icon: Calendar },
  ];

  const handleView = (wpr) => {
    setViewWPR(wpr);
    setActiveTab('view');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <HardHat className="w-6 h-6 text-gold" />
            Site WPR (Weekly Progress Report)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Operations &gt; Weekly Progress Reports
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      {activeTab !== 'view' && (
        <div className="flex overflow-x-auto hide-scrollbar gap-2 border-b border-slate-800 pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                  ${isActive 
                    ? 'border-gold text-gold bg-gold/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'}
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'dashboard' && <WPRDashboard onNavigate={setActiveTab} />}
        {activeTab === 'new' && <WPRForm onNavigate={setActiveTab} />}
        {activeTab === 'history' && <WPRHistory onNavigate={setActiveTab} onView={handleView} />}
        {activeTab === 'schedules' && <WPRSchedules />}
        {activeTab === 'view' && <WPRDetailView wpr={viewWPR} onNavigate={setActiveTab} />}
      </div>
    </div>
  );
}
