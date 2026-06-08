const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, 'bornes-cursor-final.html'), { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  fs.mkdirSync(path.resolve(__dirname, 'cursor'), { recursive: true });
  const el = await p.$('.phone');
  await el.screenshot({ path: path.resolve(__dirname, 'cursor', 'AB-final.png') });
  console.log('OK AB-final');
  await b.close();
})();
