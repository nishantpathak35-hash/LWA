const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('openResetPwdModal')) {
    console.log(`Line ${index + 1}: ${line}`);
    // Print 50 lines following this
    console.log(lines.slice(index, index + 50).join('\n'));
  }
});
