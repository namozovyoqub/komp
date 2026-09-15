import asyncio,re
from contextlib import asynccontextmanager
from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.gzip import GZipMiddleware
from .config import settings
from .db import Store
from .sheets import GoogleSheetsSource
store=Store(settings.database_path); source=GoogleSheetsSource(); sync_lock=asyncio.Lock()
def to_num(v):
    s=str(v or "").strip().replace(" ","").replace(",",".")
    m=re.search(r"-?\d+(?:\.\d+)?",s); return float(m.group()) if m else 0.0
def norm_yn(v):
    s=str(v or "").strip().lower().replace("’","'").replace("‘","'")
    if s in {"ha","ҳа","yes","bor","бор"}: return "Ha"
    if "qisman" in s or "қисман" in s: return "Qisman"
    if s in {"yo'q","yoq","йўқ","йук","no","нет"} or "yo'q" in s or "йўқ" in s: return "Yo'q"
    return "Noma'lum"
async def sync_from_google():
    if not source.available(): return {"ok":False,"skipped":True,"reason":"Google service account sozlanmagan"}
    async with sync_lock:
        records=await asyncio.to_thread(source.fetch_all); store.replace_all(records); return {"ok":True,"rows":len(records)}
async def sync_loop():
    while True:
        try: await sync_from_google()
        except Exception as e: print("SYNC ERROR",repr(e),flush=True)
        await asyncio.sleep(max(60,settings.google_sync_interval_seconds))
@asynccontextmanager
async def lifespan(app):
    task=asyncio.create_task(sync_loop()); yield; task.cancel()
    try: await task
    except asyncio.CancelledError: pass
app=FastAPI(title=settings.app_name,version="1.0.0",lifespan=lifespan)
app.add_middleware(GZipMiddleware,minimum_size=1024)
app.add_middleware(CORSMiddleware,allow_origins=["*"] if settings.cors_origins=="*" else [x.strip() for x in settings.cors_origins.split(",")],allow_credentials=False,allow_methods=["*"],allow_headers=["*"])
@app.get("/health")
def health(): return {"ok":True,"rows":store.count(),"google_source":source.available()}
@app.post("/admin/sync")
async def admin_sync(): return await sync_from_google()
def filtered(req):
    rs=store.all_records()
    for k in ("tuman","mahalla","kocha"):
        v=req.get(k)
        if v: rs=[r for r in rs if r.get(k)==v]
    return rs
@app.get("/api/families")
def families(tuman:str="",mahalla:str="",kocha:str="",q:str="",page:int=1,pageSize:int=100):
    rs=filtered({"tuman":tuman,"mahalla":mahalla,"kocha":kocha})
    if q:
        q=q.lower().strip(); rs=[r for r in rs if q in " ".join(str(r.get(k,"")) for k in ("boshliq_fio","telefon","tuman","mahalla","kocha")).lower()]
    page=max(1,page); size=min(250,max(1,pageSize)); total=len(rs); start=(page-1)*size
    return {"ok":True,"records":rs[start:start+size],"total":total,"page":page,"pageSize":size,"totalPages":max(1,(total+size-1)//size)}
@app.get("/api/meta")
def meta():
    rs=store.all_records(); tree={}
    for r in rs:
        t,m,k=r.get("tuman",""),r.get("mahalla",""),r.get("kocha","")
        if t:
            tree.setdefault(t,{}).setdefault(m,{})
            if k: tree[t][m][k]=1
    return {"ok":True,"rows":len(rs),"tumans":sorted({r.get("tuman") for r in rs if r.get("tuman")}),"mahallalar":sorted({r.get("mahalla") for r in rs if r.get("mahalla")}),"kochas":sorted({r.get("kocha") for r in rs if r.get("kocha")}),"tree":{t:{m:list(ks.keys()) for m,ks in ms.items()} for t,ms in tree.items()}}
@app.get("/api/family/{row_id}")
def family(row_id:int):
    r=store.get(row_id)
    if not r: raise HTTPException(404,"Oila topilmadi")
    return {"ok":True,"record":r}
@app.get("/api/stats")
def stats(tuman:str="",mahalla:str="",kocha:str=""):
    rs=filtered({"tuman":tuman,"mahalla":mahalla,"kocha":kocha}); n=len(rs)
    def total(k): return sum(to_num(r.get(k)) for r in rs)
    agg={"n":n,"population":total("jami_aholi"),"men":total("erkaklar"),"women":total("ayollar"),"mehnatYosh":total("mehnat_yoshidagilar"),"ishsizlar":total("ishsizlar"),"nogironShaxs":total("nogiron_shaxs"),"nogironBola":total("nogiron_bola"),"yangiKreditEhtiyoji":sum(norm_yn(r.get("yangi_kredit_ehtiyoji"))=="Ha" for r in rs),"subsidiyaEhtiyoji":sum(norm_yn(r.get("subsidiya_ehtiyoji"))=="Ha" for r in rs),"tadbirkorBor":sum(norm_yn(r.get("tadbirkor_bor"))=="Ha" for r in rs),"kengaytirishIstagi":sum(norm_yn(r.get("kengaytirish_istagi"))=="Ha" for r in rs),"kasbHunarIstagi":sum(norm_yn(r.get("kasb_hunar_ogrenish_istagi"))=="Ha" for r in rs)}
    agg["ishsizlikRate"]=agg["ishsizlar"]/agg["mehnatYosh"]*100 if agg["mehnatYosh"] else 0
    for key in ("ijtimoiy_reestr","nafaqa_beriladimi","kredit_bor","tabiiy_gaz","elektr","ichimlik_suvi","internet","uyjoy_yetarlimi","uyjoy_hujjatlari"):
        agg[key]={"Ha":sum(norm_yn(r.get(key))=="Ha" for r in rs),"Yo'q":sum(norm_yn(r.get(key))=="Yo'q" for r in rs),"Noma'lum":sum(norm_yn(r.get(key))=="Noma'lum" for r in rs)}
    agg["ijtimoiyReestr"]=agg.pop("ijtimoiy_reestr"); agg["nafaqa"]=agg.pop("nafaqa_beriladimi"); agg["kreditBor"]=agg.pop("kredit_bor"); agg["tabiiyGaz"]=agg.pop("tabiiy_gaz"); agg["ichimlikSuvi"]=agg.pop("ichimlik_suvi"); agg["internet"]=agg.pop("internet"); agg["uyjoyYetarli"]=agg.pop("uyjoy_yetarlimi")
    return JSONResponse({"ok":True,"agg":agg,"geo":{"rows":[]},"coverage":[],"filters":{"tuman":tuman,"mahalla":mahalla,"kocha":kocha},"generatedAt":__import__('datetime').datetime.utcnow().isoformat()})
