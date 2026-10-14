Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Starting Cloudflare Tunnel for Midtrans Webhook... " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath

if (Test-Path ".\cloudflared.exe") {
    .\cloudflared.exe tunnel --url http://localhost:3001
} else {
    Set-Location "$scriptPath\backend"
    npm run tunnel
}
