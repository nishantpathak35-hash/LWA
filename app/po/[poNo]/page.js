import { queryGet, queryAll } from '../../../app/lib/db.js';
import { formatCurrency } from '../../../app/lib/utils.js';
import fs from 'fs';
import path from 'path';

export default async function POPdfPage({ params }) {
  const { poNo } = await params;
  const decodedPoNo = decodeURIComponent(poNo);

  // Fetch Company Settings from app_settings
  let companyName = 'LUXEWORX ATELIER INTERIORS PRIVATE LIMITED';
  let companyAddress = '8th Floor, Magnum Towers-1\nGolf Course Ext Rd\nGurugram Haryana 122001';
  let companyGstin = '06AAGCL1112M1ZP';
  
  try {
    const companyNameRow = await queryGet(`SELECT value FROM app_settings WHERE key = 'company_name'`);
    if (companyNameRow) companyName = companyNameRow.value;
    
    const companyAddressRow = await queryGet(`SELECT value FROM app_settings WHERE key = 'company_address'`);
    if (companyAddressRow) companyAddress = companyAddressRow.value;
    
    const companyGstinRow = await queryGet(`SELECT value FROM app_settings WHERE key = 'company_gstin'`);
    if (companyGstinRow) companyGstin = companyGstinRow.value;
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

  // Read Logo
  let logoUri = '';
  try {
    logoUri = fs.readFileSync(path.join(process.cwd(), 'scratch', 'logo_uri.txt'), 'utf8');
  } catch (e) {
    try {
      const logoRow = await queryGet(`SELECT value FROM app_settings WHERE key = 'company_logo'`);
      if (logoRow) logoUri = logoRow.value;
    } catch (dbLogoErr) {
      console.error("Failed to load PO printable logo:", e.message);
    }
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
  // Get tax details from items or calculate based on PO value
  const gstPct = po.tax_pct || 18;
  const gstAmount = Math.round(subtotal * (gstPct / 100));
  const tdsPct = po.tds_pct || 2;
  const tdsAmount = Math.round(subtotal * (tdsPct / 100));
  const grandTotal = subtotal + gstAmount - tdsAmount;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-serif p-8 max-w-4xl mx-auto shadow-sm relative">
      {/* Action bar (non-printable) */}
      <div className="no-print mb-8 p-4 bg-slate-100 rounded-lg flex justify-between items-center font-sans text-sm">
        <div>
          <span className="font-semibold">Purchase Order Print Preview</span>
          <p className="text-xs text-slate-500 mt-0.5">Use the print dialog to save as a PDF file.</p>
        </div>
        <div className="flex gap-3">
          <button
            id="po-close-btn"
            className="px-4 py-2 bg-slate-200 hover:bg-slate-350 rounded-lg font-medium transition-colors cursor-pointer"
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
      <div className="border border-slate-300 p-8 md:p-10 space-y-8">
        
        {/* Header Block */}
        <div className="flex justify-between items-start border-b border-slate-350 pb-6 gap-6">
          <div className="flex-1 min-w-0">
            {logoUri && <img src={logoUri} alt="Company Logo" className="h-16 w-auto object-contain mb-3" />}
            <h1 className="text-xl font-bold tracking-wide text-slate-800 font-sans uppercase break-words leading-tight">
              {companyName}
            </h1>
            <div className="mt-3 text-xs font-sans text-slate-600 space-y-1 leading-relaxed whitespace-pre-line">
              {companyAddress}
              <div className="pt-2 space-y-0.5">
                <p><span className="font-semibold text-slate-800">GSTIN:</span> {companyGstin}</p>
                <p><span className="font-semibold text-slate-800">PAN:</span> {companyPan}</p>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <h2 className="text-xl font-semibold tracking-wider text-amber-700 uppercase">Purchase Order</h2>
            <div className="mt-4 text-xs font-sans text-slate-600 space-y-1.5">
              <p><span className="text-slate-400">PO NO:</span> <strong className="text-slate-800 text-sm">{po.po_no}</strong></p>
              <p><span className="text-slate-400">DATE:</span> <strong className="text-slate-800">{formatDate(po.po_date)}</strong></p>
              <p><span className="text-slate-400">STATUS:</span> <span className="uppercase text-amber-700 font-semibold">{po.status || 'Active'}</span></p>
            </div>
          </div>
        </div>

        {/* Parties Address block */}
        <div className="grid grid-cols-2 gap-8">
          <div className="border border-slate-200 p-4 rounded-lg bg-slate-50/50">
            <h3 className="text-xs font-sans font-bold text-slate-500 uppercase tracking-wider mb-2">Vendor / Supplier</h3>
            <div className="text-sm font-sans space-y-1">
              <p className="font-semibold text-slate-800 text-base font-serif">{po.vendor_name}</p>
              {vendor?.vendor_code && <p><span className="text-slate-500">Code:</span> {vendor.vendor_code}</p>}
              {vendor?.gstin && <p><span className="text-slate-500">GSTIN:</span> {vendor.gstin}</p>}
              {vendor?.pan && <p><span className="text-slate-500">PAN:</span> {vendor.pan}</p>}
              {vendor?.address && <p className="text-xs text-slate-600 mt-2 whitespace-pre-line leading-relaxed">{vendor.address}</p>}
            </div>
          </div>
          
          <div className="border border-slate-200 p-4 rounded-lg bg-slate-50/50">
            <h3 className="text-xs font-sans font-bold text-slate-500 uppercase tracking-wider mb-2">Shipping & Project Info</h3>
            <div className="text-sm font-sans space-y-1">
              <p className="font-semibold text-slate-800 text-base font-serif">{po.project || companyName}</p>
              <p><span className="text-slate-500">Project Ref:</span> <span className="font-medium text-slate-700">{po.project || '—'}</span></p>
              <p className="text-xs text-slate-600 mt-2 whitespace-pre-line leading-relaxed">
                {companyName} Site Delivery
                {po.project ? `\nC/O Project: ${po.project}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-xs font-sans">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <th className="border border-slate-300 p-2 text-center w-8">#</th>
                <th className="border border-slate-300 p-2 text-left">Description</th>
                <th className="border border-slate-300 p-2 text-center w-20">HSN/SAC</th>
                <th className="border border-slate-300 p-2 text-center w-12">Qty</th>
                <th className="border border-slate-300 p-2 text-center w-16">Unit</th>
                <th className="border border-slate-300 p-2 text-right w-24">Rate (INR)</th>
                <th className="border border-slate-300 p-2 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="border border-slate-300 p-4 text-center text-slate-400 italic">No line items specified</td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-serif text-[13px]">{it.description}</td>
                    <td className="border border-slate-300 p-2 text-center">{it.hsn_sac || '—'}</td>
                    <td className="border border-slate-300 p-2 text-center">{it.qty}</td>
                    <td className="border border-slate-300 p-2 text-center">{it.unit || 'Nos'}</td>
                    <td className="border border-slate-300 p-2 text-right">{Number(it.rate).toLocaleString('en-IN')}</td>
                    <td className="border border-slate-300 p-2 text-right font-medium">
                      ₹{((Number(it.qty) || 0) * (Number(it.rate) || 0)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary & Sign Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-4">
          <div className="space-y-4">
            <div className="p-3 bg-amber-50/40 border-l-4 border-amber-500 text-xs font-sans text-slate-700 rounded-r-lg">
              <strong className="text-slate-800">Total in Words:</strong>
              <p className="mt-1 font-serif text-[13px] italic font-semibold text-amber-900">
                {amountToWords(po.po_value || grandTotal)}
              </p>
            </div>
            
            {po.remarks && (
              <div className="p-3 bg-slate-50 border border-slate-200 text-xs font-sans text-slate-700 rounded-lg">
                <strong>Remarks / Notes:</strong>
                <p className="mt-1 text-slate-600 leading-relaxed whitespace-pre-line">{po.remarks}</p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-sans text-xs space-y-2">
            <div className="flex justify-between pb-1.5 border-b border-slate-200">
              <span className="text-slate-500">Subtotal (Taxable):</span>
              <span className="font-medium text-slate-800">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-slate-200">
              <span className="text-slate-500">GST (+{gstPct}%):</span>
              <span className="font-medium text-slate-800">₹{gstAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-slate-200">
              <span className="text-slate-500">TDS Deduction (-{tdsPct}%):</span>
              <span className="font-medium text-red-600">-₹{tdsAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-1.5 text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-amber-800 font-serif text-base">₹{Number(po.po_value || grandTotal).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Terms and Conditions block */}
        <div className="border-t border-slate-200 pt-6">
          <h4 className="text-xs font-sans font-bold text-slate-500 uppercase tracking-wider mb-2">Terms &amp; Conditions</h4>
          {po.terms ? (
            <div className="text-[11px] text-slate-600 font-sans whitespace-pre-line leading-relaxed">
              {po.terms}
            </div>
          ) : (
            <ol className="list-decimal list-inside text-[10px] text-slate-500 font-sans space-y-1 leading-relaxed">
              <li>Material must match specifications exactly; any deviations require written approval prior to dispatch.</li>
              <li>Delivery to be completed on or before the Expected Delivery Date. Delays may attract penalty.</li>
              <li>Invoice must reference this Purchase Order number and should be sent to billing.</li>
              <li>Payment will be processed strictly as per the Payment Terms agreed in the Vendor master contract.</li>
              <li>All disputes are subject to Mumbai jurisdiction.</li>
            </ol>
          )}
        </div>

        {/* Signatures block */}
        <div className="grid grid-cols-2 gap-8 pt-12">
          <div className="text-center font-sans">
            <div className="w-48 border-t border-slate-400 mx-auto pt-2">
              <p className="text-xs font-bold text-slate-700">Vendor Acceptance</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Signature &amp; Company Seal</p>
            </div>
          </div>
          <div className="text-center font-sans">
            <div className="w-48 border-t border-slate-400 mx-auto pt-2">
              <p className="text-xs font-bold text-slate-700">Authorised Signatory</p>
              <p className="text-[10px] text-slate-400 mt-0.5">For {companyName}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Printing style overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
          }
          .min-h-screen {
            min-height: auto !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .border {
            border: none !important;
          }
          .bg-slate-50\\/50 {
            background-color: transparent !important;
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
