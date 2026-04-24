// ═══════════════════════════════════════════════════════════════
// Cloudflare Worker — Top Secret FC
// Proxy a Google Gemini API (GRATIS) + KV storage + EA Sports proxy
// ═══════════════════════════════════════════════════════════════

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

      // ── FETCH URL PROXY (/fetch-url) ──────────────
      // Used to scrape tournament pages for auto-fill
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

        // For VPN: detect bracket/playoffs URLs and also hit their API
        const isVPN = target.hostname.includes('virtualpronetwork.com');
        const isVPUG = target.hostname.includes('virtualprogaming.com');

        const results = {};

        // Always fetch the page HTML
        try {
          const htmlResp = await fetch(targetUrl, {
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Cache-Control': 'no-cache',
            }
          });
          const rawHtml = await htmlResp.text();
          // Truncate but keep JSON data that may be embedded
          results.html = rawHtml.slice(0, 60000);
          results.httpStatus = htmlResp.status;
        } catch(e) {
          results.htmlError = e.message;
        }

        // VPN: extract league ID and hit multiple API endpoints
        if (isVPN) {
          const vpnMatch = target.pathname.match(/\/league\/(\d+)/);
          if (vpnMatch) {
            const leagueId = vpnMatch[1];
            results.vpnLeagueId = leagueId;

            // Try several VPN API endpoints in parallel
            const endpoints = [
              `https://www.virtualpronetwork.com/api/leagues/${leagueId}/knockout`,
              `https://www.virtualpronetwork.com/api/leagues/${leagueId}/playoff`,
              `https://www.virtualpronetwork.com/api/leagues/${leagueId}`,
              `https://www.virtualpronetwork.com/api/leagues/${leagueId}/table`,
              `https://www.virtualpronetwork.com/api/leagues/${leagueId}/matches?phase=knockout`,
            ];

            const apiResults = await Promise.allSettled(endpoints.map(async ep => {
              const r = await fetch(ep, {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
                  'Referer': 'https://www.virtualpronetwork.com/',
                }
              });
              const text = await r.text();
              return { url: ep, status: r.status, body: text.slice(0, 20000) };
            }));

            results.vpnApi = apiResults.map((r, i) => ({
              url: endpoints[i],
              ...(r.status === 'fulfilled' ? r.value : { error: r.reason?.message })
            }));
          }
        }

        // VPUG: extract league/tournament ID
        if (isVPUG) {
          const vpugMatch = target.pathname.match(/\/leagues\/([^/]+)/);
          if (vpugMatch) {
            const leagueSlug = vpugMatch[1];
            results.vpugLeagueSlug = leagueSlug;
            try {
              const r = await fetch(`https://api.virtualprogaming.com/public/leagues/${leagueSlug}/bracket/`, {
                headers: { 'Accept': 'application/json' }
              });
              results.vpugBracket = await r.text().then(t => t.slice(0, 20000));
            } catch(e) {
              results.vpugBracketError = e.message;
            }
          }
        }

        return jsonResp(results);
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

      // ── VPN API PROXY (/vpn-table) ────────────
      if (url.pathname === '/vpn-table' && request.method === 'GET') {
        const vpnResp = await fetch('https://www.virtualpronetwork.com/api/leagues/2127/table?season=6351&community_id=1');
        const data = await vpnResp.json();
        return jsonResp(data);
      }

      // ── VPUG API PROXY (/vpug-table) ──────────
      if (url.pathname === '/vpug-table' && request.method === 'GET') {
        const fbResp = await fetch('https://copafacil-web.firebaseio.com/events/-fthh5@n619/teams.json');
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

      return jsonResp({ error: 'Not found — endpoints: POST / (Gemini), GET|POST /kv, GET /vpn-table, GET /ea, GET /fetch-url' }, 404);

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
