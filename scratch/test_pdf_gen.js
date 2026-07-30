import 'dotenv/config';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

try {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFontSize(20);
  doc.text('LUXEWORX ATELIER INTERIOR PRIVATE LIMITED', 14, 20);
  autoTable(doc, {
    startY: 30,
    head: [['#', 'Item', 'Qty', 'Rate', 'Amount']],
    body: [[1, 'Tiles', 10, 500, 5000]]
  });
  const dataUri = doc.output('datauristring');
  console.log('PDF Generated Successfully! Base64 Length:', dataUri.length);
} catch (e) {
  console.error('PDF Generation Failed:', e);
}
