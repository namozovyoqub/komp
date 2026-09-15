const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
// Vercel env is preferred; fallback keeps the dashboard working if APPS_SCRIPT_URL
// was not added to the Vercel project settings yet.
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzSxU-qRLqgpFiDhgl7LnC0dsaloH-O6MjnAEq0HwlJ0lEbsAXSmq8iqV1mpqonrA1H/exec';
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
  const key = action + ':' + JSON.stringify(params), now = Date.now();
  const hit = cache.get(key);
  if (hit && now-hit.at < CACHE_TTL_MS) return hit.data;
  if (inflight.has(key)) return inflight.get(key);
  const promise = (async()=>{
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(apiUrl(action,params),{redirect:'follow',headers:{Accept:'application/json,text/plain,*/*'},signal:controller.signal});
      const text = await response.text();
      if(!response.ok) throw new Error(`Apps Script HTTP ${response.status}: ${text.slice(0,300)}`);
      let data;
      try { data=JSON.parse(text); } catch(_) {
        const m=text.match(/^\s*[A-Za-z_$][\w$\.]*\((.*)\)\s*;?\s*$/s);
        if(!m) throw new Error('Apps Script javobi JSON emas: '+text.slice(0,300));
        data=JSON.parse(m[1]);
      }
      if(!data || data.ok===false) throw new Error(data?.error||'Apps Script xatolik qaytardi.');
      cache.set(key,{at:Date.now(),data});
      return data;
    } catch(e) {
      if(e.name==='AbortError') throw new Error('Apps Script javobi 30 soniyada kelmadi (timeout).');
      throw e;
    } finally { clearTimeout(timer); inflight.delete(key); }
  })();
  inflight.set(key,promise); return promise;
}

