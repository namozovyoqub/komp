from datetime import datetime,date
from .config import FIELD_KEYS,EXTRA_FIELD

def clean(v):
    if v is None: return ""
    if isinstance(v,float) and v!=v: return ""
    if isinstance(v,(datetime,date)): return v.isoformat(sep=" ") if isinstance(v,datetime) else v.isoformat()
    return str(v).strip()

def row_to_record(row,row_number):
    out={"row":row_number,"timestamp":clean(row[0]) if row else ""}
    for i,key in enumerate(FIELD_KEYS,start=1): out[key]=clean(row[i]) if i<len(row) else ""
    out[EXTRA_FIELD]=clean(row[183]) if len(row)>183 else ""
    return out
