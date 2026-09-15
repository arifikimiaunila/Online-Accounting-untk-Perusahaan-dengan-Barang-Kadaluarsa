# =============================================================================
#  Skrip sekali jalan: Akuntansi Toko
#  Setup (venv, deps, .env, database, migrasi, seed) lalu jalankan
#  backend (Django) + frontend (Vite).
#
#  Cara pakai (dari PowerShell di folder proyek ini):
#      .\start.ps1
#
#  Butuh: Python 3.10+, Node.js, dan MySQL yang sedang berjalan.
# =============================================================================

$ErrorActionPreference = "Stop"

$Root     = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

# 1) Environment Python -----------------------------------------------------------------
Write-Step "1/7  Menyiapkan environment Python (backend)"
Set-Location $Backend
if (-not (Test-Path "venv")) {
    Write-Host "Membuat virtual environment..."
    python -m venv venv
}
$Py = Join-Path $Backend "venv\Scripts\python.exe"
& $Py -m pip install --quiet --upgrade pip
& $Py -m pip install --quiet -r requirements.txt

# 2) File konfigurasi .env --------------------------------------------------------------
Write-Step "2/7  Menyiapkan file konfigurasi .env"
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "File .env dibuat dari .env.example." -ForegroundColor Yellow
    Write-Host "Sesuaikan DB_USER / DB_PASSWORD bila perlu, lalu jalankan ulang skrip." -ForegroundColor Yellow
} else {
    Write-Host ".env sudah ada."
}

function Get-EnvValue([string]$key) {
    $line = Get-Content ".env" -ErrorAction SilentlyContinue |
        Where-Object { $_ -match "^$key=" } | Select-Object -First 1
    if ($line) {
        return (($line -split "=", 2)[1]).Trim().Trim('"').Trim("'")
    }
    return $null
}

$dbName = Get-EnvValue "DB_NAME"
$dbUser = Get-EnvValue "DB_USER"
$dbPass = Get-EnvValue "DB_PASSWORD"
$dbHost = Get-EnvValue "DB_HOST"
$dbPort = Get-EnvValue "DB_PORT"

# 3) Buat database MySQL ---------------------------------------------------------------
Write-Step "3/7  Membuat database MySQL"
$mysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue
if ($mysqlCmd) {
    try {
        Write-Host "Membuat database '$dbName' (jika belum ada)..."
        $sql = "CREATE DATABASE IF NOT EXISTS $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        if ($dbPass) {
            & mysql -h $dbHost -P $dbPort -u $dbUser "-p$dbPass" -e $sql
        } else {
            & mysql -h $dbHost -P $dbPort -u $dbUser -e $sql
        }
        Write-Host "Database siap." -ForegroundColor Green
    } catch {
        Write-Host "[PERINGATAN] Gagal membuat database: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "            Lanjutkan bila database sudah ada, atau perbaiki kredensial di backend/.env" -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] Perintah 'mysql' tidak ditemukan di PATH." -ForegroundColor Yellow
    Write-Host "       Pastikan database '$dbName' sudah dibuat manual:" -ForegroundColor Yellow
    Write-Host "         CREATE DATABASE $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor Yellow
}

# 4) Migrasi ----------------------------------------------------------------------------
Write-Step "4/7  Menjalankan migrasi database"
& $Py manage.py migrate

# 5) Data demo --------------------------------------------------------------------------
Write-Step "5/7  Mengisi data demo"
& $Py manage.py seed_demo

# 6) Dependensi frontend ----------------------------------------------------------------
Write-Step "6/7  Menyiapkan dependensi frontend"
Set-Location $Frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "Menginstall dependensi frontend (npm install)..."
    npm install
} else {
    Write-Host "node_modules sudah ada."
}

# 7) Jalankan server --------------------------------------------------------------------
Write-Step "7/7  Menjalankan server"
Write-Host "Backend  : http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Frontend : http://localhost:5173" -ForegroundColor Green
Write-Host ""

$proc = Start-Process -FilePath $Py -ArgumentList "manage.py runserver" -WorkingDirectory $Backend -PassThru
Write-Host "Backend berjalan (PID $($proc.Id)) di jendela terpisah." -ForegroundColor DarkGray
Write-Host "Tekan Ctrl+C untuk menghentikan frontend; tutup jendela backend saat selesai." -ForegroundColor DarkGray

npm run dev
