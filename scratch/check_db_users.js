import 'dotenv/config';
import { queryAll, queryGet } from '../app/lib/db.js';

async function checkUsers() {
  console.log('Querying database users...');
  try {
    const users = await queryAll('SELECT email, name, roles, active, password_hash, invite_token FROM users');
    console.log('Users in database:', users);
    
    const admin = await queryGet('SELECT * FROM users WHERE email = ?', ['admin@luxeworx.com']);
    console.log('Admin user specific lookup:', admin);
  } catch (err) {
    console.error('Database query failed:', err.message);
  }
}

checkUsers();
