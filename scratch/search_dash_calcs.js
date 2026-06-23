const fs = require('fs');
const content = fs.readFileSync('public/index_legacy.html', 'utf8');
const lines = content.split('\n');

const start = lines.findIndex(l => l.includes('async function renderDashboard'));
console.log(lines.slice(start, start + 100).join('\n'));
