const fs = require('fs');
const file = 'app/lib/api/dashboard.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /address: v\.address \|\| ''\r?\n\s*}\)\);/g,
  "address: v.address || '',\n    email: v.email || v.contact_email || ''\n  }));"
);

fs.writeFileSync(file, content);
console.log('patched dashboard.js');
