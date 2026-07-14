import React, { useState } from 'react';
import { HardHat, LayoutDashboard, FilePlus, History, FileText, Settings } from 'lucide-react';
import { Card, CardContent } from '../../../ui/core';

// Sub-components
import DPRDashboard from './DPRDashboard';
import DPRForm from './DPRForm';
import DPRHistory from './DPRHistory';
import DPRTemplates from './DPRTemplates';
import DPRSettings from './DPRSettings';
import DPRDetailView from './DPRDetailView';

export default function SiteDPRView() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editDPR, setEditDPR] = useState(null);
  const [viewDPR, setViewDPR] = useState(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new', label: 'New DPR', icon: FilePlus },
    { id: 'history', label: 'DPR History', icon: History },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleEdit = (dpr) => {
    setEditDPR(dpr);
    setActiveTab('new');
  };

  const handleView = (dpr) => {
    setViewDPR(dpr);
    setActiveTab('view');
  };

  const handleNavigateNew = () => {
    setEditDPR(null);
    setActiveTab('new');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <HardHat className="w-6 h-6 text-gold" />
            Site DPR
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Operations &gt; Daily Progress Reports
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 border-b border-slate-800 pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'new') {
                  setEditDPR(null);
                }
                setActiveTab(tab.id);
              }}
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

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'dashboard' && <DPRDashboard onNavigate={setActiveTab} />}
        {activeTab === 'new' && <DPRForm onNavigate={setActiveTab} editData={editDPR} />}
        {activeTab === 'history' && <DPRHistory onNavigate={setActiveTab} onEdit={handleEdit} onView={handleView} />}
        {activeTab === 'templates' && <DPRTemplates />}
        {activeTab === 'settings' && <DPRSettings />}
        {activeTab === 'view' && <DPRDetailView dpr={viewDPR} onNavigate={setActiveTab} onEdit={handleEdit} />}
      </div>
    </div>
  );
}
