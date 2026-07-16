import dotenv from 'dotenv';
dotenv.config();
import { getDashboardKPIs } from './app/lib/api.js';

async function test() {
  try {
    const data = await getDashboardKPIs({});
    console.log('KPIs:', data);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
