#!/usr/bin/env node
// Música en aprobar.html (Juan, 2026-10-27: "una sección en aprobaciones para la música, así Gemma puede trabajar sobre
// el error y yo reviso qué genera y qué hay que mejorar"). Cada tema de Thrive entra como DEMO, no se publica solo:
// una tarjeta por parte (concepto, beat, letra, voces) con quién la hizo, el reproductor y un cuadro de comentarios.
//   · Todo "Está bien"         → se publica en topsecret.ar/music.
//   · Alguna parte "A mejorar" → thrive.mjs --revisar rehace esa parte con el comentario (letra y voces: Gemma
//                                primero; beat: Claude Sonnet) y vuelve como versión siguiente.
// Cada decisión, con su comentario, queda en fuentes/ia/dataset/musica-feedback.jsonl para entrenar el modelo local.
//
//   node scripts/beats/musica-aprobacion.mjs              → procesa las decisiones (watch-regen.ps1, cada minuto)
//   node scripts/beats/musica-aprobacion.mjs --demo <slug> → manda un tema existente a aprobar como demo
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { ROOT } from '../lib/env.mjs';
import { leer, guardarKV, agregarLote } from '../social/lib/aprobaciones.mjs';
import { guardarEjemplo } from '../lib/ia.mjs';
import { armarCatalogo, MEDIA } from './catalogo.mjs';

const REG = path.join(ROOT, 'scripts', 'beats', 'thrive.json');
const log = m => console.log(`${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })} [musica] ${m}`);
const leerReg = () => JSON.parse(fs.readFileSync(REG, 'utf8'));
const guardarReg = r => fs.writeFileSync(REG, JSON.stringify(r, null, 2) + '\n');
export const PARTES = [
  { id: 'concepto', formato: 'Concepto', desc: 'La idea y el rasgo psicológico' },
  { id: 'beat', formato: 'Beat', desc: 'La instrumental' },
  { id: 'letra', formato: 'Letra', desc: 'Lo que se canta y cómo rima' },
  { id: 'voces', formato: 'Voces', desc: 'El dúo y el pulido final' },
];

// Lote de aprobación de un tema (reemplaza al de la versión anterior: mismo id)
export async function mandarAAprobar(t, comentarios = {}) {   // comentarios: texto ya cargado por parte (lo que Juan dijo en el chat)
  const local = t.motor === 'local';   // tema hecho solo con la IA local (thrive.mjs --local)
  const quien = {
    concepto: local ? 'Gemma (modelo local)' : 'Claude Opus',
    beat: t.instrumental === 'partitura' ? `Gemma, partitura (${t.vueltasBeat || 1} vuelta${t.vueltasBeat > 1 ? 's' : ''}) tocada por el intérprete`
      : t.instrumental === 'codigo' ? (local ? 'Gemma, compuesto por código' : 'Claude Sonnet, compuesto por código')
      : t.instrumental === 'ace' ? (local ? 'ACE-Step (respaldo: Gemma no logró componerlo)' : 'ACE-Step (respaldo)') : 'ACE-Step',
    letra: t.letraPor === 'local' ? 'Gemma (modelo local)' : 'Claude',
    voces: 'ACE-Step (cover sobre el beat)',
  };
  const detalle = {
    concepto: `${t.concepto}\n\nRasgo: ${t.rasgo}`,
    beat: `${t.beat || t.captionInstrumental}\n\n${t.bpm} BPM · ${t.tonalidad} · ${Math.floor(t.duracion / 60)}:${String(t.duracion % 60).padStart(2, '0')}`,
    letra: (t.historia ? `Historia: ${t.historia.quien} · 1) ${t.historia.verso1} · Estribillo "${t.historia.gancho}" · 2) ${t.historia.verso2} · Puente: ${t.historia.puente}\n\n` : '') + (t.letraFinal || t.letra),
    voces: `${t.voz}\n\n${t.captionVoces}`,
  };
  if (t.reemplaza) {   // concepto rehecho = tema nuevo: la demo anterior sale de la lista
    const data = await leer(); data.lotes = data.lotes.filter(l => l.id !== `musica-${t.reemplaza}`); await guardarKV('aprobaciones', data);
  }
  await agregarLote({
    id: `musica-${t.slug}`, etapa: 'musica', creado: new Date().toISOString(),
    titulo: `Thrive · ${t.titulo}`, bajada: `${local ? 'Demo con IA local' : 'Demo'}, versión ${t.version || 1}`,
    tema: { slug: t.slug, titulo: t.titulo, version: t.version || 1, audio: MEDIA + t.audio },
    piezas: PARTES.map(p => ({ id: p.id, red: 'musica', formato: p.formato, descripcion: `${p.desc} · ${quien[p.id]}`, detalle: detalle[p.id], texto: comentarios[p.id] || '' })),
  });
  log(`"${t.titulo}" (versión ${t.version || 1}) en aprobar.html`);
}

// Decisiones tomadas en aprobar.html → publicar o rehacer
export async function procesar() {
  const data = await leer();
  let cambio = false;
  for (const l of data.lotes.filter(l => l.etapa === 'musica' && !l.estado)) {
    if (l.piezas.some(p => !p.decision || p.decision === 'pendiente')) continue;
    const reg = leerReg(), t = reg.temas.find(x => x.slug === l.tema.slug);
    if (!t) continue;
    for (const p of l.piezas) guardarEjemplo('musica-feedback', JSON.stringify({ tema: t.slug, version: t.version || 1, parte: p.id, detalle: p.detalle }),
      JSON.stringify({ decision: p.decision === 'aprobada' ? 'bien' : 'a mejorar', comentario: p.texto || '' }));
    const mejorar = l.piezas.filter(p => p.decision === 'descartada');
    if (!mejorar.length) {
      t.publicado = true; guardarReg(reg);
      await armarCatalogo({ log });
      git('add', 'scripts/beats/thrive.json'); git('commit', '-m', `feat: Thrive — "${t.titulo}" aprobado y publicado\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`); git('push', '-q');
      l.estado = 'publicado'; log(`"${t.titulo}" aprobado: publicado en topsecret.ar/music`);
    } else {
      t.revision = Object.fromEntries(mejorar.map(p => [p.id, p.texto || '']));
      guardarReg(reg);
      l.estado = 'revisando'; l.revisandoDesde = new Date().toISOString();
      spawn('cmd.exe', ['/c', `node scripts\\beats\\thrive.mjs --revisar ${t.slug} >> scripts\\thrive.log 2>&1`], { cwd: ROOT, detached: true, stdio: 'ignore', windowsHide: true }).unref();
      log(`"${t.titulo}": a mejorar ${mejorar.map(p => p.id).join(', ')} → revisión en marcha`);
    }
    cambio = true;
  }
  if (cambio) await guardarKV('aprobaciones', data);
}
const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const i = process.argv.indexOf('--demo');
  if (i > 0) {
    const reg = leerReg(), t = reg.temas.find(x => x.slug === process.argv[i + 1]);
    if (!t?.audio) { console.error('No existe ese tema o no tiene audio.'); process.exit(1); }
    t.publicado = false; guardarReg(reg);
    await armarCatalogo({ log });
    await mandarAAprobar(t);
  } else await procesar();
}
