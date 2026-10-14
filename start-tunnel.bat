@echo off
echo ====================================================
echo Starting Cloudflare Tunnel for Midtrans Webhook...
echo ====================================================
cd /d "%~dp0"
if exist ".\cloudflared.exe" (
    .\cloudflared.exe tunnel --url http://localhost:3001
) else (
    cd backend && npm run tunnel
)
pause
