const fs = require('fs');
const code = fs.readFileSync('public/index.html', 'utf8');
const lines = code.split('\n');
lines.forEach((l, i) => {
  // Find .toLowerCase() calls where the object isn't wrapped in String()
  if (l.includes('.toLowerCase()') && !l.includes('String(')) {
    console.log(i+1, l.trim());
  }
});
