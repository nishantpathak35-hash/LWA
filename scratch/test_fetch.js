async function test() {
  const r = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'loginUser', args: ['admin@luxeworx.com', 'wrong'] })
  });
  console.log('Status:', r.status);
  const text = await r.text();
  console.log('Body:', text);
}
test();
