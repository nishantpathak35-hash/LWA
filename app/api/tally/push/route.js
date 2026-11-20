import { NextResponse } from 'next/server';
import { getMySession } from '../../../lib/api/auth.js';
import { generateTallyXML } from '../../../lib/ai/invoiceParser.js';

export async function POST(request) {
  const token = request.cookies?.get('lx_auth_token')?.value || request.headers.get('x-lwa-token');
  const session = token ? await getMySession(token).catch(() => null) : null;
  if (!session) return NextResponse.json({ error: 'Sign in to push to Tally' }, { status: 401 });
  if (!session.roles?.some(role => ['finance', 'accountant', 'admin', 'director'].includes(role))) {
    return NextResponse.json({ error: 'Finance access required' }, { status: 403 });
  }
  const endpoint = process.env.TALLY_SERVER_URL || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:9000' : '');
  if (!endpoint) return NextResponse.json({ error: 'Direct push is unconfigured. Download the XML and import it in Tally.' }, { status: 503 });
  try {
    const { invoice } = await request.json();
    if (!invoice?.vendorName || !invoice.invoiceNo || !invoice.date || !(Number(invoice.totalAmount) > 0) || !Number.isFinite(Number(invoice.totalAmount))) {
      return NextResponse.json({ error: 'Vendor, invoice number, date and positive amount are required.' }, { status: 400 });
    }
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/xml' },
      body: generateTallyXML(invoice), redirect: 'error', signal: AbortSignal.timeout(5000) });
    const result = await response.text();
    if (!response.ok || /<LINEERROR>/i.test(result) || /<ERRORS>\s*[1-9]/i.test(result) || !/<CREATED>\s*[1-9]\d*\s*<\/CREATED>/i.test(result)) {
      return NextResponse.json({ error: 'Tally did not confirm voucher creation. Check the import log before retrying.' }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'No confirmation from Tally. Check the ledger before retrying or importing the XML.' }, { status: 502 });
  }
}
