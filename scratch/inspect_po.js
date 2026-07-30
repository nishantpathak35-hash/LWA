import 'dotenv/config';
import { queryAll, queryGet } from '../app/lib/db.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

async function main() {
  const poNo = process.argv[2] || 'LAIPL/PO/26-27/068';
  const po = await queryGet('SELECT rowid, * FROM purchase_orders WHERE po_no = ?', [poNo]);
  if (!po) {
    console.error('PO not found');
    process.exit(1);
  }

  const items = await queryAll('SELECT * FROM po_items WHERE po_no = ?', [poNo]);
  const vendor = await queryGet('SELECT * FROM vendors WHERE legal_name = ? OR vendor_code = ?', [po.vendor_name, po.vendor_key]);
  const atts = await queryAll('SELECT * FROM attachments WHERE entity_type = ? AND entity_id = ?', ['po', poNo]);
  const logs = await queryAll('SELECT * FROM audit_logs WHERE details LIKE ?', [`%${poNo}%`]);

  // 1. PDF Generation
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFontSize(20);
  doc.text('LUXEWORX ATELIER INTERIOR PRIVATE LIMITED', 14, 20);
  doc.setFontSize(16);
  doc.text('PURCHASE ORDER: ' + po.po_no, 196, 20, { align: 'right' });
  
  // Table
  const tableRows = items.map((item, idx) => [idx + 1, item.description || '', item.qty || 1, item.unit || 'Nos', item.rate, item.amount]);
  autoTable(doc, {
    startY: 40,
    head: [['#', 'Description', 'Qty', 'UOM', 'Rate', 'Amount']],
    body: tableRows,
  });

  const pdfArrayBuffer = doc.output('arraybuffer');
  const pdfBuffer = Buffer.from(pdfArrayBuffer);
  const pdfSize = pdfBuffer.length;

  // Pages
  const pdfPages = doc.internal.getNumberOfPages();

  // 2. HTML Generation (Email HTML template)
  const grandTotal = po.po_value || items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const formattedTotal = Number(grandTotal || 0).toLocaleString('en-IN');
  const recipientEmail = po.vendor_email || vendor?.email || vendor?.email_id || vendor?.contact_email || vendor?.email_address || 'HSTENOIDA2019@GMAIL.COM';

  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Purchase Order ${po.po_no}</title></head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;">
  <h2>Purchase Order ${po.po_no}</h2>
  <p>Dear <strong>${po.vendor_name}</strong>,</p>
  <p>Please find attached Purchase Order <strong>${po.po_no}</strong> for <strong>${po.project || 'N/A'}</strong>.</p>
  <p>Total Value: ₹${formattedTotal}</p>
</body>
</html>`;

  const htmlSize = Buffer.byteLength(htmlContent, 'utf8');

  // Attachment details
  const attachment = atts[0] || null;

  // Email status
  const emailLog = logs.find(l => l.action_type?.toLowerCase().includes('email') || l.details?.toLowerCase().includes('email'));

  const result = {
    po_id: po.rowid,
    po_no: po.po_no,
    vendor_name: po.vendor_name,
    html_generated: true,
    html_size: `${htmlSize} bytes (${(htmlSize / 1024).toFixed(2)} KB)`,
    pdf_generated: true,
    pdf_size: `${pdfSize} bytes (${(pdfSize / 1024).toFixed(2)} KB)`,
    pdf_pages: pdfPages,
    attachment_name: attachment ? attachment.file_name : 'N/A',
    attachment_mime_type: attachment ? attachment.file_type : 'N/A',
    attachment_bytes: attachment ? `${attachment.file_size} bytes (${(attachment.file_size / 1024).toFixed(2)} KB)` : '0 bytes',
    email_recipient: recipientEmail,
    email_sent_status: emailLog ? `Sent (${emailLog.timestamp})` : 'Not Sent / Draft'
  };

  console.log('--- PO INSPECTION RESULT ---');
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
