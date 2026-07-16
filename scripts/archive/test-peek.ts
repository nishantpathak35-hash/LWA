import { NumberSeriesService } from './src/modules/core/services/NumberSeriesService.ts';
import { queryGet } from './app/lib/db.js';

async function test() {
  console.log('--- Test peekNextNumber ---');
  let num1 = await NumberSeriesService.peekNextNumber('purchase_order');
  console.log('Peek 1:', num1);
  let num2 = await NumberSeriesService.peekNextNumber('purchase_order');
  console.log('Peek 2:', num2);

  const series = await queryGet(`SELECT * FROM number_series WHERE module_type = 'purchase_order'`);
  console.log('Series in DB:', series);
}

test().catch(console.error);
