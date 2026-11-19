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

// Mock savePO from procurement
const mockSavePO = vi.fn();
vi.mock('../../app/lib/api/purchase-orders/write.js', () => ({
  savePO: (...args: any[]) => mockSavePO(...args)
}));

// Mock config
vi.mock('../../app/lib/config.js', () => ({
  isSuperAdmin: vi.fn((email: string) => email === 'admin@pts.com')
}));

import {
  initBoqTables,
  getItemMasterList,
  getItemMasterItem,
  saveItemMaster,
  deleteItemMaster,
  createBoq,
  getBoqList,
  getBoqVersionsList,
  getBoqVersion,
  saveBoqSection,
  saveBoqItem,
  deleteBoqItem,
  submitBoqForApproval,
  approveBoqVersion,
  createBoqRevision,
  createPoFromBoq,
  getBoqItemsForPoImport,
  getBoqDashboard,
  exportBoqToExcel,
  importBoqFromExcel
} from '../../app/lib/api/boq.js';

describe('BOQ Engine 2.0 Backend Tests', () => {
  const adminSession = { user: { email: 'admin@pts.com', roles: ['admin', 'director'] } };
  const userSession = { user: { email: 'estimator@pts.com', roles: ['estimator'] } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryAll.mockResolvedValue([]);
    mockQueryGet.mockResolvedValue({});
    mockQueryRun.mockResolvedValue({ success: true });
    mockSavePO.mockResolvedValue({ po_no: 'PO-TEST-001', id: 'PO-TEST-001' });
  });

  describe('Item Master & Rate Library', () => {
    it('creates a new master item with calculated cost and selling rate', async () => {
      mockQueryGet.mockResolvedValueOnce({ cnt: 4 }); // count for code generation
      mockQueryGet.mockResolvedValueOnce({
        id: 'mock-item-id',
        item_code: 'GLA-0005',
        name: '12mm Toughened Glass',
        std_cost: 220,
        std_selling_rate: 300,
        target_margin_pct: 26.67
      });

      const res = await saveItemMaster({
        name: '12mm Toughened Glass',
        category: 'Glass & Glazing',
        unit: 'Sqft',
        std_purchase_rate: 180,
        std_labour_rate: 20,
        std_equipment_cost: 0,
        overhead_pct: 10, // 200 + 10% = 220
        target_margin_pct: 26.67
      }, adminSession);

      expect(mockQueryRun).toHaveBeenCalled();
      expect(res).toBeDefined();
      expect(res.name).toBe('12mm Toughened Glass');
    });

    it('soft deletes master item by setting is_active = 0', async () => {
      await deleteItemMaster('mock-item-id', adminSession);
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE boq_item_master SET is_active = 0'),
        expect.arrayContaining(['mock-item-id'])
      );
    });

    it('lists master items with search filter', async () => {
      mockQueryGet.mockResolvedValueOnce({ total: 1 });
      mockQueryAll.mockResolvedValueOnce([{ id: '1', item_code: 'GLA-001', name: 'Glass' }]);

      const res = await getItemMasterList({ search: 'Glass', page: 1, limit: 10 });
      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
    });
  });

  describe('BOQ Header & Versioning', () => {
    it('creates project BOQ header with Rev 0 and seeds default enterprise sections', async () => {
      mockQueryGet.mockResolvedValueOnce({ cnt: 0 }); // boq count

      const res = await createBoq({ project: 'DLF Cyber Park', title: 'Fitout BOQ' }, adminSession);

      expect(res).toBeDefined();
      expect(res.boq_no).toMatch(/^BOQ-DLFCYB-001/);
      expect(res.boq_id).toBeDefined();
      expect(res.version_id).toBeDefined();

      // Verify sections inserted
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO boq_sections'),
        expect.any(Array)
      );
    });

    it('retrieves full BOQ version with sections and grouped items', async () => {
      mockQueryGet.mockResolvedValueOnce({
        id: 'v1',
        boq_id: 'b1',
        project: 'DLF Cyber Park',
        boq_no: 'BOQ-001',
        status: 'Draft'
      });

      mockQueryAll.mockResolvedValueOnce([
        { id: 'sec-1', boq_version_id: 'v1', name: 'Civil Works', sort_order: 10 }
      ]);

      mockQueryAll.mockResolvedValueOnce([
        { id: 'item-1', boq_version_id: 'v1', section_id: 'sec-1', description: 'Brickwork', amount: 5000 }
      ]);

      const version = await getBoqVersion('v1');
      expect(version).toBeDefined();
      expect(version.sections.length).toBe(1);
      expect(version.sections[0].items.length).toBe(1);
      expect(version.sections[0].items[0].description).toBe('Brickwork');
    });
  });

  describe('BOQ Calculations & Immutability Locks', () => {
    it('calculates amount, cost_amount and margin_pct correctly', async () => {
      mockQueryGet.mockResolvedValueOnce({ status: 'Draft', is_current: 1 }); // version status check
      mockQueryGet.mockResolvedValueOnce({ total_selling: 10000, total_cost: 7000 }); // recalculateBoqTotals
      mockQueryGet.mockResolvedValueOnce({
        id: 'it-1',
        quantity: 100,
        cost_rate: 70,
        selling_rate: 100,
        amount: 10000,
        cost_amount: 7000,
        margin: 3000,
        margin_pct: 30
      });

      const res = await saveBoqItem({
        boq_version_id: 'v1',
        section_id: 'sec-1',
        description: 'False ceiling gypsum tiles',
        unit: 'Sqft',
        quantity: 100,
        cost_rate: 70,
        selling_rate: 100
      }, adminSession);

      expect(res).toBeDefined();
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO boq_items'),
        expect.arrayContaining([100, 70, 100, 10000, 7000, 3000, 30])
      );
    });

    it('rejects editing an Approved BOQ version (strict immutability)', async () => {
      mockQueryGet.mockResolvedValueOnce({ status: 'Approved', is_current: 1 });

      await expect(
        saveBoqItem({
          boq_version_id: 'v1',
          description: 'Alteration attempt'
        }, adminSession)
      ).rejects.toThrow(/IMMUTABILITY_LOCK/);
    });
  });

  describe('Approval & Revisions Workflow', () => {
    it('submits BOQ for approval', async () => {
      mockQueryGet.mockResolvedValueOnce({ id: 'v1', boq_id: 'b1', status: 'Draft' });

      const res = await submitBoqForApproval('v1', userSession);
      expect(res.status).toBe('Submitted');
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE boq_versions SET status = 'Submitted'"),
        expect.any(Array)
      );
    });

    it('approves BOQ and locks baseline quantities', async () => {
      mockQueryGet.mockResolvedValueOnce({ id: 'v1', boq_id: 'b1', status: 'Submitted' });

      const res = await approveBoqVersion('v1', 'Management Approved', adminSession);
      expect(res.status).toBe('Approved');
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE boq_items SET approved_qty = quantity, status = 'Approved'"),
        expect.any(Array)
      );
    });

    it('clones approved version into next draft revision with version_number + 1', async () => {
      mockQueryGet.mockResolvedValueOnce({
        id: 'v1',
        boq_id: 'b1',
        version_number: 1,
        total_selling_value: 500000,
        total_cost_value: 380000,
        gross_margin: 120000,
        margin_pct: 24
      });

      mockQueryAll.mockResolvedValueOnce([{ id: 'sec-old', name: 'Civil', sort_order: 10 }]); // sections
      mockQueryAll.mockResolvedValueOnce([{ id: 'it-old', section_id: 'sec-old', description: 'Tiles', quantity: 50, cost_rate: 100, selling_rate: 140, amount: 7000, cost_amount: 5000, margin: 2000, margin_pct: 28.57 }]); // items
      mockQueryAll.mockResolvedValueOnce([]); // BOMs

      const res = await createBoqRevision('v1', 'Client VO for 2nd floor', adminSession);

      expect(res.success).toBe(true);
      expect(res.version_number).toBe(2);
      expect(res.revision_label).toBe('Rev 1');
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE boq_versions SET is_current = 0'),
        ['b1']
      );
    });
  });

  describe('Procurement Integration', () => {
    it('creates PO in procurement module and links BOQ commitment without changing client selling rate', async () => {
      mockQueryGet.mockResolvedValueOnce({
        id: 'v1',
        boq_id: 'b1',
        header_project: 'DLF Cyber Park',
        boq_no: 'BOQ-DLF-001'
      });

      mockQueryGet.mockResolvedValueOnce({
        id: 'boq-item-1',
        description: 'Toughened Glass 12mm',
        unit: 'Sqft',
        cost_rate: 220,
        selling_rate: 310
      });

      const res = await createPoFromBoq({
        boq_version_id: 'v1',
        project: 'DLF Cyber Park',
        selected_items: [
          { boq_item_id: 'boq-item-1', order_qty: 50, po_rate: 215 }
        ],
        vendor_id: 'V-001',
        vendor_name: 'Saint-Gobain Vendor'
      }, adminSession);

      expect(res.success).toBe(true);
      expect(res.po_no).toBe('PO-TEST-001');

      // Verify savePO was called with the mapped PO items
      expect(mockSavePO).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'DLF Cyber Park',
          vendor_name: 'Saint-Gobain Vendor',
          items: expect.arrayContaining([
            expect.objectContaining({
              description: 'Toughened Glass 12mm',
              qty: 50,
              rate: 215,
              boq_item_id: 'boq-item-1'
            })
          ])
        }),
        adminSession
      );

      // Verify committed_qty was updated
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE boq_items SET committed_qty = committed_qty + ?'),
        [50, 'boq-item-1']
      );
    });

    it('calculates available procurement balance (quantity - committed_qty)', async () => {
      mockQueryAll.mockResolvedValueOnce([
        {
          id: 'it-1',
          description: 'Acoustic Panels',
          quantity: 200,
          committed_qty: 75,
          available_balance: 125
        }
      ]);

      const items = await getBoqItemsForPoImport({ boq_version_id: 'v1' });
      expect(items.length).toBe(1);
      expect(items[0].available_balance).toBe(125);
    });
  });

  describe('BOQ Financial Dashboard Analytics', () => {
    it('aggregates section summaries and procurement coverage %', async () => {
      mockQueryGet.mockResolvedValueOnce({
        id: 'v1',
        boq_id: 'b1',
        project: 'DLF',
        boq_no: 'BOQ-001',
        total_selling_value: 100000,
        total_cost_value: 70000,
        gross_margin: 30000,
        margin_pct: 30
      });

      mockQueryAll.mockResolvedValueOnce([
        { id: 's1', name: 'Civil', item_count: 5, section_selling: 100000, section_cost: 70000, section_margin: 30000 }
      ]);

      mockQueryGet.mockResolvedValueOnce({
        total_items: 5,
        fully_committed_items: 2,
        partial_items: 1,
        uncommitted_items: 2,
        total_committed_cost: 35000
      });

      const dash = await getBoqDashboard('v1');
      expect(dash.total_selling).toBe(100000);
      expect(dash.total_cost).toBe(70000);
      expect(dash.gross_margin).toBe(30000);
      expect(dash.margin_pct).toBe(30);
      expect(dash.procurement.coverage_pct).toBe(50); // 35000 / 70000 = 50%
    });

    it('retrieves all past revisions of a BOQ via getBoqVersionsList', async () => {
      mockQueryAll.mockResolvedValueOnce([
        { id: 'v2', boq_id: 'b1', version_number: 2, revision_label: 'Rev 1', status: 'Draft' },
        { id: 'v1', boq_id: 'b1', version_number: 1, revision_label: 'Rev 0', status: 'Approved' }
      ]);

      const versions = await getBoqVersionsList('b1');
      expect(versions.length).toBe(2);
      expect(versions[0].revision_label).toBe('Rev 1');
      expect(versions[1].revision_label).toBe('Rev 0');
    });

    it('safely handles zero selling rate without division by zero NaN', async () => {
      mockQueryGet.mockResolvedValueOnce({ status: 'Draft', is_current: 1 }); // version status check
      mockQueryGet.mockResolvedValueOnce({ total_selling: 0, total_cost: 500 }); // recalculateBoqTotals
      mockQueryGet.mockResolvedValueOnce({ id: 'it-0', quantity: 10, cost_rate: 50, selling_rate: 0, margin_pct: 0 });

      const res = await saveBoqItem({
        boq_version_id: 'v1',
        description: 'Zero rate item',
        quantity: 10,
        cost_rate: 50,
        selling_rate: 0
      }, adminSession);

      expect(res).toBeDefined();
      expect(mockQueryRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO boq_items'),
        expect.arrayContaining([0]) // marginPct must be 0, not NaN or -Infinity
      );
    });

    it('exports luxury branded client Excel workbook with SUMMARY and DETAILED BOQ sheets', async () => {
      mockQueryGet.mockResolvedValueOnce({
        id: 'v1',
        boq_id: 'b1',
        project: 'VMAN-Unit 206',
        boq_no: 'BOQ-VMANUN-001',
        title: 'VMAN BOQ',
        revision_label: 'Rev 0',
        total_selling_value: 50000,
        total_cost_value: 40000,
        gross_margin: 10000,
        margin_pct: 20
      });
      mockQueryAll.mockResolvedValueOnce([{ id: 's1', name: 'Part A - Furniture Works' }]);
      mockQueryAll.mockResolvedValueOnce([{
        id: 'i1',
        section_id: 's1',
        s_no: 'A1',
        description: 'Linear Workstations',
        specification: 'PLPB top with MS powder coated leg',
        location: 'Workstation Area',
        make: 'Custom',
        unit: 'Nos',
        quantity: 5,
        selling_rate: 10000,
        amount: 50000,
        cost_rate: 8000,
        cost_amount: 40000,
        margin: 10000,
        margin_pct: 20
      }]);
      mockQueryGet.mockResolvedValueOnce({ client_name: 'VMAN', project: 'VMAN-Unit 206' });
      mockQueryGet.mockResolvedValueOnce({ site_address: 'Gurugram', client: 'VMAN' });

      const res = await exportBoqToExcel('v1', { view: 'client' });
      expect(res).toBeDefined();
      expect(res.filename).toContain('BOQ-VMANUN-001');
      expect(res.filename).toContain('VMAN');
      expect(res.base64).toBeDefined();
      expect(typeof res.base64).toBe('string');
      expect(res.base64.length).toBeGreaterThan(100);
    });
  });
});
