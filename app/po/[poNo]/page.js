import { queryGet, queryAll } from '../../../app/lib/db.js';
import fs from 'fs';
import path from 'path';

export default async function POPdfPage({ params }) {
  const { poNo } = await params;
  const decodedPoNo = decodeURIComponent(poNo);

  // Fetch Company Settings from app_settings
  let companyName = 'LUXEWORX ATELIER INTERIOR PRIVATE LIMITED';
  let companyAddress = '8th Floor, Magnum Towers-1\nGolf Course Ext Rd\nGurugram Haryana 122001';
  let companyGstin = '06AAGCL1112M1ZP';
  
  try {
    const companyNameRow = await queryGet(`SELECT value FROM app_settings WHERE key = 'company_name'`);
    if (companyNameRow && companyNameRow.value) companyName = companyNameRow.value;
    
    const companyAddressRow = await queryGet(`SELECT value FROM app_settings WHERE key = 'company_address'`);
    if (companyAddressRow && companyAddressRow.value) companyAddress = companyAddressRow.value;
    
    const companyGstinRow = await queryGet(`SELECT value FROM app_settings WHERE key = 'company_gstin'`);
    if (companyGstinRow && companyGstinRow.value) companyGstin = companyGstinRow.value;
  } catch (e) {
    console.error("Failed to query app_settings:", e.message);
  }

  const getPanFromGstin = (gstinStr) => {
    if (gstinStr && gstinStr.length >= 12) {
      return gstinStr.substring(2, 12);
    }
    return 'AAGCL1112M'; // fallback
  };
  const companyPan = getPanFromGstin(companyGstin);

  // Fetch Logo
  let logoUri = '';
  try {
    let rawLogo = '';
    const logoRow = await queryGet(`SELECT value FROM app_settings WHERE key = 'company_logo'`);
    if (logoRow && logoRow.value) {
      rawLogo = logoRow.value.trim();
    }
    
    if (!rawLogo) {
      const cleanLogoPath = path.join(process.cwd(), 'public', 'branding', 'LWA_PRIMARY_LOGO_CLEAN.png');
      const goldLogoPath = path.join(process.cwd(), 'public', 'branding', 'LWA_PRIMARY_LOGO_2_GOLD.png');
      const scratchLogoPath = path.join(process.cwd(), 'scratch', 'logo_uri.txt');
      if (fs.existsSync(cleanLogoPath)) {
        rawLogo = `data:image/png;base64,${fs.readFileSync(cleanLogoPath).toString('base64')}`;
      } else if (fs.existsSync(goldLogoPath)) {
        rawLogo = `data:image/png;base64,${fs.readFileSync(goldLogoPath).toString('base64')}`;
      } else if (fs.existsSync(scratchLogoPath)) {
        rawLogo = fs.readFileSync(scratchLogoPath, 'utf8').trim();
      }
    }

    if (rawLogo) {
      if (rawLogo.startsWith('data:') || rawLogo.startsWith('http') || rawLogo.startsWith('/')) {
        logoUri = rawLogo;
      } else {
        logoUri = `data:image/png;base64,${rawLogo}`;
      }
    }
  } catch (e) {
    console.error("Failed to check logo existence:", e.message);
  }

  // Read Signature & Stamp Logo
  let signatureUri = '';
  try {
    const sigPath = path.join(process.cwd(), 'public', 'branding', 'Logo.jpeg');
    if (fs.existsSync(sigPath)) {
      const imgBuffer = fs.readFileSync(sigPath);
      signatureUri = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;
    }
  } catch (e) {
    console.error("Failed to load signature image:", e.message);
  }

  // Fetch PO Header
  const po = await queryGet('SELECT * FROM purchase_orders WHERE po_no = ?', [decodedPoNo]);
  if (!po) {
    return (
      <div className="p-8 text-center text-red-500 font-sans">
        <h1 className="text-xl font-semibold">Error</h1>
        <p>Purchase Order {decodedPoNo} not found.</p>
      </div>
    );
  }

  // Fetch Vendor Details
  const vendor = await queryGet('SELECT * FROM vendors WHERE vendor_code = ? OR legal_name = ?', [po.vendor_key, po.vendor_name]);

  // Fetch Project Master Details
  let projectMaster = null;
  if (po.project) {
    try {
      projectMaster = await queryGet('SELECT * FROM project_financials WHERE project = ?', [po.project]);
    } catch (e) {
      console.error("Failed to fetch project master:", e.message);
    }
  }

  // Fetch PO Line Items
  const items = await queryAll('SELECT * FROM po_items WHERE po_no = ?', [decodedPoNo]);

  // Format Date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Convert number to words in Indian format (Lakh/Crore)
  const amountToWords = (num) => {
    const n = Math.round(Number(num) || 0);
    if (n === 0) return 'Zero Rupees';
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
    if (thou) out += twoD(thou) + ' Thousand ';
    if (hund) out += threeD(hund);
    
    return out.trim() + ' Rupees Only';
  };

  // Compute values
  const subtotal = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.rate) || 0), 0);
  const gstPct = po.tax_pct !== undefined && po.tax_pct !== null ? Number(po.tax_pct) : 18;
  const gstAmount = Math.round(subtotal * (gstPct / 100));
  const tdsPct = po.tds_pct !== undefined && po.tds_pct !== null ? Number(po.tds_pct) : 0;
  const tdsAmount = Math.round(subtotal * (tdsPct / 100));
  const grandTotal = subtotal + gstAmount - tdsAmount;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 print:p-0 print:bg-white text-gray-900 font-serif">
      {/* Action bar (non-printable) */}
      <div className="no-print mb-4 p-4 bg-white shadow-md rounded-lg flex justify-between items-center font-sans text-sm max-w-4xl mx-auto border border-gray-200">
        <div>
          <span className="font-semibold text-gray-800">Purchase Order Print Preview</span>
          <p className="text-xs text-gray-500 mt-0.5">Use the print button or browser dialog (Ctrl+P) to print or save as PDF.</p>
        </div>
        <div className="flex gap-3">
          <button
            id="po-close-btn"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            id="po-print-btn"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-md transition-colors cursor-pointer"
          >
            Print PO / Save PDF
          </button>
        </div>
      </div>

      {/* Printable PO Sheet */}
      <div className="printable-sheet bg-white border border-gray-300 p-5 md:p-6 print:p-0 max-w-4xl mx-auto shadow-sm relative text-gray-900">
        {po.status === 'Draft' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center opacity-10 pointer-events-none overflow-hidden" style={{ transform: 'rotate(-45deg)' }}>
            <span className="text-[120px] font-black text-gray-500 whitespace-nowrap">DRAFT ORDER</span>
          </div>
        )}
        
        {/* Header Block */}
        <div className="flex justify-between items-start border-b border-gray-300 pb-2.5 mb-3 print:pb-1.5 print:mb-2 gap-4">
          <div className="flex-1 min-w-0">
            {logoUri && (
              <div className="h-10 mb-1 flex items-center">
                <img src={logoUri} alt="Company Logo" className="h-10 max-w-[220px] object-contain" />
              </div>
            )}
            <h1 className="text-sm font-bold tracking-wide text-gray-900 font-sans uppercase break-words leading-tight">
              {companyName}
            </h1>
            <div className="mt-0.5 text-[10px] font-sans text-gray-600 space-y-0.5 leading-tight whitespace-pre-line">
              {companyAddress}
              <div className="pt-0.5 flex gap-4 text-[10px]">
                <p><span className="font-semibold text-gray-800">GSTIN:</span> {companyGstin}</p>
                <p><span className="font-semibold text-gray-800">PAN:</span> {companyPan}</p>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <h2 className="text-base font-bold tracking-wider text-amber-700 uppercase">Purchase Order</h2>
            <div className="mt-1 text-xs font-sans text-gray-600 space-y-0.5">
              <p><span className="text-gray-500">PO NO:</span> <strong className="text-gray-800 text-xs font-semibold">{po.po_no}</strong></p>
              <p><span className="text-gray-500">DATE:</span> <strong className="text-gray-800">{formatDate(po.po_date)}</strong></p>
              <p><span className="text-gray-500">STATUS:</span> <span className="uppercase text-amber-700 font-semibold">{po.status || 'Active'}</span></p>
            </div>
          </div>
        </div>

        {/* Parties Address block */}
        <div className="grid grid-cols-2 gap-3 mb-3 print:mb-2">
          <div className="border border-gray-300 p-2.5 rounded-md bg-gray-50/50">
            <h3 className="text-[10px] font-sans font-bold text-gray-600 uppercase tracking-wider mb-0.5">Vendor / Supplier</h3>
            <div className="text-[11px] font-sans space-y-0.5">
              <p className="font-bold text-gray-900 text-xs font-serif">{po.vendor_name}</p>
              {vendor?.vendor_code && <p><span className="text-gray-500">Code:</span> {vendor.vendor_code}</p>}
              {vendor?.gstin && <p><span className="text-gray-500">GSTIN:</span> {vendor.gstin}</p>}
              {vendor?.pan && <p><span className="text-gray-500">PAN:</span> {vendor.pan}</p>}
              {vendor?.address && <p className="text-[10.5px] text-gray-600 mt-0.5 whitespace-pre-line leading-tight">{vendor.address}</p>}
            </div>
          </div>
          
          <div className="border border-gray-300 p-2.5 rounded-md bg-gray-50/50">
            <h3 className="text-[10px] font-sans font-bold text-gray-600 uppercase tracking-wider mb-0.5">Shipping & Project Info</h3>
            <div className="text-[11px] font-sans space-y-0.5">
              <p className="font-bold text-gray-900 text-xs font-serif">{po.project || companyName}</p>
              
              <div className="grid grid-cols-[75px_1fr] gap-x-1.5 gap-y-0.5 mt-0.5 text-[10.5px]">
                <span className="text-gray-500">Project Ref:</span>
                <span className="font-medium text-gray-800">{projectMaster?.project_ref || '—'}</span>
                
                <span className="text-gray-500">Client:</span>
                <span className="font-medium text-gray-800">{projectMaster?.client || '—'}</span>
                
                <span className="text-gray-500">Site Address:</span>
                <span className="text-gray-600 whitespace-pre-line leading-tight">
                  {projectMaster?.site_address || `Site Delivery, C/O Project: ${po.project || ''}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-3 print:mb-2 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-xs font-sans table-fixed" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr className="bg-gray-100 text-gray-800 border-b border-gray-300 font-bold">
                <th className="border border-gray-300 px-2 py-1 text-center" style={{ width: '5%' }}>#</th>
                <th className="border border-gray-300 px-2 py-1 text-left" style={{ width: '43%' }}>Description</th>
                <th className="border border-gray-300 px-2 py-1 text-center" style={{ width: '11%' }}>HSN/SAC</th>
                <th className="border border-gray-300 px-2 py-1 text-center" style={{ width: '7%' }}>Qty</th>
                <th className="border border-gray-300 px-2 py-1 text-center" style={{ width: '8%' }}>Unit</th>
                <th className="border border-gray-300 px-2 py-1 text-right" style={{ width: '13%' }}>Rate (INR)</th>
                <th className="border border-gray-300 px-2 py-1 text-right" style={{ width: '13%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="border border-gray-300 p-2 text-center text-gray-400 italic">No line items specified</td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="border border-gray-300 px-2 py-1 text-center align-top">{idx + 1}</td>
                    <td className="border border-gray-300 px-2 py-1 font-serif text-[11px] align-top whitespace-pre-wrap break-words leading-tight" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{it.description}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center align-top font-mono text-[10.5px]">{it.hsn_sac || '—'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center align-top font-sans">{it.qty}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center align-top font-sans">{it.unit || 'Nos'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right align-top font-sans">{Number(it.rate).toLocaleString('en-IN')}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right align-top font-medium font-sans">
                      ₹{((Number(it.qty) || 0) * (Number(it.rate) || 0)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary & Financial Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start mb-3 print:mb-2">
          <div className="space-y-1.5">
            <div className="p-2 bg-amber-50/50 border-l-4 border-amber-600 text-xs font-sans text-gray-700 rounded-r-md">
              <strong className="text-gray-800 text-[10px] uppercase tracking-wide">Total in Words:</strong>
              <p className="mt-0.5 font-serif text-[11px] italic font-semibold text-amber-900 leading-tight">
                {amountToWords(po.po_value || grandTotal)}
              </p>
            </div>
            
            {po.remarks && (
              <div className="p-1.5 bg-gray-50 border border-gray-200 text-[10px] font-sans text-gray-700 rounded-md">
                <strong className="text-gray-800">Remarks / Notes:</strong>
                <p className="mt-0.5 text-gray-600 leading-tight whitespace-pre-line">{po.remarks}</p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-300 rounded-md p-2 font-sans text-xs space-y-0.5">
            <div className="flex justify-between pb-0.5 border-b border-gray-200">
              <span className="text-gray-600">Subtotal (Taxable):</span>
              <span className="font-semibold text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pb-0.5 border-b border-gray-200">
              <span className="text-gray-600">GST (+{gstPct}%):</span>
              <span className="font-semibold text-gray-900">₹{gstAmount.toLocaleString('en-IN')}</span>
            </div>
            {tdsAmount > 0 && (
              <div className="flex justify-between pb-0.5 border-b border-gray-200">
                <span className="text-gray-600">TDS Deduction (-{tdsPct}%):</span>
                <span className="font-semibold text-red-600">-₹{tdsAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between pt-0.5 text-xs font-bold text-gray-900">
              <span>Grand Total:</span>
              <span className="text-amber-800 font-serif text-sm">₹{Number(po.po_value || grandTotal).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions and Signatures Block */}
        <div className="pt-1.5 border-t border-gray-300">
          <div className="mb-2">
            <h3 className="text-[10px] font-sans font-bold text-gray-700 uppercase tracking-wider mb-1">Terms &amp; Conditions</h3>
            {po.terms ? (
              <div className="text-[9px] text-gray-700 font-sans leading-tight whitespace-pre-wrap">
                {po.terms}
              </div>
            ) : (
              <ol className="list-decimal list-inside text-[9px] text-gray-600 font-sans space-y-0.5 leading-tight">
                <li>Material must match specifications exactly; any deviations require written approval prior to dispatch.</li>
                <li>Delivery to be completed on or before the Expected Delivery Date. Delays may attract penalty.</li>
                <li>Invoice must reference this Purchase Order number and should be sent to billing.</li>
                <li>Payment will be processed strictly as per the Payment Terms agreed in the Vendor master contract.</li>
                <li>All disputes are subject to Gurugram jurisdiction.</li>
              </ol>
            )}
          </div>

          {/* Signatures block */}
          <div className="grid grid-cols-2 gap-6 pt-1">
            <div className="text-center font-sans flex flex-col items-center justify-end">
              <div className="h-10 mb-0.5 flex items-end justify-center">
                {/* Empty space for vendor signature */}
              </div>
              <div className="w-40 border-t border-gray-400 mx-auto pt-0.5">
                <p className="text-[10px] font-bold text-gray-800">Vendor Acceptance</p>
                <p className="text-[8.5px] text-gray-500">Signature &amp; Company Seal</p>
              </div>
            </div>
            
            <div className="text-center font-sans flex flex-col items-center justify-end">
              <div className="h-10 mb-0.5 flex items-end justify-center">
                {(po.status === 'Approved' && signatureUri) && (
                  <img src={signatureUri} alt="Signature & Stamp" className="h-10 w-auto object-contain opacity-95" />
                )}
              </div>
              <div className="w-40 border-t border-gray-400 mx-auto pt-0.5">
                <p className="text-[10px] font-bold text-gray-800">Authorised Signatory</p>
                <p className="text-[8.5px] text-gray-500">For {companyName}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Printing style overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 8mm;
          }
          html, body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-sheet {
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: none !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('po-close-btn').addEventListener('click', function() { window.close(); });
        document.getElementById('po-print-btn').addEventListener('click', function() { window.print(); });
      `}} />
    </div>
  );
}
