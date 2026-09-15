import json
import sqlite3
from pathlib import Path

class Store:
    def __init__(self, path):
        self.path=Path(path); self.path.parent.mkdir(parents=True,exist_ok=True); self.init()
    def connect(self):
        con=sqlite3.connect(self.path); con.execute("PRAGMA journal_mode=WAL"); con.execute("PRAGMA synchronous=NORMAL"); return con
    def init(self):
        with self.connect() as con:
            con.execute("CREATE TABLE IF NOT EXISTS records (row_id INTEGER PRIMARY KEY,timestamp TEXT,data TEXT NOT NULL)")
            con.execute("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY,value TEXT NOT NULL)")
    def replace_all(self,records):
        rows=list(records)
        with self.connect() as con:
            con.execute("DELETE FROM records")
            con.executemany("INSERT INTO records(row_id,timestamp,data) VALUES(?,?,?)",[(i+2,str(r.get("timestamp","")),json.dumps(r,ensure_ascii=False,separators=(",",":"))) for i,r in enumerate(rows)])
            con.execute("INSERT INTO meta(key,value) VALUES('row_count',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(str(len(rows)),))
    def count(self):
        with self.connect() as con: return int(con.execute("SELECT COUNT(*) FROM records").fetchone()[0])
    def all_records(self):
        with self.connect() as con: return [json.loads(x[0]) for x in con.execute("SELECT data FROM records ORDER BY row_id").fetchall()]
    def get(self,row_id):
        with self.connect() as con:
            x=con.execute("SELECT data FROM records WHERE row_id=?",(row_id,)).fetchone()
            return json.loads(x[0]) if x else None
