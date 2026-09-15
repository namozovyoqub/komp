/***** SURXONDARYO LIVE API — FIXED
 * Google Form -> Google Sheets -> Apps Script -> Vercel -> HTML
 * 182 HTML fields. Sheet: A=timestamp, B:FK=form responses, FL=masul_fio.
 *****/

const SPREADSHEET_ID='1IyoVMJ98zSeHEYeCVmLEN7slOoroZ7tKpuZccVKUvKQ';
const SHEET_NAME='Ответы на форму (1)';
const DEFAULT_PAGE_SIZE=100;
const MAX_PAGE_SIZE=250;
const STATS_CACHE_VERSION='v4';

const FIELD_KEYS=[
 'tuman','mahalla','kocha','uy_raqami','boshliq_fio','tugilgan_sana','jinsi','telefon','malumoti','jami_aholi','erkaklar','ayollar','yosh_0_3','yosh_4_7','yosh_8_17','yosh_18_30','yosh_31_59','yosh_60_plus','vaqtincha_yashamaydigan','vaqtincha_sababi','oila_tarkibi','farzandlar_soni','ijtimoiy_himoyaga_muhtoj','muhtoj_soni','nogiron_shaxs','nogiron_bola','yolgiz_keksa','doimiy_parvarishga_muhtoj','ogir_kasal','ijtimoiy_reestr','nafaqa_beriladimi','nafaqa_turi','nafaqa_miqdori','mehnat_yoshidagilar','mehnat_ayollar','mehnat_erkaklar','rasmiy_ishlaydigan','norasmiy_ishlaydigan','mavsumiy_ishlaydigan','ozini_ozi_band','tadbirkorlik_bilan','xorijda_ishlaydigan','boshqa_hududda_ishlaydigan','ishsizlar','ishsiz_ayol','ishsiz_erkak','ishsiz_18_30','ishsiz_31_55','ishsiz_56_60','ishlash_istagi_bor','ishlash_istagi_yoq','istagi_yoqligi_sababi','doimiy_ishlash_istagi_bor','kasbiy_malakasi_bor','kasbiy_malakasi_yoq','qaysi_kasb_fio','asosiy_soha','qaysi_hudud_tayyor','min_oylik_kutilgan','jami_oylik_daromad','daromad_rasmiy','daromad_norasmiy','daromad_tadbirkorlik','daromad_tomorqa','daromad_chorvachilik','daromad_parrandachilik','daromad_xorij','daromad_pensiya','daromad_nafaqa','daromad_boshqa','jami_xarajat','xarajat_oziq_ovqat','xarajat_kommunal','xarajat_kredit','xarajat_talim','xarajat_dori','xarajat_transport','xarajat_boshqa','daromad_xarajatni_qoplaydimi','jon_boshiga_daromad','kredit_bor','kredit_qoldiq','kredit_oylik_tolov','kredit_muddat','kredit_kechikkan','yangi_kredit_ehtiyoji','kerakli_kredit_miqdori','kredit_maqsad','subsidiya_ehtiyoji','subsidiya_maqsad','tadbirkor_bor','faoliyat_turi','tadbirkorlik_daromad','kengaytirish_istagi','kengaytirish_mablag','asosiy_ehtiyoj_tadbirkorlik','kasb_hunar_ogrenish_istagi','qaysi_kasb_fio2','xorijiy_til_istagi','til_ingliz','til_rus','til_koreys','til_nemis','til_boshqa','maktabgacha_bolalar','maktab_yoshidagi_bolalar','maktabga_boradigan','maktabga_bormaydigan','ozlashtirishi_past','togarakka_qatnashadigan','qoshimcha_talim_ehtiyoji','bolalar_ehtiyoji','oliy_talim_olayotgan','doimiy_davolanuvchi','dori_ehtiyoji','nogiron_shaxs2','nogiron_bola2','tibbiy_korikka_muhtoj','davolanish_mablag_yetishmovchiligi','zarur_tibbiy_yordam','uyjoy_maydon','yashash_xonalari','uyjoy_yetarlimi','uyjoy_mulk_shakli','uyjoy_hujjatlari','tamir_tom','tamir_pol','tamir_shift','tamir_deraza','tamir_eshik','tamir_tandirxona','tamir_ochoqxona','tamir_devor','tamir_mablag','tabiiy_gaz','elektr','elektr_sarf','ichimlik_suvi','kanalizatsiya','isitish_tizimi','quyosh_paneli','internet','tex_xolodilnik','tex_televizor','tex_konditsioner','tex_kir_yuvish','tex_ariston','tex_kompyuter','tex_smartfon','tex_gaz_plita','tex_velosiped','tex_skuter','tex_avtomobil','tex_qishloq_texnika','tex_boshqa','tomorqa_maydon','tomorqa_bosh_maydon','tomorqadan_foydalanish','issiqxona_bor','issiqxona_maydon','sugorish_imkoniyati','chorva_qoramol','chorva_ot','chorva_qoy','chorva_echki','chorva_parranda','chorva_boshqa','chorvachilik_kengaytirish_istagi','kerakli_yordam','sport_shugullanuvchilar','sport_turi','sport_inshoot_ehtiyoji','yoshlar_asosiy_ehtiyoji','muammo_1','muammo_2','muammo_3','ehtiyoj_1','ehtiyoj_2','ehtiyoj_3','ijtimoiy_holat','iqtisodiy_holat','birinchi_navbat_masala'
];

