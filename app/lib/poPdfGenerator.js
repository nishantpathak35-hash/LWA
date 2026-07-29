import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Convert number to words in Indian format (Lakh/Crore)
function amountToWords(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function twoD(x) {
    if (x < 20) return ones[x];
    return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
  }
  
  function threeD(x) {
    const h = Math.floor(x / 100);
    const r = x % 100;
    return (h ? ones[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? twoD(r) : '');
  }
  
  let out = '';
  let rem = n;
  const crore = Math.floor(rem / 10000000); rem %= 10000000;
  const lakh = Math.floor(rem / 100000); rem %= 100000;
  const thou = Math.floor(rem / 1000); rem %= 1000;
  const hund = rem;
  
  if (crore) out += threeD(crore) + ' Crore ';
  if (lakh) out += twoD(lakh) + ' Lakh ';
  if (thou) out += threeD(thou) + ' Thousand ';
  if (hund) out += threeD(hund);
  
  return out.trim() + ' Rupees Only';
}

export function generatePOPdf(
  po,
  items = [],
  vendor = null,
  projectMaster = null,
  companyDetails = {}
) {
  const companyName = companyDetails.name || 'LUXEWORX ATELIER INTERIOR PRIVATE LIMITED';
  const companyAddress = companyDetails.address || '8th Floor, Magnum Towers-1\nGolf Course Ext Rd\nGurugram Haryana 122001';
  const companyGstin = companyDetails.gstin || '06AAGCL1112M1ZP';
  const companyPan = companyGstin.length >= 12 ? companyGstin.substring(2, 12) : 'AAGCL1112M';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const darkColor = [17, 24, 39]; // slate-900
  const grayColor = [100, 116, 139]; // slate-500
  const lightBg = [248, 250, 252]; // slate-50

  // 1. Header Block
  doc.setFontSize(13);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  const splitTitle = doc.splitTextToSize(companyName, 115);
  doc.text(splitTitle, 14, 18);
  
  let currentY = 18 + (splitTitle.length * 5);
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  companyAddress.split('\n').forEach(line => {
    doc.text(line, 14, currentY);
    currentY += 4;
  });
  doc.text(`GSTIN: ${companyGstin}   PAN: ${companyPan}`, 14, currentY);
  currentY += 6;

  // Title "PURCHASE ORDER" on Top Right
  doc.setFontSize(15);
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.setFont('helvetica', 'bold');
  doc.text("PURCHASE ORDER", 196, 18, { align: 'right' });
  
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkColor);
  doc.text(`PO NO: ${po.po_no}`, 196, 25, { align: 'right' });
  doc.text(`DATE: ${po.po_date || '—'}`, 196, 30, { align: 'right' });
  doc.text(`STATUS: ${po.status || 'APPROVED'}`, 196, 35, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, currentY, 196, currentY);
  currentY += 5;

  // 2. Vendor & Shipping Boxes (2 Columns)
  const boxWidth = 88;
  const boxHeight = 36;
  
  // Left Box: Vendor / Supplier
  doc.setFillColor(...lightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...grayColor);
  doc.text("VENDOR / SUPPLIER", 18, currentY + 5);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text(po.vendor_name || 'N/A', 18, currentY + 10);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let vendorLineY = currentY + 15;
  if (vendor?.vendor_code) { doc.text(`Code: ${vendor.vendor_code}`, 18, vendorLineY); vendorLineY += 4; }
  if (vendor?.gstin) { doc.text(`GSTIN: ${vendor.gstin}`, 18, vendorLineY); vendorLineY += 4; }
  if (vendor?.pan) { doc.text(`PAN: ${vendor.pan}`, 18, vendorLineY); vendorLineY += 4; }
  if (vendor?.address) {
    const splitAddr = doc.splitTextToSize(vendor.address, boxWidth - 8);
    doc.text(splitAddr.slice(0, 2), 18, vendorLineY);
  }

  // Right Box: Shipping & Project Info
  const rightBoxX = 108;
  doc.setFillColor(...lightBg);
  doc.roundedRect(rightBoxX, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...grayColor);
  doc.text("SHIPPING & PROJECT INFO", rightBoxX + 4, currentY + 5);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text(po.project || companyName, rightBoxX + 4, currentY + 10);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project Ref: ${projectMaster?.project_ref || '—'}`, rightBoxX + 4, currentY + 15);
  doc.text(`Client: ${projectMaster?.client || '—'}`, rightBoxX + 4, currentY + 19);
  const siteAddr = projectMaster?.site_address || `Site Delivery, C/O Project: ${po.project || ''}`;
  const splitSite = doc.splitTextToSize(`Site Address: ${siteAddr}`, boxWidth - 8);
  doc.text(splitSite.slice(0, 3), rightBoxX + 4, currentY + 23);

  currentY += boxHeight + 6;

  // 3. Line Items Table
  const formatMoney = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const tableColumn = ["#", "Description", "HSN/SAC", "Qty", "Unit", "Rate (Rs)", "Amount (Rs)"];
  const tableRows = (items || []).map((item, index) => [
    index + 1,
    item.description || item.desc || '',
    item.hsn_sac || '—',
    item.qty || 1,
    item.unit || item.uom || 'Nos',
    formatMoney(item.rate),
    formatMoney((Number(item.qty) || 0) * (Number(item.rate) || 0))
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 8 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 68 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // 4. Financial Calculations & Words Box
  const subtotal = (items || []).reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.rate) || 0)), 0);
  const gstPct = po.tax_pct !== undefined && po.tax_pct !== null ? Number(po.tax_pct) : 18;
  const gstAmount = Math.round(subtotal * (gstPct / 100));
  const tdsPct = po.tds_pct !== undefined && po.tds_pct !== null ? Number(po.tds_pct) : 0;
  const tdsAmount = Math.round(subtotal * (tdsPct / 100));
  const calcGrandTotal = subtotal + gstAmount - tdsAmount;
  const grandTotal = Number(po.revised_po_value || po.po_value || calcGrandTotal);

  // Left side: Total in Words Box
  const wordsBoxWidth = 92;
  doc.setFillColor(254, 243, 199); // amber-100/50
  doc.setDrawColor(217, 119, 6); // amber-600
  doc.setLineWidth(0.8);
  doc.roundedRect(14, currentY, wordsBoxWidth, 24, 1, 1, 'FD');
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text("TOTAL IN WORDS:", 17, currentY + 5);
  
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(120, 53, 15);
  const splitWords = doc.splitTextToSize(amountToWords(grandTotal), wordsBoxWidth - 6);
  doc.text(splitWords, 17, currentY + 11);

  // Right side: Totals Summary Box
  const totalsBoxX = 110;
  const totalsBoxWidth = 86;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalsBoxX, currentY, totalsBoxWidth, 24, 1, 1, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkColor);
  doc.text("Subtotal (Taxable):", totalsBoxX + 4, currentY + 5);
  doc.text(`Rs. ${formatMoney(subtotal)}`, totalsBoxX + totalsBoxWidth - 4, currentY + 5, { align: 'right' });

  doc.text(`GST (+${gstPct}%):`, totalsBoxX + 4, currentY + 10);
  doc.text(`Rs. ${formatMoney(gstAmount)}`, totalsBoxX + totalsBoxWidth - 4, currentY + 10, { align: 'right' });

  if (tdsAmount > 0) {
    doc.text(`TDS Deduction (-${tdsPct}%):`, totalsBoxX + 4, currentY + 15);
    doc.text(`-Rs. ${formatMoney(tdsAmount)}`, totalsBoxX + totalsBoxWidth - 4, currentY + 15, { align: 'right' });
  }

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text("Grand Total:", totalsBoxX + 4, currentY + 20);
  doc.text(`Rs. ${formatMoney(grandTotal)}`, totalsBoxX + totalsBoxWidth - 4, currentY + 20, { align: 'right' });

  currentY += 28;

  // 5. Terms & Conditions Section
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text("TERMS & CONDITIONS", 14, currentY);
  currentY += 4;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);

  const defaultTerms = [
    "1. Material must match specifications exactly; any deviations require written approval prior to dispatch.",
    "2. Delivery to be completed on or before the Expected Delivery Date. Delays may attract penalty.",
    "3. Invoice must reference this Purchase Order number and should be sent to billing.",
    "4. Payment will be processed strictly as per the Payment Terms agreed in the Vendor master contract.",
    "5. All disputes are subject to Gurugram jurisdiction."
  ];

  const termsText = po.terms ? po.terms : defaultTerms.join("\n");
  const splitTerms = doc.splitTextToSize(termsText, 182);
  doc.text(splitTerms, 14, currentY);

  currentY += Math.max(14, splitTerms.length * 3.2);

  // 6. Signatures Block at Bottom
  const sigY = currentY + 12;
  
  // Left: Vendor Acceptance
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(20, sigY, 70, sigY);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text("Vendor Acceptance", 45, sigY + 4, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text("Signature & Company Seal", 45, sigY + 7, { align: 'center' });

  // Right: Authorised Signatory
  doc.line(140, sigY, 190, sigY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text("Authorised Signatory", 165, sigY + 4, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  doc.text(`For ${companyName}`, 165, sigY + 7, { align: 'center' });

  // Return Base64 String
  const dataUri = doc.output('datauristring');
  return {
    filename: `${po.po_no.replace(/\//g, '_')}.pdf`,
    content: dataUri.split(',')[1]
  };
}
