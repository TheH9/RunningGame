const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, 'bornes-map-styles.html'), { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  fs.mkdirSync(path.resolve(__dirname, 'map-styles'), { recursive: true });
  const cols = await p.$$('.col');
  const names=['1-fog','2-hexagones','3-veines','4-aquarelle'];
  for (let i=0;i<cols.length;i++){ await cols[i].screenshot({path:path.resolve(__dirname,'map-styles',names[i]+'.png')}); console.log('OK',names[i]); }
  await b.close();
})();
