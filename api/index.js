const fs = require('fs');
const path = require('path');

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3rorMRH3NEldVetbqix8rIac6TPTy1Cz8_DoFAcFJ84MmwAB36DsSFEpAELklCBZA/exec';
const HTML_PATH = path.join(process.cwd(), 'public', 'live-dashboard.html');
const CACHE_TTL = 60 * 1000;
const cache = new Map();

function appsUrl(action, params) {
  const u = new URL(APPS_SCRIPT_URL);
  u.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && String(v) !== '') u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function callApps(action, params = {}) {
  const key = action + ':' + JSON.stringify(params);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(appsUrl(action, params), {
      redirect: 'follow',
      headers: { accept: 'application/json,text/plain,*/*' },
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Apps Script HTTP ${response.status}: ${text.slice(0, 300)}`);
    let data;
    try { data = JSON.parse(text); }
    catch (_) {
      const m = text.match(/^\s*[A-Za-z_$][\w$\.]*\((.*)\)\s*;?\s*$/s);
      if (!m) throw new Error('Apps Script javobi JSON emas');
      data = JSON.parse(m[1]);
    }
    if (!data || data.ok === false) throw new Error(data && data.error ? data.error : 'Apps Script xatolik qaytardi');
    cache.set(key, { at: Date.now(), data });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function html(res) {
  const body = fs.readFileSync(HTML_PATH, 'utf8');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.end(body);
}

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url || '/', 'https://vercel.local');
    const pathname = url.pathname;

    if (pathname === '/' || pathname === '/live-dashboard.html') return html(res);
    if (pathname === '/api/health') return json(res, 200, { ok: true, service: 'surxondaryo-live-dashboard', timestamp: new Date().toISOString() });

    if (pathname === '/api/stats') {
      const data = await callApps('statslite', {
        tuman: url.searchParams.get('tuman') || '',
        mahalla: url.searchParams.get('mahalla') || '',
        kocha: url.searchParams.get('kocha') || ''
      });
      return json(res, 200, data);
    }

    if (pathname === '/api/meta') return json(res, 200, await callApps('meta'));

    if (pathname === '/api/families') {
      const params = {};
      for (const k of ['q', 'tuman', 'mahalla', 'kocha', 'page', 'pageSize']) {
        const v = url.searchParams.get(k); if (v) params[k] = v;
      }
      return json(res, 200, await callApps('families', params));
    }

    const familyMatch = pathname.match(/^\/api\/family\/(\d+)$/);
    if (familyMatch) return json(res, 200, await callApps('family', { row: familyMatch[1] }));

    if (pathname.startsWith('/api/')) return json(res, 404, { ok: false, error: 'API endpoint topilmadi' });
    return html(res);
  } catch (e) {
    console.error(e);
    return json(res, 502, { ok: false, error: e && e.message ? e.message : 'Server xatosi' });
  }
};
