@echo off
echo ==========================================
echo Starting OmniDoc AI (Backend + Frontend)
echo ==========================================

start "OmniDoc Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 2 /nobreak >nul
start "OmniDoc Frontend (Vite React)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are launching!
echo Frontend will be at: http://localhost:5173/
echo Backend docs will be at: http://127.0.0.1:8000/docs
echo.
