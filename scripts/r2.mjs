#!/usr/bin/env node
// Herramienta de línea de comandos para el bucket R2 del club (imágenes del sitio y originales).
//
//   node scripts/r2.mjs ls <prefijo>                     lista objetos (clave, tamaño)
//   node scripts/r2.mjs put <archivo> [clave]            sube un archivo (clave = ruta relativa al repo)
//   node scripts/r2.mjs get <clave> [archivo]            baja un objeto (archivo = misma ruta en el repo)
//   node scripts/r2.mjs sync-up <carpeta> [prefijo]      sube lo que falta o cambió de tamaño
//   node scripts/r2.mjs sync-down <prefijo> [carpeta]    baja lo que falta o cambió de tamaño
//   Opción --dry: muestra qué haría sin transferir nada.
//
// Convención de claves: `logos/...` y `Renders/...` son las mismas rutas que en el repo (el Worker las
// sirve en /media/). Los originales de trabajo que no se publican van bajo `_fuentes/`
// (p. ej. `_fuentes/fotos/T4/...`, capturas y láminas de kits); el Worker no los expone.
import fs from 'fs';
import path from 'path';
import { putFile, getFile, list } from './lib/r2.mjs';
import { ROOT } from './lib/env.mjs';

const args = process.argv.slice(2).filter(a => a !== '--dry');
const DRY = process.argv.includes('--dry');
const [cmd, a, b] = args;
const SKIP = /(^|[\\/])(Thumbs\.db|desktop\.ini|\.DS_Store)$/i;
const toKey = p => p.split(path.sep).join('/');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (!SKIP.test(p)) out.push(p);
  }
  return out;
}
async function pool(items, n, fn) {
  let i = 0, done = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const it = items[i++];
      try { await fn(it); } catch (e) { console.error('  ERROR', it.key || it, e.message); }
      if (++done % 25 === 0) console.log(`  ${done}/${items.length}`);
    }
  }));
}

if (cmd === 'ls') {
  const objs = await list(a || '');
  objs.forEach(o => console.log(String(o.size).padStart(10), o.key));
  console.log(`${objs.length} objetos, ${(objs.reduce((s, o) => s + o.size, 0) / 1048576).toFixed(1)} MB`);
} else if (cmd === 'put') {
  const key = b || toKey(path.relative(ROOT, path.resolve(a)));
  if (!DRY) await putFile(a, key);
  console.log('subido', key);
} else if (cmd === 'get') {
  const dest = b || path.join(ROOT, a);
  if (!DRY) await getFile(a, dest);
  console.log('bajado', dest);
} else if (cmd === 'sync-up') {
  const dir = path.resolve(a);
  const prefix = (b ?? toKey(path.relative(ROOT, dir))).replace(/\/$/, '');
  const remote = new Map((await list(prefix + '/')).map(o => [o.key, o.size]));
  const todo = walk(dir).map(f => ({ f, key: `${prefix}/${toKey(path.relative(dir, f))}`, size: fs.statSync(f).size }))
    .filter(x => remote.get(x.key) !== x.size);
  console.log(`${todo.length} archivos para subir (${(todo.reduce((s, x) => s + x.size, 0) / 1048576).toFixed(1)} MB) a ${prefix}/`);
  if (!DRY) await pool(todo, 6, x => putFile(x.f, x.key));
  console.log('listo');
} else if (cmd === 'sync-down') {
  const prefix = a.replace(/\/$/, '');
  const dir = path.resolve(b || path.join(ROOT, prefix));
  const todo = (await list(prefix + '/')).map(o => ({ ...o, f: path.join(dir, ...o.key.slice(prefix.length + 1).split('/')) }))
    .filter(o => !fs.existsSync(o.f) || fs.statSync(o.f).size !== o.size);
  console.log(`${todo.length} archivos para bajar (${(todo.reduce((s, x) => s + x.size, 0) / 1048576).toFixed(1)} MB) a ${dir}`);
  if (!DRY) await pool(todo, 6, o => getFile(o.key, o.f));
  console.log('listo');
} else {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n'));
}
