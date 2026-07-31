import 'dotenv/config';
import { queryAll } from '../app/lib/db.js';
import fs from 'fs';
import path from 'path';

async function backupDB() {
  try {
    console.log('--- BACKING UP TABLES TO PRE-MIGRATION JSON ---');
    const vendors = await queryAll(`SELECT * FROM vendors`);
    const pos = await queryAll(`SELECT * FROM purchase_orders`);
    const prs = await queryAll(`SELECT * FROM payment_requests`);
    const sysPayments = await queryAll(`SELECT * FROM system_payments`);

    const backupData = {
      timestamp: new Date().toISOString(),
      vendors,
      purchase_orders: pos,
      payment_requests: prs,
      system_payments: sysPayments
    };

    const backupPath = path.join(process.cwd(), 'scratch', 'backup_pre_migration.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`Backup saved to ${backupPath}`);
    console.log(`Vendors: ${vendors.length}, POs: ${pos.length}, PRs: ${prs.length}, SysPayments: ${sysPayments.length}`);
  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  }
}

backupDB();
