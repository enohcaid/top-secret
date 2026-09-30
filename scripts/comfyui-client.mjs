/**
 * Cliente mínimo para hablar con un servidor ComfyUI local (API HTTP) y
 * manejar su ciclo de vida bajo demanda: arranca solo cuando hace falta
 * generar una imagen, y se apaga después SI fue este mismo proceso el que
 * lo arrancó (si ya estaba corriendo por otra razón — p.ej. una sesión de
 * prueba manual — se lo deja como estaba).
 *
 * Reemplaza la parte de generate-image-chatgpt.mjs que conectaba a un Chrome
 * vía CDP contra un proyecto de ChatGPT. La lógica de marca/rotación de
 * estilos/kit/identidad de jugadores NO vive acá — este módulo es solo el
 * "motor de generación".
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const COMFYUI_DIR   = 'C:\\Users\\waimi\\ComfyUI-app\\ComfyUI-master';
const VENV_PYTHON   = path.join(COMFYUI_DIR, 'venv', 'Scripts', 'python.exe');
const INPUT_DIR     = path.join(COMFYUI_DIR, 'input');
const OUTPUT_DIR    = path.join(COMFYUI_DIR, 'output');
const BASE_URL      = 'http://127.0.0.1:8188';
const LOCK_FILE     = path.join(COMFYUI_DIR, '.started-by-pipeline.lock');
const STARTUP_LOG   = path.join(COMFYUI_DIR, 'pipeline-startup.log');

// Modelos confirmados funcionando (ver memoria top-secret-imagenes-local,
// 24-25 sept 2026): CLIP tipo qwen_image, UNET GGUF Q8_0 (los quants "_K"
// como Q4_K_M/Q5_K_M dan salida corrupta con el nodo ComfyUI-GGUF estándar,
// Q8_0 no es un quant "_K" y anda bien), VAE bf16.
export const MODELS = {
  clip: 'qwen3vl_8b_int8_convrot.safetensors',
  clipType: 'qwen_image',
  unet: 'qwen_image_2.1_Q8_0.gguf',
  vae: 'qwen_image_2.1_vae_bf16.safetensors',
};

async function isRunning(timeoutMs = 2000) {
  try {
    const res = await fetch(`${BASE_URL}/system_stats`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Arranca ComfyUI si no está corriendo. Devuelve { startedByUs } — usar ese
 * valor para decidir si hay que apagarlo al terminar (stopIfStartedByUs).
 */
