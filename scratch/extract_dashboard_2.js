const fs = require('fs');
const content = fs.readFileSync('public/index_legacy.html', 'utf8');
const lines = content.split('\n');

// Find index where renderDashboard function starts
const startIndex = lines.findIndex(l => l.includes('async function renderDashboard'));
console.log(`renderDashboard starts at line: ${startIndex + 1}`);
console.log(lines.slice(startIndex + 130, startIndex + 250).join('\n'));
