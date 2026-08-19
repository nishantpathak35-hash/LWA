const { spawn } = require('child_process');
const path = require('path');

const nodeDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity-ide\\scratch\\tools\\node-v20.18.0-win-x64';
const nextBin = path.resolve(__dirname, 'node_modules/next/dist/bin/next');

process.env.PATH = nodeDir + ';' + process.env.PATH;

function startServer() {
  console.log('[ServerRunner] Starting Next.js dev server on port 3000...');
  
  const child = spawn(process.execPath, [nextBin, 'dev', '--webpack', '-p', '3000'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env
  });

  child.on('exit', (code, signal) => {
    console.log(`[ServerRunner] Dev server exited with code ${code}, signal ${signal}. Restarting in 2s...`);
    setTimeout(startServer, 2000);
  });
}

startServer();
