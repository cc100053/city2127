# One-click exhibition start on Windows: survey server + 3D city + Chrome on the high-performance GPU.
# Double-click start-windows.cmd at the repo root, or run: powershell -ExecutionPolicy Bypass -File scripts\start-windows.ps1 [-Low] [-Kiosk] [-NoBrowser]
# Windows PowerShell 5.1 compatible. Stop the exhibition by closing the two server windows and the city Chrome window.
param(
  [switch]$Low,       # add &quality=low to the city URL (weaker GPUs)
  [switch]$Kiosk,     # open the city full screen without browser UI (Alt+F4 closes it)
  [switch]$NoBrowser  # start the servers only
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$survey = Join-Path $root 'survey'
$cityPort = 5173
$surveyPort = 8787

function Fail([string]$message) { Write-Host "ERROR: $message" -ForegroundColor Red; exit 1 }

# 1. Node.js 24+. A system Node 22 in Program Files can shadow nvm's Node 24 on PATH, so try nvm too.
function Get-NodeMajor([string]$exe) { try { [int]((& $exe -v) -replace '^v(\d+).*', '$1') } catch { 0 } }
$candidates = @()
$onPath = Get-Command node.exe -ErrorAction SilentlyContinue
if ($onPath) { $candidates += $onPath.Source }
if ($env:NVM_SYMLINK) { $candidates += (Join-Path $env:NVM_SYMLINK 'node.exe') }
$nvm = Get-Command nvm.exe -ErrorAction SilentlyContinue
if ($nvm) { $candidates += (Join-Path (Split-Path $nvm.Source) '.nodejs\node.exe') }
$node = $candidates | Where-Object { (Test-Path $_) -and (Get-NodeMajor $_) -ge 24 } | Select-Object -First 1
if (-not $node) { Fail 'Node.js 24 or newer was not found (checked PATH and nvm). Install it, e.g. "nvm install 24" then "nvm use 24".' }
$nodeDir = Split-Path $node
$env:Path = "$nodeDir;$env:Path"
Write-Host "Node $(& $node -v) from $nodeDir"

# 2. Dependencies: install when missing or when package-lock.json is newer than the installed tree.
function Install-Deps([string]$dir) {
  $marker = Join-Path $dir 'node_modules\.package-lock.json'
  $lock = Join-Path $dir 'package-lock.json'
  if ((Test-Path $marker) -and ((Get-Item $lock).LastWriteTime -le (Get-Item $marker).LastWriteTime)) { return }
  Write-Host "Installing dependencies in $dir ..."
  Push-Location $dir
  try { & npm ci; if ($LASTEXITCODE -ne 0) { Fail "npm ci failed in $dir" } } finally { Pop-Location }
}
Install-Deps $root
Install-Deps $survey
if (-not (Get-ChildItem (Join-Path $survey 'public') -Recurse -Filter '*.task' -ErrorAction SilentlyContinue)) {
  Write-Host 'Note: hand-tracking model not found; touch still works. Run "npm run fetch:hand-model" in survey\ once to enable &hand.' -ForegroundColor Yellow
}

# 3. Servers, each in its own window so staff can read its log and stop it with Ctrl+C.
function Test-Url([string]$url) {
  try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2 | Out-Null; $true } catch { $false }
}
function Start-ServerWindow([string]$title, [string]$dir, [string]$command) {
  $script = "`$Host.UI.RawUI.WindowTitle = '$title'; `$env:Path = '$nodeDir;' + `$env:Path; Set-Location '$dir'; $command"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
  Start-Process powershell.exe -ArgumentList '-NoExit', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encoded | Out-Null
}

$cert = Join-Path $survey 'data\tls\ipad.pem'
$key = Join-Path $survey 'data\tls\ipad-key.pem'
$lan = (Test-Path $cert) -and (Test-Path $key)
$surveyEnv = "`$env:SURVEY_QUESTIONS = 'src/survey/questions.rotation.v1.json'; "
if ($lan) { $surveyEnv += "`$env:SURVEY_HOST = '0.0.0.0'; `$env:SURVEY_TLS_CERT = 'data/tls/ipad.pem'; `$env:SURVEY_TLS_KEY = 'data/tls/ipad-key.pem'; " }

if (Test-Url "http://127.0.0.1:$surveyPort/monitor") { Write-Host "Survey server already answers on port $surveyPort; reusing it." }
else { Start-ServerWindow 'city2127 survey server' $survey "npm run build; if (`$LASTEXITCODE -eq 0) { $surveyEnv npm run server }" }
if (Test-Url "http://127.0.0.1:$cityPort/") { Write-Host "City already answers on port $cityPort; reusing it." }
else { Start-ServerWindow 'city2127 city (Vite)' $root "npm run dev -- --port $cityPort --strictPort" }

Write-Host 'Waiting for both servers ...'
$deadline = (Get-Date).AddSeconds(180)
while (-not ((Test-Url "http://127.0.0.1:$surveyPort/monitor") -and (Test-Url "http://127.0.0.1:$cityPort/"))) {
  if ((Get-Date) -gt $deadline) { Fail 'A server did not start within 180 s; read its window for the error.' }
  Start-Sleep -Seconds 2
}

# 4. Chrome. Windows ignores WebGL's high-performance request on hybrid laptops (Intel + NVIDIA),
# so force it with --force_high_performance_gpu. A dedicated profile keeps this a separate Chrome
# process: the flag would be ignored if it joined an already running Chrome.
$cityUrl = "http://127.0.0.1:$cityPort/?survey"
if ($Low) { $cityUrl += '&quality=low' }
if (-not $NoBrowser) {
  $chrome = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue).'(default)'
  if (-not $chrome) { $chrome = (Get-ItemProperty 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue).'(default)' }
  if (-not $chrome -or -not (Test-Path $chrome)) { Fail "Google Chrome was not found. Open $cityUrl in a WebGL 2 browser yourself." }
  $userData = Join-Path $env:LOCALAPPDATA 'city2127\chrome-exhibition'
  $chromeArgs = @("--user-data-dir=`"$userData`"", '--force_high_performance_gpu', '--no-first-run', '--no-default-browser-check')
  if ($Kiosk) { $chromeArgs += '--kiosk' } else { $chromeArgs += '--start-maximized' }
  Start-Process $chrome -ArgumentList ($chromeArgs + $cityUrl) | Out-Null
}

Write-Host ''
Write-Host "City:   $cityUrl" -ForegroundColor Cyan
Write-Host "Admin:  http://127.0.0.1:$surveyPort/admin  (this computer only)"
if ($lan) { Write-Host 'iPads:  https://<this PC LAN IP>:8443/guest?station=A&hand  (and station=B); the survey window lists the LAN addresses.' }
else { Write-Host "Guest:  http://127.0.0.1:$surveyPort/guest  (local only: no TLS certificate in survey\data\tls, so iPads cannot connect)" -ForegroundColor Yellow }
