const fs = require('fs');

const path = 'app/lib/api/dashboard.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /export async function getBootBundle\(session\) \{\s*requireAuth\(session\);\s*\/\/\s*Ensure schema migrations [^\n]+\s*await ensureSettingsTable\(\);/g;

const replacement = `export async function getBootBundle(session) {
  requireAuth(session);
  // Ensure schema migrations (e.g. approved_amount column) run BEFORE parallel queries
  await ensureSettingsTable();

  // Track user activity on every boot/refresh so "Last Login" acts as "Last Active"
  if (session && session.email) {
    queryRun(\`UPDATE users SET last_login = ? WHERE LOWER(email) = ?\`, [new Date().toISOString(), session.email.trim().toLowerCase()]).catch(e => console.error(e));
  }`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully patched dashboard.js for user activity tracking");
} else {
  console.log("Target not found!");
}
