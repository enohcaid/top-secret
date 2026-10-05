/* "Compartir video" de convocatoria.html: arma EN EL NAVEGADOR el video vertical del equipo de hoy
   (misma escena que scripts/video-plantel: cada jugador entra con su pose y vuela a su lugar en la formación,
   y al final los partidos del día) y lo comparte por WhatsApp / redes.
   - Cuadros de cada jugador: hojas webp en R2 video-equipo/<VER>/<gt>.webp (scripts/video-plantel/web-assets.mjs).
   - Escena: scripts/video-plantel/escena.js (crearEscena), la misma que usa render.mjs en la PC.
   - Video: WebCodecs (H.264) + mp4-muxer; música trap libre (regla del club) con AAC si el navegador lo soporta.
   Lee de convocatoria.html: lineup, captain, PLAYERS, FORMATIONS, SLOT_LABEL_ES, getTodayMatches, TODAY. */
(function () {
  const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
  const VER = 'v1';                                        // mismo VER que web-assets.mjs
  const SPRITE = { base: `${MEDIA}/video-equipo/${VER}/`, n: 22, cols: 6, fw: 480, fh: 854 };
  const ESCENA_JS = 'scripts/video-plantel/escena.js?v=2';
  const MUXER = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5/+esm';
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  let enCurso = false;

  function cargarScript(src) {
    if (window.crearEscena) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }

  function armarConfig() {
    const formation = lineup.formation;
    const def = FORMATIONS[formation] || [];
    const porNombre = Object.fromEntries(PLAYERS.map(p => [p.name, p]));
    const items = def.filter(s => lineup.slots[s.key]).map(s => {
      const name = lineup.slots[s.key], p = porNombre[name] || {};
      return { key: name, num: p.num != null ? String(p.num) : '', slot: s.key, x: s.x, y: s.y,
        puesto: (SLOT_LABEL_ES[formation] || {})[s.key] || s.l, capitan: captain === name };
    });
    let partidos = [];
    try {
      partidos = getTodayMatches().map(m => ({ time: m.time, rival: m.rival, league: m.league, isHome: !!m.isHome, badge: m.badge || m.rivalLogo || null }))
        .sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    } catch (_) {}
    const dt = new Date(TODAY + 'T12:00:00');
    return {
      items, partidos, modo: 'equipo', grilla: false, sprite: SPRITE, layout: { tipo: 'formacion' },
      header: { eyebrow: `Equipo de hoy · ${formation}`, title: `${DIAS[dt.getDay()]} ${dt.getDate()} ${MESES[dt.getMonth()]}` },
    };
  }

  // ── Modal de progreso / compartir ──
  function modal() {
    let m = document.getElementById('veModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'veModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:16px;';
    m.innerHTML = `<div style="background:var(--black,#0d0d0d);border:1px solid var(--border,#333);border-radius:16px;padding:22px;width:min(360px,100%);text-align:center;font-family:'Barlow',sans-serif;color:#fff">
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--gold,#c9a84c);font-size:.8rem">Video del equipo</div>
      <div id="veEstado" style="margin:12px 0 10px;font-size:.95rem">Preparando…</div>
      <div style="height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden"><div id="veBarra" style="height:100%;width:0;background:var(--gold,#c9a84c);transition:width .2s"></div></div>
      <video id="vePrev" playsinline muted loop style="display:none;width:100%;max-height:52vh;margin-top:14px;border-radius:10px;background:#000"></video>
      <div id="veBotones" style="display:none;gap:8px;margin-top:14px;flex-direction:column"></div>
      <button id="veCerrar" style="margin-top:12px;background:none;border:0;color:#999;font-size:.85rem;cursor:pointer">Cerrar</button>
    </div>`;
    document.body.appendChild(m);
    m.querySelector('#veCerrar').onclick = () => { m.remove(); };
    return m;
  }
  const estado = (txt, pct) => {
    const m = modal();
    m.querySelector('#veEstado').textContent = txt;
    if (pct != null) m.querySelector('#veBarra').style.width = Math.round(pct) + '%';
  };

  async function elegirCodec(w, h) {
    for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.42001f']) {
      const cfg = { codec, width: w, height: h, bitrate: 6_000_000, framerate: 30 };
      try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch (_) {}
    }
    return null;
  }

  async function musica(durS) {
    if (!window.AudioEncoder) return null;
    const conf = { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 160000 };
    try { if (!(await AudioEncoder.isConfigSupported(conf)).supported) return null; } catch (_) { return null; }
    const buf = await (await fetch(`${MEDIA}/video-equipo/${VER}/musica.mp3`)).arrayBuffer();
    const ac = new OfflineAudioContext(2, 48000, 48000);
    const audio = await ac.decodeAudioData(buf);
    const sr = audio.sampleRate, len = Math.min(audio.length, Math.floor(durS * sr));
    const L = audio.getChannelData(0).slice(0, len), R = (audio.numberOfChannels > 1 ? audio.getChannelData(1) : audio.getChannelData(0)).slice(0, len);
    const fin = Math.floor(2 * sr), ini = Math.floor(.5 * sr);
    for (let i = 0; i < len; i++) {                         // fundido de entrada 0,5 s y de salida 2 s
      const g = Math.min(1, i / ini, (len - i) / fin);
      L[i] *= g; R[i] *= g;
    }
    return { conf: { ...conf, sampleRate: sr }, L, R, sr, len };
  }

  async function generar() {
    const cfg = armarConfig();
    if (!cfg.items.length) { showToast('Primero armá el equipo en la cancha', 'info'); return null; }
    estado('Cargando jugadores…', 2);
    await cargarScript(ESCENA_JS);
    const { Muxer, ArrayBufferTarget } = await import(MUXER);

    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920;
    const escena = window.crearEscena(cv, cfg);
    const total = await escena.preparar();

    // Algunos teléfonos no codifican 1080×1920: se baja a 720×1280 dibujando la escena escalada
    let vconf = await elegirCodec(1080, 1920), out = cv;
    if (!vconf) {
      vconf = await elegirCodec(720, 1280);
      if (!vconf) throw new Error('Este navegador no puede generar video (probá con Chrome actualizado).');
      out = document.createElement('canvas'); out.width = 720; out.height = 1280;
    }
    const pista = await musica(total / 30).catch(() => null);

    const muxer = new Muxer({
      target: new ArrayBufferTarget(), fastStart: 'in-memory',
      video: { codec: 'avc', width: vconf.width, height: vconf.height },
      ...(pista ? { audio: { codec: 'aac', numberOfChannels: 2, sampleRate: pista.sr } } : {}),
    });
    let error = null;
    const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { error = e; } });
    venc.configure(vconf);

    for (let f = 0; f < total; f++) {
      if (error) throw error;
      await escena.cuadro(f, { raw: true });
      if (out !== cv) out.getContext('2d').drawImage(cv, 0, 0, out.width, out.height);
      const vf = new VideoFrame(out, { timestamp: Math.round(f * 1e6 / 30), duration: Math.round(1e6 / 30) });
      venc.encode(vf, { keyFrame: f % 60 === 0 });
      vf.close();
      while (venc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 5));
      if (f % 10 === 0) estado('Armando el video…', 5 + 85 * f / total);
    }
    await venc.flush();

    if (pista) {
      estado('Sumando la música…', 92);
      const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { error = e; } });
      aenc.configure(pista.conf);
      const BLOQUE = 1024;
      for (let i = 0; i < pista.len; i += BLOQUE) {
        const n = Math.min(BLOQUE, pista.len - i), data = new Float32Array(n * 2);
        data.set(pista.L.subarray(i, i + n), 0); data.set(pista.R.subarray(i, i + n), n);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: pista.sr, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(i * 1e6 / pista.sr), data });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush();
    }
    if (error) throw error;
    muxer.finalize();
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  }

  async function compartirVideoEquipo() {
    if (enCurso) return;
    if (!window.VideoEncoder || !window.VideoFrame) { showToast('Tu navegador no puede generar el video. Probá con Chrome actualizado.', 'info'); return; }
    enCurso = true;
    const m = modal();
    try {
      const blob = await generar();
      if (!blob) { m.remove(); return; }
      const nombre = `TopSecret-FC-equipo-${TODAY}.mp4`;
      const file = new File([blob], nombre, { type: 'video/mp4' });
      estado('¡Listo!', 100);
      const prev = m.querySelector('#vePrev'); prev.src = URL.createObjectURL(blob); prev.style.display = 'block'; prev.play().catch(() => {});
      const bot = m.querySelector('#veBotones'); bot.style.display = 'flex'; bot.innerHTML = '';
      const boton = (txt, primario, fn) => {
        const b = document.createElement('button');
        b.textContent = txt;
        b.style.cssText = `padding:12px;border-radius:10px;font-family:'Barlow Condensed',sans-serif;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.95rem;cursor:pointer;${primario ? 'background:var(--gold,#c9a84c);color:#111;border:0' : 'background:none;color:var(--gold,#c9a84c);border:1px solid var(--gold,#c9a84c)'}`;
        b.onclick = fn; bot.appendChild(b);
      };
      // navigator.share necesita un toque del usuario: por eso va en un botón al terminar, no automático
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        boton('Compartir (WhatsApp)', true, async () => {
          try { await navigator.share({ files: [file], title: 'Top Secret FC · Equipo de hoy' }); } catch (e) { if (e.name !== 'AbortError') showToast('No se pudo compartir', 'info'); }
        });
      }
      boton('Descargar', false, () => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
        document.body.appendChild(a); a.click(); a.remove();
      });
    } catch (e) {
      console.error(e);
      estado('No se pudo generar el video: ' + (e.message || e), null);
    } finally { enCurso = false; }
  }

  window.compartirVideoEquipo = compartirVideoEquipo;
})();
