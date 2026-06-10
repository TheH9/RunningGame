// Vérification bout-en-bout sur l'export web : joue le parcours complet
// (onboarding → équipe → map → run replay → summary) et capture des screenshots.
// Usage : npx expo export --platform web && node scripts/verify-web.mjs
// Prérequis : PLAYWRIGHT_BROWSERS_PATH + NODE_PATH (Chromium déjà installé).

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../../dist');
const outDir = resolve(fileURLToPath(import.meta.url), '../../.verify');
const PORT = 8765;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.map': 'application/json',
};

if (!existsSync(root)) {
  console.error('dist/ introuvable — lance d’abord : npx expo export --platform web');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  let file = join(root, url === '/' ? 'index.html' : url);
  if (!existsSync(file)) file = join(root, url.replace(/^\//, '') + '.html');
  if (!existsSync(file)) file = join(root, 'index.html'); // SPA fallback
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});

// playwright vit dans les modules globaux (NODE_PATH ignoré en ESM)
import { createRequire } from 'node:module';
const require_ = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require_('playwright');

await new Promise((r) => server.listen(PORT, r));
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const shot = (name) => page.screenshot({ path: join(outDir, name + '.png') });
const log = (m) => console.log('  •', m);

page.on('dialog', (d) => d.accept()); // window.confirm (choix d'équipe…)

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot('01-onboarding');
  log('onboarding');

  // pseudo + continuer
  const input = page.locator('input').first();
  if (await input.count()) {
    await input.fill('Testeur');
    await page.getByText('Choisir mon équipe', { exact: false }).click();
    await page.waitForTimeout(800);
    await shot('02-team');
    log('choix équipe');
    await page.getByText('Les Vagues', { exact: false }).first().click();
    await page.waitForTimeout(300);
    await page.getByText('Rejoindre Les Vagues', { exact: false }).click();
    await page.waitForTimeout(1500);
  }
  await shot('03-map');
  log('map');

  // GO → sur web le replay est le mode par défaut
  await page.getByText('GO', { exact: true }).click();
  await page.waitForTimeout(4000);
  await shot('04-run-debut');
  log('run démarré (replay)');
  await page.waitForTimeout(50000);
  await shot('05-run-50s');
  log('run +50 s — la trace doit être visible (> 100 m)');

  await page.getByText('STOP', { exact: true }).click();
  await page.waitForTimeout(2500);
  await shot('06-summary');
  log('summary');

  console.log('\n✅ Vérification terminée — screenshots dans mobile/.verify/');
} catch (e) {
  await shot('99-erreur');
  console.error('❌ Échec :', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
