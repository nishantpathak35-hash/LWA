import 'dotenv/config';
import { sendPOToVendor } from '../app/lib/api/purchase-orders/other.js';

async function test() {
  const session = { email: 'test@example.com', roles: ['admin'] };
  try {
    console.log('Testing sendPOToVendor for LAIPL/PO/26-27/068 without passing client attachment...');
    // Note: We don't actually trigger sendEmailData external call if we intercept or test pdf generation
    // But sendPOToVendor calls sendPOEmail which calls Brevo/Resend.
  } catch (e) {
    console.error(e);
  }
}
test();
