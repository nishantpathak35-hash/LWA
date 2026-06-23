import 'dotenv/config';
import * as api from '../app/lib/api.js';
import { queryGet, queryRun } from '../app/lib/db.js';

async function runAuthTest() {
  console.log('--- STARTING AUTHENTICATION & INVITATION SECURITY TEST ---');
  try {
    const testEmail = `invited-user-${Date.now()}@example.com`;
    const testPassword = 'SecurePassword123';
    
    // 1. Try login with non-existent user
    console.log('Verifying login fails for non-existent user...');
    try {
      await api.loginUser(testEmail, testPassword);
      throw new Error('Should have failed login for non-existent user');
    } catch (e) {
      if (e.message === 'Invalid credentials') {
        console.log('Pass: Rejected login for non-existent user.');
      } else {
        throw e;
      }
    }

    // 2. Invite a new user
    console.log(`Inviting new user: ${testEmail}...`);
    const inviteResult = await api.inviteUserAdmin({
      email: testEmail,
      name: 'Invited Security Test User',
      roles: ['finance']
    }, { email: 'admin@luxeworx.com' });
    
    // Extract invite token
    const tokenRegex = /\?invite=([a-z0-9]+)/;
    const match = inviteResult.inviteUrl.match(tokenRegex);
    if (!match) {
      throw new Error('Failed to extract invite token from URL: ' + inviteResult.inviteUrl);
    }
    const inviteToken = match[1];
    console.log('Invite token generated:', inviteToken);

    // 3. Accept invite and set password
    console.log('Accepting invite and setting password...');
    await api.acceptInvite(inviteToken, testPassword);
    
    // Verify password is hashed in database
    const dbUser = await queryGet(`SELECT * FROM users WHERE email = ?`, [testEmail]);
    console.log('Database password_hash:', dbUser.password_hash);
    if (dbUser.password_hash === testPassword) {
      throw new Error('Security Error: Password was stored in plain text instead of being hashed!');
    }
    console.log('Pass: Password is securely hashed in the database.');

    // 4. Try logging in with incorrect password
    console.log('Verifying login fails with incorrect password...');
    try {
      await api.loginUser(testEmail, 'WrongPassword');
      throw new Error('Should have failed login for incorrect password');
    } catch (e) {
      if (e.message === 'Invalid credentials') {
        console.log('Pass: Rejected login for incorrect password.');
      } else {
        throw e;
      }
    }

    // 5. Try logging in with correct password
    console.log('Verifying login succeeds with correct password...');
    const loginResult = await api.loginUser(testEmail, testPassword);
    console.log('Login successful! Generated session token:', loginResult.token.slice(0, 20) + '...');

    // 6. Verify session resolution using the token
    console.log('Resolving session from token...');
    const sessionUser = await api.getMySession(loginResult.token);
    console.log('Resolved Session User:', sessionUser);
    if (sessionUser.email !== testEmail || sessionUser.name !== 'Invited Security Test User') {
      throw new Error('Resolved session user details do not match!');
    }
    console.log('Pass: Session resolved dynamically and matches the database.');

    // Cleanup
    console.log('Cleaning up test user...');
    await queryRun(`DELETE FROM users WHERE email = ?`, [testEmail]);

    console.log('--- ALL AUTHENTICATION AND INVITATION SECURITY TESTS PASSED! ---');
  } catch (error) {
    console.error('AUTH TEST FAILURE:', error.message);
    process.exit(1);
  }
  process.exit(0);
}

runAuthTest();
