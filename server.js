const express=require('express');
const compression=require('compression');
const path=require('path');
const fs=require('fs');
const app=express();
const PORT=process.env.PORT||3000;
const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbw3rorMRH3NEldVetbqix8rIac6TPTy1Cz8_DoFAcFJ84MmwAB36DsSFEpAELklCBZA/exec';
const CACHE_TTL_MS=5*60*1000;
const REQUEST_TIMEOUT_MS=18000;
const PAGE_SIZE=250;
app.disable('x-powered-by');app.use(compression({threshold:512}));
const cache=new Map(),inflight=new Map();
function apiUrl(action,params={}){const u=new URL(APPS_SCRIPT_URL);u.searchParams.set('action',action);for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&String(v)!=='')u.searchParams.set(k,String(v));u.searchParams.set('_',Date.now().toString());return u.toString()}
async function fetchAppsScript(action,params={}){const key=action+':'+JSON.stringify(params),hit=cache.get(key);if(hit&&Date.now()-hit.at<CACHE_TTL_MS)return hit.data;if(inflight.has(key))return inflight.get(key);const promise=(async()=>{const c=new AbortController(),timer=setTimeout(()=>c.abort(),REQUEST_TIMEOUT_MS);try{const r=await fetch(apiUrl(action,params),{redirect:'follow',headers:{Accept:'application/json,text/plain,*/*'},signal:c.signal});const text=await r.text();if(!r.ok)throw new Error(`Apps Script HTTP ${r.status}: ${text.slice(0,300)}`);let data;try{data=JSON.parse(text)}catch(_){const m=text.match(/^\s*[A-Za-z_$][\w$\.]*\((.*)\)\s*;?\s*$/s);if(!m)throw new Error('Apps Script javobi JSON emas');data=JSON.parse(m[1])}if(!data||data.ok===false)throw new Error(data?.error||'Apps Script xatolik qaytardi');cache.set(key,{at:Date.now(),data});return data}catch(e){if(e.name==='AbortError')throw new Error('Apps Script timeout');throw e}finally{clearTimeout(timer);inflight.delete(key)}})();inflight.set(key,promise);return promise}
function normalizeStats(data){if(!data?.agg)return data;const a=data.agg,p=Math.max(0,Number(a.population)||0),m=Math.max(0,Math.min(Number(a.mehnatYosh)||0,p)),i=Math.max(0,Math.min(Number(a.ishsizlar)||0,m||p));a.mehnatYosh=m;a.ishsizlar=i;a.ishsizlikRate=m?i/m*100:0;return data}
function fallbackStats(error){return {ok:true,degraded:true,source:'last-known-fallback',error:error||'',agg:{n:21113,population:108305,mehnatYosh:87856,ishsizlar:14396,nogironShaxs:0,nogironBola:0,yolgizKeksa:0,ishsizlikRate:16.38,ijtimoiyReestr:{'Ha':2980},nafaqa:{},kreditBor:{},tadbirkorBor:{},yangiKreditEhtiyoji:{},subsidiyaEhtiyoji:{},kasbHunarIstagi:{},uyjoyYetarli:{},balans:{},incomeDist:{},employment:{},ageBands:{},mulkShakli:{},ichimlikSuvi:{},tabiiyGaz:{},internet:{},malumoti:{},oilaTarkibi:{},uyjoyHujjatlari:{},genderHead:{},repairCondition:{},appliances:{},livestock:{},childrenEdu:{},topProblems:[],topNeeds:[],indicators:{},auditStats:{},criticalStats:{}},geo:{rows:[]},coverage:[],filters:{},generatedAt:new Date().toISOString()}}
function fallbackMeta(error){return {ok:true,degraded:true,error:error||'',source:'fallback',totalFamilies:21113,tumans:[],mahallas:[],kochas:[],tree:{},generatedAt:new Date().toISOString()}}
function dashboardHtml(){return fs.readFileSync(path.join(__dirname,'public','live-dashboard.html'),'utf8')}
app.get('/',(_q,r)=>r.type('html').send(dashboardHtml()));app.get('/live-dashboard.html',(_q,r)=>r.type('html').send(dashboardHtml()));
app.get('/api/health',(_q,r)=>r.json({ok:true,service:'surxondaryo-live-dashboard',timestamp:new Date().toISOString()}));
app.get('/api/stats',async(req,res)=>{try{const data=normalizeStats(await fetchAppsScript('stats',{tuman:req.query.tuman,mahalla:req.query.mahalla,kocha:req.query.kocha}));if(data&&data.building){console.warn('Apps Script stats cache is still building');return res.set('Cache-Control','no-store').json(fallbackStats(data.message||'Apps Script cache building'))}res.set('Cache-Control','public,max-age=60').json(data)}catch(e){console.error('stats:',e.message);res.set('Cache-Control','public,max-age=30').json(fallbackStats(e.message))}});
app.get('/api/meta',async(_q,r)=>{try{r.set('Cache-Control','public,max-age=300').json(await fetchAppsScript('meta'))}catch(e){r.set('Cache-Control','public,max-age=60').json(fallbackMeta(e.message))}});
app.get('/api/families',async(req,res)=>{try{const params={q:req.query.q,tuman:req.query.tuman,mahalla:req.query.mahalla,kocha:req.query.kocha,page:Number(req.query.page||1),pageSize:PAGE_SIZE};const data=await fetchAppsScript('families',params);res.set('Cache-Control','public,max-age=30').json(data)}catch(e){res.status(200).json({ok:true,degraded:true,error:e.message,records:[],data:[],total:0,totalPages:1,page:1,pageSize:PAGE_SIZE})}});
app.get('/api/family/:row',async(req,res)=>{try{const row=Number(req.params.row);if(!Number.isInteger(row)||row<2)return res.status(400).json({ok:false,error:'Noto‘g‘ri Sheet qatori.'});res.json(await fetchAppsScript('family',{row}))}catch(e){res.status(502).json({ok:false,error:e.message})}});
app.use((_q,r)=>r.type('html').send(dashboardHtml()));
if(require.main===module)app.listen(PORT,()=>console.log('Dashboard server listening on '+PORT));
module.exports=app;
