param(
    [ValidateSet("all", "infra")]
    [string]$Scope = "all",
    [switch]$CheckOnly,
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"

Import-Module (Join-Path $PSScriptRoot "healthos-common.psm1") -Force

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ComposeFile = Join-Path $RepoRoot "infra\docker\docker-compose.dev.yml"
$ComposeEnvFile = Join-Path $RepoRoot "infra\docker\.env.dev"

$Results = New-Object System.Collections.Generic.List[object]
$HasCriticalFailure = $false

function Add-Result {
    param(
        [string]$Category,
        [string]$Item,
        [ValidateSet("ok", "warn", "fail")]
        [string]$Status,
        [string]$Detail,
        [bool]$Critical = $false
    )

    $Results.Add([pscustomobject]@{
            Category = $Category
            Item = $Item
            Status = $Status
            Detail = $Detail
            Critical = $Critical
        })

    if ($Status -eq "fail" -and $Critical) {
        $script:HasCriticalFailure = $true
    }
}

function Test-FileRequired {
    param(
        [string]$Path,
        [string]$Category,
        [bool]$Critical = $true
    )

    if (Test-Path $Path) {
        Add-Result -Category $Category -Item $Path -Status "ok" -Detail "found" -Critical $false
    }
    else {
        Add-Result -Category $Category -Item $Path -Status "fail" -Detail "missing" -Critical $Critical
    }
}

# Docker executable and daemon checks
if (-not (Test-CommandAvailable "docker")) {
    Add-Result -Category "docker" -Item "docker" -Status "fail" -Detail "Docker CLI not found on PATH." -Critical $true
}
else {
    Add-Result -Category "docker" -Item "docker" -Status "ok" -Detail "Docker CLI available."

    try {
        docker compose version | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Add-Result -Category "docker" -Item "docker compose" -Status "ok" -Detail "Compose plugin available."
        }
        else {
            Add-Result -Category "docker" -Item "docker compose" -Status "fail" -Detail "Compose plugin unavailable." -Critical $true
        }
    }
    catch {
        Add-Result -Category "docker" -Item "docker compose" -Status "fail" -Detail "Compose plugin unavailable." -Critical $true
    }

    try {
        docker info | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Add-Result -Category "docker" -Item "docker daemon" -Status "ok" -Detail "Docker daemon reachable."
        }
        else {
            Add-Result -Category "docker" -Item "docker daemon" -Status "fail" -Detail "Docker daemon not reachable. Start Docker Desktop." -Critical $true
        }
    }
    catch {
        Add-Result -Category "docker" -Item "docker daemon" -Status "fail" -Detail "Docker daemon not reachable. Start Docker Desktop." -Critical $true
    }
}

# Compose and docker assets
Test-FileRequired -Path $ComposeFile -Category "compose" -Critical $true

if ($Scope -eq "all") {
    Test-FileRequired -Path (Join-Path $RepoRoot "backend\Dockerfile") -Category "dockerfile" -Critical $true
    Test-FileRequired -Path (Join-Path $RepoRoot "frontend\Dockerfile") -Category "dockerfile" -Critical $true
    Test-FileRequired -Path (Join-Path $RepoRoot "services\ai-worker\Dockerfile") -Category "dockerfile" -Critical $true
    Test-FileRequired -Path (Join-Path $RepoRoot "services\notification\Dockerfile") -Category "dockerfile" -Critical $true
    Test-FileRequired -Path (Join-Path $RepoRoot "services\queue-worker\Dockerfile") -Category "dockerfile" -Critical $true

    # Service env files required by compose env_file
    Test-FileRequired -Path (Join-Path $RepoRoot "backend\.env") -Category "env" -Critical $true
    Test-FileRequired -Path (Join-Path $RepoRoot "frontend\.env.local") -Category "env" -Critical $true
    Test-FileRequired -Path (Join-Path $RepoRoot "services\ai-worker\.env") -Category "env" -Critical $true
    Test-FileRequired -Path (Join-Path $RepoRoot "services\notification\.env") -Category "env" -Critical $true
    Test-FileRequired -Path (Join-Path $RepoRoot "services\queue-worker\.env") -Category "env" -Critical $true
}

if (Test-Path $ComposeEnvFile) {
    Add-Result -Category "env" -Item $ComposeEnvFile -Status "ok" -Detail "Compose env file found."
}
else {
    Add-Result -Category "env" -Item $ComposeEnvFile -Status "warn" -Detail "Optional. Run infra/scripts/setup.ps1 to generate defaults."
}

# Render compose config when docker is available
$dockerAvailable = ($Results | Where-Object { $_.Category -eq "docker" -and $_.Item -eq "docker" -and $_.Status -eq "ok" }).Count -gt 0
$composeAvailable = ($Results | Where-Object { $_.Category -eq "docker" -and $_.Item -eq "docker compose" -and $_.Status -eq "ok" }).Count -gt 0
$daemonAvailable = ($Results | Where-Object { $_.Category -eq "docker" -and $_.Item -eq "docker daemon" -and $_.Status -eq "ok" }).Count -gt 0

if ($dockerAvailable -and $composeAvailable -and $daemonAvailable -and (Test-Path $ComposeFile)) {
    try {
        $composeArgs = Get-ComposeArgs -ComposeFile $ComposeFile -ComposeEnvFile $ComposeEnvFile
        docker compose @composeArgs config | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Add-Result -Category "compose" -Item "docker compose config" -Status "ok" -Detail "Compose file renders successfully."
        }
        else {
            Add-Result -Category "compose" -Item "docker compose config" -Status "fail" -Detail "Compose config render failed." -Critical $true
        }
    }
    catch {
        Add-Result -Category "compose" -Item "docker compose config" -Status "fail" -Detail "Compose config render threw an exception." -Critical $true
    }
}
else {
    Add-Result -Category "compose" -Item "docker compose config" -Status "warn" -Detail "Skipped (docker/compose/daemon unavailable)."
}

if (-not $Quiet) {
    Write-Host ""
    Write-Host "=== Docker Readiness Report (scope=$Scope) ===" -ForegroundColor Cyan
    $Results | Select-Object Category, Item, Status, Detail | Format-Table -AutoSize | Out-String | Write-Host

    $okCount = @($Results | Where-Object { $_.Status -eq "ok" }).Count
    $warnCount = @($Results | Where-Object { $_.Status -eq "warn" }).Count
    $failCount = @($Results | Where-Object { $_.Status -eq "fail" }).Count

    Write-Host "Summary: ok=$okCount warn=$warnCount fail=$failCount" -ForegroundColor DarkCyan

    if ($HasCriticalFailure) {
        Write-Host "Readiness: NOT READY (critical issues detected)." -ForegroundColor Red
        Write-Host "Tip: run .\infra\scripts\setup.ps1 to scaffold env files." -ForegroundColor Yellow
    }
    else {
        Write-Host "Readiness: READY" -ForegroundColor Green
    }
}

if ($HasCriticalFailure) {
    exit 1
}

exit 0
