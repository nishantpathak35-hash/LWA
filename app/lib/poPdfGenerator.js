import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generatePOPdf(po, items, companyName = 'LUXEWORX ATELIER INTERIOR PRIVATE LIMITED', companyAddress = '8th Floor, Magnum Towers-1\nGolf Course Ext Rd\nGurugram Haryana 122001') {
  // Use portrait A4
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const primaryColor = [200, 164, 90]; // #c8a45a (Gold)
  const darkColor = [30, 41, 59]; // slate-800
  
  // Clean Company Name and Address
  doc.setFontSize(20);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  const splitTitle = doc.splitTextToSize(companyName, 120);
  doc.text(splitTitle, 14, 20);
  
  // Title "PURCHASE ORDER" on the right
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text("PURCHASE ORDER", 196, 20, { align: 'right' });
  
  // Address
  let currentY = 20 + (splitTitle.length * 8);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  const addressLines = companyAddress.split('\n');
  addressLines.forEach((line) => {
    doc.text(line, 14, currentY);
    currentY += 4.5;
  });

  // Top Right Info Box
  autoTable(doc, {
    startY: 25,
    margin: { left: 140 },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1, textColor: darkColor },
    columnStyles: { 0: { fontStyle: 'bold', halign: 'right', cellWidth: 25 }, 1: { halign: 'right' } },
    body: [
      ['PO Number:', po.po_no],
      ['Date:', po.po_date || ''],
      ['Project:', po.project || 'N/A'],
    ],
  });

  currentY = Math.max(currentY, doc.lastAutoTable.finalY) + 10;
  
  // Divider
  doc.setDrawColor(226, 232, 240); // gray-200
  doc.setLineWidth(0.5);
  doc.line(14, currentY, 196, currentY);
  currentY += 8;

  // Vendor Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text("Vendor:", 14, currentY);
  
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(po.vendor_name || 'N/A', 14, currentY);
  if (po.vendor_email) {
    currentY += 4.5;
    doc.setTextColor(100, 100, 100);
    doc.text(`Email: ${po.vendor_email}`, 14, currentY);
  }
  if (po.vendor_phone) {
    currentY += 4.5;
    doc.text(`Phone: ${po.vendor_phone}`, 14, currentY);
  }
  
  currentY += 8;

  // Items Table
  const tableColumn = ["#", "Description", "Qty", "UOM", "Rate (Rs)", "Amount (Rs)"];
  const tableRows = [];

  const formatMoney = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  items.forEach((item, index) => {
    tableRows.push([
      index + 1,
      item.description || item.desc || '',
      item.qty || 1,
      item.uom || item.unit || 'Nos',
      formatMoney(item.rate),
      formatMoney(item.amount)
    ]);
  });

  autoTable(doc, {
    startY: currentY,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4, textColor: darkColor, lineColor: [226, 232, 240] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // Totals Box (Right Aligned)
  autoTable(doc, {
    startY: currentY,
    margin: { left: 130 },
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2, textColor: darkColor },
    columnStyles: { 0: { fontStyle: 'bold', halign: 'right' }, 1: { halign: 'right', fontStyle: 'bold' } },
    body: [
      ['Grand Total:', `Rs. ${formatMoney(po.po_value)}`],
    ],
  });

  currentY = doc.lastAutoTable.finalY + 15;

  // Terms
  if (po.terms) {
    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(14, currentY, 196, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text("Terms & Conditions:", 14, currentY);
    
    currentY += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    const splitTerms = doc.splitTextToSize(po.terms, 182);
    doc.text(splitTerms, 14, currentY);
  }

  // Output as base64
  const dataUri = doc.output('datauristring');
  return {
    filename: `${po.po_no.replace(/\//g, '_')}.pdf`,
    content: dataUri.split(',')[1] // extract just the base64 part
  };
}
