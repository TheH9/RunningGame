const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENS = [
  ['s-onb', '01-onboarding'],
  ['s-team', '02-choix-equipe'],
  ['s-map', '03-map'],
  ['s-run', '04-run-actif'],
  ['s-end', '05-fin-de-run'],
  ['s-rank', '06-classement'],
  ['s-challenge', '07-defi'],
  ['s-rewards', '08-recompenses'],
  ['s-qr', '09-lot-qr'],
  ['s-profile', '10-profil'],
  ['s-plus', '11-bornes-plus'],
  ['s-drop', '12-drop'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(__dirname, 'bornes-app.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const outDir = path.resolve(__dirname, 'app');
  fs.mkdirSync(outDir, { recursive: true });
  for (const [id, name] of SCREENS) {
    const el = await page.$('#' + id);
    if (!el) { console.log('MISS', id); continue; }
    await el.screenshot({ path: path.join(outDir, name + '.png') });
    console.log('OK  ', name);
  }
  await page.screenshot({ path: path.join(outDir, '_all.png'), fullPage: true });
  await browser.close();
})();