function dashboardHtml(){
  const file=path.join(__dirname,'public','live-dashboard.html');
  let html=fs.readFileSync(file,'utf8');
  html=html.replace(/<script>([\s\S]*?)<\/script>/gi,'');
  const safe=`
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script>
const API='/api', $=id=>document.getElementById(id), A=x=>Array.isArray(x)?x:[], esc=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])), num=v=>{const m=String(v??'').replace(/\\s/g,'').replace(',','.').match(/-?\\d+(?:\\.\\d+)?/);return m?+m[0]:0};
let stats={},meta={},familyPage=1;
async function get(path,params={}){const u=new URL(API+path,location.origin);Object.entries(params).forEach(([k,v])=>{if(v!==''&&v!=null)u.searchParams.set(k,v)});u.searchParams.set('_',Date.now());const r=await fetch(u,{cache:'no-store'});const t=await r.text();let j;try{j=JSON.parse(t)}catch(_){j={ok:false,error:t.slice(0,300)}}if(!r.ok)throw Error((j&&j.error)||('API HTTP '+r.status));if(j&&j.ok===false)throw Error(j.error||'API xatolik');return j}
function bars(id,obj){const e=$(id),a=Object.entries(obj||{}).filter(x=>x[1]!==undefined).sort((x,y)=>Number(y[1])-Number(x[1])).slice(0,12),mx=Math.max(1,...a.map(x=>Number(x[1])||0));e.innerHTML=a.map(x=>'<div class="barrow"><span>'+esc(x[0])+'</span><div class="bar"><i style="width:'+Math.min(100,(Number(x[1])||0)/mx*100)+'%"></i></div><b>'+Number(x[1]||0).toLocaleString('uz-UZ')+'</b></div>').join('')||'<div class="notice">Ma’lumot mavjud emas.</div>'}
function fill(id,values,keep){const e=$(id),a=A(values),v=keep??e.value;e.innerHTML='<option value="">Barchasi</option>'+a.map(x=>'<option>'+esc(x)+'</option>').join('');if(a.includes(v))e.value=v}
function filters(){const t=$('tuman').value,m=$('mahalla').value;fill('tuman',meta.tumans,t);const ms=t&&meta.tree&&meta.tree[t]?Object.keys(meta.tree[t]):meta.mahallas;fill('mahalla',ms,m);const ks=t&&m&&meta.tree&&meta.tree[t]&&meta.tree[t][m]?Object.keys(meta.tree[t][m]):meta.kochas;fill('kocha',ks,$('kocha').value)}
function selected(){return {tuman:$('tuman').value,mahalla:$('mahalla').value,kocha:$('kocha').value}}
function render(){const a=stats.agg||{},geo=stats.geo&&A(stats.geo.rows),cov=A(stats.coverage);$('total').textContent=Number(a.n||0).toLocaleString('uz-UZ');$('kpis').innerHTML=[['Xonadon',a.n],['Aholi',a.population],['Mehnat yoshi',a.mehnatYosh],['Ishsiz',a.ishsizlar],['Nogiron shaxs',a.nogironShaxs]].map(x=>'<div class="kpi"><span>'+x[0]+'</span><b>'+Number(x[1]||0).toLocaleString('uz-UZ')+'</b></div>').join('');bars('income',a.incomeDist);bars('social',{Ha:a.ijtimoiyReestr?.Ha||0,"Yo‘q":a.ijtimoiyReestr?.["Yo‘q"]||0,Nafaqa:a.nafaqa?.Ha||0,Nogiron:a.nogironShaxs||0});bars('utility',{Internet:a.internet?.Ha||0,'Tabiiy gaz':a.tabiiyGaz?.Ha||0,'Ichimlik suvi':a.ichimlikSuvi?.Ha||0});bars('age',a.ageBands);bars('jobs',a.employment);bars('problems',Object.fromEntries(A(a.topProblems)));bars('needs',Object.fromEntries(A(a.topNeeds)));bars('problems2',Object.fromEntries(A(a.topProblems)));bars('needs2',Object.fromEntries(A(a.topNeeds)));
$('coverage').innerHTML='<div class="tablewrap"><table class="table"><tr><th>Tuman</th><th>Oilalar</th><th>Aholi</th><th>MFY</th></tr>'+cov.map(x=>'<tr><td>'+esc(x.tuman)+'</td><td>'+Number(x.families||0).toLocaleString('uz-UZ')+'</td><td>'+Number(x.population||0).toLocaleString('uz-UZ')+'</td><td>'+Number(x.mfyCount||0)+'</td></tr>').join('')+'</table></div>';
$('regionsTable').innerHTML='<div class="tablewrap"><table class="table"><tr><th>Hudud</th><th>Oilalar</th><th>Aholi</th><th>Ishsiz</th></tr>'+geo.map(x=>'<tr><td>'+esc(x.key)+'</td><td>'+x.families+'</td><td>'+x.population+'</td><td>'+x.ishsizlar+'</td></tr>').join('')+'</table></div>';
$('aiText').innerHTML='<h3>Avtomatik xulosa</h3><p>Tanlangan hududda <b>'+Number(a.n||0).toLocaleString('uz-UZ')+'</b> ta xonadon va <b>'+Number(a.population||0).toLocaleString('uz-UZ')+'</b> nafar aholi qayd etilgan.</p><p>Ishsizlar: <b>'+Number(a.ishsizlar||0).toLocaleString('uz-UZ')+'</b>. Ijtimoiy reestr: <b>'+Number(a.ijtimoiyReestr?.Ha||0).toLocaleString('uz-UZ')+'</b> ta.</p>';
$('tasksList').innerHTML='<div class="card"><h3>Ustuvor topshiriqlar</h3><p>Ishsizlarni bandlikka yo‘naltirish, ijtimoiy himoyani kuchaytirish, kredit va subsidiya ehtiyojlarini ko‘rib chiqish.</p></div>';
}
async function load(){try{$('loading').style.display='flex';[stats,meta]=await Promise.all([get('/stats',selected()),get('/meta')]);filters();render();$('loading').style.display='none'}catch(e){console.error(e);$('loading').querySelector('b').textContent='Xatolik: '+e.message;$('loading').querySelector('p').textContent='Google Sheets ma’lumotlari olinmadi.'}}
async function families(){try{const p=await get('/families',{page:familyPage,pageSize:100,q:$('q').value,tuman:$('tuman').value,mahalla:$('mahalla').value,kocha:$('kocha').value});const rows=A(p.records);$('familyTable').innerHTML='<div class="tablewrap"><table class="table"><tr><th>#</th><th>Tuman</th><th>MFY</th><th>Ko‘cha</th><th>Oila boshlig‘i</th><th>Telefon</th></tr>'+rows.map((r,i)=>'<tr onclick="passport('+r._sheetRow+')"><td>'+((familyPage-1)*100+i+1)+'</td><td>'+esc(r.tuman)+'</td><td>'+esc(r.mahalla)+'</td><td>'+esc(r.kocha)+'</td><td>'+esc(r.boshliq_fio)+'</td><td>'+esc(r.telefon)+'</td></tr>').join('')+'</table></div>';$('pager').innerHTML='<button class="btn" onclick="familyPage=Math.max(1,familyPage-1);families()">Oldingi</button><span class="tag">'+familyPage+' / '+(p.totalPages||1)+'</span><button class="btn" onclick="familyPage=Math.min(p.totalPages||1,familyPage+1);families()">Keyingi</button>'}catch(e){$('familyTable').innerHTML='<div class="notice">'+esc(e.message)+'</div>'}}
async function passport(row){try{const p=await get('/family/'+row);const r=p.record||{};$('mt').textContent='Oila pasporti — '+(r.boshliq_fio||'');const keys=['tuman','mahalla','kocha','uy_raqami','boshliq_fio','tugilgan_sana','jinsi','telefon','jami_aholi','erkaklar','ayollar','ishsizlar','jami_oylik_daromad','jami_xarajat','ijtimoiy_reestr','nogiron_shaxs','muammo_1','muammo_2','ehtiyoj_1','ehtiyoj_2','ehtiyoj_3'];$('mb').innerHTML='<div class="sections"><div class="sec"><h4>Elektron oila pasporti</h4><div class="kv">'+keys.map(k=>'<span>'+esc(k)+'</span><b>'+esc(r[k]??'—')+'</b>').join('')+'</div></div></div>';$('modalbg').style.display='flex'}catch(e){alert(e.message)}}
function closeModal(){$('modalbg').style.display='none'}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$(b.dataset.v).classList.add('active');$('pt').textContent=b.textContent.trim();if(b.dataset.v==='families')families()});
['tuman','mahalla','kocha'].forEach(id=>$(id).onchange=async()=>{try{filters();stats=await get('/stats',selected());render()}catch(e){$('loading').style.display='flex';$('loading').querySelector('b').textContent='Xatolik: '+e.message}});$('q').oninput=()=>{if(document.getElementById('families').classList.contains('active')){familyPage=1;families()}};$('reset').onclick=()=>{['tuman','mahalla','kocha'].forEach(id=>$(id).value='');$('q').value='';filters();load()};$('modalbg').onclick=e=>{if(e.target.id==='modalbg')closeModal()};load();setInterval(load,300000);
</script>`;
  return html.replace('</body>',safe+'</body>');
}

