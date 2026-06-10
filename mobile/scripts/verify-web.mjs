// Vérification bout-en-bout sur l'export web : joue TOUT le parcours
// (onboarding → équipe → tutoriel → map → run replay avec événements →
// summary → onglets → rollover de saison forcé) et capture des screenshots.
// Usage : npx expo export --platform web && node scripts/verify-web.mjs

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require_ = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require_('playwright');

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
  if (!existsSync(file)) file = join(root, 'index.html');
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});

await new Promise((r) => server.listen(PORT, r));
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const shot = (name) => page.screenshot({ path: join(outDir, name + '.png') });
const log = (m) => console.log('  •', m);
const tapText = async (text, exact = false) => {
  await page.getByText(text, { exact }).first().click();
  await page.waitForTimeout(600);
};

page.on('dialog', (d) => d.accept());

try {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await shot('01-onboarding');
  log('onboarding');

  await page.locator('input').first().fill('Testeur');
  await tapText('Choisir mon équipe');
  await shot('02-team');
  await tapText('Les Vagues');
  await tapText('Rejoindre Les Vagues');
  await page.waitForTimeout(1500);
  log('équipe choisie');

  // tutoriel 3 étapes
  if (await page.getByText('La ville est le plateau').count()) {
    await shot('03-tutoriel');
    await tapText('Suivant →');
    await tapText('Suivant →');
    await tapText('C’est parti 🔥');
    log('tutoriel passé');
  }
  await page.waitForTimeout(1500);
  await shot('04-map');
  log('map (territoire + bots live)');

  // onglets
  await tapText('Ligue');
  await shot('05-classement');
  await tapText('Coureurs');
  await shot('05b-classement-coureurs');
  await tapText('Défis');
  await page.waitForTimeout(800);
  await shot('06-defis');
  log('défis (duels + amis)');
  // lancer un duel
  const defier = page.getByText('Défier', { exact: true }).first();
  if (await defier.count()) {
    await defier.click();
    await page.waitForTimeout(800);
    await shot('06b-duel-lance');
    log('duel lancé');
  }
  await tapText('Lots');
  await page.waitForTimeout(600);
  await shot('07-recompenses');
  await tapText('Profil');
  await shot('08-profil');

  // run replay
  await tapText('Carte');
  await page.waitForTimeout(400);
  await page.getByText('GO', { exact: true }).click();
  await page.waitForTimeout(5000);
  await shot('09-run-debut');
  log('run démarré (replay)');
  await page.waitForTimeout(55000);
  await shot('10-run-1min');
  log('run +1 min — trace, toasts, compteur de zones');

  await page.getByText('STOP', { exact: true }).click();
  await page.waitForTimeout(2500);
  await shot('11-summary');
  log('summary (story animée)');
  await tapText('Retour à la carte');
  await page.waitForTimeout(1500);
  await shot('12-map-apres-run');
  log('map après run — ma trace intégrée au territoire');

  // feed (clic par coordonnées — la cloche est en haut à droite)
  try {
    await page.mouse.click(390 - 16 - 22, 86 + 22);
    await page.waitForTimeout(1000);
    if (await page.getByText('Activité').count()) {
      await shot('13-feed');
      log('feed d’activité');
      await page.mouse.click(390 - 24, 76);
      await page.waitForTimeout(600);
    }
  } catch {
    log('⚠️ feed non testé');
  }

  // rollover de saison forcé
  await page.goto(`http://localhost:${PORT}/?debugSeasonEnd=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  if (await page.getByText('TERMINÉE').count()) {
    await shot('14-season-recap');
    log('récap de saison (rollover forcé)');
    // clic DOM direct (l'animation reanimated fait échouer le check de visibilité)
    await page.evaluate(() => {
      const els = [...document.querySelectorAll('div')];
      const cta = els.find((e) => e.textContent?.startsWith('Conquérir la Saison') && e.children.length === 0);
      cta?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(2000);
    await shot('15-map-saison-2');
    log('saison suivante — carte remise à zéro');
  } else {
    await shot('14-rollover-absent');
    log('⚠️ récap de saison non affiché');
  }

  console.log('\n✅ Vérification terminée — screenshots dans mobile/.verify/');
} catch (e) {
  await shot('99-erreur');
  console.error('❌ Échec :', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
