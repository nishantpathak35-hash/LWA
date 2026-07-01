const fs = require('fs');

const path = 'app/lib/api/dashboard.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /status: p\.approval_status \|\| p\.status \|\| 'Draft',\s*approval_status: p\.approval_status \|\| p\.status \|\| 'Draft',\s*payment_eligible: isPOEligibleForPayment\(p\),/g;

const replacement = `status: p.approval_status || p.status || 'Draft',
      approval_status: p.approval_status || p.status || 'Draft',
      payment_status: p.payment_status || 'Unpaid',
      payment_eligible: isPOEligibleForPayment(p),`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully patched dashboard.js");
} else {
  console.log("Target not found!");
}
