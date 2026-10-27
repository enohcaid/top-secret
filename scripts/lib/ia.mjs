// IA de texto para las tareas automáticas (pedido de Juan, 2026-10-26: "optimizar el consumo de Claude en TODO lo
// que hacemos con una IA gratuita", "no quiero que baje la calidad, de hecho debe subir").
// Dos motores: un modelo local con Ollama (gratis, GTX 1070 de drygan) y Claude en UNA llamada sin herramientas,
// corrida desde una carpeta neutra (así no carga CLAUDE.md, memorias ni el repo: miles de tokens menos por llamada).
// `orden` elige quién va primero; el otro es el respaldo, así la tarea sale aunque uno falle o Claude no tenga cupo.
// Comparación 2026-10-26 (docs/conocimiento/reference_ia_local.md): los locales de 8–14B
// rompen reglas en textos públicos (rimas, idioma, datos inventados) → para lo creativo/público, Claude primero.
//
//   import { pedirTexto, pedirJSON } from './lib/ia.mjs';
//   const j = await pedirJSON(prompt, { claves: ['titulo', 'letra'], orden: ['claude', 'local'] });
//
// Modelo local: IA_MODELO en .env (o 'gemma3:12b'). Instalar: winget install Ollama.Ollama; modelos en
// D:\ollama\models (OLLAMA_MODELS); `ollama pull gemma3:12b`.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT, loadEnv } from './env.mjs';

loadEnv();
const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
export const MODELO = process.env.IA_MODELO || 'gemma3:12b';   // el mejor local en la comparación
const CLAUDE = [path.join(os.homedir(), '.local/bin/claude.exe'), path.join(os.homedir(), 'AppData/Roaming/npm/claude.cmd')].find(fs.existsSync) || 'claude';
const log = m => console.log(`  [ia] ${m}`);

// Llama a Ollama. Libera la placa al terminar (keep_alive 0): a la noche la GTX 1070 la necesita ACE-Step.
export async function ollama(prompt, { modelo = MODELO, json = false, temperatura = 0.8, pensar = false, sistema, timeoutMin = 30 } = {}) {
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(timeoutMin * 60000),
    // stream: true — sin streaming, fetch de Node corta a los 5 min sin cabeceras (los 14B tardan más)
    body: JSON.stringify({ model: modelo, stream: true, keep_alive: 0, think: pensar, ...(json ? { format: 'json' } : {}),
      options: { temperature: temperatura, num_ctx: 16384 },
      messages: [...(sistema ? [{ role: 'system', content: sistema }] : []), { role: 'user', content: prompt }] }),
  });
  if (!r.ok) throw new Error(`Ollama ${r.status}: ${(await r.text()).slice(0, 200)}`);
  let texto = '', fin = {}, resto = '';
  for await (const parte of r.body) {
    resto += Buffer.from(parte).toString('utf8');
    const lineas = resto.split('\n'); resto = lineas.pop();
    for (const l of lineas) if (l.trim()) { const j = JSON.parse(l); texto += j.message?.content || ''; if (j.done) fin = j; }
  }
  return { texto: texto.replace(/<think>[\s\S]*?<\/think>/g, '').trim(), segundos: Math.round((fin.total_duration || 0) / 1e9) };
}

