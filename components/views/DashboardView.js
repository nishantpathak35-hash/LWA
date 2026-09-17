'use client';

import { toast } from '../ui/Toast';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../StateProvider';

import { num, pct100, paginateItems } from './dashboard/dashboard-utils';
import DashboardWelcomeHeader from './dashboard/DashboardWelcomeHeader';
import PendingActionsWidget from '../ui/PendingActionsWidget';
import DashboardExecutiveKpiStrip from './dashboard/DashboardExecutiveKpiStrip';
import DashboardChartsSection from './dashboard/DashboardChartsSection';
import DashboardProjectLedger from './dashboard/DashboardProjectLedger';
import DashboardEditFinancialsModal from './dashboard/DashboardEditFinancialsModal';

export default function DashboardView() {
  const { pos, vendors, payments, kpis, user, setActiveView, setTargetPo, call } = useAppState();

  const [projectsList, setProjectsList] = useState([]);

  const approvalMetrics = useMemo(() => {
    const queue = payments.filter(p => {
      const stage = String(p.stage || '').toLowerCase();
      return !stage.includes('remit') && !stage.includes('reject') && !stage.includes('cancel');
    });
    return {
      total: queue.length,
      pending: queue.filter(r => String(r.status || '').toLowerCase() === 'pending').length,
      approved: queue.filter(r => String(r.status || '').toLowerCase() === 'approved').length,
      rejected: queue.filter(r => String(r.status || '').toLowerCase() === 'rejected').length,
      overBudget: queue.filter(r => r.is_overbudget_approval || r.overbudget === 1).length,
      tdsApplicable: queue.filter(r => Number(r.tds_amount) > 0).length,
    };
  }, [payments]);

  const vendorsList = useMemo(() => vendors, [vendors]);

  const [loading, setLoading] = useState(false);

  // Edit financials state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [boqVal, setBoqVal] = useState(0);
  const [bcsVal, setBcsVal] = useState(0);
  const [inflowVal, setInflowVal] = useState(0);
  const [clientDebitVal, setClientDebitVal] = useState(0);
  const [tdsVal, setTdsVal] = useState(0);
  const [savingFinancials, setSavingFinancials] = useState(false);

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const projs = await call('getProjectDetails');
      setProjectsList(projs || []);
    } catch (e) {
      console.error('Failed to load project details:', e);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, payments.length, pos.length]);

  // Calculate Global Executive Totals from all active projects
  let totPV = 0, totInflow = 0, totPendInflow = 0;
  let totBCS = 0, totPGM = 0, totPO = 0, totAGM = 0, totPendOut = 0, totBal = 0, totOut = 0;

  projectsList.forEach(r => {
    totPV += num(r.projectValueTax || r.projectValue);
    totInflow += num(r.inflow);
    totPendInflow += num(r.pendingInflow);
    totOut += num(r.outflow);
    totBCS += num(r.bcs);
    totPGM += num(r.plannedGM);
    totPO += num(r.poIssued);
    totAGM += num(r.actualGM);
    totPendOut += num(r.pendingOutflow);
    totBal += num(r.balanceAvailable);
  });

  // Sparkline datasets
  const spPV   = projectsList.map(r => num(r.projectValueTax || r.projectValue));
  const spIn   = projectsList.map(r => num(r.inflow));
  const spPin  = projectsList.map(r => num(r.pendingInflow));
  const spOutCF = projectsList.map(r => num(r.outflow));
  const spBCS = projectsList.map(r => num(r.bcs));
  const spPGM = projectsList.map(r => num(r.plannedGM));
  const spPO = projectsList.map(r => num(r.poIssued));
  const spAGM = projectsList.map(r => num(r.actualGM));
  const spOut = projectsList.map(r => num(r.outflow));
  const spPendOut = projectsList.map(r => num(r.pendingOutflow));
  const spBal = projectsList.map(r => num(r.balanceAvailable));

  // Payment pipeline segments
  const p = kpis?.payments || {};
  const stageParts = [
    { k: 'Procurement', v: num(p.pendingProc || 0), c: 'rgba(245,158,11,.95)' },
    { k: 'Finance', v: num(p.pendingFinance || 0), c: 'rgba(155,114,248,.95)' },
    { k: 'Director', v: num(p.pendingDirector || 0), c: 'rgba(91,141,239,.95)' },
    { k: 'Ready to Remit', v: num(p.readyToRemit || 0), c: 'rgba(34,211,238,.95)' },
    { k: 'Remitted', v: num(p.remitted || 0), c: 'rgba(61,214,140,.95)' }
  ];
  const stageTotal = stageParts.reduce((a, s) => a + s.v, 0) || 1;

  // Calculate Vendor Exposure / Payables Liability from Purchase Orders & Vendors
  const vendorPayablesMap = useMemo(() => {
    const map = {};
    (pos || []).forEach(po => {
      const st = String(po.status || po.approval_status || '').toLowerCase();
      if (st === 'rejected' || st === 'cancelled') return;
      const isShortClosed = st === 'short closed' || st === 'short_closed' || st === 'closed';
      const poValue = Number(po.po_value || po.poValue || 0);
      const paid = Number(po.paid || po.paid_amount || 0);
      const balance = isShortClosed ? 0 : Math.max(0, poValue - paid);
      
      const vName = po.vendor_name || po.vendor_key || po.vendor;
      if (vName) {
        map[vName] = (map[vName] || 0) + balance;
      }
    });

    // If all balances are 0 or no POs, fall back to total PO commitment per vendor
    const totalBal = Object.values(map).reduce((a, b) => a + b, 0);
    if (totalBal === 0) {
      (pos || []).forEach(po => {
        const st = String(po.status || po.approval_status || '').toLowerCase();
        if (st === 'rejected' || st === 'cancelled') return;
        const poValue = Number(po.po_value || po.poValue || 0);
        const vName = po.vendor_name || po.vendor_key || po.vendor;
        if (vName && poValue > 0) {
          map[vName] = (map[vName] || 0) + poValue;
        }
      });
    }

    // Also include vendor list names if no POs exist yet
    if (Object.keys(map).length === 0 && vendorsList.length > 0) {
      vendorsList.forEach(v => {
        const vName = v.name || v.tradeName || v.legalName || v.vendor;
        const val = num(v.totalPayable || v.balance || 0);
        if (vName && val > 0) {
          map[vName] = val;
        }
      });
    }

    return map;
  }, [pos, vendorsList]);

  const vendorSlices = useMemo(() => {
    const entries = Object.entries(vendorPayablesMap)
      .map(([label, value]) => ({ label, value: num(value) }))
      .filter(s => s.value > 0)
      .sort((a, b) => b.value - a.value);

    const top5 = entries.slice(0, 5);
    const vendorPalette = [
      'rgba(200,164,90,.95)',
      'rgba(34,211,238,.95)',
      'rgba(155,114,248,.95)',
      'rgba(245,158,11,.95)',
      'rgba(61,214,140,.95)'
    ];

    return top5.map((item, idx) => ({
      ...item,
      color: vendorPalette[idx % vendorPalette.length]
    }));
  }, [vendorPayablesMap]);

  const totalVendorPayable = useMemo(() => {
    return Object.values(vendorPayablesMap).reduce((acc, val) => acc + num(val), 0);
  }, [vendorPayablesMap]);

  const handleOpenEditModal = (proj) => {
    setEditProject(proj);
    setBoqVal(num(proj.projectValue));
    setBcsVal(num(proj.bcs));
    setInflowVal(num(proj.inflow));
    setClientDebitVal(num(proj.invoiceValue));
    setTdsVal(num(proj.tds));
    setEditModalOpen(true);
  };

  const handleSaveFinancials = async (e) => {
    e.preventDefault();
    setSavingFinancials(true);
    try {
      const payload = {
        project: editProject.project,
        projectValue: boqVal,
        bcs: bcsVal,
        inflow: inflowVal,
        clientDebit: clientDebitVal,
        tds: tdsVal
      };
      await call('updateProjectFinancials', payload);
      toast.success('Project financial performance updated successfully.');
      setEditModalOpen(false);
      loadDashboardData();
    } catch (e) {
      toast.error('Error updating project details: ' + (e.message || String(e)));
    } finally {
      setSavingFinancials(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-foreground">
      <DashboardWelcomeHeader
        user={user}
        loading={loading}
        loadDashboardData={loadDashboardData}
        setActiveView={setActiveView}
        approvalMetrics={approvalMetrics}
      />

      <PendingActionsWidget
        onSelectRecord={(type, id) => {
          const t = String(type || '').toLowerCase();
          if (t.includes('payment')) {
            setActiveView('payments');
          } else if (t.includes('po') || t.includes('purchase')) {
            if (setTargetPo && id) setTargetPo(id);
            setActiveView('pos');
          } else if (t.includes('invoice')) {
            setActiveView('invoices');
          }
        }}
      />

      {/* ── Executive Financial KPI Strip ── */}
      <DashboardExecutiveKpiStrip
        totPV={totPV}
        totInflow={totInflow}
        totOut={totOut}
        totPendInflow={totPendInflow}
        totBCS={totBCS}
        totPO={totPO}
        totAGM={totAGM}
        totPGM={totPGM}
        totBal={totBal}
        spPV={spPV}
        spIn={spIn}
        spOutCF={spOutCF}
        projectsCount={projectsList.length}
      />

      {/* ── Visual Analytics: Pipeline Flow & Vendor Exposure ── */}
      <DashboardChartsSection
        stageParts={stageParts}
        stageTotal={stageTotal}
        vendorSlices={vendorSlices}
        totalVendorPayable={totalVendorPayable}
      />

      {/* ── Reimagined Unified Project Financial Ledger ── */}
      <DashboardProjectLedger
        projectsList={projectsList}
        handleOpenEditModal={handleOpenEditModal}
        totPV={totPV}
        totInflow={totInflow}
        totOut={totOut}
        totPendInflow={totPendInflow}
        totBCS={totBCS}
        totPGM={totPGM}
        totPO={totPO}
        totAGM={totAGM}
        totPendOut={totPendOut}
        totBal={totBal}
        spPV={spPV}
        spIn={spIn}
        spOutCF={spOutCF}
        spPin={spPin}
        spBCS={spBCS}
        spPGM={spPGM}
        spPO={spPO}
        spAGM={spAGM}
        spOut={spOut}
        spPendOut={spPendOut}
        spBal={spBal}
      />

      <DashboardEditFinancialsModal
        editModalOpen={editModalOpen}
        setEditModalOpen={setEditModalOpen}
        editProject={editProject}
        boqVal={boqVal} setBoqVal={setBoqVal}
        bcsVal={bcsVal} setBcsVal={setBcsVal}
        inflowVal={inflowVal} setInflowVal={setInflowVal}
        clientDebitVal={clientDebitVal} setClientDebitVal={setClientDebitVal}
        tdsVal={tdsVal} setTdsVal={setTdsVal}
        savingFinancials={savingFinancials}
        handleSaveFinancials={handleSaveFinancials}
      />
    </div>
  );
}
