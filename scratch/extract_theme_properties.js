const fs = require('fs');
const content = fs.readFileSync('public/index_legacy.html', 'utf8');
const lines = content.split('\n');

console.log(lines.slice(2270, 2330).join('\n'));
