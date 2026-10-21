// ═══════════════════════════════════════════════════════════════
// Cloudflare Worker — Top Secret FC
// Proxy a Google Gemini API (GRATIS) + KV storage + EA Sports proxy
// ═══════════════════════════════════════════════════════════════

// ── NOTICIAS — OG meta map ───────────────────────────────────────
// Add an entry here whenever a new article is added to noticias-data.js
const SITE = 'https://topsecret.ar/';
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
const NOTICIAS_OG = {
  'nuevos-fichajes-t4': {
    t: 'Seis caras nuevas: los fichajes de la Temporada 4',
    i: MEDIA + 'logos/noticias/fichajes-t4-portada.jpg',
  },
  'presentacion-plantel-t4': {
    t: 'Diecinueve: así se presenta el plantel de la Temporada 4',
    i: MEDIA + 'logos/noticias/plantel-t4-portada-v2.jpg',
  },
  'expediente-desclasificado-2026': {
    t: 'Expediente Top Secret: desclasificado',
    i: MEDIA + 'logos/noticias/relanz-estadio-final.png',
  },
  'renovacion-web-identidad-2026': {
    t: 'Misma esencia, otra presencia: Top Secret renueva su imagen',
    i: MEDIA + 'logos/noticias/web-identidad-portada.png',
  },
  'presentacion-kits-t4': {
    t: 'Negro, azul y fuego: así son las camisetas de la Temporada 4',
    i: MEDIA + 'logos/noticias/kits-t4-portada-v3.png',
  },
  'lanzamiento-twitch-2026': {
    t: '¡Ya estamos en Twitch! Top Secret FC transmite todos sus partidos en vivo',
    i: MEDIA + 'logos/' + encodeURIComponent('Lanzamiento Twitch.png'),
  },
  'cierre-vpn-t3-2026': {
    t: 'Cierre VPN: 19 partidos, el cambio a línea de tres y los 9 goles de Lautavester7',
    i: MEDIA + 'logos/' + encodeURIComponent('Cierre VPN T3.png'),
  },
  'cierre-11x11-t3-2026': {
    t: 'Cierre 11x11: 18 partidos, la remontada en la vuelta y los 8 goles de Lautavester7',
    i: MEDIA + 'logos/' + encodeURIComponent('Cierre 11x11 T3.png'),
  },
  'cierre-vpug-t3-2026': {
    t: 'Cierre VPUG: 17 partidos, la racha de 5 triunfos y los 16 goles de Lautavester7',
    i: MEDIA + 'logos/' + encodeURIComponent('Cierre VPUG T3.png'),
  },
  'lanzamiento-tiktok-2026': {
    t: '¡Ya estamos en TikTok! Top Secret FC lanza su cuenta oficial',
    i: MEDIA + 'logos/' + encodeURIComponent('Lanzamiento TikTok.png'),
  },
  'fichajes-full-boxxing-ltemp30148-2026': {
    t: 'Nuevos fichajes: Full_boxxing_ y lTemp30148 se suman al plantel',
    i: MEDIA + 'logos/' + encodeURIComponent('NUEVOS FICHAJES.webp'),
  },
  'gracias-yzytx0-mauriii-2026': {
    t: 'Gracias, yzytx0 y Mauriii-_1891: el club se despide de dos piezas del plantel',
    i: MEDIA + 'logos/' + encodeURIComponent('GRACIAS!.webp'),
  },
  'comunicado-colombia-2026': {
    t: 'Comunicado oficial: Top Secret FC junto a Colombia',
    i: MEDIA + 'logos/' + encodeURIComponent('Comunicado Colombia.png'),
  },
  'fixture-vpug-t6-2026': {
    t: 'Fixture confirmado: 17 partidos en la Primera División VPUG, Temporada 6',
    i: MEDIA + 'logos/' + encodeURIComponent('Fixture VPUG T3.png'),
  },
  'youtube-resumen-semanal-1': {
    t: '¡Estamos en YouTube! Top Secret FC inaugura su canal oficial con el Resumen Semanal #1',
    i: MEDIA + 'logos/' + encodeURIComponent('Resumen Semanal 1.png'),
  },
  'plantel-t3-2026': {
    t: 'Presentamos el plantel completo de Top Secret FC para la Temporada 3',
    i: MEDIA + 'logos/' + encodeURIComponent('Presentación Plantel T3.png'),
  },
  'fichajes-t3-2026': {
    t: 'Once caras nuevas: Top Secret FC confirma sus refuerzos para la Temporada 3',
    i: MEDIA + 'logos/10.png',
  },
  'fixture-vpn-t3-2026': {
    t: 'Ya tenemos fixture: 19 partidos en la Liga Argentina 2da División VPN',
    i: MEDIA + 'logos/' + encodeURIComponent('Fixture VPN T3.png'),
  },
  'fixture-11x11-t3-2026': {
    t: 'Fixture confirmado: 18 partidos en el Challengers #4 de 11x11',
    i: MEDIA + 'logos/' + encodeURIComponent('Fixture 11x11 T3.png'),
  },
  'mundial-2026-finalissima': {
    t: '"Ganamos la final": Argentina tumbó a Inglaterra y el domingo va por la Finalíssima ante España',
    i: MEDIA + 'logos/Noticia%20WC2026%2017-7.png',
  },
  'kits-t3-2026': {
    t: 'Top Secret FC presenta sus kits T3 con Nike — negro, blanco y amarillo',
    i: MEDIA + 'logos/T3%20Kits.png',
  },
  'invierno-2026-j3j6': {
    t: 'Invierno VPUG: caída el martes, doble victoria el jueves — el equipo se recompone',
    i: MEDIA + 'logos/Resumen%20sem1%20invierno.png',
  },
  'invierno-2026-j1j2': {
    t: 'Campeonato de Invierno: Top Secret arranca con dos victorias — 2-1 y 3-2',
    i: MEDIA + 'logos/Campeonato%20Invierno.png',
  },
  'cierre-vpug-t2': {
    t: 'Cierre VPUG T2: 17 partidos, 30 goles y BlackPanther como máximo artillero con 10',
    i: MEDIA + 'logos/Cierre%20VPUG%20T2.png',
  },
  'cierre-11x11-t2': {
    t: 'Cierre 11x11 T2: Lautavester7 y lucasmatiakd, 5 goles cada uno',
    i: MEDIA + 'logos/Cierre%2011x11%20T2.png',
  },
  'cierre-vpn-t2': {
    t: 'Cierre VPN T2: 19 partidos en Primera División, Lautavester7 termina con 13 goles',
    i: MEDIA + 'logos/Cierre%20VPN%20T2.png',
  },
  'destacados-semana3-t2': {
    t: 'Semana 3: la goleada en VPUG y el punto arrancado en VPN',
    i: MEDIA + 'logos/Destacados%20Sem3.png',
  },
  'destacados-semana2-t2': {
    t: 'Semana 2: el jueves salva la semana',
    i: MEDIA + 'logos/Destacados%20Sem2.png',
  },
  'destacados-semana1-t2': {
    t: 'Semana 1 de Temporada 2: análisis de los tres frentes',
    i: MEDIA + 'logos/Destacados%20Sem1.png',
  },
  'nuevo-ct-2026': {
    t: 'Top Secret FC presenta su nuevo Cuerpo Técnico',
    i: MEDIA + 'logos/Nuevo%20CT.png',
  },
  'fixture-vpn-t2-2026': {
    t: 'Ya tenemos fixture: 19 partidos en la Primera División VPN',
    i: MEDIA + 'logos/Fixture%20VPN.webp',
  },
  'plantel-2026': {
    t: 'Este es el plantel que jugará la nueva temporada',
    i: MEDIA + 'logos/Plantel%20T2%202026.webp',
  },
  'fichajes-t2-2026': {
    t: 'Tres incorporaciones para la Temporada 2',
    i: MEDIA + 'logos/Fichajes.webp',
  },
  'kit-drop-2026': {
    t: 'Nuevas camisetas para la temporada 2026',
    i: MEDIA + 'logos/2026%20Kit%20Drop.png',
  },
  'rebrand-2026': {
    t: 'Top Secret FC presenta su nueva identidad',
    i: MEDIA + 'logos/Anuncio%20Rebrand.webp',
  },
  'equipo-temporada-vpn-2026': {
    t: 'Tres jugadores en el Equipo de la Temporada VPN',
    i: MEDIA + 'logos/equipo-temporada-vpn.webp',
  },
  'ascenso-primera-2025': {
    t: 'Ascendimos a Primera División',
    i: MEDIA + 'logos/Festejo%20Ascenso.webp',
  },
};

