const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components', 'views');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir, f));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('alert(')) {
    if (!content.includes('import { toast }')) {
      content = content.replace(/(import React.*?;\n)/, '$1import { toast } from \'../ui/Toast\';\n');
    }
    
    // Replace alert('...successfully...') with toast.success('...successfully...')
    content = content.replace(/alert\((.*?successfully.*?)\)/gi, 'toast.success($1)');
    
    // Replace alert('Error: ...') or alert('Failed...') with toast.error
    content = content.replace(/alert\((.*?(?:error|failed).*?)\)/gi, 'toast.error($1)');
    
    // Replace remaining alert( with toast.error( if it includes 'Required' or 'Please'
    content = content.replace(/alert\((.*?(?:Required|Please|invalid|must be).*?)\)/gi, 'toast.error($1)');
    
    // Replace remaining alert( with toast(
    content = content.replace(/alert\(/g, 'toast(');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
}