export async function ensureRunning() {
  if (await isRunning()) {
    console.log('ComfyUI ya estaba corriendo — no se toca su ciclo de vida.');
    return { startedByUs: false };
  }

  console.log('ComfyUI no está corriendo — arrancándolo...');
  const logFd = fs.openSync(STARTUP_LOG, 'a');
  const child = spawn(VENV_PYTHON, ['main.py'], {
    cwd: COMFYUI_DIR,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  fs.writeFileSync(LOCK_FILE, String(child.pid));

  const TIMEOUT_MS = 120_000;
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    if (await isRunning()) {
      console.log(`ComfyUI arriba (${Math.round((Date.now() - start) / 1000)}s).`);
      return { startedByUs: true, pid: child.pid };
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`ComfyUI no respondió tras ${TIMEOUT_MS / 1000}s arrancando. Ver ${STARTUP_LOG}.`);
}

/**
 * Apaga ComfyUI SOLO si esta misma ejecución lo arrancó (según el valor
 * devuelto por ensureRunning). Mata el árbol de procesos — el venv lanza un
 * segundo python.exe hijo que un simple taskkill sin /T no toca.
 */
export async function stopIfStartedByUs({ startedByUs, pid }) {
  if (!startedByUs) return;
  try {
    const { execSync } = await import('child_process');
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    console.log('ComfyUI apagado (lo habíamos arrancado nosotros).');
  } catch (e) {
    console.warn('No se pudo apagar ComfyUI limpiamente (no crítico):', e.message.split('\n')[0]);
  } finally {
    try { fs.unlinkSync(LOCK_FILE); } catch {}
  }
}

/** Copia una referencia visual local a la carpeta input/ de ComfyUI con
 * nombre único (evita colisiones entre corridas superpuestas) y devuelve
 * el nombre de archivo a usar en un nodo LoadImage. */
export function stageReferenceImage(localPath) {
  if (!fs.existsSync(localPath)) return null;
  const unique = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${path.basename(localPath)}`;
  fs.copyFileSync(localPath, path.join(INPUT_DIR, unique));
  return unique;
}

/**
 * Arma el workflow de generación. Usa TextEncodeQwenImageEditPlus (hasta 3
 * imágenes de referencia) — es el nodo que de verdad usa las referencias
 * como base a editar/preservar; TextEncodeQwenImage21 (texto-a-imagen puro)
 * da solo una influencia estilística débil, no reproduce diseños (escudo,
 * kit) con fidelidad — confirmado empíricamente 25/9/2026.
 * `referenceFilenames`: hasta 3 nombres de archivo ya en input/ (ver
 * stageReferenceImage). Si no hay ninguna referencia, cae a
 * TextEncodeQwenImage21 (texto puro).
 */
function buildWorkflow({ positivePrompt, negativePrompt = '', referenceFilenames = [], width, height, seed, steps = 25, cfg = 1, filenamePrefix }) {
  const wf = {
    clipLoader: { class_type: 'CLIPLoader', inputs: { clip_name: MODELS.clip, type: MODELS.clipType } },
    unetLoader: { class_type: 'UnetLoaderGGUF', inputs: { unet_name: MODELS.unet } },
    vaeLoader:  { class_type: 'VAELoader', inputs: { vae_name: MODELS.vae } },
    negative:   { class_type: 'CLIPTextEncode', inputs: { clip: ['clipLoader', 0], text: negativePrompt } },
    latent:     { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
  };

  const refs = referenceFilenames.filter(Boolean).slice(0, 3);
  if (refs.length > 0) {
    const editInputs = { clip: ['clipLoader', 0], vae: ['vaeLoader', 0], prompt: positivePrompt };
    refs.forEach((filename, i) => {
      const loadId = `loadRef${i}`;
      wf[loadId] = { class_type: 'LoadImage', inputs: { image: filename } };
      editInputs[`image${i + 1}`] = [loadId, 0];
    });
    wf.positive = { class_type: 'TextEncodeQwenImageEditPlus', inputs: editInputs };
  } else {
    wf.positive = {
      class_type: 'TextEncodeQwenImage21',
      inputs: { clip: ['clipLoader', 0], prompt: positivePrompt, negative_prompt: negativePrompt, resolution: 1024 },
    };
    // TextEncodeQwenImage21 ya da su propia salida "negative" (índice 1) —
    // no hace falta el nodo CLIPTextEncode separado en este camino.
  }

  const negativeRef = refs.length > 0 ? ['negative', 0] : ['positive', 1];

  wf.sampler = {
    class_type: 'KSampler',
    inputs: {
      model: ['unetLoader', 0],
      positive: ['positive', 0],
      negative: negativeRef,
      latent_image: ['latent', 0],
      seed, steps, cfg,
      sampler_name: 'euler',
      scheduler: 'simple',
      denoise: 1.0,
    },
  };
  wf.decode = { class_type: 'VAEDecode', inputs: { samples: ['sampler', 0], vae: ['vaeLoader', 0] } };
  wf.save   = { class_type: 'SaveImage', inputs: { images: ['decode', 0], filename_prefix: filenamePrefix } };

  return wf;
}

async function queuePrompt(workflow) {
  const res = await fetch(`${BASE_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  const data = await res.json();
  if (data.node_errors && Object.keys(data.node_errors).length > 0) {
    throw new Error('ComfyUI rechazó el workflow: ' + JSON.stringify(data.node_errors));
  }
  if (!data.prompt_id) throw new Error('ComfyUI no devolvió prompt_id: ' + JSON.stringify(data));
  return data.prompt_id;
}

async function waitForResult(promptId, timeoutMs = 6 * 60 * 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${BASE_URL}/history/${promptId}`);
    const hist = await res.json();
    const entry = hist[promptId];
    if (entry) {
      const status = entry.status || {};
      if (status.status_str === 'error' || (status.messages || []).some(m => m[0] === 'execution_error')) {
        const errMsg = (status.messages || []).find(m => m[0] === 'execution_error');
        throw new Error('ComfyUI falló generando: ' + JSON.stringify(errMsg || status));
      }
      const saveOut = entry.outputs?.save?.images?.[0];
      if (saveOut) return saveOut; // { filename, subfolder, type }
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error(`Timeout (${timeoutMs / 1000}s) esperando la imagen de ComfyUI.`);
}

async function fetchViewImage({ filename, subfolder, type }) {
  const qs = new URLSearchParams({ filename, subfolder: subfolder || '', type: type || 'output' });
  const res = await fetch(`${BASE_URL}/view?${qs}`);
  if (!res.ok) throw new Error(`No se pudo descargar la imagen generada (HTTP ${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Genera una imagen y la guarda en `outputPath`. `referenceImagePaths` son
 * rutas LOCALES (no todavía en input/ de ComfyUI) — esta función se encarga
 * de copiarlas. Devuelve { outputPath, seed }.
 */
export async function generateImage({
  positivePrompt, negativePrompt = '', referenceImagePaths = [],
  width, height, seed = Math.floor(Math.random() * 1e9),
  steps = 25, cfg = 1, filenamePrefix, outputPath,
}) {
  const referenceFilenames = referenceImagePaths.map(stageReferenceImage);
  try {
    const workflow = buildWorkflow({ positivePrompt, negativePrompt, referenceFilenames, width, height, seed, steps, cfg, filenamePrefix });
    const promptId = await queuePrompt(workflow);
    const imgInfo = await waitForResult(promptId);
    const buffer = await fetchViewImage(imgInfo);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);
    return { outputPath, seed };
  } finally {
    // Las copias de referencia en input/ son transitorias (los originales
    // siguen intactos en el repo) — no dejarlas acumularse en cada corrida.
    for (const fn of referenceFilenames) {
      if (!fn) continue;
      try { fs.unlinkSync(path.join(INPUT_DIR, fn)); } catch {}
    }
  }
}

/** Borra del output/ de ComfyUI los PNG generados por el pipeline que ya
 * fueron copiados a su destino final (Renders/Daily News/, R2, etc.) —
 * ComfyUI no los borra solo, y son la parte más pesada de lo que se
 * acumula en input/output si nadie los limpia. Llamar después de guardar
 * el resultado donde corresponda. */
export function purgeOutputFile(filenamePrefix) {
  for (const f of fs.readdirSync(OUTPUT_DIR)) {
    if (f.startsWith(filenamePrefix)) {
      try { fs.unlinkSync(path.join(OUTPUT_DIR, f)); } catch {}
    }
  }
}