// Strip nulls, URLs, and long strings from API JSON to reduce token usage
function simplifyForAI(v, depth = 0) {
  if (depth > 6) return undefined;
  if (Array.isArray(v)) {
    const arr = v.map(x => simplifyForAI(x, depth + 1)).filter(x => x !== undefined);
    return arr.length ? arr : undefined;
  }
  if (v !== null && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (val === null || val === undefined) continue;
      if (typeof val === 'string' && val.startsWith('http')) continue;
      if (typeof val === 'string' && val.length > 120) continue;
      const s = simplifyForAI(val, depth + 1);
      if (s !== undefined) out[k] = s;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return v;
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Rutas EA permitidas (whitelist de seguridad)
const EA_ALLOWED_PATHS = [
  'clubs/overallStats',
  'clubs/stats',
  'clubs/seasonalStats',
  'clubs/members/stats',
  'clubs/matches',
  'clubs/search',
  'clubs/info',
  'members/stats',
  'members/career/stats',
  'allTimeLeaderboard/search',
  'ping',
];

// Headers que pasan el Akamai de EA (desde la IP de Cloudflare funciona; curl/Node local no)
const EA_HEADERS = {
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
  'Cache-Control':   'no-cache',
  'Referer':         'https://www.ea.com/games/ea-sports-fc/clubs/rankings',
  'Origin':          'https://www.ea.com',
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Sec-Fetch-Dest':  'empty',
  'Sec-Fetch-Mode':  'cors',
  'Sec-Fetch-Site':  'same-site',
};

// Club en FC 27 (ver docs/conocimiento/reference_ea_proclubs_api.md)
const EA_CLUB_ID = '404340';
const EA_PLATFORM = 'common-gen5';
// Solo partidos privados: ahí se juegan los oficiales (VPN/VPUG/Espacio Gamer). Los de
// liga de EA (Division Rivals) y sus playoffs nunca son oficiales.
const EA_MATCH_TYPES = ['friendlyMatch'];

// Dominios permitidos para proxy de URLs de torneos
const FETCH_ALLOWED_DOMAINS = [
  'virtualpronetwork.com',
  'virtualprogaming.com',
  'copafacil-web.firebaseio.com',
  'copafacil.gg',
  'copafacil-storage.b-cdn.net',
  'espaciogamer.cl',
  'challonge.com',
  'toornament.com',
  'smash.gg',
  'start.gg',
  'faceit.com',
  'firebasestorage.googleapis.com',
];

export default {
  async fetch(request, env, ctx) {
    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      // ── R2 MEDIA (/media/<key>) — serves Renders/ and logos/ from the R2 bucket ──
      if (url.pathname.startsWith('/media/') && request.method === 'GET') {
        const key = decodeURIComponent(url.pathname.slice('/media/'.length));
        // `_fuentes/` guarda originales de trabajo (capturas, láminas de kits): no se publican.
        if (key.startsWith('_fuentes/')) return new Response('Not found', { status: 404, headers: CORS_HEADERS });
        // Copia en la caché del borde de Cloudflare: la primera visita lee R2 (~250 ms), las
        // siguientes (de cualquier visitante en esa región) salen de la caché. La clave incluye
        // el ?v=, así que versionar una URL sigue sirviendo la imagen nueva al instante.
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), { method: 'GET' });
        const hit = await cache.match(cacheKey);
        if (hit) {
          const h = new Response(hit.body, hit);
          h.headers.set('X-Media-Cache', 'HIT');
          return h;
        }
        const obj = await env.MEDIA_BUCKET.get(key);
        if (!obj) return new Response('Not found', { status: 404, headers: CORS_HEADERS });
        const headers = new Headers(CORS_HEADERS);
        obj.writeHttpMetadata(headers);
        headers.set('etag', obj.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        const dl = url.searchParams.get('dl');
        if (dl) headers.set('Content-Disposition', `attachment; filename="${dl.replace(/"/g, '')}"`);
        const res = new Response(obj.body, { headers });
        if (ctx) ctx.waitUntil(cache.put(cacheKey, res.clone()));
        res.headers.set('X-Media-Cache', 'MISS');
        return res;
      }

      // ── KV STORAGE (/kv) ──────────────────────────
      if (url.pathname === '/kv') {
        if (request.method === 'GET') {
          const key = url.searchParams.get('key');
          if (!key) return jsonResp({ error: 'Missing key' }, 400);
          let value = null;
          try { const raw = await env.TS_KV.get(key, 'text'); if (raw) value = JSON.parse(raw); } catch(e) {}
          return jsonResp(value ?? []);
        }

        if (request.method === 'POST') {
          const { key, value } = await request.json();
          if (!key) return jsonResp({ error: 'Missing key' }, 400);
          await env.TS_KV.put(key, JSON.stringify(value));
          return jsonResp({ ok: true });
        }
      }

      // ── EA SPORTS API PROXY (/ea) ──────────────────
      if (url.pathname === '/ea' && request.method === 'GET') {
        const eaPath = (url.searchParams.get('path') || '').trim();

        if (eaPath === 'ping') {
          return jsonResp({ pong: true, v: 2 });
        }

        const pathBase = eaPath.split('?')[0];
        if (!EA_ALLOWED_PATHS.some(p => pathBase.startsWith(p))) {
          return jsonResp({ error: 'Path not allowed' }, 403);
        }

        const eaUrl = `https://proclubs.ea.com/api/fc/${eaPath}`;

        const resp = await fetch(eaUrl, {
          headers: EA_HEADERS,
          cf: { cacheTtl: 120, cacheEverything: true },
        });

        const body = await resp.text();
        const isJson = body.trim().startsWith('[') || body.trim().startsWith('{');

        if (!resp.ok || !isJson) {
          return jsonResp({
            error: 'EA error',
            status: resp.status,
            preview: body.slice(0, 150),
          }, 502);
        }

        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
            'Cache-Control': 'public, max-age=120',
          }
        });
      }

      // ── HISTORIAL EA (/ea-historial) ──────────────
      // Partidos de EA guardados por el cron (EA solo devuelve los últimos 5 por tipo)
      // + foto de los miembros. POST /ea-historial/refrescar fuerza una sincronización.
      if (url.pathname === '/ea-historial' && request.method === 'GET') {
        const [partidos, miembros, meta] = await Promise.all([
          env.TS_KV.get('ea_partidos', 'json'),
          env.TS_KV.get('ea_miembros', 'json'),
          env.TS_KV.get('ea_sync_meta', 'json'),
        ]);
        return jsonResp({ club: EA_CLUB_ID, platform: EA_PLATFORM, partidos: partidos || [], miembros: miembros || null, sync: meta || null });
      }
      if (url.pathname === '/ea-historial/refrescar' && request.method === 'POST') {
        const r = await syncEaPartidos(env, true, url.searchParams.get('limpiar') === '1');
        return jsonResp(r);
      }

      // ── IMAGE PROXY (/img-proxy) ──────────────────
      // Returns cross-origin images with CORS headers so html2canvas can capture them
      if (url.pathname === '/img-proxy' && request.method === 'GET') {
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) return jsonResp({ error: 'Missing url' }, 400);
        let target;
        try { target = new URL(targetUrl); }
        catch(e) { return jsonResp({ error: 'Invalid URL' }, 400); }
        const isAllowed = FETCH_ALLOWED_DOMAINS.some(d => target.hostname.includes(d));
        if (!isAllowed) return jsonResp({ error: 'Domain not allowed' }, 403);
        try {
          const resp = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': target.origin + '/' },
            cf: { cacheTtl: 86400, cacheEverything: true },
          });
          const ct = resp.headers.get('content-type') || 'image/png';
          const body = await resp.arrayBuffer();
          return new Response(body, {
            status: resp.status,
            headers: { 'Content-Type': ct, ...CORS_HEADERS, 'Cache-Control': 'public, max-age=86400' },
          });
        } catch(e) {
          return jsonResp({ error: e.message }, 502);
        }
      }

      // ── FETCH URL PROXY (/fetch-url) ──────────────
      // Pure proxy used by the agentic Gemini loop — domain-whitelisted for security
      if (url.pathname === '/fetch-url' && request.method === 'GET') {
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) return jsonResp({ error: 'Missing url' }, 400);

        let target;
        try { target = new URL(targetUrl); }
        catch(e) { return jsonResp({ error: 'Invalid URL' }, 400); }

        const isAllowed = FETCH_ALLOWED_DOMAINS.some(d => target.hostname.includes(d));
        if (!isAllowed) {
          return jsonResp({ error: 'Domain not allowed', hostname: target.hostname }, 403);
        }

        try {
          const resp = await fetch(targetUrl, {
            headers: {
              'Accept': 'application/json, text/html, */*',
              'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Cache-Control': 'no-cache',
              'Referer': target.origin + '/',
            }
          });
          const ct = resp.headers.get('content-type') || '';
          const body = await resp.text();
          const result = { status: resp.status, contentType: ct };

          if (ct.includes('json')) {
            try {
              // Parse and strip nulls/URLs/long-strings so AI gets clean, compact data
              const simplified = simplifyForAI(JSON.parse(body));
              result.json = simplified;
            } catch(e) {
              result.body = body.slice(0, 20000);
            }
          } else {
            result.body = body.slice(0, 20000);
          }

          return jsonResp(result);
        } catch(e) {
          return jsonResp({ error: e.message }, 502);
        }
      }

      // ── GEMINI API PROXY (POST a raíz /) ───────────
      if (request.method === 'POST' && (url.pathname === '/' || url.pathname === '')) {
        const apiKey = env.GEMINI_API_KEY;

        if (!apiKey) {
          return jsonResp({
            error: { message: 'GEMINI_API_KEY no configurada. Generá una gratis en https://aistudio.google.com/apikey' }
          }, 500);
        }

        const body = await request.json();

        const geminiResp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await geminiResp.json();

        if (!geminiResp.ok) {
          return jsonResp({
            error: {
              message: result?.error?.message || `Gemini API error: ${geminiResp.status}`,
              status: geminiResp.status
            }
          }, geminiResp.status);
        }

        return jsonResp(result);
      }

      // ── VPN TEAM RESULTS (/vpn-results) ──────
      if (url.pathname === '/vpn-results' && request.method === 'GET') {
        const TS_ID     = 28524;
        const LEAGUE_ID = 2127; // Liga Argentina 2da División T3 — auto-detects latest season

        const vpnResp = await fetch('https://www.virtualpronetwork.com/api/teams/28524/results', {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
          cf: { cacheTtl: 300, cacheEverything: true },
        });
        if (!vpnResp.ok) return jsonResp({ error: 'VPN API error', status: vpnResp.status }, 502);

        const data = await vpnResp.json();
        const rows = Array.isArray(data.rows) ? data.rows : [];

        const leagueRows = rows.filter(m => m.matchSeason && m.matchSeason.id_league === LEAGUE_ID);
        if (!leagueRows.length) return new Response('[]', {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' },
        });
        const latestSeason = Math.max(...leagueRows.map(m => m.matchSeason.number));

        const filtered = leagueRows
          .filter(m => m.matchSeason.number === latestSeason)
          .map(m => {
            const isHome   = m.team1 === TS_ID;
            const tsGoals  = isHome ? m.gteam1 : m.gteam2;
            const rvGoals  = isHome ? m.gteam2 : m.gteam1;
            const rival    = isHome ? m.awayTeam  : m.homeTeam;
            const argDate  = new Date(new Date(m.date).getTime() - 3 * 60 * 60 * 1000)
              .toISOString().slice(0, 10);
            return {
              id:    m.id,
              date:  argDate,
              rival: rival.name || rival.short_name,
              isHome,
              ts:    tsGoals,
              rv:    rvGoals,
            };
          });

        return new Response(JSON.stringify(filtered), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' },
        });
      }

      // ── VPN FIXTURES (/vpn-fixtures) ──────────
      if (url.pathname === '/vpn-fixtures' && request.method === 'GET') {
        const TS_ID     = 28524;
        const LEAGUE_ID = 2127; // Liga Argentina 2da División T3

        const vpnResp = await fetch('https://www.virtualpronetwork.com/api/teams/28524/fixtures', {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
          cf: { cacheTtl: 300, cacheEverything: true },
        });
        if (!vpnResp.ok) return jsonResp({ error: 'VPN API error', status: vpnResp.status }, 502);

        const data = await vpnResp.json();
        const rows = Array.isArray(data.rows) ? data.rows : [];
        if (!rows.length) return new Response('[]', {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' },
        });

        const leagueRows = rows.filter(m => m.matchSeason &&
          (m.matchSeason.id_league === LEAGUE_ID ||
           (m.matchSeason.league && m.matchSeason.league.id === LEAGUE_ID)));
        if (!leagueRows.length) return new Response('[]', {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' },
        });
        const latestSeason = Math.max(...leagueRows.map(m => m.matchSeason.number));

        const filtered = leagueRows
          .filter(m => m.matchSeason.number === latestSeason)
          .map(m => {
            const isHome   = m.team1 === TS_ID;
            const rival    = isHome ? m.awayTeam : m.homeTeam;
            const rawDt    = new Date(m.date);
            return {
              id:     m.id,
              date:   rawDt.toISOString().slice(0, 10),
              time:   rawDt.toISOString().slice(11, 16),
              rival:  rival.name || rival.short_name,
              badge:  rival.logoUrl || null,
              isHome,
              round:  m.round,
            };
          });

        return new Response(JSON.stringify(filtered), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' },
        });
      }

      // ── VPN API PROXY (/vpn-table) ────────────
      if (url.pathname === '/vpn-table' && request.method === 'GET') {
        const vpnResp = await fetch('https://www.virtualpronetwork.com/api/leagues/2127/table?season=6410&community_id=1');
        const data = await vpnResp.json();
        return jsonResp(data);
      }

      // ── VPUG API PROXY (/vpug-table) ──────────
      if (url.pathname === '/vpug-table' && request.method === 'GET') {
        const fbResp = await fetch('https://copafacil-web.firebaseio.com/events/-fthh5@pg59/teams.json');
        const raw = await fbResp.json();
        if (!raw) return jsonResp({ error: 'Firebase returned null', fallback: true }, 200);
        const teams = Object.values(raw).map(t => {
          const stats = {};
          const dtKey = Object.keys(t.dt || {})[0];
          if (dtKey && t.dt[dtKey] && t.dt[dtKey].dt) {
            t.dt[dtKey].dt.split('#').forEach(pair => {
              const [k, v] = pair.split('=');
              stats[k] = parseFloat(v);
            });
          }
          return {
            name: (t.name || '').trim(),
            logo: t.url || null,
            gp: stats['1'] || 0, w: stats['2'] || 0, d: stats['3'] || 0, l: stats['4'] || 0,
            gf: stats['5'] || 0, gc: stats['6'] || 0, gd: stats['7'] || 0, pts: stats['0'] || 0
          };
        });
        teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
        return jsonResp(teams);
      }

      // ── VPUG API PROXY T3 (/vpug-table-t3) ────
      // #1 Primera División VPUG (T6 CopáFácil) — temporada regular, arrancó 2026-08-10.
      if (url.pathname === '/vpug-table-t3' && request.method === 'GET') {
        const fbResp = await fetch('https://copafacil-web.firebaseio.com/events/-fthh5@7zxj/teams.json');
        const raw = await fbResp.json();
        if (!raw) return jsonResp({ error: 'Firebase returned null', fallback: true }, 200);
        const teams = Object.values(raw).map(t => {
          const stats = {};
          const dtKeys = Object.keys(t.dt || {}).sort();
          const latest = dtKeys.length ? t.dt[dtKeys[dtKeys.length - 1]] : null;
          if (latest && latest.dt) {
            latest.dt.split('#').forEach(pair => {
              const [k, v] = pair.split('=');
              stats[k] = parseFloat(v);
            });
          }
          return {
            name: (t.name || '').trim(),
            logo: t.url || null,
            gp: stats['1'] || 0, w: stats['2'] || 0, d: stats['3'] || 0, l: stats['4'] || 0,
            gf: stats['5'] || 0, gc: stats['6'] || 0, gd: stats['7'] || 0, pts: stats['0'] || 0
          };
        });
        teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
        return jsonResp(teams);
      }

      // ── VPUG API PROXY T4 (/vpug-table-t4) ────
      // Liga Pretemporada VPUG (FC-27) (T7 CopáFácil) — arrancó 2026-10-05, 8 grupos A-H
      // (TOP Secret en el D). ?group=D devuelve solo ese grupo; sin parámetro, todos con `group`.
      if (url.pathname === '/vpug-table-t4' && request.method === 'GET') {
        const fbResp = await fetch('https://copafacil-web.firebaseio.com/events/-fthh5@b7we/teams.json');
        const raw = await fbResp.json();
        if (!raw) return jsonResp({ error: 'Firebase returned null', fallback: true }, 200);
        const groupFilter = (url.searchParams.get('group') || '').toUpperCase();
        const teams = Object.values(raw)
          .filter(t => !groupFilter || (t.g || '').toUpperCase() === groupFilter)
          .map(t => {
            const stats = {};
            // Cada equipo trae una entrada por fase; la de la fase siguiente existe desde el
            // arranque pero vacía (solo col/g), así que se toma la última que tenga stats.
            const dtKeys = Object.keys(t.dt || {}).filter(k => t.dt[k] && t.dt[k].dt).sort();
            const latest = dtKeys.length ? t.dt[dtKeys[dtKeys.length - 1]] : null;
            if (latest && latest.dt) {
              latest.dt.split('#').forEach(pair => {
                const [k, v] = pair.split('=');
                stats[k] = parseFloat(v);
              });
            }
            return {
              name: (t.name || '').replace(/\s*\p{RI}\p{RI}\s*$/u, '').trim(),
              logo: t.url || null,
              group: t.g || null,
              gp: stats['1'] || 0, w: stats['2'] || 0, d: stats['3'] || 0, l: stats['4'] || 0,
              gf: stats['5'] || 0, gc: stats['6'] || 0, gd: stats['7'] || 0, pts: stats['0'] || 0
            };
          });
        teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
        return jsonResp(teams);
      }

      // ── VPUG PLAYOFFS T4 (/vpug-playoffs-t4) ────
      // Cuadros de la Liga Pretemporada: fases (`fs`) con show_eli = PLAYOFF FASE ORO / PLATA.
      // Cada ronda (`m_set`) trae partidos "Octavos de final #7 - ..." y su "(Vuelta)" enlazados
      // por `return`. El que avanza = el equipo que aparece en la ronda siguiente (vale también
      // si la serie se definió con un tercer partido fuera de CopáFácil).
      if (url.pathname === '/vpug-playoffs-t4' && request.method === 'GET') {
        const FB = 'https://copafacil-web.firebaseio.com/events';
        const EVT = '-fthh5@b7we';
        const [fases, rondas, teams, matchs] = await Promise.all([
          fetch(`${FB}/${EVT}/fs.json`).then(r => r.json()),
          fetch(`${FB}/${EVT}/m_set.json`).then(r => r.json()),
          fetch(`${FB}/${EVT}/teams.json`).then(r => r.json()),
          fetch(`${FB}/-fthh5/matchs.json`).then(r => r.json()),
        ]);
        const limpiar = s => (s || '').replace(/\s*\p{RI}\p{RI}\s*$/u, '').trim();
        const equipo = k => k && teams?.[k] ? { key: k, name: limpiar(teams[k].name), logo: teams[k].url || null } : null;
        const partidos = Object.entries(matchs || {}).filter(([, m]) => m.evt === EVT && m.title).map(([id, m]) => ({ id, ...m }));
        const goles = m => (m.finished && m.dt && m.dt.qt_g1 !== undefined) ? [Number(m.dt.qt_g1), Number(m.dt.qt_g2)] : null;
        const out = Object.entries(fases || {}).filter(([, f]) => f.show_eli).sort(([a], [b]) => a.localeCompare(b)).map(([fsId, f], fi) => {
          const rs = Object.entries(rondas || {}).filter(([, r]) => r.fs === fsId).sort(([a], [b]) => a.localeCompare(b));
          const enRonda = rs.map(([rid]) => partidos.filter(m => m.m_set === rid));
          return {
            id: fsId, titulo: (f.title || '').replace(/\s*[\u{1F947}\u{1F948}\u{1F949}]\s*/u, '').trim(),
            rondas: rs.map(([rid, r], ri) => {
              const idas = enRonda[ri].filter(m => !/\(Vuelta\)/.test(m.title)).sort((a, b) => a.id.localeCompare(b.id));
              const siguientes = new Set((enRonda[ri + 1] || []).flatMap(m => [m.team1, m.team2]).filter(Boolean));
              return {
                titulo: r.title,
                series: idas.map(ida => {
                  const vta = enRonda[ri].find(m => m.id === ida.return) || null;
                  const a = equipo(ida.team1), b = equipo(ida.team2);
                  const gi = goles(ida), gv = vta ? goles(vta) : null;
                  // Global desde el lado de A (local en la ida): en la vuelta A es team2
                  const global = gi && gv ? [gi[0] + gv[1], gi[1] + gv[0]] : null;
                  const ganador = a && siguientes.has(a.key) ? 'a' : b && siguientes.has(b.key) ? 'b' : null;
                  return {
                    nombre: (ida.title.split(' - ')[0] || '').trim(),
                    a: a || { name: ida.name1 ? `Ganador ${ida.name1}` : 'A definir', logo: null },
                    b: b || { name: ida.name2 ? `Ganador ${ida.name2}` : 'A definir', logo: null },
                    // CopáFácil rotula todos los cuadros con "1° GrupoA x 2° GrupoB"; el 2° cuadro
                    // (Plata) en realidad es 3°/4° de cada grupo → se corre 2 puestos por cuadro previo
                    cupo: (ida.title.split(' - ')[1] || '').trim()
                      .replace(/(\d+)° Grupo\s*([A-Z])/g, (_, n, g) => `${Number(n) + 2 * fi}° Grupo ${g}`).replace(' x ', ' vs '),
                    ida: gi, vuelta: gv, global, ganador,
                  };
                }),
              };
            }),
          };
        });
        return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, 'Cache-Control': 'public, max-age=60' } });
      }

      // ── ESPACIO GAMER (/eg-table) ─────────────────────────────────────
      // Desde la T4 la ex-liga 11x11 es "Espacio Gamer": CHALLENGERS (2°) | ESPACIO GAMER ARGENTINA,
      // https://espaciogamer.cl/division/challengers-2-espacio-gamer-argentina/ (WordPress).
      // La tabla la arma su plugin por admin-ajax (action eg_obtener_ranking) con un nonce que
      // sale de la misma página: se lee el nonce y los ids de división/temporada del HTML y se
      // parsea la tabla que devuelve (orden = el de la liga, ya con sus desempates).
      if (url.pathname === '/eg-table' && request.method === 'GET') {
        const EG = 'https://espaciogamer.cl';
        const DIV_URL = EG + '/division/challengers-2-espacio-gamer-argentina/tabla-posiciones/';
        const UA = { 'User-Agent': 'Mozilla/5.0 (TopSecretFC site)' };
        const page = await (await fetch(DIV_URL, { headers: UA })).text();
        const nonce = (page.match(/egRankingsData\s*=\s*\{[^}]*"nonce":"([a-f0-9]+)"/) || [])[1];
        const divId = (page.match(/data-division-id="(\d+)"/) || [])[1] || '10';
        const tempId = (page.match(/data-temporada-id="(\d+)"/) || [])[1] || '6';
        if (!nonce) return jsonResp({ error: 'nonce not found', fallback: true }, 200);
        const body = new URLSearchParams({
          action: 'eg_obtener_ranking', nonce, metrica: 'posiciones',
          division_id: divId, temporada_id: tempId, limite: '40', club_destacado: '0'
        });
        const aj = await (await fetch(EG + '/wp-admin/admin-ajax.php', {
          method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body
        })).json();
        if (!aj || !aj.success || !aj.data || !aj.data.html) return jsonResp({ error: 'bad ajax response', fallback: true }, 200);
        const decode = s => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').trim();
        // Escudos que EG sube con fondo (cuadrado negro/blanco/crema): versión sin fondo en R2
        // (scripts/escudos-sin-fondo.mjs). Nuvo FC no tiene escudo en EG: el suyo de VPUG.
        const ESC = url.origin + '/media/logos/escudos-eg/';
        const LOGO_LIMPIO = {
          'ALL BOYS': ESC + 'all-boys.webp', 'IACC Reserva': ESC + 'iacc-reserva.webp',
          'MISKYMAYU FC': ESC + 'miskymayu-fc.webp', 'MONOTRIBUTISTAS': ESC + 'monotributistas.webp',
          'Suda eSports': ESC + 'suda-esports.webp', 'Argentinos Jrs Esp': ESC + 'argentinos-jrs-esp.webp',
          'Nuvo FC': 'https://firebasestorage.googleapis.com/v0/b/copafacil-web.appspot.com/o/events%2F-fthh5%2Fpg59%2Fteams%2F-OsMvBXyushQcOcLYfub.png?alt=media&token=1',
        };
        // Los equipos en zona (playoffs/promo/descenso) vienen como class="eg-tp-club eg-tp-en-zona" style=…:
        // cortar solo por class="eg-tp-club" exacto dejaba afuera a 18 de 20.
        const teams = aj.data.html.split(/<tbody class="eg-tp-club[^"]*"[^>]*>/).slice(1).map(chunk => {
          // la diferencia de gol positiva viene con signo ("+3"): sin [+-] esa celda no se leía y quedaba en 0
          const nums = [...chunk.matchAll(/<td class="eg-tp-c-(?:pts|num)[^"]*">\s*([+-]?\d+)\s*<\/td>/g)].map(m => +m[1]);
          const det = n => +((chunk.match(new RegExp('<dt>' + n + '<\\/dt><dd>(-?\\d+)<\\/dd>')) || [])[1] || 0);
          const [pts = 0, gp = 0, w = 0, d = 0, l = 0, gd = 0] = nums;
          const name = decode((chunk.match(/class="eg-tp-nombre">\s*<span title="([^"]+)"/) || [])[1] || '');
          return {
            name,
            logo: LOGO_LIMPIO[name] || (chunk.match(/<img class="eg-tp-logo" src="([^"]+)"/) || [])[1] || null,
            gp, w, d, l, gf: det('Goles a favor'), gc: det('Goles en contra'), gd, pts
          };
        }).filter(t => t.name);
        return jsonResp(teams);
      }

      // ── COPAFACIL PRETEMPORADA (/copafacil-pretemporada) ──────────────
      if (url.pathname === '/copafacil-pretemporada' && request.method === 'GET') {
        const BASE   = 'https://copafacil-web.firebaseio.com';
        const EVT    = '-fthh5@llo8';
        const PARENT = '-fthh5';
        const TS_KEY = '-OvQetM8ROfp55aARizV';

        // Fixed schedule: Tue & Thu, 2 rounds/day at 22:30 and 23:00
        // Exception: R17/R18 (Thu Jul 16) postponed to Tue Jul 21.
        // Exception: R19-R21 (Tue Jul 21, triple date to close the tournament) postponed to Thu Jul 23.
        const SCHEDULE = [
          null,                        // index 0 unused
          {date:'2026-06-18',time:'22:30'}, // R1
          {date:'2026-06-18',time:'23:00'}, // R2
          {date:'2026-06-23',time:'22:30'}, // R3
          {date:'2026-06-23',time:'23:00'}, // R4
          {date:'2026-06-25',time:'22:30'}, // R5
          {date:'2026-06-25',time:'23:00'}, // R6
          {date:'2026-06-30',time:'22:30'}, // R7
          {date:'2026-06-30',time:'23:00'}, // R8
          {date:'2026-07-02',time:'22:30'}, // R9
          {date:'2026-07-02',time:'23:00'}, // R10
          {date:'2026-07-07',time:'22:30'}, // R11
          {date:'2026-07-07',time:'23:00'}, // R12
          {date:'2026-07-09',time:'22:30'}, // R13
          {date:'2026-07-09',time:'23:00'}, // R14
          {date:'2026-07-14',time:'22:30'}, // R15
          {date:'2026-07-14',time:'23:00'}, // R16
          {date:'2026-07-21',time:'22:30'}, // R17
          {date:'2026-07-21',time:'23:00'}, // R18
          {date:'2026-07-23',time:'22:30'}, // R19
          {date:'2026-07-23',time:'23:00'}, // R20
          {date:'2026-07-23',time:'23:30'}, // R21 — triple fecha de cierre
          {home:{date:'2026-07-28',time:'23:00'}, away:{date:'2026-07-28',time:'23:30'}}, // R22 — Cuartos de Final vs Polenta Fria (ida local, vuelta visitante)
        ];

        // Manual result overrides for matches the external API doesn't reflect correctly
        const RESULT_OVERRIDES = {};

        // Logo fallback for teams not registered in CopáFácil but known from VPG
        const VPG_CDN = 'https://virtualprogaming.com/cdn-cgi/imagedelivery/cl8ocWLdmZDs72LEaQYaYw/';
        const LOGO_FALLBACK = {
          'Comunicaciones': VPG_CDN + 'admin_defffab4-7d4a-489c-b9fd-ed65a8883046/public',
        };

        try {
          const [teamsResp, matchsResp, playersResp] = await Promise.all([
            fetch(`${BASE}/events/${EVT}/teams.json`,         { cf: { cacheTtl: 300, cacheEverything: true } }),
            fetch(`${BASE}/events/${PARENT}/matchs.json`,     { cf: { cacheTtl: 300, cacheEverything: true } }),
            fetch(`${BASE}/events/${EVT}/player.json`,        { cf: { cacheTtl: 300, cacheEverything: true } }),
          ]);
          const [teamsRaw, matchsRaw, playersRaw] = await Promise.all([teamsResp.json(), matchsResp.json(), playersResp.json()]);

          // Parse "0=pts#1=gp#2=w#3=d#4=l#5=gf#6=gc#7=gd#..." stats string
          function parseStats(dtStr) {
            const s = {};
            (dtStr || '').split('#').forEach(p => {
              const eq = p.indexOf('=');
              if (eq > -1) s[+p.slice(0, eq)] = +p.slice(eq + 1);
            });
            return { pts: s[0]||0, gp: s[1]||0, w: s[2]||0, d: s[3]||0, l: s[4]||0, gf: s[5]||0, gc: s[6]||0, gd: s[7]||0 };
          }

          // Build team map
          const teams = {};
          for (const [id, t] of Object.entries(teamsRaw || {})) {
            const dtKeys = Object.keys(t.dt || {}).sort();
            const latest = dtKeys.length ? t.dt[dtKeys[dtKeys.length - 1]] : null;
            const stats  = (latest && latest.dt) ? parseStats(latest.dt) : {};
            const colg   = latest ? (latest.colg ?? latest.col ?? 99) : 99;
            const tName = (t.name || '').trim();
            teams[id] = { id, name: tName, logo: t.url || LOGO_FALLBACK[tName] || null, group: t.g, colg, us: id === TS_KEY, ...stats };
          }

          const groupA = Object.values(teams).filter(t => t.group === 'A').sort((a,b) => a.colg - b.colg);
          const groupB = Object.values(teams).filter(t => t.group === 'B').sort((a,b) => a.colg - b.colg);

          // Build round number map and collect TS matches
          const roundMap = {};
          let roundCount = 0;
          const tsMatches = [];

          // Process matches in key-sorted order (timestamps = chronological)
          for (const id of Object.keys(matchsRaw || {}).sort()) {
            const m = matchsRaw[id];
            if (!m || m.evt !== `${PARENT}@llo8`) continue;
            if (!roundMap[m.m_set]) roundMap[m.m_set] = ++roundCount;
            if (m.team1 !== TS_KEY && m.team2 !== TS_KEY) continue;

            const isHome    = m.team1 === TS_KEY;
            const rivalKey  = isHome ? m.team2 : m.team1;
            const rival     = teams[rivalKey] || {};
            const round     = roundMap[m.m_set];
            const override  = RESULT_OVERRIDES[round] || null;
            const tsGoals   = override ? override.tsGoals : isHome ? (m.dt?.qt_g1 ?? 0) : (m.dt?.qt_g2 ?? 0);
            const rivGoals  = override ? override.rivGoals : isHome ? (m.dt?.qt_g2 ?? 0) : (m.dt?.qt_g1 ?? 0);
            // m.finished can be set before a score is entered (placeholder) — only treat as
            // finished once an actual score exists, otherwise it wrongly shows a 0-0 result.
            const finished  = override ? true : !!m.finished && !!m.dt;
            const schedRaw  = SCHEDULE[round] || null;
            const sched     = schedRaw && (schedRaw.home || schedRaw.away) ? (isHome ? schedRaw.home : schedRaw.away) : schedRaw;
            const result    = !finished ? null : tsGoals > rivGoals ? 'win' : tsGoals < rivGoals ? 'loss' : 'draw';

            tsMatches.push({
              id, round,
              date: sched?.date || null,
              time: sched?.time || null,
              rival: rival.name || '?',
              rivalLogo: rival.logo || null,
              isHome, tsGoals, rivGoals, finished, result,
              note: override?.note || null,
            });
          }

          tsMatches.sort((a, b) => a.round - b.round);

          // Build Top Secret player stats with snapshot history for differential approach
          const tsPlayers = Object.values(playersRaw || {})
            .filter(p => p.team === TS_KEY)
            .map(p => {
              const snapshots = {};
              for (const [k, snap] of Object.entries(p.fs || {})) {
                snapshots[k] = { goals: snap.ART || 0, assists: snap.ASS || 0 };
              }
              const dtParts = {};
              (p.dt || '').split('#').forEach(part => { const eq = part.indexOf('='); if (eq > -1) dtParts[+part.slice(0,eq)] = +part.slice(eq+1); });
              return { name: p.name, goals: p.ART || 0, assists: p.ASS || 0, pj: dtParts[2] || 0, snapshots };
            })
            .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists) || b.goals - a.goals);

          return new Response(JSON.stringify({
            tournament: 'Campeonato de Invierno VPUG',
            ts_team: teams[TS_KEY] || null,
            standings: { A: groupA, B: groupB },
            matches: tsMatches,
            players: tsPlayers,
          }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' } });

        } catch(e) {
          return jsonResp({ error: e.message }, 502);
        }
      }

      // ── RECLU EMAIL NOTIFICATION (/notify-reclu) ──
      if (url.pathname === '/notify-reclu' && request.method === 'POST') {
        const apiKey = env.RESEND_API_KEY;
        if (!apiKey) return jsonResp({ ok: false, error: 'RESEND_API_KEY not set' });

        let data;
        try { data = await request.json(); } catch(e) { return jsonResp({ ok: false }, 400); }

        const { nombre='—', gamertag='—', edad='—', posiciones=[], arquetipos=[], ultimoEquipo='—', experiencias=[] } = data;
        const posText = posiciones.join(', ') || '—';
        const arqText = arquetipos.map(a => `${a.nombre} (niv. ${a.nivel})`).join(', ') || '—';
        const expText = experiencias.join(', ') || '—';

        const html = `<h2 style="color:#c8a84b;font-family:sans-serif">Nueva solicitud — Top Secret FC</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%;max-width:520px">
  <tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap">Gamertag</td><td style="padding:6px 0;font-weight:600">${gamertag}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#666">Nombre</td><td style="padding:6px 0">${nombre}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#666">Edad</td><td style="padding:6px 0">${edad}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#666">Posiciones</td><td style="padding:6px 0">${posText}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#666">Arquetipos</td><td style="padding:6px 0">${arqText}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#666">Último equipo</td><td style="padding:6px 0">${ultimoEquipo}</td></tr>
  <tr><td style="padding:6px 12px 6px 0;color:#666">Experiencias</td><td style="padding:6px 0">${expText}</td></tr>
</table>
<p style="font-family:sans-serif;font-size:12px;color:#999;margin-top:20px">Formulario de reclutamiento · Top Secret FC</p>`;

        const resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Top Secret FC <onboarding@resend.dev>',
            to: ['fctopsecret@gmail.com'],
            subject: `[Reclutamiento] Nueva solicitud de ${gamertag}`,
            html,
          }),
        });

        const result = await resendResp.json();
        return jsonResp({ ok: resendResp.ok, ...result });
      }

      // ── VISIT COUNTER (/counter) ─────────────────
      if (url.pathname === '/counter') {
        const key = 'site:visits';
        if (request.method === 'POST') {
          const v = await env.TS_KV.get(key);
          const next = parseInt(v || '0') + 1;
          await env.TS_KV.put(key, String(next));
          return jsonResp({ count: next });
        }
        if (request.method === 'GET') {
          const v = await env.TS_KV.get(key);
          return jsonResp({ count: parseInt(v || '0') });
        }
      }

      // ── TWITCH LIVE STATUS (/twitch-live) ────────
      // Chequea si el canal está en vivo vía el endpoint GQL interno que usa
      // la propia web de twitch.tv (client-id público, sin cuenta/2FA/app
      // registrada). No oficial: si Twitch lo rompe, migrar a la API Helix
      // oficial (requiere TWITCH_CLIENT_ID/TWITCH_CLIENT_SECRET como secrets).
      if (url.pathname === '/twitch-live' && request.method === 'GET') {
        const cacheKey = 'twitch_live:topsecretfc';
        try {
          const cached = await env.TS_KV.get(cacheKey, 'json');
          if (cached) return jsonResp(cached);
        } catch (e) {}

        let result = { live: false };
        try {
          const gqlResp = await fetch('https://gql.twitch.tv/gql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
            },
            body: JSON.stringify({
              query: 'query($login:String!){user(login:$login){stream{id}}}',
              variables: { login: 'topsecretfc' },
            }),
          });
          const gqlData = await gqlResp.json();
          result = { live: !!gqlData?.data?.user?.stream };
        } catch (e) { /* deja result = { live:false } */ }

        try { await env.TS_KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 }); } catch (e) {}
        return jsonResp(result);
      }

      // ── OG META REDIRECT (/og/<id>) ──────────────
      // Clean short link for WhatsApp previews. URL: /og/<articleId>
      // Article data comes from the NOTICIAS_OG map above — no KV, no query params.
      if (url.pathname.startsWith('/og') && request.method === 'GET') {
        const articleId = decodeURIComponent(url.pathname.slice(4).replace(/^\//, ''));
        let article = NOTICIAS_OG[articleId];

        // Fallback: noticias publicadas por el pipeline diario (KV) — así los
        // links compartidos de las diarias tienen preview sin mantener el mapa manual
        if (!article) {
          try {
            const raw = await env.TS_KV.get('published_noticias', 'text');
            if (raw) {
              const pub = JSON.parse(raw).find(n => n.id === articleId);
              if (pub && pub.title) {
                let img = pub.imagePost || pub.image || '';
                if (img && !/^https?:\/\//.test(img)) {
                  img = SITE + img.split('/').map(encodeURIComponent).join('/');
                }
                article = { t: pub.title, i: img };
              }
            }
          } catch(e) { /* KV ilegible — sigue al redirect sin preview */ }
        }

        if (!article) {
          // Unknown article — redirect to noticias without a preview
          return Response.redirect(SITE + 'noticias.html' + (articleId ? '#' + articleId : ''), 302);
        }

        const t = article.t;
        // Vista previa con el logo (regla: el logo va en todas las publicaciones): la arma el paso
        // "Publicar en redes" de noticias.html. Si no existe, la imagen de la nota.
        let i = article.i;
        try {
          const ogObj = await env.MEDIA_BUCKET.head(`logos/noticias/redes/${articleId}-og.jpg`);
          if (ogObj) i = `${url.origin}/media/logos/noticias/redes/${encodeURIComponent(articleId)}-og.jpg?v=${ogObj.uploaded.getTime().toString(36)}`;
        } catch(e) {}
        const r = SITE + 'noticias.html#' + articleId;
        const d = 'Top Secret FC · Noticias';

        const e = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const html = `<!DOCTYPE html><html lang="es"><head>
<meta charset="utf-8">
<title>${e(t)}</title>
<meta property="og:type" content="article">
<meta property="og:title" content="${e(t)}">
<meta property="og:description" content="${e(d)}">
<meta property="og:image" content="${e(i)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${e(r)}">
<meta property="og:site_name" content="Top Secret FC">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(t)}">
<meta name="twitter:description" content="${e(d)}">
<meta name="twitter:image" content="${e(i)}">
<meta http-equiv="refresh" content="0;url=${e(r)}">
</head><body>
<script>window.location.replace(${JSON.stringify(r)});<\/script>
<p>Redirigiendo… <a href="${e(r)}">Hacer clic aquí</a></p>
</body></html>`;
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html;charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
            ...CORS_HEADERS,
          },
        });
      }

      // ── REGEN REQUEST (POST /request-regen | GET+DELETE /regen-flag) ─────────
      // Browser POSTs to /request-regen (PIN-gated) to kick off a full pipeline
      // regeneration. The local watch-regen.ps1 polls /regen-flag and runs the
      // cloud agent + image generation when it sees the flag set.
      if (url.pathname === '/request-regen' && request.method === 'POST') {
        const pin = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        if (!env.ADMIN_PIN || pin !== env.ADMIN_PIN) return jsonResp({ error: 'Unauthorized' }, 401);
        const FS_DRAFT = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft';
        await fetch(FS_DRAFT, { method: 'DELETE' });
        await env.TS_KV.put('regen_request', JSON.stringify({ requested: true, at: new Date().toISOString() }));
        return jsonResp({ ok: true });
      }

      if (url.pathname === '/regen-flag') {
        if (request.method === 'GET') {
          const flag = await env.TS_KV.get('regen_request', 'json');
          return jsonResp(flag || { requested: false });
        }
        if (request.method === 'DELETE') {
          await env.TS_KV.delete('regen_request');
          return jsonResp({ ok: true });
        }
      }

      // ── DISCARD FLAG (GET | DELETE /discard-flag) ─────────────────────────────
      // Seteado al descartar un draft (DELETE /draft-noticia). watch-regen.ps1 lo
      // consulta cada minuto y borra las imágenes listadas del repo local + GitHub.
      if (url.pathname === '/discard-flag') {
        if (request.method === 'GET') {
          const flag = await env.TS_KV.get('discard_cleanup', 'json');
          return jsonResp(flag || { requested: false });
        }
        if (request.method === 'DELETE') {
          await env.TS_KV.delete('discard_cleanup');
          return jsonResp({ ok: true });
        }
      }

      // ── NOTICIAS DRAFT (GET | POST | DELETE /draft-noticia) ──────────────────
      // Draft is stored in Firestore news/draft (agent can write there directly).
      // Worker reads/deletes it from Firestore; browser uses this endpoint.
      if (url.pathname === '/draft-noticia') {
        const FS_DRAFT = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft';

        if (request.method === 'GET') {
          const fsResp = await fetch(FS_DRAFT);
          if (!fsResp.ok) return jsonResp({ draft: null });
          const doc = await fsResp.json();
          if (doc.error) return jsonResp({ draft: null });
          try {
            const draft = JSON.parse(doc.fields?.data?.stringValue || 'null');
            return jsonResp({ draft });
          } catch(e) {
            return jsonResp({ draft: null });
          }
        }

        const pin = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        if (!env.ADMIN_PIN || pin !== env.ADMIN_PIN) return jsonResp({ error: 'Unauthorized' }, 401);

        if (request.method === 'DELETE') {
          // Descarte real (no publicación ni regen): capturar las imágenes ya
          // generadas para que el watcher local las borre de R2 (bucket top-secret-media).
          let cleanup = null;
          try {
            const fsResp = await fetch(FS_DRAFT);
            if (fsResp.ok) {
              const doc = await fsResp.json();
              const draft = JSON.parse(doc.fields?.data?.stringValue || 'null');
              if (draft) {
                const files = [...new Set(
                  [draft.imagePost, draft.imageStory, draft.image, draft.imagePostRaw, draft.imageStoryRaw]
                    .filter(f => typeof f === 'string' && f.startsWith(MEDIA))
                    .map(f => decodeURIComponent(f.slice(MEDIA.length).split('?')[0]))
                    .filter(f => f.startsWith('Renders/Daily News/') && !f.includes('..'))
                )];
                if (!files.length && (draft.id || draft.date)) {
                  const slug = draft.id || draft.date;
                  files.push(`Renders/Daily News/${slug}_post.png`, `Renders/Daily News/${slug}_story.png`);
                }
                if (files.length) cleanup = { requested: true, date: draft.date || null, files, at: new Date().toISOString() };
              }
            }
          } catch(e) { /* sin draft legible — no hay nada que limpiar */ }
          await fetch(FS_DRAFT, { method: 'DELETE' });
          if (cleanup) await env.TS_KV.put('discard_cleanup', JSON.stringify(cleanup));
          return jsonResp({ ok: true });
        }

        if (request.method === 'POST') {
          let updates;
          try { updates = await request.json(); } catch(e) { return jsonResp({ error: 'Invalid JSON' }, 400); }
          const fsResp = await fetch(FS_DRAFT);
          if (!fsResp.ok) return jsonResp({ error: 'No draft exists' }, 404);
          const doc = await fsResp.json();
          let existing;
          try { existing = JSON.parse(doc.fields?.data?.stringValue || 'null'); } catch(e) { existing = null; }
          if (!existing) return jsonResp({ error: 'No draft exists' }, 404);
          const merged = { ...existing, ...updates };
          await fetch(FS_DRAFT, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { data: { stringValue: JSON.stringify(merged) } } }),
          });
          return jsonResp({ ok: true });
        }
      }

      // ── PERSIST DRAFT IMAGE (POST /persist-draft-image) ───────────────────────
      // Canva's export URLs are temporary signed S3 links that expire in hours.
      // The cloud agent calls this right after exporting so the bytes get stored
      // in KV under a stable key, served back via a URL that never expires.
      if (url.pathname === '/persist-draft-image' && request.method === 'POST') {
        const pin = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        if (!env.ADMIN_PIN || pin !== env.ADMIN_PIN) return jsonResp({ error: 'Unauthorized' }, 401);
        let body;
        try { body = await request.json(); } catch(e) { return jsonResp({ error: 'Invalid JSON' }, 400); }
        const { url: srcUrl, slot } = body || {};
        if (!srcUrl || !['post', 'story'].includes(slot)) return jsonResp({ error: 'Missing url or invalid slot' }, 400);
        try {
          const resp = await fetch(srcUrl);
          if (!resp.ok) return jsonResp({ error: 'Source fetch failed', status: resp.status }, 502);
          const buf = await resp.arrayBuffer();
          await env.TS_KV.put(`draft_img_${slot}`, buf);
          return jsonResp({ ok: true, url: `${url.origin}/draft-image?slot=${slot}&t=${Date.now()}` });
        } catch(e) {
          return jsonResp({ error: e.message }, 502);
        }
      }

      // ── SERVE DRAFT IMAGE (GET /draft-image) ──────────────────────────────────
      if (url.pathname === '/draft-image' && request.method === 'GET') {
        const slot = url.searchParams.get('slot');
        if (!['post', 'story'].includes(slot)) return jsonResp({ error: 'Invalid slot' }, 400);
        const buf = await env.TS_KV.get(`draft_img_${slot}`, 'arrayBuffer');
        if (!buf) return jsonResp({ error: 'No image' }, 404);
        return new Response(buf, {
          headers: { 'Content-Type': 'image/png', ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' },
        });
      }

      // ── PUBLISH DRAFT (POST /publish-noticia) ────────────────────────────────
      if (url.pathname === '/publish-noticia' && request.method === 'POST') {
        const pin = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        if (!env.ADMIN_PIN || pin !== env.ADMIN_PIN) return jsonResp({ error: 'Unauthorized' }, 401);
        const FS_DRAFT = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft';
        const fsResp = await fetch(FS_DRAFT);
        if (!fsResp.ok) return jsonResp({ error: 'No draft to publish' }, 404);
        const doc = await fsResp.json();
        let draft;
        try { draft = JSON.parse(doc.fields?.data?.stringValue || 'null'); } catch(e) { draft = null; }
        if (!draft) return jsonResp({ error: 'No draft to publish' }, 404);
        const published = { ...draft, status: 'published', publishedAt: new Date().toISOString() };
        let existing = [];
        try { const raw = await env.TS_KV.get('published_noticias', 'text'); if (raw) existing = JSON.parse(raw); } catch(e) {}
        if (existing.some(n => n.id === published.id)) {
          return jsonResp({ error: `ID '${published.id}' ya está publicado. Cambiá el id del draft antes de publicar.` }, 409);
        }
        await env.TS_KV.put('published_noticias', JSON.stringify([published, ...existing]));
        await fetch(FS_DRAFT, { method: 'DELETE' });
        return jsonResp({ ok: true, id: published.id });
      }

      // ── PUBLICAR NOTICIA EN REDES (POST /redes-publicar, GET /redes-estado) ──
      // El paso "Publicar en redes" de noticias.html arma las piezas en el navegador y las
      // manda acá: se guardan en R2 (logos/noticias/redes/) y queda un pedido en KV
      // (redes_job) que la PC toma en el minuto (scripts/publicar-noticia-redes.mjs, desde
      // watch-regen.ps1), publica en cada red y va anotando el estado de cada destino.
      if (url.pathname === '/redes-publicar' && request.method === 'POST') {
        const pin = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        if (!env.ADMIN_PIN || pin !== env.ADMIN_PIN) return jsonResp({ error: 'Unauthorized' }, 401);
        let body;
        try { body = await request.json(); } catch(e) { return jsonResp({ error: 'Invalid JSON' }, 400); }
        const { id, link, piezas = {}, destinos = [] } = body || {};
        const REDES = ['ig-post', 'ig-historia', 'fb-post', 'fb-historia', 'x'];
        if (!id || !/^[\w-]+$/.test(id) || !destinos.length || destinos.some(d => !REDES.includes(d.red))) {
          return jsonResp({ error: 'Pedido inválido' }, 400);
        }
        const prev = await env.TS_KV.get('redes_job', 'json');
        if (prev && prev.destinos.some(d => d.estado === 'pendiente' || d.estado === 'publicando')) {
          return jsonResp({ error: `Hay otra publicación en curso (${prev.id}). Esperá a que termine.` }, 409);
        }
        const v = Date.now().toString(36);
        const urls = {};
        for (const tipo of ['ig', 'historia', 'og']) {
          const b64 = (piezas[tipo] || '').replace(/^data:image\/jpeg;base64,/, '');
          if (!b64) continue;
          const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          const key = `logos/noticias/redes/${id}-${tipo}.jpg`;
          await env.MEDIA_BUCKET.put(key, bytes, { httpMetadata: { contentType: 'image/jpeg' } });
          urls[tipo] = `${url.origin}/media/${key}?v=${v}`;
        }
        const job = {
          id, link: link || `${url.origin}/og/${id}`, creado: new Date().toISOString(),
          destinos: destinos.map(d => ({
            red: d.red, texto: String(d.texto || '').slice(0, 2200),
            imagen: d.red === 'ig-post' ? urls.ig : (d.red.endsWith('historia') ? urls.historia : null),
            estado: 'pendiente',
          })),
        };
        if (job.destinos.some(d => (d.red === 'ig-post' || d.red.endsWith('historia')) && !d.imagen)) {
          return jsonResp({ error: 'Falta la imagen de alguna pieza' }, 400);
        }
        await env.TS_KV.put('redes_job', JSON.stringify(job));
        return jsonResp({ ok: true, job });
      }
      if (url.pathname === '/redes-estado' && request.method === 'GET') {
        const job = await env.TS_KV.get('redes_job', 'json');
        return jsonResp({ job: job || null });
      }

      // ── APROBACIONES (aprobar.html — la única página de aprobación, pedido de Juan 2026-10-09) ──
      // La PC deja en KV `aprobaciones` los lotes a revisar (p. ej. la ronda de redes de las 14:00,
      // scripts/social/), cada uno con sus piezas por red. Juan aprueba, descarta o corrige el texto de
      // cada pieza desde la página; la PC publica las aprobadas y anota el resultado en el mismo KV.
      if (url.pathname === '/aprobaciones' && request.method === 'GET') {
        const pin = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        if (!env.ADMIN_PIN || pin !== env.ADMIN_PIN) return jsonResp({ error: 'Unauthorized' }, 401);
        const data = await env.TS_KV.get('aprobaciones', 'json');
        return jsonResp({ lotes: data?.lotes || [] });
      }
      if (url.pathname === '/aprobaciones/decidir' && request.method === 'POST') {
        const pin = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        if (!env.ADMIN_PIN || pin !== env.ADMIN_PIN) return jsonResp({ error: 'Unauthorized' }, 401);
        let body;
        try { body = await request.json(); } catch(e) { return jsonResp({ error: 'Invalid JSON' }, 400); }
        const { lote, piezas = [], decision, texto, titulo } = body || {};
        if (decision && !['aprobada', 'descartada', 'pendiente'].includes(decision)) return jsonResp({ error: 'Decisión inválida' }, 400);
        const data = (await env.TS_KV.get('aprobaciones', 'json')) || { lotes: [] };
        const l = data.lotes.find(x => x.id === lote);
        if (!l) return jsonResp({ error: 'No existe ese lote' }, 404);
        const ahora = new Date().toISOString();
        for (const p of l.piezas.filter(p => piezas.includes(p.id))) {
          if (p.estado === 'publicado' || p.estado === 'publicando') continue;   // ya salió: no se toca
          if (decision) { p.decision = decision; p.decididoEn = ahora; }
          if (typeof texto === 'string') p.texto = texto.slice(0, 20000);   // el cuerpo de una nota (bloques JSON) supera los 5000
          if (typeof titulo === 'string' && p.titulo !== undefined) p.titulo = titulo.slice(0, 200);
        }
        await env.TS_KV.put('aprobaciones', JSON.stringify(data));
        return jsonResp({ ok: true, lote: l });
      }

      // ── PUBLISHED NOTICIAS (GET /published-noticias) ─────────────────────────
      if (url.pathname === '/published-noticias' && request.method === 'GET') {
        let articles = [];
        try { const raw = await env.TS_KV.get('published_noticias', 'text'); if (raw) articles = JSON.parse(raw); } catch(e) {}
        return jsonResp({ articles });
      }

      // ── CONVOCATORIA STATUS (/convocatoria-status) ────────────────────────────
      if (url.pathname === '/convocatoria-status' && request.method === 'GET') {
        const fsUrl = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/convocatoria/state';
        const resp = await fetch(fsUrl, { cf: { cacheTtl: 60, cacheEverything: true } });
        if (!resp.ok) return jsonResp({ error: 'Firestore error', status: resp.status }, 502);
        const doc = await resp.json();

        function parseFs(v) {
          if (!v) return null;
          if ('stringValue'  in v) return v.stringValue;
          if ('integerValue' in v) return parseInt(v.integerValue);
          if ('doubleValue'  in v) return v.doubleValue;
          if ('booleanValue' in v) return v.booleanValue;
          if ('nullValue'    in v) return null;
          if ('mapValue'     in v) {
            const out = {};
            for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = parseFs(val);
            return out;
          }
          if ('arrayValue' in v) return (v.arrayValue.values || []).map(parseFs);
          return null;
        }

        const fields = doc.fields || {};
        const rawAvail  = parseFs(fields.availability) || {};
        const alwaysPresent = parseFs(fields.alwaysPresent) || [];
        const captain   = parseFs(fields.captain) || null;
        const TODAY     = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });

        const absences = {};
        for (const [name, data] of Object.entries(rawAvail)) {
          if (!data || !data.status) continue;
          if (data.status === 'black') {
            const isIndef  = !data.returnDate || data.returnDate >= '9999';
            const isActive = data.returnDate && data.returnDate > TODAY;
            if (isIndef || isActive) {
              absences[name] = { status: 'baja', indefinida: isIndef, hasta: isIndef ? null : data.returnDate };
            }
          } else if (data.status === 'red') {
            absences[name] = { status: 'ausente_hoy' };
          }
        }

        return jsonResp({ absences, alwaysPresent, captain, today: TODAY });
      }

      // ── RECLUTAMIENTO ACTIVO (/reclutamiento-activo) ──────────────────────────
      if (url.pathname === '/reclutamiento-activo' && request.method === 'GET') {
        const fsUrl = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/reclutamiento?pageSize=50';
        const resp = await fetch(fsUrl, { cf: { cacheTtl: 300, cacheEverything: true } });
        if (!resp.ok) return jsonResp({ error: 'Firestore error', status: resp.status }, 502);
        const data = await resp.json();

        function parseFsV(v) {
          if (!v) return null;
          if ('stringValue'  in v) return v.stringValue;
          if ('integerValue' in v) return parseInt(v.integerValue);
          if ('booleanValue' in v) return v.booleanValue;
          if ('nullValue'    in v) return null;
          if ('mapValue'     in v) {
            const out = {};
            for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = parseFsV(val);
            return out;
          }
          if ('arrayValue' in v) return (v.arrayValue.values || []).map(parseFsV);
          return null;
        }

        const docs = data.documents || [];
        const activos = docs
          .map(doc => { const f = {}; for (const [k, v] of Object.entries(doc.fields || {})) f[k] = parseFsV(v); return f; })
          .filter(f => f.estado === 'pendiente' || f.estado === 'en_revision');

        return jsonResp({
          count: activos.length,
          players: activos.map(p => ({ gamertag: p.gamertag, posicion: p.posicion || (Array.isArray(p.posiciones) ? p.posiciones[0] : p.posiciones), estado: p.estado })),
        });
      }

      // ── CLUB EVENTS LOG (/log-event) ──────────────────────────────────────────
      if (url.pathname === '/log-event') {
        if (request.method === 'GET') {
          const log = (await env.TS_KV.get('club_events_log', 'json')) || [];
          return jsonResp({ events: log });
        }
        if (request.method === 'POST') {
          const pin = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
          if (!env.ADMIN_PIN || pin !== env.ADMIN_PIN) return jsonResp({ error: 'Unauthorized' }, 401);
          let body;
          try { body = await request.json(); } catch(e) { return jsonResp({ error: 'Invalid JSON' }, 400); }
          const { type, summary, date } = body;
          if (!type || !summary) return jsonResp({ error: 'Missing type or summary' }, 400);
          const log = (await env.TS_KV.get('club_events_log', 'json')) || [];
          const entry = {
            type, summary,
            date: date || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }),
            addedAt: new Date().toISOString(),
          };
          await env.TS_KV.put('club_events_log', JSON.stringify([entry, ...log].slice(0, 100)));
          return jsonResp({ ok: true, entry });
        }
      }

      return jsonResp({ error: 'Not found' }, 404);

    } catch (err) {
      return jsonResp({ error: { message: err.message || 'Internal error' } }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(dailyConvocatoriaReset(env));
    ctx.waitUntil(purgarAmistososPasados(env));
    // EA cada 10 min (el cron corre cada minuto); los miembros a la hora en punto
    const min = new Date(event.scheduledTime).getUTCMinutes();
    if (min % 10 === 0) ctx.waitUntil(syncEaPartidos(env, min === 0));
  }
};

