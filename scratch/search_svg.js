const fs = require('fs');
const content = fs.readFileSync('public/index_legacy.html', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('function donutSVG') || line.includes('function sparklineSVG')) {
    console.log(`Line ${index + 1}: ${line}`);
    console.log(lines.slice(index, index + 35).join('\n'));
  }
});
