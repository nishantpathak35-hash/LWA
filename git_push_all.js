const { execSync } = require('child_process');

const gitBin = 'C:\\Users\\Admin\\AppData\\Local\\GitHubDesktop\\app-3.6.4\\resources\\app\\git\\cmd\\git.exe';

const repos = [
  {
    path: 'C:\\Users\\Admin\\Desktop\\Construct-O-Genie',
    message: 'feat: second-pass enterprise-grade website refinement (signature hero x-ray, reconciled data, legal & security pages)'
  },
  {
    path: 'C:\\Users\\Admin\\Desktop\\Final',
    message: 'feat: update marketing build suite and enterprise refinement scripts'
  }
];

for (const repo of repos) {
  console.log(`\n========================================`);
  console.log(`Pushing repo: ${repo.path}`);
  console.log(`========================================`);
  try {
    console.log('1. git add -A');
    execSync(`"${gitBin}" add -A`, { cwd: repo.path, stdio: 'inherit' });

    console.log('2. git commit');
    try {
      execSync(`"${gitBin}" commit -m "${repo.message}"`, { cwd: repo.path, stdio: 'inherit' });
    } catch (e) {
      console.log('Nothing to commit or already committed.');
    }

    console.log('3. git push origin main');
    const pushOutput = execSync(`"${gitBin}" push origin main`, { cwd: repo.path, encoding: 'utf8' });
    console.log(pushOutput);
    console.log(`[SUCCESS] Pushed ${repo.path}`);
  } catch (err) {
    console.error(`[ERROR] Failed on ${repo.path}:`, err.message);
  }
}
