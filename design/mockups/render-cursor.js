const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, 'bornes-cursor.html'), { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  fs.mkdirSync(path.resolve(__dirname, 'cursor'), { recursive: true });
  const cols = await p.$$('.col');
  const names=['A-comete','B-navigateur','C-pinceau'];
  for (let i=0;i<cols.length;i++){ await cols[i].screenshot({path:path.resolve(__dirname,'cursor',names[i]+'.png')}); console.log('OK',names[i]); }
  await b.close();
})();
