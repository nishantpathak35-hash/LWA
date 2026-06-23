const fs = require('fs');
const content = fs.readFileSync('app/lib/api.js', 'utf8');
const lines = content.split('\n');

const start = lines.findIndex(l => l.includes('function inviteUserAdmin'));
console.log(lines.slice(start, start + 30).join('\n'));
