const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;

app.disable('x-powered-by');
app.use(compression({ threshold: 512 }));

// Production dashboard: use the new compact live frontend at the site root.
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'live-dashboard.html')));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const cache = new Map();
const inflight = new Map();

function apiUrl(action, params = {}) {
  if (!APPS_SCRIPT_URL) throw new Error('APPS_SCRIPT_URL sozlanmagan.');
  const u = new URL(APPS_SCRIPT_URL);
  u.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') u.searchParams.set(k, String(v));
  });
  u.searchParams.set('_', Date.now().toString());
  return u.toString();
}

async function fetchAppsScript(action, params = {}) {
  const key = action + ':' + JSON.stringify(params);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.data;
  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(apiUrl(action, params), {
        redirect: 'follow',
        headers: { Accept: 'application/json,text/plain,*/*' },
        signal: controller.signal
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`Apps Script HTTP ${response.status}`);
      let data;
      try { data = JSON.parse(text); }
      catch (_) {
        const m = text.match(/^\s*[A-Za-z_$][\w$\.]*\((.*)\)\s*;?\s*$/s);
        if (!m) throw new Error('Apps Script javobi JSON emas.');
        data = JSON.parse(m[1]);
      }
      if (!data || data.ok === false) throw new Error(data?.error || 'Apps Script xatolik qaytardi.');
      cache.set(key, { at: Date.now(), data });
      return data;
    } finally {
      clearTimeout(timer);
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true, service: 'surxondaryo-live-dashboard', appsScriptConfigured: Boolean(APPS_SCRIPT_URL), cacheEntries: cache.size, timestamp: new Date().toISOString() });
});

app.get('/api/stats', async (req, res) => {
  try {
    const data = await fetchAppsScript('stats', { tuman: req.query.tuman, mahalla: req.query.mahalla, kocha: req.query.kocha });
    res.set('Cache-Control', 'no-store').json(data);
  } catch (err) { res.status(502).json({ ok: false, error: err.message }); }
});

app.get('/api/meta', async (_req, res) => {
  try {
    const data = await fetchAppsScript('meta');
    res.set('Cache-Control', 'public, max-age=300').json(data);
  } catch (err) { res.status(502).json({ ok: false, error: err.message }); }
});

app.get('/api/families', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(250, Math.max(1, Number(req.query.pageSize || 100)));
    const data = await fetchAppsScript('families', { page, pageSize, q: req.query.q, tuman: req.query.tuman, mahalla: req.query.mahalla, kocha: req.query.kocha });
    res.set('Cache-Control', 'no-store').json(data);
  } catch (err) { res.status(502).json({ ok: false, error: err.message }); }
});

app.get('/api/family/:row', async (req, res) => {
  try {
    const row = Number(req.params.row);
    if (!Number.isInteger(row) || row < 2) return res.status(400).json({ ok: false, error: 'Noto‘g‘ri Sheet qatori.' });
    const data = await fetchAppsScript('family', { row });
    res.set('Cache-Control', 'no-store').json(data);
  } catch (err) { res.status(502).json({ ok: false, error: err.message }); }
});

app.use((_req, res) => res.sendFile(path.join(__dirname, 'public', 'live-dashboard.html')));

if (require.main === module) app.listen(PORT, () => console.log(`Dashboard server listening on ${PORT}`));
module.exports = app;
