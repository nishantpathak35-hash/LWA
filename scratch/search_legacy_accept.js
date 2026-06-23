const fs = require('fs');
const content = fs.readFileSync('public/index_legacy.html', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('acceptInvite')) {
    console.log(`Line ${index + 1}: ${line}`);
    console.log(lines.slice(index - 2, index + 25).join('\n'));
  }
});
