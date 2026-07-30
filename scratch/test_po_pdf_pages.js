import puppeteer from 'puppeteer';

async function testPdfPageCount() {
  console.log('--- TESTING PO PDF PAGE COUNT WITH PUPPETEER ---');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set viewport to A4 dimensions
    await page.setViewport({ width: 794, height: 1123 });
    await page.goto('http://localhost:3000/po/LAIPL_PO_26-27_067', { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' },
      printBackground: true
    });

    const pdfParse = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    console.log(`Generated PDF Page Count: ${data.numpages}`);
    console.log(`Total Text Length: ${data.text.length}`);

  } catch (err) {
    console.error('Error generating PDF:', err.message);
  } finally {
    if (browser) await browser.close();
  }
}

testPdfPageCount();