// ── EA PRO CLUBS — guardar cada partido (Cron, cada 10 min) ──────────────────
// EA solo devuelve los últimos 5 partidos de cada tipo: si no se guardan al jugarse,
// se pierden. KV 'ea_partidos' = array compacto (más nuevo primero), solo se escribe
// cuando entra algo nuevo. Los partidos cortados/reiniciados o con desconexión quedan
// marcados con `sospechoso` (EA los registra como 3-0 / 0-3 con stats vacías).
// Regla (Juan, 2026-10-13): solo se guardan los partidos del calendario oficial, dentro
// de su horario (ver eaAsignarCalendario); cada uno lleva `calendario` con el partido asignado.
async function eaGet(path) {
  const r = await fetch(`https://proclubs.ea.com/api/fc/${path}`, { headers: EA_HEADERS });
  const body = await r.text();
  if (!r.ok || !/^\s*[\[{]/.test(body)) throw new Error(`EA ${r.status} en ${path.split('?')[0]}`);
  return JSON.parse(body);
}

function eaCompactar(m, tipo) {
  const n = v => (v === undefined || v === null || v === '') ? null : Number(v);
  const mio = m.clubs?.[EA_CLUB_ID] || {};
  const rivalId = Object.keys(m.clubs || {}).find(id => id !== EA_CLUB_ID);
  const riv = m.clubs?.[rivalId] || {};
  const agg = m.aggregate || {};
  const fechaArt = new Date(m.timestamp * 1000);
  const jugadores = Object.values(m.players?.[EA_CLUB_ID] || {}).map(p => ({
    gamertag: p.playername, pos: p.pos, arq: n(p.archetypeid), nota: n(p.rating),
    goles: n(p.goals), asist: n(p.assists), tiros: n(p.shots),
    pases: n(p.passesmade), pases_int: n(p.passattempts),
    entradas: n(p.tacklesmade), entradas_int: n(p.tackleattempts),
    atajadas: n(p.saves), rojas: n(p.redcards), mvp: p.mom === '1',
    seg: n(p.secondsPlayed), vallas_def: n(p.cleansheetsdef), vallas_gk: n(p.cleansheetsgk),
  }));
  const segs = jugadores.map(j => j.seg || 0).sort((a, b) => a - b);
  const segMediana = segs.length ? segs[Math.floor(segs.length / 2)] : 0;
  const aggMio = agg[EA_CLUB_ID] || {}, aggRiv = agg[rivalId] || {};
  const tirosTot = (n(aggMio.shots) || 0) + (n(aggRiv.shots) || 0);
  const pasesTot = n(aggMio.passattempts) || 0;
  let sospechoso = null;
  if (segMediana < 60 * 60) sospechoso = `duró ${Math.round(segMediana / 60)} min (cortado, reiniciado o abandono)`;
  else if (tirosTot === 0 && pasesTot < 60) sospechoso = 'stats vacías (desconexión)';
  else if (riv.winnerByDnf === '1' || mio.winnerByDnf === '1') sospechoso = 'ganado por abandono';
  return {
    id: String(m.matchId), ts: m.timestamp, tipo,
    fecha: fechaArt.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }),
    hora: fechaArt.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false }),
    gf: n(mio.goals), gc: n(riv.goals),
    rival: { id: rivalId || null, nombre: riv.details?.name || null },
    sospechoso,
    equipo: { tiros: n(aggMio.shots), pases: n(aggMio.passesmade), pases_int: n(aggMio.passattempts), entradas: n(aggMio.tacklesmade), entradas_int: n(aggMio.tackleattempts), atajadas: n(aggMio.saves), rojas: n(aggMio.redcards) },
    equipo_rival: { tiros: n(aggRiv.shots), pases: n(aggRiv.passesmade), pases_int: n(aggRiv.passattempts), entradas: n(aggRiv.tacklesmade), entradas_int: n(aggRiv.tackleattempts), atajadas: n(aggRiv.saves) },
    jugadores,
  };
}

