import dotenv from 'dotenv';
dotenv.config();
import { getPOPrefix } from '../app/lib/api.js';

async function test() {
  console.log('Testing getPOPrefix authentication...');
  
  // Test case 1: admin session
  try {
    const prefixAdmin = await getPOPrefix({ email: 'admin@luxeworx.com', roles: ['admin'] });
    console.log('Test 1 Passed: Admin session succeeded with prefix:', prefixAdmin);
  } catch (e) {
    console.error('Test 1 Failed: Admin session failed:', e);
  }

  // Test case 2: non-admin session
  try {
    const prefixNonAdmin = await getPOPrefix({ email: 'accounts@luxeworxatelier.com', roles: ['finance'] });
    console.log('Test 2 Passed: Non-admin session succeeded with prefix:', prefixNonAdmin);
  } catch (e) {
    console.error('Test 2 Failed: Non-admin session failed:', e);
  }

  // Test case 3: no session
  try {
    await getPOPrefix(null);
    console.error('Test 3 Failed: Null session should have thrown an error');
  } catch (e) {
    console.log('Test 3 Passed: Null session failed as expected:', e.message);
  }
}

test().catch(console.error);
