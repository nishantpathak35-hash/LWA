const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

async function removeWhite() {
  const logoPath = path.join(__dirname, 'logo_uri.txt');
  const logoUri = fs.readFileSync(logoPath, 'utf8').trim();
  const match = logoUri.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) {
    console.error('Invalid base64 logo');
    process.exit(1);
  }
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  const image = await Jimp.read(buffer);
  
  // Make white and near-white transparent
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    // Calculate brightness or simply check if R, G, B are high enough
    // White is 255, 255, 255. Near white could be > 230
    if (r > 220 && g > 220 && b > 220) {
      // Calculate alpha based on how close to white it is for smooth edge
      // If 255 it should be 0. If 220 it should be 255.
      const avg = (r + g + b) / 3;
      // map 220->255 to 255->0
      let alpha = 255 - ((avg - 220) * (255 / 35));
      if (alpha < 0) alpha = 0;
      if (alpha > 255) alpha = 255;
      
      this.bitmap.data[idx + 3] = alpha;
    }
  });

  const newBuffer = await image.getBuffer('image/png');
  const newBase64 = `data:image/png;base64,${newBuffer.toString('base64')}`;
  
  fs.writeFileSync(logoPath, newBase64, 'utf8');
  console.log('Logo updated with transparent background');
}

removeWhite().catch(console.error);
