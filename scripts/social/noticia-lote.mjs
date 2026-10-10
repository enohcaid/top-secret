#!/usr/bin/env node
// Noticia del día → aprobar.html (pedido de Juan, 2026-10-10: sacar el botón oculto de noticias.html y aprobar la
// noticia desde la misma página que todo lo demás). Lo corre run-daily-images.ps1 apenas el borrador tiene imágenes.
// Arma un lote "noticia" con la nota del sitio (vista previa completa, título y cuerpo editables) y sus piezas para
// redes (las mismas que armaba el paso "Publicar en redes": post e historia con título, link con vista previa, X).
// Sale apenas se aprueba (publicarA = ahora); publicar.mjs publica primero la nota y después las redes.
//   node scripts/social/noticia-lote.mjs [--no-abrir]
import { spawn } from 'child_process';
import { putFile } from '../lib/r2.mjs';
import { cargarNoticia, generarPiezas } from '../noticia-redes.mjs';
import { leer, agregarLote, PAGINA } from './lib/aprobaciones.mjs';

const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const log = m => console.log(`${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })} [noticia-lote] ${m}`);

const n = await cargarNoticia(null).catch(() => null);
if (!n || !n.imagePost) log('No hay borrador con imágenes: nada para aprobar.');
else if ((await leer()).lotes.some(l => l.id === `noticia-${n.id}` && l.piezas.some(p => p.estado === 'publicado'))) log(`La noticia ${n.id} ya salió.`);
else {
  log(`Piezas para redes de ${n.id}…`);
  const piezas = await generarPiezas(n);
  const v = Date.now().toString(36);
  const url = {};
  for (const [tipo, f] of Object.entries(piezas)) {
    const key = `logos/noticias/redes/${n.id}-${tipo}.jpg`;   // mismas claves que usaba el Worker (/og las encuentra)
    await putFile(f, key);
    url[tipo] = `${WORKER}/media/${key}?v=${v}`;
  }
  const link = `${WORKER}/og/${n.id}`;
  const sc = n.shareCaptions || {};
  // Cuerpo editable: un párrafo o bloque por línea (los bloques {h}, {specs}, {quote}, {pair}, {img} como JSON),
  // igual que el editor viejo del borrador.
  const cuerpo = (n.body || []).map(b => typeof b === 'string' ? b : JSON.stringify(b)).join('\n');
  const P = o => ({ decision: 'pendiente', ...o });
  await agregarLote({
    id: `noticia-${n.id}`, tipo: 'noticia', creado: new Date().toISOString(), publicarA: new Date().toISOString(),
    titulo: `Noticia del día · ${n.dateLabel || n.date}`,
    piezas: [
      P({ id: 'sitio', red: 'sitio', formato: 'Noticia en el sitio', descripcion: `${n.category || ''} · sale apenas la aprobás`, media: [{ tipo: 'imagen', url: n.imagePost }], titulo: n.title, texto: cuerpo, noticia: n, metodo: 'sitio-borrador', etiquetaTexto: 'Cuerpo (un párrafo o bloque por línea)' }),
      P({ id: 'ig-post', red: 'instagram', formato: 'Post con título', descripcion: 'La foto con el título encima', media: [{ tipo: 'imagen', url: url.ig }], texto: sc.ig || n.excerpt || '', metodo: 'ig-imagen' }),
      P({ id: 'ig-historia', red: 'instagram', formato: 'Historia', descripcion: '24 h', media: [{ tipo: 'imagen', url: url.historia, vertical: true }], texto: '', metodo: 'ig-historia' }),
      P({ id: 'fb-post', red: 'facebook', formato: 'Post con link', descripcion: 'La vista previa del link trae la foto y el título', media: [{ tipo: 'imagen', url: n.imagePost }], texto: sc.fb || n.excerpt || '', metodo: 'fb-link', link }),
      P({ id: 'fb-historia', red: 'facebook', formato: 'Historia', descripcion: '24 h', media: [{ tipo: 'imagen', url: url.historia, vertical: true }], texto: '', metodo: 'fb-historia' }),
      P({ id: 'x', red: 'x', formato: 'Post con link', descripcion: 'La tarjeta del link trae la foto', media: [{ tipo: 'imagen', url: n.imagePost }], texto: `${sc.x || n.shareCaption || n.title}\n${link}`, metodo: 'x-texto' }),
    ],
  });
  log(`Lote noticia-${n.id} listo para aprobar.`);
  if (!process.argv.includes('--no-abrir')) spawn('cmd', ['/c', 'start', '', PAGINA], { detached: true, stdio: 'ignore' }).unref();
}
