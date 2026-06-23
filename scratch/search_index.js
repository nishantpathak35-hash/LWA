const fs = require('fs');
const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');

function search(query) {
  console.log(`=== Searching for "${query}" ===`);
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(query.toLowerCase())) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
}

search('reports');
search('settings');
