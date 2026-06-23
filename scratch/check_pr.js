const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    const v = await client.execute('SELECT * FROM vendors');
    console.log("VENDORS:");
    console.log(JSON.stringify(v.rows, null, 2));

    const po = await client.execute('SELECT * FROM purchase_orders');
    console.log("PURCHASE ORDERS:");
    console.log(JSON.stringify(po.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
}
main();
