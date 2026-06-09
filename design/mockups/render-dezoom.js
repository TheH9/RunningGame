const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, 'bornes-map-dezoom.html'), { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  const el = await p.$('.phone');
  await el.screenshot({ path: path.resolve(__dirname, 'map-styles', 'dezoom-hex-final.png') });
  console.log('OK dezoom');
  await b.close();
})();
