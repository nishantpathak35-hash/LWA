const fs = require('fs');
const content = fs.readFileSync('app/lib/api.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('Invite') || line.includes('invite')) {
    console.log(`Line ${index + 1}: ${line}`);
    // print 20 lines following this
    console.log(lines.slice(index, index + 25).join('\n'));
  }
});
