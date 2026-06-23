import 'dotenv/config';

const BREVO_API_KEY = process.env.BREVO_API_KEY; // Set via .env — never hardcode
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'admin@luxeworx.com';

async function test() {
  console.log('Sending test email via Brevo...');
  console.log('API Key (first 10 chars):', BREVO_API_KEY.slice(0, 10));
  console.log('Sender Email:', FROM_EMAIL);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'Luxeworx Finance',
          email: FROM_EMAIL
        },
        to: [
          {
            email: 'nishantpathak35@gmail.com', // Let's try sending to a Gmail address or test email
            name: 'Test Recipient'
          }
        ],
        subject: 'Test Email from Brevo Integration',
        htmlContent: '<h3>Hello!</h3><p>This is a test email validating the Brevo SMTP API key integration.</p>'
      })
    });

    console.log('HTTP Status:', response.status);
    const text = await response.text();
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

test();