app.get('/', (_req,res)=>res.type('html').send(dashboardHtml()));
app.get('/live-dashboard.html', (_req,res)=>res.type('html').send(dashboardHtml()));

app.get('/api/health', (_req,res)=>res.json({ok:true,service:'surxondaryo-live-dashboard',appsScriptConfigured:Boolean(APPS_SCRIPT_URL),cacheEntries:cache.size,timestamp:new Date().toISOString()}));
app.get('/api/stats', async(req,res)=>{try{res.set('Cache-Control','no-store').json(await fetchAppsScript('stats',{tuman:req.query.tuman,mahalla:req.query.mahalla,kocha:req.query.kocha}))}catch(e){res.status(502).json({ok:false,error:e.message})}});
app.get('/api/meta', async(_req,res)=>{try{res.set('Cache-Control','public,max-age=300').json(await fetchAppsScript('meta'))}catch(e){res.status(502).json({ok:false,error:e.message})}});
app.get('/api/families', async(req,res)=>{try{const page=Math.max(1,Number(req.query.page||1)),pageSize=Math.min(250,Math.max(1,Number(req.query.pageSize||100)));res.set('Cache-Control','no-store').json(await fetchAppsScript('families',{page,pageSize,q:req.query.q,tuman:req.query.tuman,mahalla:req.query.mahalla,kocha:req.query.kocha}))}catch(e){res.status(502).json({ok:false,error:e.message})}});
app.get('/api/family/:row', async(req,res)=>{try{const row=Number(req.params.row);if(!Number.isInteger(row)||row<2)return res.status(400).json({ok:false,error:'Noto‘g‘ri Sheet qatori.'});res.set('Cache-Control','no-store').json(await fetchAppsScript('family',{row}))}catch(e){res.status(502).json({ok:false,error:e.message})}});

app.use((_req,res)=>res.type('html').send(dashboardHtml()));
if(require.main===module)app.listen(PORT,()=>console.log('Dashboard server listening on '+PORT));
module.exports=app;
