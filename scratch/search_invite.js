const fs = require('fs');
const path = require('path');

function searchFiles(dir, query) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        searchFiles(filePath, query);
      }
    } else if (file.endsWith('.js') || file.endsWith('.sql') || file.endsWith('.html')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found in: ${filePath}`);
      }
    }
  });
}

searchFiles('.', 'invite');
