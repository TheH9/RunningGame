const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, 'redesign-concept.html'), { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const cols = await p.$$('.col');
  const names = ['carte', 'run', 'profil'];
  for (let i = 0; i < cols.length; i++) { await cols[i].screenshot({ path: path.resolve(__dirname, 'redesign', names[i] + '.png') }); console.log('OK', names[i]); }
  await b.close();
})();
