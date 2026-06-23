import fs from 'fs';
import path from 'path';

const filePath = path.resolve('app/lib/api.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\r\n').join('\n').split('\n');
let modifiedContent = '';

const funcRegex = /^export\s+async\s+function\s+(\w+)\(([^)]*session[^)]*)\)\s*\{/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(funcRegex);
  if (match) {
    const name = match[1];
    modifiedContent += line + '\n';
    
    // Search the next lines for requireAdminConsole, requireAuth, or legacy check
    let j = i + 1;
    let nextLine = '';
    while (j < lines.length) {
      if (lines[j].trim() !== '') {
        nextLine = lines[j].trim();
        break;
      }
      j++;
    }
    
    if (nextLine.startsWith('requireAdminConsole') || nextLine.startsWith('requireAuth')) {
      // Already has a security check, do nothing
    } else {
      // Append requireAuth(session);
      modifiedContent += '  requireAuth(session);\n';
      
      // If the next non-empty line was a legacy session check, we skip it
      if (nextLine.includes('!session') && nextLine.includes('No active session')) {
        // Skip lines until j (inclusive)
        i = j;
      }
    }
  } else {
    modifiedContent += line + '\n';
  }
}

// Remove extra trailing newline if any
fs.writeFileSync(filePath, modifiedContent.trim() + '\n', 'utf8');
console.log('Successfully updated api.js with requireAuth!');
