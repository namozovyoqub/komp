const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbw3rorMRH3NEldVetbqix8rIac6TPTy1Cz8_DoFAcFJ84MmwAB36DsSFEpAELklCBZA/exec';
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 30000;

app.disable('x-powered-by');
app.use(compression({ threshold: 512 }));
const cache = new Map();
const inflight = new Map();

function apiUrl(action, params = {}) {
  const u = new URL(APPS_SCRIPT_URL);
  u.searchParams.set('action', action);
  Object.entries(params).forEach(([k,v]) => { if(v!==undefined&&v!==null&&String(v)!=='') u.searchParams.set(k,String(v)); });
  u.searchParams.set('_', Date.now().toString());
  return u.toString();
}

async function fetchAppsScript(action, params = {}) {
  const key=action+':'+JSON.stringify(params), now=Date.now(), hit=cache.get(key);
  if(hit && now-hit.at<CACHE_TTL_MS) return hit.data;
  if(inflight.has(key)) return inflight.get(key);
  const promise=(async()=>{
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    try{
      const response=await fetch(apiUrl(action,params),{redirect:'follow',headers:{Accept:'application/json,text/plain,*/*'},signal:controller.signal});
      const text=await response.text();
      if(!response.ok) throw new Error(`Apps Script HTTP ${response.status}: ${text.slice(0,300)}`);
      let data;
      try{data=JSON.parse(text)}catch(_){const m=text.match(/^\s*[A-Za-z_$][\w$\.]*\((.*)\)\s*;?\s*$/s);if(!m)throw new Error('Apps Script javobi JSON emas: '+text.slice(0,300));data=JSON.parse(m[1])}
      if(!data||data.ok===false)throw new Error(data?.error||'Apps Script xatolik qaytardi.');
      cache.set(key,{at:Date.now(),data});
      return data;
    }catch(e){if(e.name==='AbortError')throw new Error('Apps Script javobi 30 soniyada kelmadi (timeout).');throw e}
    finally{clearTimeout(timer);inflight.delete(key)}
  })();
  inflight.set(key,promise); return promise;
}

function normalizeStats(data){
  if(!data || !data.agg) return data;
  const a=data.agg;
  const population=Math.max(0,Number(a.population)||0);
  const rawMehnat=Number(a.mehnatYosh)||0;
  const rawIshsiz=Number(a.ishsizlar)||0;
  a.mehnatYosh=Math.max(0,Math.min(rawMehnat,population));
  a.ishsizlar=Math.max(0,Math.min(rawIshsiz,a.mehnatYosh||population));
  a.ishsizlikRate=a.mehnatYosh ? a.ishsizlar/a.mehnatYosh*100 : 0;
  if(Array.isArray(data.geo?.rows)){
    data.geo.rows=data.geo.rows.map(r=>({...r,
      population:Math.max(0,Number(r.population)||0),
      ishsizlar:Math.max(0,Math.min(Number(r.ishsizlar)||0,Number(r.population)||0))
    }));
  }
  return data;
}

function emptyStats(error){return {ok:true,degraded:true,error:error||'Google Sheets vaqtincha mavjud emas.',agg:{n:0,population:0,mehnatYosh:0,ishsizlar:0,nogironShaxs:0,nogironBola:0,yolgizKeksa:0,ishsizlikRate:0,ijtimoiyReestr:{},nafaqa:{},kreditBor:{},tadbirkorBor:{},yangiKreditEhtiyoji:{},subsidiyaEhtiyoji:{},kasbHunarIstagi:{},uyjoyYetarli:{},balans:{},incomeDist:{},employment:{},ageBands:{},mulkShakli:{},ichimlikSuvi:{},tabiiyGaz:{},internet:{},malumoti:{},oilaTarkibi:{},uyjoyHujjatlari:{},genderHead:{},repairCondition:{},appliances:{},livestock:{},childrenEdu:{},topProblems:[],topNeeds:[],indicators:{},auditStats:{},criticalStats:{}},geo:{rows:[]},coverage:[],filters:{},generatedAt:new Date().toISOString()};}
function emptyMeta(error){return {ok:true,degraded:true,error:error||'Google Sheets vaqtincha mavjud emas.',totalFamilies:0,tumans:[],mahallas:[],kochas:[],tree:{},generatedAt:new Date().toISOString()};}

function dashboardHtml(){const file=path.join(__dirname,'public','live-dashboard.html');return fs.readFileSync(file,'utf8');}
app.get('/',(_req,res)=>res.type('html').send(dashboardHtml()));
app.get('/live-dashboard.html',(_req,res)=>res.type('html').send(dashboardHtml()));
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'surxondaryo-live-dashboard',appsScriptConfigured:Boolean(APPS_SCRIPT_URL),cacheEntries:cache.size,timestamp:new Date().toISOString()}));
app.get('/api/stats',async(req,res)=>{try{const data=normalizeStats(await fetchAppsScript('stats',{tuman:req.query.tuman,mahalla:req.query.mahalla,kocha:req.query.kocha}));res.set('Cache-Control','no-store').json(data)}catch(e){console.error('stats:',e.message);res.set('Cache-Control','no-store').json(emptyStats(e.message))}});
app.get('/api/meta',async(_req,res)=>{try{res.set('Cache-Control','public,max-age=300').json(await fetchAppsScript('meta'))}catch(e){console.error('meta:',e.message);res.set('Cache-Control','public,max-age=30').json(emptyMeta(e.message))}});
app.get('/api/families',async(req,res)=>{try{const page=Math.max(1,Number(req.query.page||1)),pageSize=Math.min(250,Math.max(1,Number(req.query.pageSize||100)));res.set('Cache-Control','no-store').json(await fetchAppsScript('families',{page,pageSize,q:req.query.q,tuman:req.query.tuman,mahalla:req.query.mahalla,kocha:req.query.kocha}))}catch(e){console.error('families:',e.message);res.set('Cache-Control','no-store').json({ok:true,degraded:true,error:e.message,page:1,pageSize:100,totalPages:1,total:0,records:[]})}});
app.get('/api/family/:row',async(req,res)=>{try{const row=Number(req.params.row);if(!Number.isInteger(row)||row<2)return res.status(400).json({ok:false,error:'Noto‘g‘ri Sheet qatori.'});res.set('Cache-Control','no-store').json(await fetchAppsScript('family',{row}))}catch(e){res.status(502).json({ok:false,error:e.message})}});
app.use((_req,res)=>res.type('html').send(dashboardHtml()));
if(require.main===module)app.listen(PORT,()=>console.log('Dashboard server listening on '+PORT));
module.exports=app;