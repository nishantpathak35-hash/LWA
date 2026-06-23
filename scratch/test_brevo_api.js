import 'dotenv/config';

async function testBrevo() {
  const brevoPayload = {
    sender: { name: 'Test', email: process.env.BREVO_FROM_EMAIL || 'accounts@luxeworxatelier.com' },
    to: [{ email: 'newuser@example.com' }],
    subject: 'Test',
    htmlContent: '<p>Test</p>'
  };
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(brevoPayload)
  });
  console.log(response.status);
  const text = await response.text();
  console.log(text);
}
testBrevo();
