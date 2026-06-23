const fs = require('fs');
const content = fs.readFileSync('app/lib/api.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('invite_token')) {
    console.log(`Line ${index + 1}: ${line}`);
  }
});
