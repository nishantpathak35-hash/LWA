import 'dotenv/config';
import { sendPOEmail } from '../app/lib/email.js';
import { generatePOPdf } from '../app/lib/poPdfGenerator.js';

async function testWithAttachment() {
  console.log('Testing sendPOEmail WITH generated PDF attachment via Brevo...');

  const po = { po_no: 'TEST/PO/002', po_date: '2026-07-29', project: 'Test Project', vendor_name: 'Test Vendor', po_value: 5000, terms: 'Test Terms' };
  const items = [{ description: 'Test Item 1', qty: 2, rate: 2500, amount: 5000 }];
  const pdf = generatePOPdf(po, items);

  console.log('Generated PDF filename:', pdf.filename);
  console.log('Generated PDF content prefix:', pdf.content.substring(0, 30));
  console.log('Generated PDF content length:', pdf.content.length);

  try {
    const res = await sendPOEmail({
      toEmail: 'nishantpathak35@gmail.com',
      vendorName: 'Test Vendor',
      poNo: 'TEST/PO/002',
      project: 'Test Project',
      poDate: '2026-07-29',
      items: [{ desc: 'Test Item 1', qty: 2, unit: 'Nos', rate: 2500, amount: 5000 }],
      grandTotal: 5000,
      terms: 'Test Terms',
      attachments: [pdf]
    });
    console.log('Result from sendPOEmail with attachment:', res);
  } catch (err) {
    console.error('Error from sendPOEmail with attachment:', err);
  }
}

testWithAttachment();
