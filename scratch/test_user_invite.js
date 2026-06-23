import 'dotenv/config';
import * as api from '../app/lib/api.js';

async function testInvite() {
  console.log('Sending invitation via inviteUserAdmin API...');
  
  const testEmail = 'nishantpathak35@gmail.com';
  const payload = {
    email: testEmail,
    name: 'Verification User',
    roles: ['admin', 'finance']
  };
  const session = { email: 'admin@luxeworx.com' };

  try {
    const result = await api.inviteUserAdmin(payload, session);
    console.log('API Result:', result);
    
    if (result.emailSent) {
      console.log('Success! Invite email was successfully sent via Brevo.');
    } else {
      console.log('Failure: Invite API returned emailSent = false.');
    }
  } catch (err) {
    console.error('API Error:', err.message);
  }
}

testInvite();
