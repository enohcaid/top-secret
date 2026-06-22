// ═══════════════════════════════════════════════════════════════
// Cloudflare Worker — Top Secret FC
// Proxy a Google Gemini API (GRATIS) + KV storage + EA Sports proxy
// ═══════════════════════════════════════════════════════════════

// ── NOTICIAS — OG meta map ───────────────────────────────────────
// Add an entry here whenever a new article is added to noticias-data.js
const SITE = 'https://enohcaid.github.io/top-secret/';
const NOTICIAS_OG = {
  'kits-t3-2026': {
    t: 'Top Secret FC presenta sus kits T3 con Nike — negro, blanco y amarillo',
    i: SITE + 'logos/T3%20Kits.png',
  },
  'invierno-2026-j1j2': {
    t: 'Campeonato de Invierno: Top Secret arranca con dos victorias — 2-1 y 3-2',
    i: SITE + 'logos/Campeonato%20Invierno.png',
  },
  'cierre-vpug-t2': {
    t: 'Cierre VPUG T2: 17 partidos, 30 goles y BlackPanther como máximo artillero con 10',
    i: SITE + 'logos/Cierre%20VPUG%20T2.png',
  },
  'cierre-11x11-t2': {
    t: 'Cierre 11x11 T2: Lautavester7 y lucasmatiakd, 5 goles cada uno',
    i: SITE + 'logos/Cierre%2011x11%20T2.png',
  },
  'cierre-vpn-t2': {
    t: 'Cierre VPN T2: 19 partidos en Primera División, Lautavester7 termina con 13 goles',
    i: SITE + 'logos/Cierre%20VPN%20T2.png',
  },
  'destacados-semana3-t2': {
    t: 'Semana 3: la goleada en VPUG y el punto arrancado en VPN',
    i: SITE + 'logos/Destacados%20Sem3.png',
  },
  'destacados-semana2-t2': {
    t: 'Semana 2: el jueves salva la semana',
    i: SITE + 'logos/Destacados%20Sem2.png',
  },
  'destacados-semana1-t2': {
    t: 'Semana 1 de Temporada 2: análisis de los tres frentes',
    i: SITE + 'logos/Destacados%20Sem1.png',
  },
  'nuevo-ct-2026': {
    t: 'Top Secret FC presenta su nuevo Cuerpo Técnico',
    i: SITE + 'logos/Nuevo%20CT.png',
  },
  'fixture-vpn-t2-2026': {
    t: 'Ya tenemos fixture: 19 partidos en la Primera División VPN',
    i: SITE + 'logos/Fixture%20VPN.webp',
  },
  'plantel-2026': {
    t: 'Este es el plantel que jugará la nueva temporada',
    i: SITE + 'logos/Plantel%20T2%202026.webp',
  },
  'fichajes-t2-2026': {
    t: 'Tres incorporaciones para la Temporada 2',
    i: SITE + 'logos/Fichajes.webp',
  },
  'kit-drop-2026': {
    t: 'Nuevas camisetas para la temporada 2026',
    i: SITE + 'logos/2026%20Kit%20Drop.png',
  },
  'rebrand-2026': {
    t: 'Top Secret FC presenta su nueva identidad',
    i: SITE + 'logos/Anuncio%20Rebrand.webp',
  },
  'equipo-temporada-vpn-2026': {
    t: 'Tres jugadores en el Equipo de la Temporada VPN',
    i: SITE + 'logos/equipo-temporada-vpn.webp',
  },
  'ascenso-primera-2025': {
    t: 'Ascendimos a Primera División',
    i: SITE + 'logos/Festejo%20Ascenso.webp',
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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Rutas EA permitidas (whitelist de seguridad)
const EA_ALLOWED_PATHS = [
  'clubs/overallStats',
  'clubs/stats',
  'clubs/seasonalStats',
  'clubs/members/stats',
  'clubs/matches',
  'clubs/search',
  'ping',
];

// Dominios permitidos para proxy de URLs de torneos
const FETCH_ALLOWED_DOMAINS = [
  'virtualpronetwork.com',
  'virtualprogaming.com',
  'copafacil-web.firebaseio.com',
  'copafacil.gg',
  'challonge.com',
  'toornament.com',
  'smash.gg',
  'start.gg',
  'faceit.com',
  'firebasestorage.googleapis.com',
];

export default {
  async fetch(request, env) {
    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      // ── KV STORAGE (/kv) ──────────────────────────
      if (url.pathname === '/kv') {
        if (request.method === 'GET') {
          const key = url.searchParams.get('key');
          if (!key) return jsonResp({ error: 'Missing key' }, 400);
          const value = await env.TS_KV.get(key, 'json');
          return jsonResp(value || []);
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
          headers: {
            'Accept':          'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
            'Cache-Control':   'no-cache',
            'Referer':         'https://www.ea.com/games/ea-sports-fc/clubs/rankings',
            'Origin':          'https://www.ea.com',
            'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Sec-Fetch-Dest':  'empty',
            'Sec-Fetch-Mode':  'cors',
            'Sec-Fetch-Site':  'same-site',
          },
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
        const LEAGUE_ID = 2119; // Liga Argentina 1ra División T2 — auto-detects latest season

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
        const LEAGUE_ID = 2119;

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
        const vpnResp = await fetch('https://www.virtualpronetwork.com/api/leagues/2119/table?season=6395&community_id=1');
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

      // ── COPAFACIL PRETEMPORADA (/copafacil-pretemporada) ──────────────
      if (url.pathname === '/copafacil-pretemporada' && request.method === 'GET') {
        const BASE   = 'https://copafacil-web.firebaseio.com';
        const EVT    = '-fthh5@llo8';
        const PARENT = '-fthh5';
        const TS_KEY = '-OvQetM8ROfp55aARizV';

        // Fixed schedule: Tue & Thu, 2 rounds/day at 22:30 and 23:00
        // Exception: R21 moved to Tue Jul 21 at 23:30 — triple date to close the tournament
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
          {date:'2026-07-16',time:'22:30'}, // R17
          {date:'2026-07-16',time:'23:00'}, // R18
          {date:'2026-07-21',time:'22:30'}, // R19
          {date:'2026-07-21',time:'23:00'}, // R20
          {date:'2026-07-21',time:'23:30'}, // R21 — triple fecha de cierre
        ];

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
            const tsGoals   = isHome ? (m.dt?.qt_g1 ?? 0) : (m.dt?.qt_g2 ?? 0);
            const rivGoals  = isHome ? (m.dt?.qt_g2 ?? 0) : (m.dt?.qt_g1 ?? 0);
            const finished  = !!m.finished;
            const round     = roundMap[m.m_set];
            const sched     = SCHEDULE[round] || null;
            const result    = !finished ? null : tsGoals > rivGoals ? 'win' : tsGoals < rivGoals ? 'loss' : 'draw';

            tsMatches.push({
              id, round,
              date: sched?.date || null,
              time: sched?.time || null,
              rival: rival.name || '?',
              rivalLogo: rival.logo || null,
              isHome, tsGoals, rivGoals, finished, result,
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
              return { name: p.name, goals: p.ART || 0, assists: p.ASS || 0, snapshots };
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

      // ── OG META REDIRECT (/og/<id>) ──────────────
      // Clean short link for WhatsApp previews. URL: /og/<articleId>
      // Article data comes from the NOTICIAS_OG map above — no KV, no query params.
      if (url.pathname.startsWith('/og') && request.method === 'GET') {
        const articleId = decodeURIComponent(url.pathname.slice(4).replace(/^\//, ''));
        const article = NOTICIAS_OG[articleId];

        if (!article) {
          // Unknown article — redirect to noticias without a preview
          return Response.redirect(SITE + 'noticias.html' + (articleId ? '#' + articleId : ''), 302);
        }

        const t = article.t;
        const i = article.i;
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

      return jsonResp({ error: 'Not found — endpoints: POST / (Gemini), GET|POST /kv, GET /vpn-results, GET /vpn-fixtures, GET /vpn-table, GET /ea, GET /fetch-url, GET /og' }, 404);

    } catch (err) {
      return jsonResp({ error: { message: err.message || 'Internal error' } }, 500);
    }
  }
};

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
