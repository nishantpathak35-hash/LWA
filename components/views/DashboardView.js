'use client';

import { toast } from '../ui/Toast';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppState } from '../StateProvider';

import { num, pct100, paginateItems } from './dashboard/dashboard-utils';
import DashboardWelcomeHeader from './dashboard/DashboardWelcomeHeader';
import DashboardCashflowSection from './dashboard/DashboardCashflowSection';
import DashboardChartsSection from './dashboard/DashboardChartsSection';
import DashboardFinancialSection from './dashboard/DashboardFinancialSection';
import DashboardEditFinancialsModal from './dashboard/DashboardEditFinancialsModal';

export default function DashboardView() {
  const { pos, vendors, payments, kpis, user, setActiveView, call } = useAppState();

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

  const [cashflowSearchQ, setCashflowSearchQ] = useState('');
  const [financialSearchQ, setFinancialSearchQ] = useState('');
  const [cashflowPage, setCashflowPage] = useState(1);
  const [financialPage, setFinancialPage] = useState(1);
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
  }, [loadDashboardData]);

  const filterProjects = (query) => projectsList.filter(r => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = [r.project, r.projectName, r.clientName, r.category].join(' ').toLowerCase();
    return haystack.includes(q);
  });

  const filteredCashflowProjects = useMemo(() => filterProjects(cashflowSearchQ), [projectsList, cashflowSearchQ]);
  const filteredFinancialProjects = useMemo(() => filterProjects(financialSearchQ), [projectsList, financialSearchQ]);

  const cashflowPagination = paginateItems(filteredCashflowProjects, cashflowPage);
  const financialPagination = paginateItems(filteredFinancialProjects, financialPage);

  // Calculate Totals
  let totPV = 0, totInflow = 0, totPendInflow = 0;
  let totBCS = 0, totPGM = 0, totPO = 0, totAGM = 0, totPendOut = 0, totBal = 0, totOut = 0;

  filteredCashflowProjects.forEach(r => {
    totPV += num(r.projectValue);
    totInflow += num(r.inflow);
    totPendInflow += num(r.pendingInflow);
    totOut += num(r.outflow);
  });

  filteredFinancialProjects.forEach(r => {
    totBCS += num(r.bcs);
    totPGM += num(r.plannedGM);
    totPO += num(r.poIssued);
    totAGM += num(r.actualGM);
    totPendOut += num(r.pendingOutflow);
    totBal += num(r.balanceAvailable);
  });

  // Sparkline datasets
  const spPV   = filteredCashflowProjects.map(r => num(r.projectValueTax || r.projectValue));
  const spIn   = filteredCashflowProjects.map(r => num(r.inflow));
  const spPin  = filteredCashflowProjects.map(r => num(r.pendingInflow));
  const spOutCF = filteredCashflowProjects.map(r => num(r.outflow));
  const spBCS = filteredFinancialProjects.map(r => num(r.bcs));
  const spPGM = filteredFinancialProjects.map(r => num(r.plannedGM));
  const spPO = filteredFinancialProjects.map(r => num(r.poIssued));
  const spAGM = filteredFinancialProjects.map(r => num(r.actualGM));
  const spOut = filteredFinancialProjects.map(r => num(r.outflow));
  const spPendOut = filteredFinancialProjects.map(r => num(r.pendingOutflow));
  const spBal = filteredFinancialProjects.map(r => num(r.balanceAvailable));

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

  // Top vendors payables
  const sortedVendors = [...vendorsList]
    .sort((a, b) => num(b.totalPayable) - num(a.totalPayable))
    .slice(0, 5);
  const totalVendorPayable = vendorsList.reduce((a, v) => a + num(v.totalPayable), 0);

  const vendorPalette = [
    'rgba(200,164,90,.95)',
    'rgba(34,211,238,.95)',
    'rgba(155,114,248,.95)',
    'rgba(245,158,11,.95)',
    'rgba(61,214,140,.95)'
  ];
  const vendorSlices = sortedVendors.map((v, i) => ({
    label: v.vendor,
    value: num(v.totalPayable),
    color: vendorPalette[i % vendorPalette.length]
  })).filter(s => s.value > 0);

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

      <DashboardCashflowSection
        filteredCashflowProjects={filteredCashflowProjects}
        cashflowSearchQ={cashflowSearchQ}
        setCashflowSearchQ={setCashflowSearchQ}
        setCashflowPage={setCashflowPage}
        cashflowPagination={cashflowPagination}
        handleOpenEditModal={handleOpenEditModal}
        totPV={totPV} totInflow={totInflow} totOut={totOut} totPendInflow={totPendInflow}
        spPV={spPV} spIn={spIn} spOutCF={spOutCF} spPin={spPin}
      />

      <DashboardChartsSection
        stageParts={stageParts}
        stageTotal={stageTotal}
        vendorSlices={vendorSlices}
        totalVendorPayable={totalVendorPayable}
      />

      <DashboardFinancialSection
        filteredFinancialProjects={filteredFinancialProjects}
        financialSearchQ={financialSearchQ}
        setFinancialSearchQ={setFinancialSearchQ}
        setFinancialPage={setFinancialPage}
        financialPagination={financialPagination}
        handleOpenEditModal={handleOpenEditModal}
        totBCS={totBCS} totPGM={totPGM} totPO={totPO} totAGM={totAGM}
        totOut={totOut} totPendOut={totPendOut} totBal={totBal}
        spBCS={spBCS} spPGM={spPGM} spPO={spPO} spAGM={spAGM}
        spOut={spOut} spPendOut={spPendOut} spBal={spBal}
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
