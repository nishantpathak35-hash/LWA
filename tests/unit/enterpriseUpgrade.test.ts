import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB
const mockQueryAll = vi.fn();
const mockQueryGet = vi.fn();
const mockQueryRun = vi.fn();
const mockQueryBatch = vi.fn();

vi.mock('../../app/lib/db.js', () => ({
  queryAll: (...args: any[]) => mockQueryAll(...args),
  queryGet: (...args: any[]) => mockQueryGet(...args),
  queryRun: (...args: any[]) => mockQueryRun(...args),
  queryBatch: (...args: any[]) => mockQueryBatch(...args)
}));

// Mock Audit Logger
vi.mock('../../app/lib/api/core.js', () => ({
  logAudit: vi.fn()
}));

import {
  listClients,
  getClient,
  saveClient,
  deleteClient,
  getClientProjectsAndBoqs,
  seedClientsFromProjects
} from '../../app/lib/api/clients.js';

import {
  listRateContracts,
  getRateContract,
  saveRateContract,
  getEligibleRateContractsForPO
} from '../../app/lib/api/rate-contracts.js';

import {
  generateMasterRateExcel,
  parseAndValidateMasterRateExcel,
  confirmMasterRateImport
} from '../../app/lib/api/excel-master-rates.js';

import {
  getProjectSchedule,
  listProjectScheduleTasks,
  saveScheduleTask,
  deleteScheduleTask,
  updateTaskProgressFromDpr
} from '../../app/lib/api/schedule.js';

import {
  getEmployeeTaskDashboard,
  getProjectManagerTaskDashboard,
  getManagementTaskDashboard
} from '../../app/lib/api/task-dashboard.js';

