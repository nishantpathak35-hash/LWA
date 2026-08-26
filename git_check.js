const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const possibleGitPaths = [
  'C:\\Program Files\\Git\\cmd\\git.exe',
  'C:\\Program Files\\Git\\bin\\git.exe',
  'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
  'C:\\Users\\Admin\\AppData\\Local\\Programs\\Git\\cmd\\git.exe'
];

// Check GitHub Desktop
const ghDesktopDir = 'C:\\Users\\Admin\\AppData\\Local\\GitHubDesktop';
if (fs.existsSync(ghDesktopDir)) {
  const entries = fs.readdirSync(ghDesktopDir);
  for (const entry of entries) {
    if (entry.startsWith('app-')) {
      const candidate = path.join(ghDesktopDir, entry, 'resources', 'app', 'git', 'cmd', 'git.exe');
      if (fs.existsSync(candidate)) {
        possibleGitPaths.push(candidate);
      }
    }
  }
}

let gitBin = null;
for (const p of possibleGitPaths) {
  if (fs.existsSync(p)) {
    gitBin = p;
    break;
  }
}

console.log('Git binary:', gitBin);

if (!gitBin) {
  console.log('Searching drives for git.exe...');
  // Check PATH
  try {
    const whereOut = execSync('where.exe git', { encoding: 'utf8' });
    console.log('where.exe git:', whereOut);
    gitBin = whereOut.trim().split('\r\n')[0];
  } catch (e) {
    console.log('git not in PATH');
  }
}

if (gitBin) {
  console.log('Using git binary:', gitBin);
  
  // Check repositories: Final & Construct-O-Genie
  const repos = [
    'C:\\Users\\Admin\\Desktop\\Final',
    'C:\\Users\\Admin\\Desktop\\Construct-O-Genie'
  ];

  for (const repo of repos) {
    console.log(`\n========================================`);
    console.log(`Checking repo: ${repo}`);
    console.log(`========================================`);
    try {
      const status = execSync(`"${gitBin}" status`, { cwd: repo, encoding: 'utf8' });
      console.log('Status:\n', status);
      
      const remotes = execSync(`"${gitBin}" remote -v`, { cwd: repo, encoding: 'utf8' });
      console.log('Remotes:\n', remotes);
    } catch (err) {
      console.log(`Error checking ${repo}:`, err.message);
    }
  }
}
