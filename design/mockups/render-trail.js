const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, 'bornes-trail.html'), { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  fs.mkdirSync(path.resolve(__dirname, 'trail'), { recursive: true });
  for (const id of ['t-run','t-rest']) {
    const el = await p.$('#' + id);
    await el.screenshot({ path: path.resolve(__dirname, 'trail', id + '.png') });
    console.log('OK', id);
  }
  await b.close();
})();