describe('Enterprise Upgrade System Tests', () => {
  const session = { email: 'admin@pts.com', roles: ['admin'] };

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryRun.mockResolvedValue({ lastInsertRowid: 1, changes: 1 });
    mockQueryBatch.mockResolvedValue([]);
  });

  describe('1. Clients Module & Contract Linkage', () => {
    it('creates a new client and prevents duplicate names', async () => {
      mockQueryGet.mockResolvedValueOnce(null); // No duplicate

      const res = await saveClient({
        name: 'Nexus Corp',
        company_name: 'Nexus Tech Parks Pvt Ltd',
        gst: '27AABCU9603R1ZM',
        contact: '9876543210',
        email: 'nexus@corp.com'
      }, session);

      expect(res.success).toBe(true);
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO clients'),
        expect.arrayContaining(['Nexus Corp', 'nexus@corp.com'])
      );
    });

    it('rejects duplicate client creation', async () => {
      mockQueryGet.mockResolvedValueOnce({ id: 99, name: 'Nexus Corp' });

      await expect(
        saveClient({ name: 'Nexus Corp', email: 'other@corp.com' }, session)
      ).rejects.toThrow(/already exists/i);
    });

    it('retrieves client along with linked projects and approved BOQs', async () => {
      mockQueryGet.mockResolvedValueOnce({
        id: 10,
        name: 'Nexus Corp',
        company_name: 'Nexus Corp'
      });
      mockQueryAll.mockResolvedValueOnce([
        { project: 'Project Nexus Phase 1', project_value: 5000000, client_id: 10 }
      ]);
      mockQueryAll.mockResolvedValueOnce([
        {
          id: 'boq-1',
          boq_number: 'BOQ-NEXUS-01',
          version_number: 1,
          total_selling_value: 5500000,
          total_cost_value: 4000000,
          gross_margin: 1500000,
          margin_pct: 27.27,
          version_status: 'Approved'
        }
      ]);

      const res = await getClientProjectsAndBoqs(10, session);
      expect(res.client.name).toBe('Nexus Corp');
      expect(res.projects).toHaveLength(1);
      expect(res.boqs).toHaveLength(1);
      expect(res.boqs[0].gross_margin).toBe(1500000);
    });

    it('seeds clients from projects and purges unnecessary clients on delete', async () => {
      mockQueryAll.mockResolvedValueOnce([{ p: 'Vatika Group' }]); // POs
      mockQueryAll.mockResolvedValueOnce([{ p: 'Vatika Group', c: 'Vatika Group' }]); // Project Financials
      mockQueryGet.mockResolvedValueOnce(null); // not existing yet

      const seedRes = await seedClientsFromProjects(session);
      expect(seedRes.success).toBe(true);
      expect(seedRes.inserted).toBe(1);
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('system:project_seed'),
        expect.arrayContaining(['Vatika Group'])
      );

      // Test delete
      mockQueryGet.mockResolvedValueOnce({ id: 1, name: 'Vatika Group' });
      const delRes = await deleteClient(1, session);
      expect(delRes.success).toBe(true);
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM clients WHERE id = ?'),
        [1]
      );
    });
  });

  describe('2. Central Rate Contracts & PO Match Engine', () => {
    it('saves a rate contract and computes total contract value', async () => {
      const contractPayload = {
        vendor_name: 'Saint-Gobain Glass India',
        valid_from: '2026-01-01',
        valid_until: '2026-12-31',
        items: [
          {
            item_name: '12mm Clear Toughened Glass',
            unit: 'Sqft',
            agreed_rate: 220,
            max_qty: 1000
          },
          {
            item_name: '10mm Frosted Glass',
            unit: 'Sqft',
            agreed_rate: 190,
            max_qty: 500
          }
        ]
      };

      const res = await saveRateContract(contractPayload, session);
      expect(res.success).toBe(true);
      expect(res.contract_no).toBeDefined();
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO rate_contracts'),
        expect.arrayContaining(['Saint-Gobain Glass India', 315000]) // (220*1000 + 190*500 = 315000)
      );
    });

    it('matches eligible approved active rate contracts for a PO line item', async () => {
      mockQueryAll.mockResolvedValueOnce([
        {
          id: 'rc-item-1',
          contract_no: 'RC-2026-001',
          item_name: '12mm Clear Toughened Glass',
          agreed_rate: 220,
          unit: 'Sqft'
        }
      ]);
      mockQueryAll.mockResolvedValueOnce([]); // No po history needed

      const matches = await getEligibleRateContractsForPO({
        vendor: 'Saint-Gobain Glass India',
        project: 'Project Alpha',
        item_description: '12mm Clear Toughened Glass'
      }, session);

      expect(matches.hasContract).toBe(true);
      expect(matches.contractMatches[0].agreed_rate).toBe(220);
    });
  });

  describe('3. Master Rate Excel Generation & Synchronization', () => {
    it('generates multi-sheet Master Rate Excel from live PO history lines', async () => {
      // Mock PO items in DB
      mockQueryAll.mockResolvedValue([
        {
          id: 1,
          po_no: 'PO-2026-001',
          description: 'Armstrong Mineral Fiber Ceiling Tiles 600x600',
          rate: 85,
          unit: 'Sqft',
          qty: 500,
          vendor_name: 'Armstrong Solutions',
          project: 'Project Alpha',
          po_date: '2026-03-01'
        },
        {
          id: 2,
          po_no: 'PO-2026-002',
          description: 'Armstrong Mineral Fiber Ceiling Tiles 600x600',
          rate: 90, // Variance > 2% trigger conflict review sheet
          unit: 'Sqft',
          qty: 300,
          vendor_name: 'Armstrong Solutions',
          project: 'Project Beta',
          po_date: '2026-04-01'
        }
      ]);

      const res = await generateMasterRateExcel(session);
      expect(res.success).toBe(true);
      expect(res.poLinesAnalyzed).toBe(2);
      expect(res.uniqueItemsExtracted).toBe(1);
      expect(res.rateConflictsCount).toBe(1);
      expect(res.base64).toBeDefined();
    });

    it('validates and detects duplicate codes and invalid rates in workbook upload', async () => {
      mockQueryAll.mockResolvedValueOnce([]); // No existing items

      // Generate a small dummy workbook in memory
      const XLSX = await import('xlsx');
      const testData = [
        { 'Item Code': 'MAT-001', 'Item Name': 'Gypsum Board 12.5mm', 'UOM': 'Sqft', 'Basic Rate': 45 },
        { 'Item Code': 'MAT-001', 'Item Name': 'Duplicate Code Row', 'UOM': 'Sqft', 'Basic Rate': 50 }, // Duplicate code error
        { 'Item Code': 'MAT-002', 'Item Name': 'Negative Rate Item', 'UOM': 'Nos', 'Basic Rate': -10 } // Negative rate error
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(testData);
      XLSX.utils.book_append_sheet(wb, ws, 'MASTER ITEM RATE UPLOAD');
      const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

      const validation = await parseAndValidateMasterRateExcel({ fileBase64: base64 }, session);
      expect(validation.validCount).toBe(1);
      expect(validation.errorCount).toBe(2);
      expect(validation.errors[0].error).toMatch(/duplicate item code/i);
      expect(validation.errors[1].error).toMatch(/invalid rate/i);
    });

    it('confirms and commits validated items into boq_item_master', async () => {
      mockQueryGet.mockResolvedValueOnce(null); // Item does not exist, insert fresh

      const res = await confirmMasterRateImport({
        items: [
          {
            item_code: 'MAT-001',
            name: 'Gypsum Board 12.5mm',
            category: 'False Ceiling & Partition',
            item_type: 'material',
            unit: 'Sqft',
            std_purchase_rate: 45,
            std_labour_rate: 15,
            std_cost: 60,
            std_selling_rate: 80,
            target_margin_pct: 25
          }
        ]
      }, session);

      expect(res.success).toBe(true);
      expect(res.createdCount).toBe(1);
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO boq_item_master'),
        expect.arrayContaining(['MAT-001', 'Gypsum Board 12.5mm'])
      );
    });
  });

  describe('4. Project Scheduling & Employee Assignment', () => {
    it('creates scheduled tasks and computes overdue days correctly', async () => {
      mockQueryGet.mockResolvedValueOnce({ id: 'sched-1', project: 'Project Titan' });

      const res = await saveScheduleTask({
        project: 'Project Titan',
        title: 'Flooring Screed and Leveling',
        work_package: 'Flooring & Tiling',
        assigned_to_id: 'EMP-001',
        assigned_to_name: 'Rajesh Kumar',
        planned_start_date: '2026-03-01',
        planned_end_date: '2026-03-05',
        planned_qty: 1200,
        uom: 'Sqft'
      }, session);

      expect(res.success).toBe(true);

      // Now query tasks and verify overdue computation
      mockQueryAll.mockResolvedValueOnce([
        {
          id: res.id,
          title: 'Flooring Screed and Leveling',
          planned_start_date: '2026-01-01',
          planned_end_date: '2026-01-05', // In the past
          status: 'In Progress',
          progress_pct: 40
        }
      ]);

      const taskList = await listProjectScheduleTasks({ project: 'Project Titan' }, session);
      expect(taskList[0].is_overdue).toBe(true);
      expect(taskList[0].overdue_days).toBeGreaterThan(0);
      expect(taskList[0].health).toBe('critical');
    });

    it('updates task progress and completion status from DPR submission', async () => {
      mockQueryGet.mockResolvedValueOnce({
        id: 'task-10',
        title: 'Electrical Conduit Laying',
        progress_pct: 50,
        actual_qty: 250,
        status: 'In Progress'
      });

      const updateRes = await updateTaskProgressFromDpr({
        taskId: 'task-10',
        progressPct: 100,
        executedQty: 250,
        isCompleted: true,
        dprId: 'DPR-2026-001'
      }, session);

      expect(updateRes.success).toBe(true);
      expect(updateRes.newStatus).toBe('Completed');
      expect(updateRes.numProgress).toBe(100);

      // Verify DB update and audit history insert
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE schedule_tasks'),
        expect.arrayContaining([100, 500, 'Completed'])
      );
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO schedule_task_history'),
        expect.any(Array)
      );
    });
  });

  describe('5. Task Performance & Overdue Dashboard Matrix', () => {
    it('aggregates employee matrix with live task counts and DPR submission status', async () => {
      // Mock employees
      mockQueryAll.mockResolvedValueOnce([
        { employee_id: 'EMP-1', name: 'Vikram Singh', designation: 'Site Engineer' },
        { employee_id: 'EMP-2', name: 'Anil Verma', designation: 'Project Supervisor' }
      ]);
      // Mock tasks
      mockQueryAll.mockResolvedValueOnce([
        {
          id: 't-1',
          assigned_to_id: 'EMP-1',
          status: 'In Progress',
          planned_end_date: '2026-01-01' // Overdue
        },
        {
          id: 't-2',
          assigned_to_id: 'EMP-1',
          status: 'Completed',
          planned_end_date: '2026-04-01'
        },
        {
          id: 't-3',
          assigned_to_id: 'EMP-2',
          status: 'In Progress',
          planned_end_date: '2026-12-31' // Not overdue
        }
      ]);
      // Mock DPRs
      mockQueryAll.mockResolvedValueOnce([
        { prepared_by: 'Vikram Singh' } // EMP-1 submitted DPR
      ]);

      const dashboard = await getManagementTaskDashboard(session);
      expect(dashboard.summary.totalEmployees).toBe(2);
      expect(dashboard.summary.totalTasksAssigned).toBe(3);
      expect(dashboard.summary.totalOverdueTasks).toBe(1);

      const vikram = dashboard.matrix.find((m: any) => m.employee_id === 'EMP-1');
      expect(vikram.assigned).toBe(2);
      expect(vikram.completed).toBe(1);
      expect(vikram.overdue).toBe(1);
      expect(vikram.has_dpr_today).toBe(true);

      const anil = dashboard.matrix.find((m: any) => m.employee_id === 'EMP-2');
      expect(anil.has_dpr_today).toBe(false);
      expect(dashboard.summary.pendingDprEmployeesCount).toBe(1);
    });
  });
});