// Partidos oficiales del calendario, armados igual que calendario.html: RAW (leído del
// HTML publicado) con edits/suspended de Firestore aplicados por índice + los custom.
// Solo ligas oficiales (VPN, VPUG, 11x11 = Espacio Gamer); amistosos y demás afuera.
const EA_LIGAS_OFICIALES = new Set(['VPN', 'VPUG', '11x11']);
const CALENDARIO_HTML_URL = 'https://topsecret.ar/calendario.html';

function parseObjLiteral(linea) {
  const o = {};
  for (const m of linea.matchAll(/(\w+)\s*:\s*('(?:[^'\\]|\\.)*'|true|false|null|-?\d+(?:\.\d+)?)/g)) {
    const v = m[2];
    o[m[1]] = v.startsWith("'") ? v.slice(1, -1).replace(/\\'/g, "'") : v === 'null' ? null : v === 'true' ? true : v === 'false' ? false : Number(v);
  }
  return o;
}
function fsVal(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fsVal);
  if ('mapValue' in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = fsVal(x); return o; }
  return null;
}
async function cargarCalendarioOficial() {
  const [html, fsDoc] = await Promise.all([
    fetch(CALENDARIO_HTML_URL, { cf: { cacheTtl: 300 } }).then(r => r.ok ? r.text() : Promise.reject(new Error(`calendario.html ${r.status}`))),
    fetch('https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/calendario/estado').then(r => r.json()),
  ]);
  const ini = html.indexOf('const RAW = [');
  if (ini < 0) throw new Error('RAW no encontrado en calendario.html');
  const fin = html.indexOf('\n];', ini);
  const raw = html.slice(ini, fin).split('\n').map(l => l.trim()).filter(l => l.startsWith('{')).map(parseObjLiteral);
  const estado = fsVal({ mapValue: { fields: fsDoc.fields || {} } }) || {};
  const edits = estado.edits || {}, suspended = estado.suspended || {};
  const lista = raw.map((m, i) => {
    const b = { ...m, ...(edits[i] || {}), origen: `RAW#${i}` };
    if (suspended[i]?.newDate) b.date = suspended[i].newDate;
    return b;
  });
  (estado.custom || []).forEach((m, i) => lista.push({ ...m, origen: `c${i}` }));
  return lista.filter(m => EA_LIGAS_OFICIALES.has(m.league) && /^\d{4}-\d\d-\d\d$/.test(m.date || '') && /^\d\d:\d\d$/.test(m.time || ''));
}

