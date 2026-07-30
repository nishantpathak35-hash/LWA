import 'dotenv/config';
import { sendPOToVendor } from '../app/lib/api/purchase-orders/other.js';

async function main() {
  const session = { email: 'nishant@luxeworxatelier.com', roles: ['admin'] };
  try {
    console.log('Sending test email for LAIPL/PO/26-27/068...');
    const result = await sendPOToVendor('LAIPL/PO/26-27/068', 'nishantpathak35@gmail.com', null, session);
    console.log('SUCCESS:', result);
  } catch (err) {
    console.error('FAILED TO SEND EMAIL:', err);
  }
  process.exit(0);
}

main();
