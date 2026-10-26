// IA de texto para las tareas automáticas (pedido de Juan, 2026-10-26: "optimizar el consumo de Claude en TODO lo
// que hacemos con una IA gratuita"). Primero un modelo local con Ollama (gratis, corre en la GTX 1070 de drygan);
// si Ollama no está, el modelo falla o la respuesta no pasa la validación, cae a Claude (claude -p) para que la tarea
// salga igual.
//
//   import { pedirTexto, pedirJSON } from './lib/ia.mjs';
//   const j = await pedirJSON(prompt, { claves: ['titulo', 'letra'], modelo: 'qwen3:14b' });
//
// Modelo por defecto: IA_MODELO en .env (o 'qwen3:14b'). Instalar: winget install Ollama.Ollama; modelos en
// D:\ollama\models (OLLAMA_MODELS); `ollama pull qwen3:14b`. Comparación de modelos: scripts/ia-comparar.mjs.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT, loadEnv } from './env.mjs';

loadEnv();
const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
export const MODELO = process.env.IA_MODELO || 'qwen3:14b';
const CLAUDE = [path.join(os.homedir(), '.local/bin/claude.exe'), path.join(os.homedir(), 'AppData/Roaming/npm/claude.cmd')].find(fs.existsSync) || 'claude';
const log = m => console.log(`  [ia] ${m}`);

// Llama a Ollama. Libera la placa al terminar (keep_alive 0): a la noche la GTX 1070 la necesita ACE-Step.
export async function ollama(prompt, { modelo = MODELO, json = false, temperatura = 0.8, pensar = false, sistema, timeoutMin = 30 } = {}) {
  const r = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(timeoutMin * 60000),
    body: JSON.stringify({ model: modelo, stream: false, keep_alive: 0, think: pensar, ...(json ? { format: 'json' } : {}),
      options: { temperature: temperatura, num_ctx: 16384 },
      messages: [...(sistema ? [{ role: 'system', content: sistema }] : []), { role: 'user', content: prompt }] }),
  });
  if (!r.ok) throw new Error(`Ollama ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return { texto: (j.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim(), segundos: Math.round((j.total_duration || 0) / 1e9) };
}

export function claude(prompt, { modelo = 'opus' } = {}) {
  const r = spawnSync(CLAUDE, ['-p', '--model', modelo, '--output-format', 'json'], {
    cwd: ROOT, input: prompt, encoding: 'utf8', timeout: 10 * 60000, maxBuffer: 16 * 1024 * 1024, shell: CLAUDE.endsWith('.cmd'),
  });
  const res = (() => { try { return JSON.parse(r.stdout).result; } catch { return null; } })();
  if (!res) throw new Error(`Claude sin respuesta (código ${r.status}): ${(r.stdout || r.stderr || '').slice(-200)}`);
  return res;
}

const sacarJSON = t => JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));

// Texto libre: local primero, Claude si falla. `validar(texto)` devuelve un error (string) o nada.
export async function pedirTexto(prompt, { validar, respaldo = true, ...opc } = {}) {
  try {
    const { texto, segundos } = await ollama(prompt, opc);
    const err = validar?.(texto);
    if (!err) { log(`${opc.modelo || MODELO} respondió en ${segundos} s`); return texto; }
    log(`${opc.modelo || MODELO}: respuesta inválida (${err})`);
  } catch (e) { log(`modelo local no disponible: ${e.message}`); }
  if (!respaldo) throw new Error('El modelo local no dio una respuesta válida.');
  log('respaldo: Claude'); return claude(prompt);
}

// JSON con las claves pedidas (strings no vacíos), 2 intentos locales y después Claude.
export async function pedirJSON(prompt, { claves = [], validar, respaldo = true, ...opc } = {}) {
  const chequear = j => { const f = claves.filter(k => !(typeof j[k] === 'string' ? j[k].trim() : j[k] != null)); return f.length ? `faltan ${f.join(', ')}` : validar?.(j); };
  for (let i = 1; i <= 2; i++) {
    try {
      const { texto, segundos } = await ollama(prompt, { ...opc, json: true });
      const j = sacarJSON(texto), err = chequear(j);
      if (!err) { log(`${opc.modelo || MODELO} respondió en ${segundos} s`); return j; }
      log(`${opc.modelo || MODELO}: respuesta inválida, intento ${i} (${err})`);
    } catch (e) { log(`modelo local, intento ${i}: ${e.message}`); if (/fetch failed|ECONNREFUSED/.test(e.message)) break; }
  }
  if (!respaldo) throw new Error('El modelo local no dio un JSON válido.');
  log('respaldo: Claude');
  const j = sacarJSON(claude(prompt)), err = chequear(j);
  if (err) throw new Error(`Claude tampoco devolvió un JSON válido (${err})`);
  return j;
}
