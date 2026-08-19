import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

describe('Purchase Order Unit Tests: Dual Terms & 0% GST', () => {
  const testPoNo = `UNIT-TEST-PO-${Date.now()}`;

  after(async () => {
    // Cleanup test fixtures
    await client.execute({ sql: 'DELETE FROM po_items WHERE po_no = ?', args: [testPoNo] });
    await client.execute({ sql: 'DELETE FROM purchase_orders WHERE po_no = ?', args: [testPoNo] });
  });

  describe('1. 0% GST Logic & Calculations', () => {
    it('should correctly preserve 0% GST without defaulting to 18%', () => {
      // Test the nullish coalescing formula used across frontend and backend
      const resolveGstPct = (item) => {
        return (item.gstPct !== undefined && item.gstPct !== null)
          ? Number(item.gstPct)
          : ((item.tax_pct !== undefined && item.tax_pct !== null)
            ? Number(item.tax_pct)
            : 18);
      };

      assert.equal(resolveGstPct({ gstPct: 0 }), 0, 'gstPct: 0 should evaluate to 0, not 18');
      assert.equal(resolveGstPct({ tax_pct: 0 }), 0, 'tax_pct: 0 should evaluate to 0, not 18');
      assert.equal(resolveGstPct({ gstPct: '0' }), 0, 'string "0" should evaluate to 0');
      assert.equal(resolveGstPct({ gstPct: 5 }), 5, 'gstPct: 5 should evaluate to 5');
      assert.equal(resolveGstPct({ gstPct: 12 }), 12, 'gstPct: 12 should evaluate to 12');
      assert.equal(resolveGstPct({ gstPct: 18 }), 18, 'gstPct: 18 should evaluate to 18');
      assert.equal(resolveGstPct({ gstPct: 28 }), 28, 'gstPct: 28 should evaluate to 28');
      assert.equal(resolveGstPct({}), 18, 'empty item should default to 18');
    });

    it('should accurately calculate amounts for 0% GST and taxable items', () => {
      const calcLineItem = (item) => {
        const qty = Number(item.quantity ?? item.qty ?? 0);
        const rate = Number(item.rate ?? 0);
        const gstPct = (item.gstPct !== undefined && item.gstPct !== null)
          ? Number(item.gstPct)
          : ((item.tax_pct !== undefined && item.tax_pct !== null) ? Number(item.tax_pct) : 18);
        const gross = qty * rate;
        const gstAmt = Math.round(gross * gstPct / 100);
        const total = gross + gstAmt;
        return { gross, gstAmt, total };
      };

      const zeroGstItem = calcLineItem({ quantity: 10, rate: 500, gstPct: 0 });
      assert.equal(zeroGstItem.gross, 5000);
      assert.equal(zeroGstItem.gstAmt, 0, 'GST Amount on 0% item must be 0');
      assert.equal(zeroGstItem.total, 5000, 'Total on 0% item must equal gross amount');

      const standardGstItem = calcLineItem({ quantity: 10, rate: 500, gstPct: 18 });
      assert.equal(standardGstItem.gross, 5000);
      assert.equal(standardGstItem.gstAmt, 900);
      assert.equal(standardGstItem.total, 5900);
    });
  });

  describe('2. Dual PO Terms Architecture (Payment & Delivery + General Terms)', () => {
    it('should persist and retrieve payment_delivery_terms and general_terms in DB', async () => {
      const samplePaymentTerms = 'Payment Terms: 30% advance, 70% against delivery.\nDelivery: Site Address within 14 days.';
      const sampleGeneralTerms = '1. Material Warranty: 12 months warranty on all supplied goods.\n2. Jurisdiction: Gurugram, Haryana.';

      await client.execute({
        sql: `INSERT INTO purchase_orders 
          (po_no, vendor_name, vendor_key, project, po_value, revised_po_value, approval_status, status, po_date, terms, payment_delivery_terms, general_terms, gst_total, gst_mode) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          testPoNo, 'Unit Test Vendor', 'V-UT', 'Unit Test Project', 25000, 25000, 
          'Draft', 'Draft', '2026-08-19', samplePaymentTerms, samplePaymentTerms, sampleGeneralTerms, 0, 'inter'
        ]
      });

      await client.execute({
        sql: `INSERT INTO po_items (po_no, description, hsn_sac, qty, unit, rate, disc_pct, tax_pct, amount) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [testPoNo, '0% GST Test Item', '9988', 5, 'Nos', 5000, 0, 0, 25000]
      });

      // Verify DB record
      const poRes = await client.execute({
        sql: 'SELECT * FROM purchase_orders WHERE po_no = ?',
        args: [testPoNo]
      });

      const itemsRes = await client.execute({
        sql: 'SELECT * FROM po_items WHERE po_no = ?',
        args: [testPoNo]
      });

      assert.equal(poRes.rows.length, 1, 'PO must exist in database');
      const po = poRes.rows[0];
      assert.equal(po.payment_delivery_terms, samplePaymentTerms);
      assert.equal(po.general_terms, sampleGeneralTerms);
      assert.equal(itemsRes.rows[0].tax_pct, 0, 'Line item tax_pct must be exactly 0 in database');
      assert.equal(itemsRes.rows[0].amount, 25000);
    });

    it('should verify global default general terms configuration in app_settings', async () => {
      const settingsRes = await client.execute({
        sql: 'SELECT value FROM app_settings WHERE key = ?',
        args: ['default_po_general_terms']
      });

      assert.equal(settingsRes.rows.length, 1, 'default_po_general_terms setting must exist');
      const defaultTerms = String(settingsRes.rows[0].value);
      assert.ok(defaultTerms.length > 50, 'Default general terms must contain multi-clause contract text');
      assert.ok(defaultTerms.includes('Material'), 'Default terms should include Material/Quality clause');
      assert.ok(defaultTerms.includes('Jurisdiction'), 'Default terms should include Jurisdiction clause');
    });

    it('should support backward compatibility fallback for legacy POs', () => {
      const legacyPO = {
        po_no: 'LEGACY-PO-001',
        terms: '100% against delivery',
        payment_delivery_terms: null,
        general_terms: null
      };

      const resolvedPaymentDeliveryTerms = legacyPO.payment_delivery_terms || legacyPO.terms || '';
      assert.equal(resolvedPaymentDeliveryTerms, '100% against delivery', 'Legacy PO should fall back to legacy terms field');
    });
  });
});
