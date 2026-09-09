# Vaikkal quick-start (Windows PowerShell)
# Creates backend venv, installs deps, seeds demo data, and starts both dev servers.
$ErrorActionPreference = "Stop"

Write-Host "=== Vaikkal quick-start ===" -ForegroundColor Green

# 1. Check for Docker (preferred path)
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Docker detected. Run 'docker compose up --build' for the fastest start."
}

# 2. Backend
$backend = "C:\Users\RANJITH T\Desktop\try2\backend"
if (-not (Test-Path "$backend\.venv")) {
    Write-Host "Creating backend virtualenv..." -ForegroundColor Cyan
    python -m venv "$backend\.venv"
}
& "$backend\.venv\Scripts\pip" install -r "$backend\requirements.txt"

if (-not (Test-Path "$backend\.env")) {
    Copy-Item "$backend\.env.example" "$backend\.env"
    Write-Host "Created backend\.env from template. Edit DATABASE_URL if needed." -ForegroundColor Yellow
}

# Remind about Postgres + Redis
Write-Host ""
Write-Host "Requires PostgreSQL on localhost:5432 (db=vaikkal, user=vaikkal, pass=vaikkal)" -ForegroundColor Yellow
Write-Host "Requires Redis on localhost:6379. Start them (or use Docker), then:" -ForegroundColor Yellow
Write-Host "  1. cd backend; python seed.py; uvicorn app.main:app --reload" -ForegroundColor Green
Write-Host "  2. cd frontend; npm install; npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "Done. Docs at http://localhost:8000/docs, app at http://localhost:3000" -ForegroundColor Green