const fs = require('fs');
const content = fs.readFileSync('app/lib/api.js', 'utf8');
const lines = content.split('\n');

function printFunction(name) {
  const startIndex = lines.findIndex(l => l.includes(`function ${name}`));
  if (startIndex !== -1) {
    console.log(`=== Function ${name} ===`);
    console.log(lines.slice(startIndex, startIndex + 50).join('\n'));
  }
}

printFunction('loginUser');
printFunction('acceptInvite');
printFunction('getMySession');
