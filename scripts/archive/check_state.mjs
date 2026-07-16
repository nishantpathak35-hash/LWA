import 'dotenv/config';
import { queryAll } from './app/lib/db.js';

async function checkState() {
  const users = await queryAll(`SELECT email, roles FROM users`);
  console.log("Users:", users);

  const prs = await queryAll(`SELECT pr_id, stage, proc_approval, finance_approval, director_approval, amount_requested FROM payment_requests ORDER BY pr_id DESC LIMIT 10`);
  console.log("Recent PRs:", prs);
}

checkState().catch(console.error);
