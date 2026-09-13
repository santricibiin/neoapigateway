# =============================================================================
# Hermes Agent — auto setup untuk member (Windows / PowerShell)
#
#   $env:BASE_URL="https://domainmu/v1"; $env:API_KEY="sk-xxxx"; iex (irm https://domainmu/docs/windows.ps1)
#
# Env var:
#   BASE_URL  (wajib)  — base URL endpoint, contoh https://buatprem.biz.id/v1
#   API_KEY   (wajib)  — API key member (sk-xxxx)
#   MODEL     (opsional) — model default, default: glm-5.3
#   PROVIDER_NAME (opsional) — nama provider di config, default: buatprem
#
# Script ini idempotent: aman dijalankan berulang.
#  - Hermes belum terinstall  → install otomatis (installer resmi Nous Research)
#  - Hermes sudah terinstall  → hanya set base URL, API key, dan header
#  - Config lama di-backup ke config.yaml.bak.<timestamp>, bagian lain tidak disentuh
# =============================================================================

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

function Write-Info { param($m) Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Write-Ok   { param($m) Write-Host "[OK] $m"   -ForegroundColor Green }
function Write-Warn2{ param($m) Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Fail { param($m) Write-Host "[ERROR] $m" -ForegroundColor Red; exit 1 }

# ---------- argumen ----------
$BaseUrl      = if ($env:BASE_URL) { $env:BASE_URL.TrimEnd('/') } else { $env:BASE_URL }
$ApiKey       = $env:API_KEY
$Model        = if ($env:MODEL) { $env:MODEL } else { "glm-5.3" }
$ProviderName = if ($env:PROVIDER_NAME) { $env:PROVIDER_NAME } else { "buatprem" }
$KeyEnv       = "HERMES_BUATPREM_API_KEY"
$UaValue      = "hermes-agent-setup/1.0"

if (-not $BaseUrl) { Write-Fail "BASE_URL wajib diisi. Contoh: `$env:BASE_URL='https://domainmu/v1'; `$env:API_KEY='sk-xxx'; iex (irm https://domainmu/docs/windows.ps1)" }
if (-not $ApiKey)  { Write-Fail "API_KEY wajib diisi." }
if ($ApiKey -notlike "sk-*") { Write-Warn2 "API_KEY biasanya berawalan 'sk-' — pastikan sudah benar." }

if ($PSVersionTable.PSVersion.Major -lt 5) { Write-Fail "Butuh PowerShell 5.1 atau lebih baru." }

# ---------- 1. install hermes bila belum ada ----------
function Test-Hermes {
    return [bool](Get-Command hermes -ErrorAction SilentlyContinue)
}

if (Test-Hermes) {
    Write-Ok "Hermes sudah terinstall: $((Get-Command hermes).Source)"
} else {
    Write-Info "Hermes belum terinstall. Menginstall via installer resmi..."
    try {
        iex (irm https://hermes-agent.nousresearch.com/install.ps1)
    } catch {
        Write-Fail "Install gagal: $($_.Exception.Message)"
    }

    # refresh PATH sesi ini (installer menambah ke PATH user/machine)
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [Environment]::GetEnvironmentVariable("Path", "User")

    if (-not (Test-Hermes)) {
        Write-Fail "Install selesai tapi 'hermes' tidak ditemukan di PATH. Tutup lalu buka PowerShell baru, jalankan ulang script ini."
    }
    Write-Ok "Hermes terinstall: $((Get-Command hermes).Source)"
}

# ---------- 2. lokasi config ----------
# Hermes: HERMES_HOME env → %LOCALAPPDATA%\hermes (Windows) — lihat hermes_constants.py
if ($env:HERMES_HOME) {
    $ConfigDir = $env:HERMES_HOME
} elseif ($env:HERMES_CONFIG_DIR) {
    $ConfigDir = $env:HERMES_CONFIG_DIR
} elseif ($env:LOCALAPPDATA) {
    $ConfigDir = Join-Path $env:LOCALAPPDATA "hermes"
} else {
    $ConfigDir = Join-Path $HOME "AppData\Local\hermes"
}
$ConfigFile = Join-Path $ConfigDir "config.yaml"
$EnvFile    = Join-Path $ConfigDir ".env"
New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null

if (-not (Test-Path $ConfigFile)) {
    Write-Info "Config belum ada — membuat config baru."
    $newCfg = "model:`n  default: $Model`n  provider: custom`n  base_url: $BaseUrl`n  api_key: `${$KeyEnv}`n"
    [IO.File]::WriteAllText($ConfigFile, $newCfg)
}

# ---------- 3. tulis API key ke .env ----------
$lines = @()
if (Test-Path $EnvFile) {
    $lines = @(Get-Content $EnvFile | Where-Object { $_ -notmatch "^$KeyEnv=" })
}
$lines += "$KeyEnv=$ApiKey"
[IO.File]::WriteAllText($EnvFile, ($lines -join "`n") + "`n")
Write-Ok "API key tersimpan di $EnvFile"

# ---------- 4. patch config.yaml (tekstual, bagian lain tetap utuh) ----------
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item $ConfigFile "$ConfigFile.bak.$timestamp" -Force

$content = Get-Content $ConfigFile -Raw
# hapus blok model: dan custom_providers: (level-1) lalu tulis ulang di akhir file
$content = $content -replace '(?ms)^model:\r?\n.*?(?=^\S|\z)', ''
$content = $content -replace '(?ms)^custom_providers:\r?\n.*?(?=^\S|\z)', ''
$content = $content.TrimEnd("`r","`n") + "`n"

$newBlock = @"
model:
  default: $Model
  provider: custom
  base_url: $BaseUrl
  api_key: `${$KeyEnv}
custom_providers:
  - name: $ProviderName
    base_url: $BaseUrl
    key_env: $KeyEnv
    model: $Model
    extra_headers:
      User-Agent: "$UaValue"
"@

[IO.File]::WriteAllText($ConfigFile, ($content + $newBlock + "`n"))
if (-not (Get-Item $ConfigFile).Length) { Write-Fail "Patch config gagal — file kosong. Backup lama tetap ada." }
Write-Ok "Config di-update: $ConfigFile (backup tersimpan)"

# ---------- 5. verifikasi ----------
Write-Info "Verifikasi koneksi (panggil model sekali)..."
try {
    $out = & hermes -z "Reply with exactly: OK" 2>&1
    $exit = $LASTEXITCODE
} catch {
    $out = $_.Exception.Message
    $exit = 1
}
if ($exit -ne 0) {
    $out | Select-Object -Last 20 | Write-Host
    Write-Fail "Verifikasi gagal. Cek API key / BASE_URL, atau jalankan: hermes doctor"
}
$out | Select-Object -Last 3 | Write-Host
Write-Ok "Setup selesai! Hermes siap dipakai dengan model $Model di $BaseUrl"
Write-Host ""
Write-Info "Mulai dengan: hermes"
