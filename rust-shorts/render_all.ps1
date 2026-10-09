# Rock Bottom: render all five episodes on a Windows PC with a GPU.
#
#   Double-click render_all.bat, or in PowerShell from this folder:
#     powershell -ExecutionPolicy Bypass -File render_all.ps1                 # all episodes
#     powershell -ExecutionPolicy Bypass -File render_all.ps1 -Episodes 2,4   # only some
#     ... -Workers 8      # more parallel Chrome pages (default 6)
#     ... -Fresh          # throw away frames from an earlier run instead of resuming
#
# Needs Node.js 20+, ffmpeg and Google Chrome (the script checks and tells you what's missing).
# Output: final\rock_bottom_epN_<name>.mp4 (1080x1920, 24 fps, -14 LUFS stereo), plus a smaller _720p copy.
param(
  [string]$Episodes = '1,2,3,4,5',   # a string: via the .bat, '1,3,4,5' would otherwise arrive as the number 1345
  [int]$Workers = 6,
  [switch]$Fresh
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$epList = $Episodes -split '[,\s]+' | Where-Object { $_ } | ForEach-Object { [int]$_ }
$names = @{ 1 = 'friendly'; 2 = '1234'; 3 = 'eoka'; 4 = 'hit_the_x'; 5 = 'naked_privilege' }

# ── tools ──
$missing = @()
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $missing += 'Node.js   ->  winget install OpenJS.NodeJS.LTS' }
elseif ([int]((node -v) -replace '^v(\d+).*', '$1') -lt 20) {
  $missing += "Node.js 20+ (you have $(node -v), npm $(npm -v))  ->  winget upgrade OpenJS.NodeJS.LTS   (or: winget install OpenJS.NodeJS.LTS)" }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { $missing += 'ffmpeg    ->  winget install Gyan.FFmpeg' }
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { $missing += 'Chrome    ->  winget install Google.Chrome' }
if ($missing) {
  Write-Host "Install these first, then open a NEW terminal and run again:" -ForegroundColor Yellow
  $missing | ForEach-Object { Write-Host "  $_" }
  exit 1
}
$env:CHROME_PATH = $chrome

# ── packages (once) ──
# Use the npm that ships with this Node: an old global npm earlier on PATH (npm 6) can't read the lockfile.
$npmCli = Join-Path (Split-Path (Get-Command node).Source) 'node_modules\npm\bin\npm-cli.js'
if (-not (Test-Path $npmCli)) { $npmCli = $null }
if (-not (Test-Path node_modules\p5.brush)) {
  Write-Host 'Installing packages...'
  if ($npmCli) { node $npmCli ci } else { npm ci }
  if ($LASTEXITCODE) { exit 1 }
}

New-Item -ItemType Directory -Force final | Out-Null
$start = Get-Date
foreach ($n in $epList) {
  $name = $names[$n]; $mp4 = "final\rock_bottom_ep${n}_$name.mp4"
  Write-Host "`n=== EP$n $name ===" -ForegroundColor Cyan
  if ($Fresh -and (Test-Path "out\ep$n\frames")) { Remove-Item -Recurse -Force "out\ep$n\frames" }

  # soundtrack (synthesised, deterministic; not stored in git)
  node tools/music.mjs --ep=$n
  if ($LASTEXITCODE) { Write-Host "EP$n soundtrack failed" -ForegroundColor Red; continue }

  # frames: resumable, so a crash or Ctrl+C just continues where it stopped
  $ok = $false
  foreach ($try in 1..3) {
    node render.mjs --ep=$n --frames --workers=$Workers
    if ($LASTEXITCODE -eq 0) { $ok = $true; break }
    Write-Host "EP$n frames: try $try failed, retrying..." -ForegroundColor Yellow
  }
  if (-not $ok) { Write-Host "EP$n frames FAILED (try again with -Workers 3)" -ForegroundColor Red; continue }

  node render.mjs --ep=$n --encode --out=$mp4
  if ($LASTEXITCODE) { Write-Host "EP$n encode FAILED" -ForegroundColor Red; continue }
  ffmpeg -y -loglevel error -i $mp4 -vf scale=720:1280:flags=lanczos -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -c:a copy -movflags +faststart "final\rock_bottom_ep${n}_${name}_720p.mp4"
  Write-Host "EP$n done -> $mp4" -ForegroundColor Green
}
Write-Host ("`nAll done in {0:N0} min. Videos are in the 'final' folder; titles and descriptions are in UPLOAD.md." -f ((Get-Date) - $start).TotalMinutes) -ForegroundColor Green
