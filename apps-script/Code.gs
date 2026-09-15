/***** SURXONDARYO LIVE API — OPTIMIZED
 * Google Form -> Google Sheets -> Apps Script -> Vercel -> HTML
 * Optimized for 17k+ rows: stats reads only required columns and caches results.
 *****/

const SPREADSHEET_ID = '1IyoVMJ98zSeHEYeCVmLEN7slOoroZ7tKpuZccVKUvKQ';
const SHEET_NAME = 'Ответы на форму (1)';
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 250;

const FIELD_KEYS = [
  'tuman','mahalla','kocha','uy_raqami','boshliq_fio','tugilgan_sana','jinsi','telefon','malumoti','jami_aholi','erkaklar','ayollar',
  'yosh_0_3','yosh_4_7','yosh_8_17','yosh_18_30','yosh_31_59','yosh_60_plus','vaqtincha_yashamaydigan','vaqtincha_sababi','oila_tarkibi','farzandlar_soni',
  'ijtimoiy_himoyaga_muhtoj','muhtoj_soni','nogiron_shaxs','nogiron_bola','yolgiz_keksa','doimiy_parvarishga_muhtoj','ogir_kasal','ijtimoiy_reestr',
  'nafaqa_beriladimi','nafaqa_turi','nafaqa_miqdori','mehnat_yoshidagilar','mehnat_ayollar','mehnat_erkaklar','rasmiy_ishlaydigan','norasmiy_ishlaydigan',
  'mavsumiy_ishlaydigan','ozini_ozi_band','tadbirkorlik_bilan','xorijda_ishlaydigan','boshqa_hududda_ishlaydigan','ishsizlar','ishsiz_ayol','ishsiz_erkak',
  'ishsiz_18_30','ishsiz_31_55','ishsiz_56_60','ishlash_istagi_bor','ishlash_istagi_yoq','istagi_yoqligi_sababi','doimiy_ishlash_istagi_bor',
  'kasbiy_malakasi_bor','kasbiy_malakasi_yoq','qaysi_kasb_fio','asosiy_soha','qaysi_hudud_tayyor','min_oylik_kutilgan','jami_oylik_daromad',
  'daromad_rasmiy','daromad_norasmiy','daromad_tadbirkorlik','daromad_tomorqa','daromad_chorvachilik','daromad_parrandachilik','daromad_xorij',
  'daromad_pensiya','daromad_nafaqa','daromad_boshqa','jami_xarajat','xarajat_oziq_ovqat','xarajat_kommunal','xarajat_kredit','xarajat_talim','xarajat_dori',
  'xarajat_transport','xarajat_boshqa','daromad_xarajatni_qoplaydimi','jon_boshiga_daromad','kredit_bor','kredit_qoldiq','kredit_oylik_tolov','kredit_muddat',
  'kredit_kechikkan','yangi_kredit_ehtiyoji','kerakli_kredit_miqdori','kredit_maqsad','subsidiya_ehtiyoji','subsidiya_maqsad','tadbirkor_bor','faoliyat_turi',
  'tadbirkorlik_daromad','kengaytirish_istagi','kengaytirish_mablag','asosiy_ehtiyoj_tadbirkorlik','kasb_hunar_ogrenish_istagi','qaysi_kasb_fio2',
  'xorijiy_til_istagi','til_ingliz','til_rus','til_koreys','til_nemis','til_boshqa','maktabgacha_bolalar','maktab_yoshidagi_bolalar','maktabga_boradigan',
  'maktabga_bormaydigan','ozlashtirishi_past','togarakka_qatnashadigan','qoshimcha_talim_ehtiyoji','bolalar_ehtiyoji','oliy_talim_olayotgan',
  'doimiy_davolanuvchi','dori_ehtiyoji','nogiron_shaxs2','nogiron_bola2','tibbiy_korikka_muhtoj','davolanish_mablag_yetishmovchiligi','zarur_tibbiy_yordam',
  'uyjoy_maydon','yashash_xonalari','uyjoy_yetarlimi','uyjoy_mulk_shakli','uyjoy_hujjatlari','tamir_tom','tamir_pol','tamir_shift','tamir_deraza','tamir_eshik',
  'tamir_tandirxona','tamir_ochoqxona','tamir_devor','tamir_mablag','tabiiy_gaz','elektr','elektr_sarf','ichimlik_suvi','kanalizatsiya','isitish_tizimi',
  'quyosh_paneli','internet','tex_xolodilnik','tex_televizor','tex_konditsioner','tex_kir_yuvish','tex_ariston','tex_kompyuter','tex_smartfon','tex_gaz_plita',
  'tex_velosiped','tex_skuter','tex_avtomobil','tex_qishloq_texnika','tex_boshqa','tomorqa_maydon','tomorqa_bosh_maydon','tomorqadan_foydalanish','issiqxona_bor',
  'issiqxona_maydon','sugorish_imkoniyati','chorva_qoramol','chorva_ot','chorva_qoy','chorva_echki','chorva_parranda','chorva_boshqa',
  'chorvachilik_kengaytirish_istagi','kerakli_yordam','sport_shugullanuvchilar','sport_turi','sport_inshoot_ehtiyoji','yoshlar_asosiy_ehtiyoji',
  'muammo_1','muammo_2','muammo_3','ehtiyoj_1','ehtiyoj_2','ehtiyoj_3','ijtimoiy_holat','iqtisodiy_holat','birinchi_navbat_masala'
];

