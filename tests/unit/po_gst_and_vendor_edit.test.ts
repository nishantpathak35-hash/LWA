import { describe, it, expect, vi } from 'vitest';
import { generatePOPdf } from '../../app/lib/poPdfGenerator.js';
import { VendorRepository } from '../../src/modules/vendors/repositories/VendorRepository';
import { PORepository } from '../../src/modules/purchase-orders/repositories/PORepository';
import * as db from '../../app/lib/db.js';

describe('PO 0% GST and Vendor Edit Cascading Tests', () => {
  describe('Bug 1: 0% GST PO PDF Export', () => {
    it('generates PO PDF with 0% GST without defaulting to 18%', () => {
      const po = {
        po_no: 'PO/26-27/001',
        po_date: '2026-10-29',
        vendor_name: 'Alpha Supplies',
        project: 'Project Alpha',
        po_value: 50000,
        gst_total: 0,
        tds_pct: 0,
        tds_amount: 0,
        status: 'Approved'
      };

      const items = [
        { description: 'Service Item A', qty: 5, rate: 10000, tax_pct: 0, hsn_sac: '9988' }
      ];

      const vendor = {
        vendor_code: 'VEN-001',
        legal_name: 'Alpha Supplies',
        gstin: '07AAAAA0000A1Z5',
        address: 'New Delhi'
      };

      const result = generatePOPdf(po, items, vendor);
      expect(result).toBeDefined();
      expect(result.filename).toBe('PO_26-27_001.pdf');
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(100);
    });

    it('generates PO PDF with correct standard GST when tax_pct is present', () => {
      const po = {
        po_no: 'PO/26-27/002',
        po_date: '2026-10-29',
        vendor_name: 'Beta Supplies',
        project: 'Project Beta',
        po_value: 59000,
        gst_total: 9000,
        status: 'Approved'
      };

      const items = [
        { description: 'Goods Item B', qty: 5, rate: 10000, tax_pct: 18, hsn_sac: '8471' }
      ];

      const vendor = {
        vendor_code: 'VEN-002',
        legal_name: 'Beta Supplies'
      };

      const result = generatePOPdf(po, items, vendor);
      expect(result).toBeDefined();
      expect(result.filename).toBe('PO_26-27_002.pdf');
      expect(typeof result.content).toBe('string');
    });
  });

  describe('Bug 2: Vendor Name Editing and Cascading', () => {
    it('cascades updated vendor name to purchase_orders, payment_requests, invoices, and credit_notes', async () => {
      const executedQueries: { sql: string; params: any[] }[] = [];
      vi.spyOn(db, 'queryRun').mockImplementation(async (sql: string, params: any[] = []) => {
        executedQueries.push({ sql, params });
        return { rowsAffected: 1 } as any;
      });

      const existingVendor = {
        id: 10,
        vendor_code: 'VEN-010',
        legal_name: 'Old Vendor Name',
        trade_name: 'Old Trade'
      };

      await VendorRepository.cascadeVendorUpdate(existingVendor, {
        legalName: 'New Vendor Name Private Limited',
        vendorCode: 'VEN-010'
      });

      expect(executedQueries.length).toBeGreaterThanOrEqual(4);

      // Verify PO update
      const poUpdate = executedQueries.find(q => q.sql.includes('UPDATE purchase_orders'));
      expect(poUpdate).toBeDefined();
      expect(poUpdate?.params[0]).toBe('New Vendor Name Private Limited');

      // Verify PR update
      const prUpdate = executedQueries.find(q => q.sql.includes('UPDATE payment_requests'));
      expect(prUpdate).toBeDefined();
      expect(prUpdate?.params[0]).toBe('New Vendor Name Private Limited');

      // Verify Invoice update
      const invUpdate = executedQueries.find(q => q.sql.includes('UPDATE invoices'));
      expect(invUpdate).toBeDefined();
      expect(invUpdate?.params[0]).toBe('New Vendor Name Private Limited');

      // Verify Credit Note update
      const cnUpdate = executedQueries.find(q => q.sql.includes('UPDATE credit_notes'));
      expect(cnUpdate).toBeDefined();
      expect(cnUpdate?.params[0]).toBe('New Vendor Name Private Limited');

      vi.restoreAllMocks();
    });
  });
});
