const { execSync } = require('child_process');

const gitBin = 'C:\\Users\\Admin\\AppData\\Local\\GitHubDesktop\\app-3.6.4\\resources\\app\\git\\cmd\\git.exe';
const cwd = 'C:\\Users\\Admin\\Desktop\\Final';

try {
  console.log('Staging all files in Final...');
  execSync(`"${gitBin}" add -A`, { cwd, stdio: 'inherit' });
  console.log('Committing in Final...');
  execSync(`"${gitBin}" commit -m "feat: enterprise second-pass website refinements and build scripts"`, { cwd, stdio: 'inherit' });
  console.log('Final committed successfully!');
} catch (e) {
  console.log('Error or nothing to commit:', e.message);
}
