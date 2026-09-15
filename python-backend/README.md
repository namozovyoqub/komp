# Surxondaryo MFY Python Backend

Python FastAPI backend for the Surxondaryo live dashboard. The existing dashboard design remains in the Vercel application; this backend is prepared as a separate service for faster cached access to Google Sheets data.

Architecture: Google Form -> Google Sheets -> Python FastAPI -> SQLite cache -> dashboard.

Production requires a Google service-account JSON with read access to the spreadsheet. Data is synchronized in chunks instead of one oversized Sheets API response.