// Un partido de EA es oficial si TERMINÓ entre 10 y 75 min después del horario de un
// partido del calendario (EA fecha al final; los slots son de 30 min, así que puede caer
// en dos ventanas: gana el rival que coincide y, si no, el horario más cercano).
function eaAsignarCalendario(ea, calendario, guardados = []) {
  const finMs = ea.ts * 1000;
  const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const ruido = new Set(['esports', 'esport', 'club', 'gaming', 'team']);
  const pal = s => norm(s).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !ruido.has(w));
  const palEa = new Set(pal(ea.rival.nombre));
  // Un horario que ya tiene un partido válido guardado no recibe otro (los cortados no
  // ocupan: el reinicio va al mismo horario). Así el 3er partido de una serie no cae en la vuelta.
  const ocupado = c => guardados.some(g => g.id !== ea.id && !g.sospechoso && g.calendario?.origen === c.origen);
  const cands = calendario.filter(c => !ocupado(c))
    .map(c => ({ c, ini: Date.parse(`${c.date}T${c.time}:00-03:00`) }))
    .filter(({ ini }) => finMs >= ini + 10 * 60000 && finMs <= ini + 75 * 60000);
  if (!cands.length) return null;
  const porRival = cands.filter(({ c }) => pal(c.rival).some(w => palEa.has(w)));
  const elegido = (porRival.length ? porRival : cands).sort((a, b) => b.ini - a.ini)[0].c;
  return { fecha: elegido.date, hora: elegido.time, liga: elegido.league, rival: elegido.rival, origen: elegido.origen, rival_coincide: porRival.length > 0 };
}

