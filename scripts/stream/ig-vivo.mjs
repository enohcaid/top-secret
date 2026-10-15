// Vivo de Instagram (@fctopsecret) desde el Live Producer de instagram.com, en el Chrome CDP (sesión iniciada por
// Juan el 2026-10-15). Instagram no tiene API para esto: se crea el vivo en la web, se lee la URL + clave (de un solo
// uso) y, cuando la señal ya llega, se toca "Transmitir". Probado en modo "Practicar" (solo lo ve la cuenta).
//   const ig = await crearVivoIg({ titulo, practica }) → { url }   (url = rtmps://…/rtmp/<clave>)
//   await ig.transmitir()  — espera la vista previa y toca "Transmitir"
//   await ig.finalizar({ descartar })   — "Finalizar vídeo en directo" (y "Descartar vídeo" si se pide; si no, queda
//                                          en el archivo de la cuenta)
// Si al abrir encuentra un vivo anterior todavía abierto (Instagram no lo corta cuando deja de llegar señal), lo
// finaliza y lo descarta antes de crear el nuevo.
// CLI de prueba: node scripts/stream/ig-vivo.mjs --practica   (crea el vivo y muestra si obtuvo la URL)
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';

const espera = ms => new Promise(r => setTimeout(r, ms));

// Clic por JavaScript en el último elemento de un diálogo con ese texto exacto (un clic normal lo tapa una capa)
const clicTexto = (pagina, t) => pagina.evaluate(t => {
  const h = [...document.querySelectorAll('[role=dialog] *')].filter(e => e.children.length === 0 && e.textContent.trim() === t).at(-1);
  const btn = h?.closest('[role=button],button') || h; if (!btn) return false; btn.click(); return true;
}, t);
const textoDialogo = pagina => pagina.evaluate(() => [...document.querySelectorAll('[role=dialog]')].map(d => d.innerText).join(' / '));
async function cerrarVivo(pagina, descartar) {
  if (!await clicTexto(pagina, 'Finalizar vídeo en directo')) return false;
  await pagina.waitForTimeout(2500);
  if ((await textoDialogo(pagina)).includes('Finalizar vídeo en directo')) { await clicTexto(pagina, 'Finalizar vídeo en directo'); await pagina.waitForTimeout(2500); }
  if (descartar && await clicTexto(pagina, 'Descartar vídeo')) { await pagina.waitForTimeout(2000); await clicTexto(pagina, 'Descartar'); await pagina.waitForTimeout(1500); }
  return true;
}

export async function crearVivoIg({ titulo = 'Top Secret FC en vivo', practica = false, log = console.log } = {}) {
  const b = await chromium.connectOverCDP('http://localhost:9222');
  // Ventana propia: no toca las pestañas de Canva/ChatGPT
  const s = await b.newBrowserCDPSession();
  const nueva = b.contexts()[0].waitForEvent('page');
  const { targetId } = await s.send('Target.createTarget', { url: 'about:blank', newWindow: true, background: true });
  const pagina = await nueva;
  await pagina.setViewportSize({ width: 1400, height: 900 });
  await pagina.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(5000);
  if (await pagina.locator('input[name=username]').count()) throw new Error('Instagram pide iniciar sesión en el Chrome CDP');
  const abrir = async () => {
    await pagina.locator('svg[aria-label="Nueva publicación"]').first().click();
    await pagina.waitForTimeout(1500);
    await pagina.getByRole('link', { name: /Vídeo en directo/ }).first().click();
    await pagina.waitForTimeout(3500);
  };
  await abrir();
  if ((await textoDialogo(pagina)).includes('Finalizar vídeo en directo')) {
    log('Instagram: había un vivo anterior abierto, lo finalizo y lo descarto.');
    await cerrarVivo(pagina, true);
    await pagina.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' }); await pagina.waitForTimeout(5000);
    await abrir();
  }
  const d = pagina.locator('[role=dialog]').last();
  await d.getByPlaceholder(/título/i).fill(titulo.slice(0, 100));
  if (practica) {
    await d.getByText('Público', { exact: true }).click(); await pagina.waitForTimeout(1000);
    await pagina.getByText('Practicar', { exact: true }).click(); await pagina.waitForTimeout(1000);
  }
  await pagina.getByRole('button', { name: 'Siguiente' }).click();
  let vals = [];
  for (let i = 0; i < 20 && !vals[0]?.startsWith('rtmp'); i++) {
    await pagina.waitForTimeout(1000);
    vals = await pagina.evaluate(() => [...document.querySelectorAll('[role=dialog] input')].map(i => i.value));
  }
  if (!vals[0]?.startsWith('rtmp') || !vals[1]) throw new Error('No apareció la URL/clave del vivo de Instagram');
  const url = vals[0].replace(/\/?$/, '/') + vals[1];
  log(`Instagram: vivo creado${practica ? ' (práctica)' : ''}, esperando señal.`);

  return {
    url,
    // La vista previa del diálogo empieza a reproducir cuando llega la señal; recién ahí se puede transmitir
    async transmitir({ maxSeg = 120 } = {}) {
      let t0 = null;
      for (let i = 0; i < maxSeg / 2; i++) {
        await pagina.waitForTimeout(2000);
        const t = await pagina.evaluate(() => document.querySelector('[role=dialog] video')?.currentTime ?? null);
        if (t !== null && t0 === null) t0 = t;
        if (t !== null && t - t0 > 3) {                          // avanzó 3 s desde que apareció: la señal es la nuestra
          if (await clicTexto(pagina, 'Transmitir')) { log('Instagram: al aire.'); return true; }
        }
      }
      log('Instagram: la señal no llegó a la vista previa.'); return false;
    },
    async finalizar({ descartar = practica } = {}) {
      try { if (await cerrarVivo(pagina, descartar)) log(`Instagram: vivo finalizado${descartar ? ' y descartado' : ''}.`); } catch {}
      try { await s.send('Target.closeTarget', { targetId }); } catch {}
      await b.close();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ig = await crearVivoIg({ titulo: 'Prueba', practica: process.argv.includes('--practica') });
  console.log('URL obtenida:', /^rtmps:\/\//.test(ig.url), '(la clave no se muestra)');
  await ig.finalizar();
}
