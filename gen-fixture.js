// Genera fixture-vpn-t2.png usando puppeteer (headless Chrome)
// Uso: node gen-fixture.js
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--disable-web-security',
      '--allow-file-access-from-files',
      '--no-sandbox',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1180, height: 900, deviceScaleFactor: 2 });

  const filePath = path.resolve(__dirname, 'fixture-igram.html');
  const fileUrl  = 'file:///' + filePath.replace(/\\/g, '/');

  console.log('Cargando página…');
  await page.goto(fileUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  // Esperar a que los fixtures carguen (fetch al worker)
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('#card .match-row');
    return rows.length >= 19;
  }, { timeout: 20000 });

  // Esperar a que las imágenes terminen de cargar
  await page.waitForFunction(() => {
    return [...document.querySelectorAll('#card img')]
      .every(img => img.complete);
  }, { timeout: 15000 }).catch(() => {
    console.warn('Algunas imágenes no cargaron — continuando de todas formas');
  });

  // Pequeña pausa para render final (fonts)
  await new Promise(r => setTimeout(r, 800));

  const card = await page.$('#card');
  const outPath = path.resolve(__dirname, 'fixture-vpn-t2.png');
  await card.screenshot({ path: outPath, type: 'png' });

  await browser.close();
  console.log('✅ Generado:', outPath);
})().catch(err => { console.error(err); process.exit(1); });