// ── Tercer partido de una serie eliminatoria (regla de Juan, 2026-10-13) ──
// Ida y vuelta = dos partidos oficiales del calendario contra el mismo rival, misma liga,
// a menos de 3 h. Si se ganó uno y se perdió el otro por la misma diferencia de gol, se
// juega un tercero que no está en el calendario. Se reconoce SOLO si: ida y vuelta están
// guardados desde EA y ninguno es `sospechoso`, la serie quedó empatada así, y el partido
// es contra el mismo club de EA (mismo id) y terminó DESPUÉS de la vuelta, dentro de 75 min.
function eaDetectarDesempate(p, guardados, calendario) {
  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const ini = c => Date.parse(`${c.date}T${c.time}:00-03:00`);
  for (const vuelta of calendario) {
    const ida = calendario.find(c => c !== vuelta && c.league === vuelta.league && norm(c.rival) === norm(vuelta.rival)
      && ini(c) < ini(vuelta) && ini(vuelta) - ini(c) <= 3 * 3600000);
    if (!ida) continue;
    const eaIda = guardados.find(g => g.calendario?.origen === ida.origen);
    const eaVuelta = guardados.find(g => g.calendario?.origen === vuelta.origen);
    if (!eaIda || !eaVuelta || eaIda.sospechoso || eaVuelta.sospechoso) continue;
    const dIda = eaIda.gf - eaIda.gc, dVuelta = eaVuelta.gf - eaVuelta.gc;
    if (dIda === 0 || dIda !== -dVuelta) continue;
    if (!p.rival.id || p.rival.id !== eaIda.rival.id || p.rival.id !== eaVuelta.rival.id) continue;
    if (p.ts <= eaVuelta.ts || p.ts > eaVuelta.ts + 75 * 60) continue;
    if (guardados.some(g => g.calendario?.origen === 'desempate' && g.calendario.serie?.[1] === vuelta.origen)) continue;
    // Horario estimado: 30 min después de la vuelta (los slots del calendario van de a 30)
    const t = new Date(ini(vuelta) + 30 * 60000);
    return {
      fecha: t.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }),
      hora: t.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false }),
      liga: vuelta.league, rival: vuelta.rival, origen: 'desempate', serie: [ida.origen, vuelta.origen],
      isHome: ida.isHome === undefined ? null : !!ida.isHome, rival_coincide: true,
    };
  }
  return null;
}

