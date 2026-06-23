const fs = require('fs');
const content = fs.readFileSync('public/index_legacy.html', 'utf8');
const match = content.match(/var BRAND_LOGO_DATA_URI = '(data:image\/[^']+)'/);
if (match) {
  fs.writeFileSync('scratch/logo_uri.txt', match[1]);
  console.log("Logo URI extracted successfully, length:", match[1].length);
} else {
  console.log("Not found in index_legacy.html");
}
