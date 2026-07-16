import { queryAll } from './app/lib/db.js';
async function test() {
  const info = await queryAll(`PRAGMA table_info('vendors')`);
  console.log(info);
}
test().catch(console.error);
