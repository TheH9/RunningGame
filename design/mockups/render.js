const { chromium } = require('playwright');
const path = require('path');

const SCREENS = [
  ['map-light', 'Map (clair)'],
  ['map-dark', 'Map (sombre)'],
  ['map-streets', 'Map (conquête par rue)'],
  ['rank', 'Classement'],
  ['rewards', 'Récompenses'],
  ['profile', 'Profil'],
  ['story', 'Fin de run'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  const file = 'file://' + path.resolve(__dirname, 'bornes-mockups.html');
  await page.goto(file, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const outDir = path.resolve(__dirname, 'out');
  require('fs').mkdirSync(outDir, { recursive: true });
  for (const [id, label] of SCREENS) {
    const el = await page.$('#' + id);
    if (!el) { console.log('MISS', id); continue; }
    await el.screenshot({ path: path.join(outDir, id + '.png') });
    console.log('OK  ', id, '→', label);
  }
  // full board
  await page.screenshot({ path: path.join(outDir, '_all.png'), fullPage: true });
  await browser.close();
})();
