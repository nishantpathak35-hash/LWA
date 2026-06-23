const fs = require('fs');
const content = fs.readFileSync('public/index_legacy.html', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('function renderDashboard')) {
    console.log(`Line ${index + 1}: ${line}`);
    // Print 100 lines following this
    console.log(lines.slice(index, index + 150).join('\n'));
  }
});
