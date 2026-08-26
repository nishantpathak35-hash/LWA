const http = require('http');

const urls = [
  'http://localhost:3005/',
  'http://localhost:3005/privacy',
  'http://localhost:3005/terms',
  'http://localhost:3005/security',
  'http://localhost:3005/contact'
];

let pending = urls.length;

urls.forEach(url => {
  http.get(url, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`[PASS] ${url} -> Status: ${res.statusCode} | Length: ${data.length} bytes`);
      pending--;
      if (pending === 0) process.exit(0);
    });
  }).on('error', err => {
    console.error(`[FAIL] ${url} -> Error: ${err.message}`);
    pending--;
    if (pending === 0) process.exit(1);
  });
});
