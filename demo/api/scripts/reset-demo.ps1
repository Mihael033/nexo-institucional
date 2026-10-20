<#
.SYNOPSIS
    Resets the demo: stops the API on port 5080, deletes api/demo.db and starts the API again with a clean seed.

.DESCRIPTION
    The running API keeps demo.db open (Windows blocks deleting it), so the script:
      1. stops the process listening on the port, only if it is the Nexo API;
      2. deletes demo.db, demo.db-shm and demo.db-wal;
      3. starts "dotnet run --project src/Nexo.Api" in the background (log: api/demo-api.log)
         and waits for /health. The seed runs on startup (30 products, 3 news, 5 messages...).

.PARAMETER NoStart
    Only stop and delete; do not start the API again.

.PARAMETER DryRun
    Show what would be done without stopping or deleting anything.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File api\scripts\reset-demo.ps1
#>
param(
    [switch]$NoStart,
    [switch]$DryRun,
    [int]$Port = 5080
)

$ErrorActionPreference = 'Stop'
$apiDir = Split-Path -Parent $PSScriptRoot
$dbFiles = 'demo.db', 'demo.db-shm', 'demo.db-wal' | ForEach-Object { Join-Path $apiDir $_ }
$log = Join-Path $apiDir 'demo-api.log'
$prefix = if ($DryRun) { '[dry-run] ' } else { '' }

function Get-ApiProcess {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $listener) { return $null }

    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
    $isNexo = $process.Name -eq 'Nexo.Api.exe' -or ($process.Name -eq 'dotnet.exe' -and $process.CommandLine -match 'Nexo\.Api')
    if (-not $isNexo) {
        throw "Port $Port is used by '$($process.Name)' (PID $($process.ProcessId)), which is not the Nexo API. Nothing was changed."
    }

    return $process
}

# 1. Stop the API (it locks demo.db).
$api = Get-ApiProcess
if ($api) {
    Write-Host "${prefix}Stopping Nexo API (PID $($api.ProcessId)) on port $Port"
    if (-not $DryRun) {
        Stop-Process -Id $api.ProcessId -Force
        $deadline = (Get-Date).AddSeconds(15)
        while ((Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 300
        }
    }
}
else {
    Write-Host "No API listening on port $Port"
}

# 2. Delete the SQLite database (it is recreated and seeded on the next start).
foreach ($file in $dbFiles) {
    if (Test-Path $file) {
        Write-Host "${prefix}Deleting $file"
        if (-not $DryRun) { Remove-Item $file -Force }
    }
}

if ($NoStart -or $DryRun) {
    if ($DryRun) { Write-Host '[dry-run] Would start the API and wait for /health' }
    return
}

# 3. Start the API again in the background and wait until it is healthy.
Write-Host "Starting API (log: $log)"
Start-Process -FilePath 'dotnet' `
    -ArgumentList 'run', '--project', (Join-Path $apiDir 'src\Nexo.Api'), '--launch-profile', 'http' `
    -WorkingDirectory $apiDir -WindowStyle Hidden `
    -RedirectStandardOutput $log -RedirectStandardError "$log.err" | Out-Null

$deadline = (Get-Date).AddSeconds(120)
do {
    Start-Sleep -Seconds 1
    try { $status = (Invoke-WebRequest "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 2).StatusCode } catch { $status = 0 }
} while ($status -ne 200 -and (Get-Date) -lt $deadline)

if ($status -ne 200) {
    throw "API did not become healthy within 120 s. See $log and $log.err."
}

$products = (Invoke-RestMethod "http://localhost:$Port/api/v1/products?pageSize=1").totalItems
Write-Host "Demo reset: API healthy on http://localhost:$Port with $products products (clean seed)."
