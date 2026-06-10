const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, 'bornes-story.html'), { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  const el = await p.$('.card');
  await el.screenshot({ path: path.resolve(__dirname, 'app', 'story-fin-de-run.png') });
  console.log('OK');
  await b.close();
})();
