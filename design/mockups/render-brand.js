// Génère l'identité visuelle de l'app (icône + splash) via Chromium/Playwright.
// Marque "Bornes" : trail acid-green qui peint un territoire d'hexagones, sur
// fond sombre. Sort les PNG directement dans mobile/assets/images/.

const path = require('path');
const fs = require('fs');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(process.env.PW_GLOBAL || '/opt/node22/lib/node_modules', 'playwright'))); }

const OUT = path.resolve(__dirname, '../../mobile/assets/images');

const TEAM = ['#3B82F6', '#FF4D5E', '#F5B82E', '#2EB789']; // vagues, braises, soleils, pousses
const ACID = '#B8FF2E';

// ---- Honeycomb d'hexagones (pointy-top) formant un amas circulaire ----------
function hexPoints(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    p.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return p.join(' ');
}

function honeycomb({ cx, cy, r, ringR, mono }) {
  const hexes = [];
  const dx = Math.sqrt(3) * r;
  const dy = 1.5 * r;
  // motif de couleurs déterministe (suggère un territoire contesté)
  const colored = { '0,0': ACID, '1,0': TEAM[0], '-1,1': TEAM[3], '1,-1': TEAM[2], '0,-2': TEAM[1], '-1,-1': ACID, '2,0': TEAM[3] };
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const x = cx + col * dx + (row & 1 ? dx / 2 : 0);
      const y = cy + row * dy;
      if (Math.hypot(x - cx, y - cy) > ringR) continue;
      const key = `${col},${row}`;
      const fill = colored[key];
      if (mono) {
        hexes.push(`<polygon points="${hexPoints(x, y, r - 5)}" fill="none" stroke="#fff" stroke-width="6" opacity="${fill ? 0.95 : 0.4}"/>`);
      } else if (fill) {
        hexes.push(`<polygon points="${hexPoints(x, y, r - 5)}" fill="${fill}" opacity="0.55"/>`);
      } else {
        hexes.push(`<polygon points="${hexPoints(x, y, r - 5)}" fill="#171A24" stroke="#222633" stroke-width="3"/>`);
      }
    }
  }
  return hexes.join('');
}

// ---- Marque (logo) : hexagones + trail lumineux ----------------------------
function mark({ size = 1024, bg = null, scale = 1, mono = false } = {}) {
  const cx = size / 2, cy = size / 2;
  const r = 84 * scale;
  const ringR = 300 * scale;
  const hexes = honeycomb({ cx, cy, r, ringR, mono });
  const stroke = mono ? '#fff' : 'url(#acid)';
  const head = mono ? '#fff' : '#EAFFB0';
  // trail en S, centré
  const d = `M ${cx - 250 * scale} ${cy + 250 * scale}
             C ${cx - 90 * scale} ${cy + 60 * scale}, ${cx - 70 * scale} ${cy + 20 * scale}, ${cx} ${cy}
             S ${cx + 120 * scale} ${cy - 90 * scale}, ${cx + 250 * scale} ${cy - 250 * scale}`;
  const bgEl = bg
    ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>`
    : '';
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg" cx="50%" cy="38%" r="75%">
        <stop offset="0" stop-color="#15192400"/>
        <stop offset="0" stop-color="#161B27"/>
        <stop offset="1" stop-color="#0A0B0F"/>
      </radialGradient>
      <linearGradient id="acid" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#8FE000"/>
        <stop offset="0.5" stop-color="${ACID}"/>
        <stop offset="1" stop-color="#E6FF8A"/>
      </linearGradient>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="${22 * scale}" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    ${bgEl}
    <g>${hexes}</g>
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${76 * scale}" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
    <circle cx="${cx + 250 * scale}" cy="${cy - 250 * scale}" r="${58 * scale}" fill="${head}" filter="url(#glow)"/>
    <circle cx="${cx + 250 * scale}" cy="${cy - 250 * scale}" r="${28 * scale}" fill="#fff"/>
  </svg>`;
}

// Chaque asset = un élément dimensionné, capturé en PNG (fond transparent si pas de bg).
const ASSETS = [
  { id: 'icon',        size: 1024, html: mark({ size: 1024, bg: true,  scale: 1 }) },
  { id: 'splash-icon', size: 1024, html: mark({ size: 1024, bg: null,  scale: 1 }) },
  { id: 'favicon',     size: 256,  html: mark({ size: 256,  bg: true,  scale: 0.25 }) },
  // Android adaptatif : marque réduite (safe zone ~66 %) sur fond transparent.
  { id: 'android-icon-foreground', size: 1024, html: mark({ size: 1024, bg: null, scale: 0.62 }) },
  { id: 'android-icon-monochrome', size: 1024, html: mark({ size: 1024, bg: null, scale: 0.62, mono: true }) },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 }, deviceScaleFactor: 1 });
  fs.mkdirSync(OUT, { recursive: true });
  for (const a of ASSETS) {
    await page.setContent(
      `<html><body style="margin:0;background:transparent">
         <div id="box" style="width:${a.size}px;height:${a.size}px">${a.html}</div>
       </body></html>`,
      { waitUntil: 'networkidle' },
    );
    const el = await page.$('#box');
    await el.screenshot({ path: path.join(OUT, a.id + '.png'), omitBackground: true });
    console.log('OK  ', a.id + '.png', a.size + '²');
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