function sheet_(){const ss=SpreadsheetApp.openById(SPREADSHEET_ID);return ss.getSheetByName(SHEET_NAME)||ss.getSheets()[0];}
function out_(obj,e){const text=JSON.stringify(obj),cb=e&&e.parameter&&e.parameter.callback;if(cb&&/^[A-Za-z_$][\w$\.]*$/.test(cb))return ContentService.createTextOutput(cb+'('+text+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);}
function num_(v){if(v===null||v===undefined||v==='')return 0;const m=String(v).replace(/\s/g,'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0;}
function yn_(v){const s=String(v||'').toLowerCase().trim();if(!s)return 'Noma\'lum';if(s==='ha'||s==='ҳа'||s==='yes'||s==='да')return 'Ha';if(s.includes('qisman')||s.includes('қисман'))return 'Qisman';if(s==='yoq'||s==="yo'q"||s==='йўқ'||s==='нет'||s==='no')return "Yo'q";return 'Noma\'lum';}
function clean_(v){return String(v==null?'':v).trim();}
function yes_(v){return yn_(v)==='Ha';}
function cacheGetJson_(key){try{const v=CacheService.getScriptCache().get(key);return v?JSON.parse(v):null;}catch(_){return null;}}
function cachePutJson_(key,obj,seconds){try{CacheService.getScriptCache().put(key,JSON.stringify(obj),seconds);}catch(_) {}}

function actionStats_(e){
  const p=e.parameter||{}, cacheKey='stats:'+JSON.stringify({tuman:p.tuman||'',mahalla:p.mahalla||'',kocha:p.kocha||''}),cached=cacheGetJson_(cacheKey);if(cached)return cached;
  const sh=sheet_(),n=Math.max(0,sh.getLastRow()-1);if(!n)return {ok:true,agg:{n:0,population:0,mehnatYosh:0,ishsizlar:0,nogironShaxs:0},geo:{rows:[]},coverage:[],generatedAt:new Date().toISOString()};
  const bcd=sh.getRange(2,2,n,3).getValues();
  const ksu=sh.getRange(2,11,n,11).getValues();
  const vad=sh.getRange(2,22,n,9).getValues();
  const aex=sh.getRange(2,31,n,20).getValues();
  const inc=sh.getRange(2,51,n,42).getValues();
  const edu=sh.getRange(2,95,n,40).getValues();
  const infra=sh.getRange(2,135,n,48).getValues();
  const agg={n:0,population:0,mehnatYosh:0,ishsizlar:0,nogironShaxs:0,nogironBola:0,yolgizKeksa:0};
  const incomeDist={},employment={},ageBands={},social={},nafaqa={},credit={},subsidy={},appliances={},livestock={},malumoti={},oilaTarkibi={},mulkShakli={},topP={},topN={},geo={},coverage={};
  const applianceNames=['Xolodilnik','Televizor','Konditsioner','Kir yuvish','Ariston','Kompyuter','Smartfon','Gaz plita','Velosiped','Skuter','Avtomobil','Qishloq texnika'];
  for(let i=0;i<n;i++){
    const loc=bcd[i],k=ksu[i],v=vad[i],e1=aex[i],income=inc[i],house=edu[i],infraRow=infra[i],t=clean_(loc[0]),m=clean_(loc[1]),ko=clean_(loc[2]);
    if(!t)continue;if(p.tuman&&t!==clean_(p.tuman))continue;if(p.mahalla&&m!==clean_(p.mahalla))continue;if(p.kocha&&ko!==clean_(p.kocha))continue;
    agg.n++;agg.population+=num_(k[0]);agg.mehnatYosh+=num_(e1[3]);agg.ishsizlar+=num_(e1[14]);agg.nogironShaxs+=num_(v[4]);agg.nogironBola+=num_(v[5]);agg.yolgizKeksa+=num_(v[6]);
    const g=geo[t]||(geo[t]={key:t,families:0,population:0,ishsizlar:0,mfy:{}});g.families++;g.population+=num_(k[0]);g.ishsizlar+=num_(e1[14]);if(m)g.mfy[m]=1;
    const cv=coverage[t]||(coverage[t]={tuman:t,families:0,population:0,mfy:{}});cv.families++;cv.population+=num_(k[0]);if(m)cv.mfy[m]=1;
    const iv=num_(income[10]),band=iv<=1000000?'1 mln gacha':iv<=3000000?'1–3 mln':iv<=5000000?'3–5 mln':iv<=10000000?'5–10 mln':'10 mln+';incomeDist[band]=(incomeDist[band]||0)+1;
    [['Rasmiy',e1[6]],['Norasmiy',e1[7]],['Mavsumiy',e1[8]],['O‘zini o‘zi band',e1[9]],['Xorijda',e1[10]],['Boshqa hududda',e1[11]],['Ishsiz',e1[14]]].forEach(x=>{const z=num_(x[1]);if(z)employment[x[0]]=(employment[x[0]]||0)+z;});
    [['0–3',k[3]],['4–7',k[4]],['8–17',k[5]],['18–30',k[6]],['31–59',k[7]],['60+',k[8]]].forEach(x=>{const z=num_(x[1]);if(z)ageBands[x[0]]=(ageBands[x[0]]||0)+z;});
    const sr=yn_(e1[0]);social[sr]=(social[sr]||0)+1;const nf=yn_(e1[1]);nafaqa[nf]=(nafaqa[nf]||0)+1;const cr=yn_(income[31]);credit[cr]=(credit[cr]||0)+1;const su=yn_(income[39]);subsidy[su]=(subsidy[su]||0)+1;
    if(clean_(k[2])){const z=clean_(k[2]);malumoti[z]=(malumoti[z]||0)+1;}if(clean_(v[0])){const z=clean_(v[0]);oilaTarkibi[z]=(oilaTarkibi[z]||0)+1;}if(clean_(house[30])){const z=clean_(house[30]);mulkShakli[z]=(mulkShakli[z]||0)+1;}
    for(let j=0;j<12;j++)if(yes_(infraRow[9+j]))appliances[applianceNames[j]]=(appliances[applianceNames[j]]||0)+1;
    for(let j=0;j<3;j++){const z=clean_(infraRow[40+j]);if(z)topP[z]=(topP[z]||0)+1;}for(let j=0;j<3;j++){const z=clean_(infraRow[43+j]);if(z)topN[z]=(topN[z]||0)+1;}
  }
  const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,12);
  const geoRows=Object.values(geo).map(x=>({key:x.key,families:x.families,population:x.population,ishsizlar:x.ishsizlar})).sort((a,b)=>b.families-a.families);
  const covRows=Object.values(coverage).map(x=>({tuman:x.tuman,families:x.families,population:x.population,mfyCount:Object.keys(x.mfy).length,avgPerMfy:Object.keys(x.mfy).length?x.families/Object.keys(x.mfy).length:0})).sort((a,b)=>b.families-a.families);
  const result={ok:true,agg:Object.assign(agg,{ishsizlikRate:agg.mehnatYosh?agg.ishsizlar/agg.mehnatYosh*100:0,ijtimoiyReestr:social,nafaqa,kreditBor:credit,tadbirkorBor:{},yangiKreditEhtiyoji:{},subsidiyaEhtiyoji:subsidy,kasbHunarIstagi:{},uyjoyYetarli:{},balans:{},incomeDist,expenseAvg:0,employment,ageBands,mulkShakli,ichimlikSuvi:{},tabiiyGaz:{},internet:{},malumoti,oilaTarkibi,uyjoyHujjatlari:{},genderHead:{},repairCondition:{},appliances,livestock,childrenEdu:{},topProblems:top(topP),topNeeds:top(topN),indicators:{},auditStats:{},criticalStats:{}}),geo:{rows:geoRows},coverage:covRows,filters:{tuman:p.tuman||'',mahalla:p.mahalla||'',kocha:p.kocha||''},generatedAt:new Date().toISOString()};
  cachePutJson_(cacheKey,result,300);return result;
}

function actionMeta_(){
  const cached=cacheGetJson_('meta:v2');if(cached)return cached;const sh=sheet_(),n=Math.max(0,sh.getLastRow()-1);if(!n)return {ok:true,totalFamilies:0,tumans:[],mahallas:[],kochas:[],tree:{},generatedAt:new Date().toISOString()};
  const rows=sh.getRange(2,2,n,3).getValues(),tumans={},mahallas={},kochas={},tree={};
  rows.forEach(r=>{const t=clean_(r[0]),m=clean_(r[1]),k=clean_(r[2]);if(t){tumans[t]=1;tree[t]=tree[t]||{};}if(m){mahallas[m]=1;if(t){tree[t][m]=tree[t][m]||{};}}if(k){kochas[k]=1;if(t&&m)tree[t][m][k]=1;}});
  const out={ok:true,totalFamilies:n,tumans:Object.keys(tumans).sort(),mahallas:Object.keys(mahallas).sort(),kochas:Object.keys(kochas).sort(),tree,generatedAt:new Date().toISOString()};cachePutJson_('meta:v2',out,300);return out;
}

function actionFamilies_(e){
  const sh=sheet_(),p=e.parameter||{},page=Math.max(1,Number(p.page||1)),pageSize=Math.min(MAX_PAGE_SIZE,Math.max(1,Number(p.pageSize||DEFAULT_PAGE_SIZE))),q=String(p.q||'').toLowerCase().trim(),tuman=clean_(p.tuman),mahalla=clean_(p.mahalla),kocha=clean_(p.kocha),rows=sh.getRange(2,1,Math.max(0,sh.getLastRow()-1),9).getValues(),matched=[];
  rows.forEach((row,i)=>{if(!clean_(row[1]))return;if(tuman&&clean_(row[1])!==tuman)return;if(mahalla&&clean_(row[2])!==mahalla)return;if(kocha&&clean_(row[3])!==kocha)return;if(q&&![row[5],row[1],row[2],row[3],row[4]].join(' ').toLowerCase().includes(q))return;matched.push({_sheetRow:i+2,tuman:row[1]||'',mahalla:row[2]||'',kocha:row[3]||'',uy_raqami:row[4]||'',boshliq_fio:row[5]||'',tugilgan_sana:row[6]||'',jinsi:row[7]||'',telefon:row[8]||''});});
  const total=matched.length,start=(page-1)*pageSize;return {ok:true,page,pageSize,totalPages:Math.ceil(total/pageSize),total,records:matched.slice(start,start+pageSize),generatedAt:new Date().toISOString()};
}
function rowToFamily_(row,sheetRow){const r={_sheetRow:sheetRow,_timestamp:row[0]||''};for(let i=0;i<FIELD_KEYS.length;i++)r[FIELD_KEYS[i]]=row[i+1]??'';r.mahalla_original=r.mahalla||'';r.kocha_original=r.kocha||'';r.masul_fio=row[183]??'';return r;}
function actionFamily_(e){const rowNo=Number((e.parameter||{}).row||0);if(rowNo<2)return {ok:false,error:'row parametri kerak'};const sh=sheet_();if(rowNo>sh.getLastRow())return {ok:false,error:'Bunday Sheet qatori mavjud emas'};return {ok:true,record:rowToFamily_(sh.getRange(rowNo,1,1,sh.getLastColumn()).getValues()[0],rowNo),generatedAt:new Date().toISOString()};}
function doGet(e){try{const action=String((e&&e.parameter&&e.parameter.action)||'stats').toLowerCase();let result;if(action==='stats')result=actionStats_(e);else if(action==='meta')result=actionMeta_();else if(action==='families')result=actionFamilies_(e);else if(action==='family')result=actionFamily_(e);else if(action==='check')result={ok:true,columns:sheet_().getLastColumn(),rows:Math.max(0,sheet_().getLastRow()-1),fieldKeys:FIELD_KEYS.length};else result={ok:false,error:'Noma\'lum action: '+action};return out_(result,e);}catch(err){return out_({ok:false,error:String(err&&err.message||err),stack:String(err&&err.stack||'')},e);}}
function testAll(){const sh=sheet_();Logger.log('Sheet: '+sh.getName());Logger.log('Rows: '+Math.max(0,sh.getLastRow()-1));Logger.log('Columns: '+sh.getLastColumn());Logger.log('HTML field keys: '+FIELD_KEYS.length);Logger.log(JSON.stringify(actionStats_({parameter:{}})));Logger.log(JSON.stringify(actionMeta_()));}
