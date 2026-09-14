const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzSxU-qRLqgpFiDhgl7LnC0dsaloH-O6MjnAEq0HwlJ0lEbsAXSmq8iqV1mpqonrA1H/exec';
const CACHE_TTL_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 120 * 1000;

app.disable('x-powered-by');
app.use(compression({ threshold: 1024 }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

let cache = { data: null, json: null, fetchedAt: 0, loading: null, error: null };

function normalizePayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.families)) return payload.families;
  if (payload && Array.isArray(payload.records)) return payload.records;
  if (payload && Array.isArray(payload.result)) return payload.result;
  return [];
}

async function fetchGoogleData() {
  const url = APPS_SCRIPT_URL + (APPS_SCRIPT_URL.includes('?') ? '&' : '?') + 'action=families';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json,text/plain,*/*' }, redirect: 'follow', signal: controller.signal });
    const text = await response.text();
    if (!response.ok) throw new Error(`Google Apps Script HTTP ${response.status}`);
    let payload;
    try { payload = JSON.parse(text); }
    catch (_) {
      const match = text.match(/^\s*\w+\((.*)\)\s*;?\s*$/s);
      if (!match) throw new Error('Apps Script javobi JSON emas.');
      payload = JSON.parse(match[1]);
    }
    if (payload && payload.ok === false) throw new Error(payload.error || 'Apps Script xatolik qaytardi.');
    const rows = normalizePayload(payload);
    if (!rows.length) throw new Error('Google Sheets dan 0 ta oila qaytdi.');
    return rows;
  } finally { clearTimeout(timer); }
}

async function refreshCache(force = false) {
  const fresh = cache.data && (Date.now() - cache.fetchedAt < CACHE_TTL_MS);
  if (!force && fresh) return cache.data;
  if (cache.loading) return cache.loading;
  cache.loading = fetchGoogleData()
    .then(rows => {
      cache.data = rows;
      cache.json = JSON.stringify({ ok: true, data: rows, count: rows.length, fetchedAt: new Date().toISOString() });
      cache.fetchedAt = Date.now();
      cache.error = null;
      return rows;
    })
    .catch(err => { cache.error = err.message; throw err; })
    .finally(() => { cache.loading = null; });
  return cache.loading;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'surxondaryo-live-dashboard', cachedFamilies: cache.data ? cache.data.length : 0, lastUpdate: cache.fetchedAt ? new Date(cache.fetchedAt).toISOString() : null, loading: Boolean(cache.loading), error: cache.error });
});

app.get('/api/families', async (_req, res) => {
  try {
    if (cache.data) {
      if (Date.now() - cache.fetchedAt >= CACHE_TTL_MS && !cache.loading) refreshCache(true).catch(() => {});
      res.set('Content-Type', 'application/json; charset=utf-8');
      res.set('Cache-Control', 'no-store');
      return res.send(cache.json);
    }
    await refreshCache(true);
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    return res.send(cache.json);
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message, detail: 'Google Sheets ma’lumotlarini olish muvaffaqiyatsiz bo‘ldi.' });
  }
});

app.use((_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Dashboard server listening on ${PORT}`));