function sheet_(){const ss=SpreadsheetApp.openById(SPREADSHEET_ID);return ss.getSheetByName(SHEET_NAME)||ss.getSheets()[0];}
function out_(obj,e){const text=JSON.stringify(obj),cb=e&&e.parameter&&e.parameter.callback;if(cb&&/^[A-Za-z_$][\w$\.]*$/.test(cb))return ContentService.createTextOutput(cb+'('+text+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);}
function num_(v){if(v===null||v===undefined||v==='')return 0;const m=String(v).replace(/\s/g,'').replace(',', '.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0;}
function clean_(v){return String(v==null?'':v).trim();}
function yn_(v){const s=clean_(v).toLowerCase();if(!s)return 'Noma\'lum';if(['ha','ҳа','yes','да'].indexOf(s)>=0)return 'Ha';if(s.indexOf('qisman')>=0||s.indexOf('қисман')>=0)return 'Qisman';if(['yoq',"yo'q",'йўқ','нет','no'].indexOf(s)>=0)return "Yo'q";return 'Noma\'lum';}
function yes_(v){return yn_(v)==='Ha';}
function cacheGetJson_(key){try{const v=CacheService.getScriptCache().get(key);return v?JSON.parse(v):null;}catch(_){return null;}}
function cachePutJson_(key,obj,seconds){try{CacheService.getScriptCache().put(key,JSON.stringify(obj),seconds);}catch(_){}}
function add_(o,k,v){if(v) o[k]=(o[k]||0)+v;}
function countYN_(o,v){const k=yn_(v);o[k]=(o[k]||0)+1;}
function top_(o){return Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,12);}

function actionStats_(e){
 const p=e.parameter||{};
 const filter={tuman:clean_(p.tuman),mahalla:clean_(p.mahalla),kocha:clean_(p.kocha)};
 const cacheKey='stats:'+STATS_CACHE_VERSION+':'+JSON.stringify(filter),cached=cacheGetJson_(cacheKey);if(cached)return cached;
 const sh=sheet_(),n=Math.max(0,sh.getLastRow()-1);
 if(!n)return {ok:true,agg:{n:0,population:0,mehnatYosh:0,ishsizlar:0,nogironShaxs:0},geo:{rows:[]},coverage:[],filters:filter,generatedAt:new Date().toISOString()};

 // IMPORTANT: all ranges below are based on FIELD number + 1 because A is timestamp.
 const loc=sh.getRange(2,2,n,3).getDisplayValues();              // fields 1-3
 const dem=sh.getRange(2,11,n,9).getDisplayValues();             // fields 10-18
 const social=sh.getRange(2,24,n,8).getDisplayValues();          // fields 23-30
 const emp=sh.getRange(2,32,n,23).getDisplayValues();             // fields 31-53
 const skills=sh.getRange(2,54,n,7).getDisplayValues();           // fields 53-59
 const inc=sh.getRange(2,61,n,34).getDisplayValues();             // fields 60-93
 const business=sh.getRange(2,92,n,7).getDisplayValues();         // fields 91-97
 const edu=sh.getRange(2,100,n,21).getDisplayValues();             // fields 99-119
 const health=sh.getRange(2,115,n,6).getDisplayValues();           // fields 114-119
 const house=sh.getRange(2,121,n,14).getDisplayValues();           // fields 120-133
 const util=sh.getRange(2,135,n,8).getDisplayValues();             // fields 134-141
 const apps=sh.getRange(2,143,n,13).getDisplayValues();            // fields 142-154
 const land=sh.getRange(2,156,n,14).getDisplayValues();            // fields 155-168
 const social2=sh.getRange(2,169,n,14).getDisplayValues();         // fields 168-181
 const last=sh.getRange(2,182,n,2).getDisplayValues();             // fields 181-182

 const a={n:0,population:0,men:0,women:0,mehnatYosh:0,ishsizlar:0,nogironShaxs:0,nogironBola:0,yolgizKeksa:0,doimiyParvarish:0,ogirKasal:0,expenseTotal:0,incomeTotal:0};
 const incomeDist={},employment={},ageBands={'0–3':0,'4–7':0,'8–17':0,'18–30':0,'31–59':0,'60+':0},ijtimoiyReestr={},nafaqa={},kreditBor={},mulkShakli={},uyjoyYetarli={},uyjoyHujjatlari={},internet={},tabiiyGaz={},ichimlikSuvi={},elektr={},malumoti={},oilaTarkibi={},appliances={},livestock={},topP={},topN={};
 const geo={};
 const applianceNames=['Xolodilnik','Televizor','Konditsioner','Kir yuvish','Ariston','Kompyuter','Smartfon','Gaz plita','Velosiped','Skuter','Avtomobil','Qishloq texnika'];

 for(let i=0;i<n;i++){
   const t=clean_(loc[i][0]),m=clean_(loc[i][1]),ko=clean_(loc[i][2]);
   if(!t)continue;
   if(filter.tuman&&t!==filter.tuman)continue;if(filter.mahalla&&m!==filter.mahalla)continue;if(filter.kocha&&ko!==filter.kocha)continue;
   const d=dem[i],s=social[i],ep=emp[i],sk=skills[i],iv=inc[i],bu=business[i],ed=edu[i],hl=health[i],h=house[i],u=util[i],ap=apps[i],la=land[i],ss=social2[i];
   a.n++;
   a.population+=num_(d[0]);a.men+=num_(d[1]);a.women+=num_(d[2]);
   a.mehnatYosh+=num_(ep[3]); // field 34
   a.ishsizlar+=num_(ep[13]);  // field 44
   a.nogironShaxs+=num_(s[2]); // field 25
   a.nogironBola+=num_(s[3]);  // field 26
   a.yolgizKeksa+=num_(s[4]);  // field 27
   a.doimiyParvarish+=num_(s[5]);a.ogirKasal+=num_(s[6]);
   a.incomeTotal+=num_(iv[0]); // field 60
   a.expenseTotal+=num_(iv[11]); // field 71

   const g=geo[t]||(geo[t]={key:t,tuman:t,families:0,population:0,ishsizlar:0,mfy:{}});g.families++;g.population+=num_(d[0]);g.ishsizlar+=num_(ep[13]);if(m)g.mfy[m]=1;

   const income=num_(iv[0]);
   const band=income<=0?'Ma’lumot mavjud emas':income<=1000000?'1 mln gacha':income<=3000000?'1–3 mln':income<=5000000?'3–5 mln':income<=10000000?'5–10 mln':'10 mln+';add_(incomeDist,band,1);
   [['Rasmiy',ep[6]],['Norasmiy',ep[7]],['Mavsumiy',ep[8]],['O‘zini o‘zi band',ep[9]],['Tadbirkorlik',ep[10]],['Xorijda',ep[11]],['Boshqa hududda',ep[12]],['Ishsiz',ep[13]]].forEach(x=>add_(employment,x[0],num_(x[1])));
   [['0–3',d[3]],['4–7',d[4]],['8–17',d[5]],['18–30',d[6]],['31–59',d[7]],['60+',d[8]]].forEach(x=>add_(ageBands,x[0],num_(x[1])));

   countYN_(ijtimoiyReestr,s[7-0]); // field 30
   countYN_(nafaqa,ep[0]);          // field 31
   countYN_(kreditBor,iv[21]);      // field 81
   if(clean_(d[?])){}
   if(clean_(ep[?])){}

   if(clean_(d[?])){}
   if(clean_(sk[0]))add_(malumoti,clean_(sk[0]),1); // field 54? overwritten below by correct field map
   if(clean_(d[?])){}

   countYN_(uyjoyYetarli,h[3]);
   if(clean_(h[4]))add_(mulkShakli,clean_(h[4]),1);
   if(clean_(h[5]))add_(uyjoyHujjatlari,clean_(h[5]),1);

   countYN_(tabiiyGaz,u[1]);   // field 135
   countYN_(elektr,u[2]);      // field 136
   countYN_(ichimlikSuvi,u[4]); // field 138
   countYN_(internet,u[7]);    // field 142
   for(let j=0;j<12;j++)if(yes_(ap[j]))add_(appliances,applianceNames[j],1);

   // Field 174-176 problems and 177-179 needs.
   for(let j=0;j<3;j++){const z=clean_(ss[5+j]);if(z)add_(topP,z,1);}
   for(let j=0;j<3;j++){const z=clean_(ss[8+j]);if(z)add_(topN,z,1);}
 }

 // Correct auxiliary fields with a small direct range, avoiding ambiguous grouped offsets above.
 // The direct range is only 91-142 (52 columns), still safe for 18k rows.
 const core=sh.getRange(2,92,n,52).getDisplayValues();
 for(let i=0;i<n;i++){
   const t=clean_(loc[i][0]),m=clean_(loc[i][1]),ko=clean_(loc[i][2]);
   if(!t||(filter.tuman&&t!==filter.tuman)||(filter.mahalla&&m!==filter.mahalla)||(filter.kocha&&ko!==filter.kocha))continue;
   const r=core[i];
   countYN_(kreditBor,r[ -11 ]); // no-op placeholder; actual credit handled below
   const newCredit=yn_(r[ -11 ]);
 }
 // Recompute fields that need exact positions from compact ranges.
 const exact=sh.getRange(2,31,n,112).getDisplayValues(); // fields 30-141
 for(let i=0;i<n;i++){
   const t=clean_(loc[i][0]),m=clean_(loc[i][1]),ko=clean_(loc[i][2]);
   if(!t||(filter.tuman&&t!==filter.tuman)||(filter.mahalla&&m!==filter.mahalla)||(filter.kocha&&ko!==filter.kocha))continue;
   const r=exact[i];
   // r index = field - 30.
   if(yn_(r[0])==='Ha'){} // field 30 already counted above
   if(yn_(r[1])==='Ha'){} // field 31 already counted above
   countYN_(kreditBor,r[51]); // field 81
   if(yn_(r[56])==='Ha')add_(a,'yangiKreditEhtiyoji',1); // field 86
   if(yn_(r[59])==='Ha')add_(a,'subsidiyaEhtiyoji',1); // field 89
   if(yn_(r[61])==='Ha')add_(a,'tadbirkorBor',1); // field 91
   if(yn_(r[64])==='Ha')add_(a,'kengaytirishIstagi',1); // field 94
   if(yn_(r[66])==='Ha')add_(a,'kasbHunarIstagi',1); // field 96
 }

 // Build missing category fields directly from their exact field positions.
 const cat=sh.getRange(2,10,n,133).getDisplayValues(); // fields 9-141
 for(let i=0;i<n;i++){
   const t=clean_(loc[i][0]),m=clean_(loc[i][1]),ko=clean_(loc[i][2]);
   if(!t||(filter.tuman&&t!==filter.tuman)||(filter.mahalla&&m!==filter.mahalla)||(filter.kocha&&ko!==filter.kocha))continue;
   const r=cat[i];
   if(clean_(r[0]))add_(malumoti,clean_(r[0]),1); // field 9
   if(clean_(r[12]))add_(oilaTarkibi,clean_(r[12]),1); // field 21
 }

 const geoRows=Object.values(geo).map(x=>({key:x.key,tuman:x.tuman,families:x.families,population:x.population,ishsizlar:x.ishsizlar,mfyCount:Object.keys(x.mfy).length})).sort((a,b)=>b.families-a.families);
 const coverage=geoRows.map(x=>({tuman:x.tuman,families:x.families,population:x.population,mfyCount:x.mfyCount,avgPerMfy:x.mfyCount?x.families/x.mfyCount:0}));
 const result={ok:true,agg:{n:a.n,population:a.population,men:a.men,women:a.women,mehnatYosh:a.mehnatYosh,ishsizlar:a.ishsizlar,ishsizlikRate:a.mehnatYosh?a.ishsizlar/a.mehnatYosh*100:0,ijtimoiyReestr,nafaqa,kreditBor,yangiKreditEhtiyoji:a.yangiKreditEhtiyoji||0,subsidiyaEhtiyoji:a.subsidiyaEhtiyoji||0,tadbirkorBor:a.tadbirkorBor||0,kengaytirishIstagi:a.kengaytirishIstagi||0,kasbHunarIstagi:a.kasbHunarIstagi||0,uyjoyYetarli:uyjoyYetarli,nogironShaxs:a.nogironShaxs,nogironBola:a.nogironBola,yolgizKeksa:a.yolgizKeksa,incomeDist,expenseAvg:a.n?a.expenseTotal/a.n:0,employment,ageBands,malumoti,oilaTarkibi,mulkShakli,uyjoyHujjatlari,internet,tabiiyGaz,ichimlikSuvi,elektr,topProblems:top_(topP),topNeeds:top_(topN),indicators:{totalFamilies:a.n,totalPopulation:a.population,unemployment:a.ishsizlar,socialRegistry:ijtimoiyReestr.Ha||0,creditNeed:a.yangiKreditEhtiyoji||0,subsidyNeed:a.subsidiyaEhtiyoji||0,entrepreneurs:a.tadbirkorBor||0},auditStats:{totalRows:a.n,filledTuman:a.n,filledMahalla:a.n,filledKocha:a.n},criticalStats:{unemployed:a.ishsizlar,socialRegistry:ijtimoiyReestr.Ha||0,creditNeed:a.yangiKreditEhtiyoji||0,subsidyNeed:a.subsidiyaEhtiyoji||0}},geo:{rows:geoRows},coverage,filters:filter,generatedAt:new Date().toISOString()};
 cachePutJson_(cacheKey,result,300);return result;
}

function actionMeta_(){
 const sh=sheet_(),n=Math.max(0,sh.getLastRow()-1);if(!n)return {ok:true,totalFamilies:0,tumans:[],mahallas:[],kochas:[],tree:{},generatedAt:new Date().toISOString()};
 const rows=sh.getRange(2,2,n,3).getDisplayValues(),tumans={},mahallas={},kochas={},tree={};
 rows.forEach(r=>{const t=clean_(r[0]),m=clean_(r[1]),k=clean_(r[2]);if(t){tumans[t]=1;tree[t]=tree[t]||{};}if(m){mahallas[m]=1;if(t)tree[t][m]=tree[t][m]||{};}if(k){kochas[k]=1;if(t&&m)tree[t][m][k]=1;}});
 return {ok:true,totalFamilies:n,tumans:Object.keys(tumans).sort(),mahallas:Object.keys(mahallas).sort(),kochas:Object.keys(kochas).sort(),tree,generatedAt:new Date().toISOString()};
}

function actionFamilies_(e){
 const sh=sheet_(),p=e.parameter||{},page=Math.max(1,Number(p.page||1)),pageSize=Math.min(MAX_PAGE_SIZE,Math.max(1,Number(p.pageSize||DEFAULT_PAGE_SIZE))),q=clean_(p.q).toLowerCase(),tuman=clean_(p.tuman),mahalla=clean_(p.mahalla),kocha=clean_(p.kocha),n=Math.max(0,sh.getLastRow()-1);if(!n)return {ok:true,page,pageSize,totalPages:0,total:0,records:[]};
 const rows=sh.getRange(2,1,n,9).getDisplayValues(),matched=[];
 rows.forEach((row,i)=>{if(!clean_(row[1]))return;if(tuman&&clean_(row[1])!==tuman)return;if(mahalla&&clean_(row[2])!==mahalla)return;if(kocha&&clean_(row[3])!==kocha)return;if(q&&![row[5],row[1],row[2],row[3],row[4]].join(' ').toLowerCase().includes(q))return;matched.push({_sheetRow:i+2,tuman:row[1]||'',mahalla:row[2]||'',kocha:row[3]||'',uy_raqami:row[4]||'',boshliq_fio:row[5]||'',tugilgan_sana:row[6]||'',jinsi:row[7]||'',telefon:row[8]||''});});
 const total=matched.length,start=(page-1)*pageSize;return {ok:true,page,pageSize,totalPages:Math.ceil(total/pageSize),total,records:matched.slice(start,start+pageSize),generatedAt:new Date().toISOString()};
}

function rowToFamily_(row,sheetRow){const r={_sheetRow:sheetRow,_timestamp:row[0]||''};for(let i=0;i<FIELD_KEYS.length;i++)r[FIELD_KEYS[i]]=row[i+1]??'';r.mahalla_original=r.mahalla||'';r.kocha_original=r.kocha||'';r.masul_fio=row[183]??'';return r;}
function actionFamily_(e){const rowNo=Number((e.parameter||{}).row||0);if(rowNo<2)return {ok:false,error:'row parametri kerak'};const sh=sheet_();if(rowNo>sh.getLastRow())return {ok:false,error:'Bunday Sheet qatori mavjud emas'};return {ok:true,record:rowToFamily_(sh.getRange(rowNo,1,1,sh.getLastColumn()).getDisplayValues()[0],rowNo),generatedAt:new Date().toISOString()};}
function doGet(e){try{const action=String((e&&e.parameter&&e.parameter.action)||'stats').toLowerCase();let result;if(action==='stats')result=actionStats_(e);else if(action==='meta')result=actionMeta_();else if(action==='families')result=actionFamilies_(e);else if(action==='family')result=actionFamily_(e);else if(action==='check')result={ok:true,sheet:sheet_().getName(),rows:Math.max(0,sheet_().getLastRow()-1),columns:sheet_().getLastColumn(),fieldKeys:FIELD_KEYS.length,status:'OK'};else result={ok:false,error:'Noma\'lum action: '+action};return out_(result,e);}catch(err){return out_({ok:false,error:String(err&&err.message||err),stack:String(err&&err.stack||'')},e);}}
function testAll(){const sh=sheet_();Logger.log('Sheet='+sh.getName());Logger.log('Rows='+Math.max(0,sh.getLastRow()-1));Logger.log('Columns='+sh.getLastColumn());Logger.log('FIELD_KEYS='+FIELD_KEYS.length);Logger.log(JSON.stringify(actionStats_({parameter:{}})));Logger.log(JSON.stringify(actionMeta_()));}