// Agrega el tercer partido a calendario/estado.custom (con resultado salvo que sea
// sospechoso). Precondición updateTime: si alguien guardó el calendario en el medio,
// falla y se reintenta en la próxima pasada (el partido no se guarda en KV hasta lograrlo).
async function eaAgregarDesempateCalendario(p) {
  const FS_CAL = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/calendario/estado';
  const doc = await (await fetch(FS_CAL)).json();
  const custom = doc.fields?.custom?.arrayValue?.values || [];
  if (custom.some(v => v.mapValue?.fields?.ea_match_id?.stringValue === p.id)) return true;
  const c = p.calendario;
  const S = v => ({ stringValue: String(v) });
  const fields = { tipo: S('partido'), date: S(c.fecha), time: S(c.hora), rival: S(c.rival), league: S(c.liga),
    instancia: S('Playoff'), playoff: S('Desempate (3er partido)'), ea_match_id: S(p.id) };
  if (c.isHome !== null) fields.isHome = { booleanValue: c.isHome };
  const results = { ...(doc.fields?.results?.mapValue?.fields || {}) };
  if (!p.sospechoso) {
    const home = c.isHome === false ? [p.gc, p.gf] : [p.gf, p.gc];
    const res = { arrayValue: { values: home.map(g => ({ integerValue: String(g) })) } };
    fields.result = res;
    results['c' + custom.length] = res;
  }
  const body = { fields: { custom: { arrayValue: { values: [...custom, { mapValue: { fields } }] } }, results: { mapValue: { fields: results } } } };
  const params = ['updateMask.fieldPaths=custom', 'updateMask.fieldPaths=results', 'currentDocument.updateTime=' + encodeURIComponent(doc.updateTime)].join('&');
  const r = await fetch(FS_CAL + '?' + params, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.ok;
}

async function syncEaPartidos(env, conMiembros, limpiar = false) {
  const res = { nuevos: 0, descartados: 0, errores: [] };
  try {
    let guardados = (await env.TS_KV.get('ea_partidos', 'json')) || [];
    const ids = new Set(guardados.map(p => p.id));
    const candidatos = [];
    for (const tipo of EA_MATCH_TYPES) {
      try {
        const lista = await eaGet(`clubs/matches?platform=${EA_PLATFORM}&clubIds=${EA_CLUB_ID}&matchType=${tipo}`);
        for (const m of (Array.isArray(lista) ? lista : [])) {
          if (!ids.has(String(m.matchId))) candidatos.push(eaCompactar(m, tipo));
        }
      } catch (e) { res.errores.push(e.message); }
    }
    // El calendario solo se lee si hay algo que decidir
    let cambio = false;
    if (candidatos.length || limpiar) {
      const calendario = await cargarCalendarioOficial();
      if (limpiar) {
        const antes = guardados.length;
        const previos = guardados.filter(p => p.tipo === 'friendlyMatch').sort((a, b) => a.ts - b.ts);
        guardados = [];
        for (const p of previos) {
          const cal = p.calendario?.origen === 'desempate' ? p.calendario : eaAsignarCalendario(p, calendario, guardados);
          if (cal) guardados.push({ ...p, calendario: cal });
        }
        res.descartados += antes - guardados.length;
        cambio = true;
      }
      const nuevos = [];
      // En orden cronológico: así ida y vuelta ya están cuando se evalúa un posible tercero
      for (const p of candidatos.sort((a, b) => a.ts - b.ts)) {
        const cal = eaAsignarCalendario(p, calendario, [...nuevos, ...guardados]);
        if (cal) { nuevos.push({ ...p, calendario: cal }); continue; }
        const des = eaDetectarDesempate(p, [...nuevos, ...guardados], calendario);
        if (des) {
          const conCal = { ...p, calendario: des };
          try {
            if (await eaAgregarDesempateCalendario(conCal)) { nuevos.push(conCal); res.desempates = (res.desempates || 0) + 1; }
            else res.errores.push('desempate: no se pudo escribir el calendario (se reintenta)');
          } catch (e) { res.errores.push('desempate: ' + e.message); }
          continue;
        }
        res.descartados++;
      }
      if (nuevos.length) { guardados = [...nuevos, ...guardados]; res.nuevos = nuevos.length; cambio = true; }
    }
    if (cambio) {
      guardados.sort((a, b) => b.ts - a.ts);
      await env.TS_KV.put('ea_partidos', JSON.stringify(guardados));
    }
    if (conMiembros) {
      try {
        const [stats, carrera] = await Promise.all([
          eaGet(`members/stats?platform=${EA_PLATFORM}&clubId=${EA_CLUB_ID}`),
          eaGet(`members/career/stats?platform=${EA_PLATFORM}&clubId=${EA_CLUB_ID}`),
        ]);
        await env.TS_KV.put('ea_miembros', JSON.stringify({ ts: Date.now(), stats: stats.members || [], carrera: carrera.members || [] }));
      } catch (e) { res.errores.push(e.message); }
    }
    if (res.nuevos || res.errores.length || conMiembros) {
      await env.TS_KV.put('ea_sync_meta', JSON.stringify({ ts: Date.now(), ...res, total: guardados.length }));
    }
  } catch (e) { res.errores.push(e.message); }
  return res;
}

// ── CALENDARIO — borrar amistosos ya jugados (Cron, cada 1 min) ──────────────
// Regla del usuario (2026-10-08): de un amistoso nunca se reporta resultado, así que
// una vez pasado su día se borra de calendario/estado.custom. results/edits/suspended
// guardan las entradas custom como 'c<índice>': al sacar elementos del array hay que
// reindexar esas claves (igual que deleteCustom() en calendario.html) o quedarían
// apuntando a otro partido. La escritura lleva precondición updateTime: si alguien
// guardó el calendario entre el GET y el PATCH, falla y se reintenta al minuto.
async function purgarAmistososPasados(env) {
  const FS_CAL = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/calendario/estado';
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  try {
    const resp = await fetch(FS_CAL);
    if (!resp.ok) return;
    const doc = await resp.json();
    const custom = doc.fields?.custom?.arrayValue?.values || [];
    const vencido = v => {
      const f = v.mapValue?.fields || {};
      return f.league?.stringValue === 'Amistoso' && (f.date?.stringValue || '9999') < today;
    };
    if (!custom.some(vencido)) return;

    const nuevoIndice = {}; // índice viejo → nuevo (los borrados no figuran)
    const kept = [];
    custom.forEach((v, i) => { if (!vencido(v)) { nuevoIndice[i] = kept.length; kept.push(v); } });

    const remap = name => {
      const src = doc.fields?.[name]?.mapValue?.fields || {};
      const out = {};
      for (const [k, val] of Object.entries(src)) {
        const m = /^c(\d+)$/.exec(k);
        if (!m) { out[k] = val; continue; }
        const ni = nuevoIndice[+m[1]];
        if (ni !== undefined) out['c' + ni] = val;
      }
      return { mapValue: { fields: out } };
    };

    const fields = {
      custom: { arrayValue: { values: kept } },
      results: remap('results'),
      edits: remap('edits'),
      suspended: remap('suspended'),
    };
    const params = Object.keys(fields).map(p => 'updateMask.fieldPaths=' + p)
      .concat('currentDocument.updateTime=' + encodeURIComponent(doc.updateTime)).join('&');
    await fetch(FS_CAL + '?' + params, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
  } catch (e) { /* se reintenta en el próximo disparo del cron */ }
}

// ── CONVOCATORIA — reset diario server-side (Cron Trigger, cada 1 min) ───────
// Antes esto lo decidía cada pestaña de convocatoria.html comparando su propio TODAY
// (una fecha fijada una sola vez al cargar la página) contra resetDate. Una pestaña
// que quedó abierta sin recargar seguía firmando cada guardado con esa fecha vieja —
// incidente 2026-08-12/13: una pestaña escribió resetDate para atrás TRES veces en
// menos de 24hs (21:00, 22:56, y de nuevo 23:53 ART), cada vez unos minutos después
// de haberse corregido — o sea que no es una pestaña vieja aislada, es alguien usando
// activamente una versión vieja de la página, de forma recurrente. Empezó en 00:05
// ART (una vez por día) → subió a cada 10 min (confirmado que se autocorregía, pero
// dejaba una ventana de hasta ~10 min con datos mal mostrados) → esto corre cada 1
// min: el trabajo es liviano (1 GET siempre, 1 PATCH solo si hace falta corregir
// algo), así que no hay motivo para no ir al mínimo que permite Cloudflare. Hace DOS
// cosas en cada corrida:
//   1) SIEMPRE (sin importar resetDate): tira cualquier entrada de dailyOverrides
//      cuyo `day` no sea el de hoy — esto neutraliza en minutos, no en un día
//      entero, cualquier estado que una pestaña vieja/activa siga escribiendo con
//      una fecha incorrecta.
//   2) Si resetDate quedó desalineado con hoy (el caso "es un día nuevo" real, o
//      una pestaña vieja lo pisó hacia atrás): además limpia `availability` (deja
//      solo vacaciones "black" todavía vigentes, ya que esos entries no tienen
//      campo `day` para poder limpiarlos de forma incremental) y fija resetDate=hoy.
// Nunca toca alwaysPresent/captain/lineup.
//
// AUTENTICACIÓN DEL CRON (2026-08-13): las reglas de Firestore pasaron a exigir
// request.auth != null para escribir en convocatoria/* (ver CLAUDE.md / incidente de
// resets). El cron necesita autenticarse igual que el cliente, pero SIN cuenta de
// servicio (decisión explícita del usuario): usa sign-in anónimo por REST contra
// Identity Toolkit con la Web API key del proyecto — es pública (ya va embebida en
// convocatoria.html), no un secreto. El ID token se cachea en TS_KV ~55 min (por
// debajo de la expiración real de 1h) para no pedir uno nuevo en cada corrida de 1 min.
const FIREBASE_WEB_API_KEY = 'AIzaSyAzjOjdspr1SRMiX88ge0AuoKirrsJB17M';
async function getConvocatoriaAuthToken(env) {
  try {
    const cached = await env.TS_KV.get('conv_auth_token', 'text');
    if (cached) return cached;
  } catch (e) {}
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_WEB_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }
  );
  if (!resp.ok) throw new Error('anonymous sign-in failed: ' + resp.status);
  const data = await resp.json();
  if (!data.idToken) throw new Error('no idToken in sign-in response');
  try { await env.TS_KV.put('conv_auth_token', data.idToken, { expirationTtl: 55 * 60 }); } catch (e) {}
  return data.idToken;
}

