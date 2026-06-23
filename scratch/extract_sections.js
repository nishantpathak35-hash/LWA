const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');

const reportsSection = lines.slice(11430, 11785).join('\n');
fs.writeFileSync('scratch/renderReports.js', reportsSection, 'utf8');
console.log('Saved reports section to scratch/renderReports.js');

const settingsSection = lines.slice(10600, 11300).join('\n');
fs.writeFileSync('scratch/renderSettings.js', settingsSection, 'utf8');
console.log('Saved settings section to scratch/renderSettings.js');