// pensar: tope de tokens de razonamiento (MAX_THINKING_TOKENS). Sin tope, Opus llegó a pensar 18 min antes de
// escribir el código de un beat (27/10) y la llamada se cortaba.
// Modelos por nombre completo: el alias 'sonnet' de este Claude Code apunta a claude-sonnet-4-6 (27/10).
const MODELOS = { opus: 'claude-opus-5-5', sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-5-5' };
export function claude(prompt, { modelo = 'opus', minutos = 10, pensar } = {}) {
  const r = spawnSync(CLAUDE, ['-p', '--model', MODELOS[modelo] || modelo, '--output-format', 'json', '--tools', '', '--system-prompt', 'You are a precise writer. Follow the brief exactly and answer only with what it asks for.'], {
    cwd: os.tmpdir(), input: prompt, encoding: 'utf8', timeout: minutos * 60000, env: { ...process.env, CLAUDE_CODE_MAX_OUTPUT_TOKENS: '64000', ...(pensar != null ? { MAX_THINKING_TOKENS: String(pensar) } : {}) }, maxBuffer: 16 * 1024 * 1024, shell: CLAUDE.endsWith('.cmd'),
  });
  const j = (() => { try { return JSON.parse(r.stdout); } catch { return null; } })();
  if (!j?.result) throw new Error(`Claude sin respuesta (código ${r.status}): ${(r.stdout || r.stderr || '').slice(-200)}`);
  // sin cupo, Claude "responde" igual con el aviso de límite como texto (26/10 pasó por composición fallida): es un error
  if (j.is_error || (j.result.length < 400 && /usage limit|out of (extra )?usage|hit your limit|limit (will )?reset|rate limit/i.test(j.result)))
    throw new Error(`Claude sin cupo: ${j.result.slice(0, 200)}`);
  return j.result;
}

// Ejemplos para entrenar el modelo local (Juan, 2026-10-27: "aunque las primeras versiones no estén a la altura,
// podemos entrenar el modelo y perfeccionarlo"): cada respuesta de Claude que pasa los controles se guarda como par
// encargo → respuesta en fuentes/ia/dataset/<tarea>.jsonl. Con unos cientos por tarea se entrena (LoRA) un modelo chico.
export let ultimoMotor = null;
export function guardarEjemplo(tarea, prompt, respuesta) {
  if (!tarea) return;
  try {
    const dir = path.join(ROOT, 'fuentes', 'ia', 'dataset');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, `${tarea}.jsonl`), JSON.stringify({ fecha: new Date().toISOString(), prompt, respuesta }) + '\n');
  } catch {}
}

const sacarJSON = t => JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));

// Texto libre. `validar(texto)` devuelve un error (string) o nada.
export async function pedirTexto(prompt, { validar, orden = ['local', 'claude'], claudeModelo = 'opus', tarea, ...opc } = {}) {
  for (const motor of orden) {
    try {
      const texto = motor === 'claude' ? claude(prompt, { modelo: claudeModelo }) : (await ollama(prompt, opc)).texto;
      const err = validar?.(texto);
      if (!err) { log(`${motor === 'claude' ? 'Claude ' + claudeModelo : opc.modelo || MODELO} respondió`); ultimoMotor = motor; if (motor === 'claude') guardarEjemplo(tarea, prompt, texto); return texto; }
      log(`${motor}: respuesta inválida (${err})`);
    } catch (e) { log(`${motor} no disponible: ${e.message}`); }
  }
  throw new Error('Ningún motor dio una respuesta válida.');
}

// JSON con las claves pedidas (strings no vacíos); 2 intentos por motor, en el orden pedido.
export async function pedirJSON(prompt, { claves = [], validar, orden = ['local', 'claude'], claudeModelo = 'opus', tarea, ...opc } = {}) {
  const chequear = j => { const f = claves.filter(k => !(typeof j[k] === 'string' ? j[k].trim() : j[k] != null)); return f.length ? `faltan ${f.join(', ')}` : validar?.(j); };
  for (const motor of orden) for (let i = 1; i <= 2; i++) {
    try {
      const texto = motor === 'claude' ? claude(prompt, { modelo: claudeModelo }) : (await ollama(prompt, { ...opc, json: true })).texto;
      const j = sacarJSON(texto), err = chequear(j);
      if (!err) { log(`${motor === 'claude' ? 'Claude ' + claudeModelo : opc.modelo || MODELO} respondió`); ultimoMotor = motor; if (motor === 'claude') guardarEjemplo(tarea, prompt, JSON.stringify(j)); return j; }
      log(`${motor}: respuesta inválida, intento ${i} (${err})`);
    } catch (e) {
      log(`${motor}, intento ${i}: ${e.message}`);
      if (/fetch failed|ECONNREFUSED|out of extra usage|usage limit/i.test(e.message)) break;   // no tiene sentido reintentar
    }
  }
  throw new Error('Ningún motor devolvió un JSON válido.');
}