async function dailyConvocatoriaReset(env) {
  const FS_STATE = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/convocatoria/state';
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  try {
    const resp = await fetch(FS_STATE);
    if (!resp.ok) return;
    const doc = await resp.json();
    const resetDate = doc.fields?.resetDate?.stringValue || '';

    const overrideFields = doc.fields?.dailyOverrides?.mapValue?.fields || {};
    const keptOverrides = {};
    let overridesChanged = false;
    for (const [name, val] of Object.entries(overrideFields)) {
      const f = val.mapValue?.fields || {};
      if (f.day?.stringValue === today) keptOverrides[name] = val;
      else overridesChanged = true;
    }

    const needsDayReset = resetDate !== today;
    if (!overridesChanged && !needsDayReset) return; // nada para corregir

    const fieldPaths = ['dailyOverrides'];
    const fields = { dailyOverrides: { mapValue: { fields: keptOverrides } } };

    if (needsDayReset) {
      // Conservar solo las ausencias "black" (vacación/baja) todavía vigentes;
      // todo lo demás (rojo/amarillo/verde de un día anterior) expira.
      const availFields = doc.fields?.availability?.mapValue?.fields || {};
      const keptAvailability = {};
      for (const [name, val] of Object.entries(availFields)) {
        const f = val.mapValue?.fields || {};
        if (f.status?.stringValue === 'black' && f.returnDate?.stringValue > today) {
          keptAvailability[name] = val;
        }
      }
      fieldPaths.push('availability', 'resetDate');
      fields.availability = { mapValue: { fields: keptAvailability } };
      fields.resetDate = { stringValue: today };
    }

    const token = await getConvocatoriaAuthToken(env);
    await fetch(
      FS_STATE + '?' + fieldPaths.map(p => 'updateMask.fieldPaths=' + p).join('&'),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ fields }),
      }
    );
  } catch (e) { /* se reintenta en el próximo disparo del cron */ }
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
