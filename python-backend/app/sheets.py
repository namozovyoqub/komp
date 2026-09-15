import json
from .config import settings
from .transform import row_to_record

class GoogleSheetsSource:
    def __init__(self): self.service=None; self._connect()
    def _connect(self):
        if not settings.google_service_account_json: return
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        info=json.loads(settings.google_service_account_json)
        creds=service_account.Credentials.from_service_account_info(info,scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"])
        self.service=build("sheets","v4",credentials=creds,cache_discovery=False)
    def available(self): return self.service is not None
    def fetch_all(self):
        if not self.service: raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON sozlanmagan")
        meta=self.service.spreadsheets().values().get(spreadsheetId=settings.spreadsheet_id,range=f"'{settings.sheet_name}'!A1:A1").execute()
        total=self.service.spreadsheets().get(spreadsheetId=settings.spreadsheet_id,fields="sheets(properties(title,gridProperties(rowCount)))").execute()
        sheet=next((s for s in total.get("sheets",[]) if s.get("properties",{}).get("title")==settings.sheet_name),None)
        row_count=int((sheet or {}).get("properties",{}).get("gridProperties",{}).get("rowCount",0))
        if row_count<2: return []
        out=[]; chunk=max(100,min(1000,settings.google_chunk_rows))
        for start in range(2,row_count+1,chunk):
            end=min(row_count,start+chunk-1)
            result=self.service.spreadsheets().values().get(spreadsheetId=settings.spreadsheet_id,range=f"'{settings.sheet_name}'!A{start}:HF{end}",majorDimension="ROWS",valueRenderOption="UNFORMATTED_VALUE",dateTimeRenderOption="FORMATTED_STRING").execute()
            values=result.get("values",[])
            out.extend(row_to_record(row,n) for n,row in enumerate(values,start=start) if any(str(x).strip() for x in row if x is not None))
        return out
