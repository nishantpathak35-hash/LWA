import { queryAll } from './app/lib/db.js';

async function checkTriggers() {
  const triggers = await queryAll(`SELECT * FROM sqlite_master WHERE type = 'trigger'`);
  console.log(triggers);
}

checkTriggers().catch(console.error);
