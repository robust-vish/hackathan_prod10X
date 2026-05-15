@echo off
echo =========================================
echo   RCA + A/B + Ticket Agent — IndiaMART
echo =========================================
echo.

echo [1/2] Starting Backend (FastAPI on :8000)...
start "Backend" cmd /k "cd /d %~dp0backend && pip install -r requirements.txt -q && python run.py"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend (React on :5173)...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

echo.
echo Both servers starting...
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo.
pause
