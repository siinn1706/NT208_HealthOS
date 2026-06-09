param(
    [ValidateSet("auto", "docker", "local")]
    [string]$Mode = "auto",
    [switch]$SkipInstall,
    [ValidateSet("infra", "be", "fe", "ai", "queue", "notification", "all")]
    [string]$Only = "all",
    [switch]$CheckOnly,
    [ValidateSet("prompt", "auto", "never")]
    [string]$InstallPolicy = "prompt",
    [string]$LogFile
)

$ErrorActionPreference = "Stop"

Import-Module (Join-Path $PSScriptRoot "healthos-common.psm1") -Force

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Invoke-LogCleanup -LogDir (Join-Path $RepoRoot "infra\logs")
$ComposeFile = Join-Path $RepoRoot "infra\docker\docker-compose.dev.yml"
$ComposeEnvFile = Join-Path $RepoRoot "infra\docker\.env.dev"
$PowerShellExe = Resolve-PowerShellExe
$StatusRows = New-Object System.Collections.Generic.List[object]
$ConflictRows = New-Object System.Collections.Generic.List[object]
$HasFailure = $false

function New-ComponentLogFile {
    param([string]$Component)
    return Resolve-LogFilePath -RepoRoot $RepoRoot -DefaultName $Component -RequestedPath $null
}

$ScriptLogFile = Resolve-LogFilePath -RepoRoot $RepoRoot -DefaultName "start_all" -RequestedPath $LogFile
Start-HealthOSTranscript -LogFilePath $ScriptLogFile

function Add-Status {
    param(
        [string]$Component,
        [string]$Status,
        [string]$Detail
    )

    $StatusRows.Add([pscustomobject]@{
            Component = $Component
            Status = $Status
            Detail = $Detail
        })
}

function Add-Conflict {
    param(
        [string]$Item,
        [string]$Suggestion,
        [string]$Reason
    )
    $ConflictRows.Add([pscustomobject]@{
            Item = $Item
            Suggestion = $Suggestion
            Reason = $Reason
        })
}

function Get-SelectedComponents {
    if ($Only -eq "all") {
        return @("infra", "be", "fe", "ai", "queue", "notification")
    }
    return @($Only)
}

function Invoke-LocalScript {
    param(
        [string]$Component,
        [string]$ScriptName,
        [hashtable]$ExtraParams = @{}
    )

    $scriptPath = Join-Path $PSScriptRoot $ScriptName
    if (-not (Test-Path $scriptPath)) {
        throw "Script missing: $scriptPath"
    }

    $componentLog = New-ComponentLogFile -Component $Component

    if ($CheckOnly) {
        $params = @{}
        foreach ($key in $ExtraParams.Keys) {
            $params[$key] = $ExtraParams[$key]
        }
        if ($SkipInstall) { $params.SkipInstall = $true }
        $params.CheckOnly = $true
        $params.LogFile = $componentLog
        & $scriptPath @params
        if ($LASTEXITCODE -ne 0) {
            throw "Check failed for $Component. See log: $componentLog"
        }
        Add-Status -Component $Component -Status "ok" -Detail "Check passed | log: $componentLog"
        return
    }

    $args = @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-File", $scriptPath
    )

    foreach ($key in $ExtraParams.Keys) {
        $args += "-$key"
        $args += "$($ExtraParams[$key])"
    }

    if ($SkipInstall) {
        $args += "-SkipInstall"
    }

    $args += "-LogFile"
    $args += $componentLog

    Start-Process -FilePath $PowerShellExe -ArgumentList $args -WorkingDirectory $RepoRoot | Out-Null
    Add-Status -Component $Component -Status "started" -Detail "Opened in separate terminal | log: $componentLog"
}

function Invoke-DockerComponents {
    param([string[]]$Components)

    if (-not (Test-Path $ComposeFile)) {
        throw "Compose file not found: $ComposeFile"
    }

    $map = @{
        infra = @("postgres", "redis", "minio")
        be = @("core-be")
        fe = @("frontend")
        ai = @("ai-worker")
        queue = @("queue-worker")
        notification = @("notification")
    }

    $serviceList = New-Object System.Collections.Generic.List[string]
    foreach ($component in $Components) {
        foreach ($service in $map[$component]) {
            if (-not $serviceList.Contains($service)) {
                $serviceList.Add($service)
            }
        }
    }

    if ($serviceList.Count -eq 0) {
        Add-Status -Component "docker" -Status "skipped" -Detail "No services selected"
        return
    }

    $composeArgs = Get-ComposeArgs -ComposeFile $ComposeFile -ComposeEnvFile $ComposeEnvFile

    if ($CheckOnly) {
        docker compose @composeArgs ps $serviceList
        if ($LASTEXITCODE -ne 0) {
            throw "docker compose ps failed."
        }
        Add-Status -Component "docker" -Status "ok" -Detail "Compose check passed | log: $ScriptLogFile"
        return
    }

    Write-Host "[ALL] Starting docker services: $($serviceList -join ', ')" -ForegroundColor Cyan
    docker compose @composeArgs up -d $serviceList
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose up failed."
    }

    foreach ($component in $Components) {
        Add-Status -Component $component -Status "started" -Detail "Managed by docker compose"
    }
}

function Collect-ConflictReport {
    $rootLock = Join-Path $RepoRoot "package-lock.json"
    $rootPkg = Join-Path $RepoRoot "package.json"
    if ((Test-Path $rootLock) -and -not (Test-Path $rootPkg)) {
        Add-Conflict -Item $rootLock -Suggestion "remove" -Reason "No root package.json; this lockfile is stale and misleading."
    }

    $frontendPkg = Join-Path $RepoRoot "frontend\package.json"
    $frontendLock = Join-Path $RepoRoot "frontend\package-lock.json"
    if ((Test-Path $frontendPkg) -and (Test-Path $frontendLock)) {
        Add-Conflict -Item $frontendLock -Suggestion "keep" -Reason "Frontend lockfile is the source of truth for deterministic FE installs."
    }

    if ((Test-Path $frontendPkg) -and (Test-CommandAvailable "npm")) {
        $frontendDir = Join-Path $RepoRoot "frontend"
        Push-Location $frontendDir
        try {
            $raw = npm ls --depth=0 --json 2>$null
            if ($LASTEXITCODE -eq 0 -and $raw) {
                $json = $raw | ConvertFrom-Json
                $problems = @()
                if ($json.problems) {
                    $problems = @($json.problems)
                }
                $extraneous = $problems | Where-Object { $_ -match "extraneous" }
                if ($extraneous.Count -gt 0) {
                    $knownOptionalWasm = @(
                        "@emnapi/core",
                        "@emnapi/runtime",
                        "@emnapi/wasi-threads",
                        "@napi-rs/wasm-runtime",
                        "@tybys/wasm-util"
                    )

                    $extraneousPackages = @()
                    foreach ($problem in $extraneous) {
                        $parts = ($problem -replace "^extraneous:\s+", "").Split(" ")
                        if ($parts.Count -gt 0) {
                            $pkgWithVersion = $parts[0]
                            $atIndex = $pkgWithVersion.LastIndexOf("@")
                            if ($atIndex -gt 0) {
                                $extraneousPackages += $pkgWithVersion.Substring(0, $atIndex)
                            }
                        }
                    }

                    $unknown = $extraneousPackages | Where-Object { $knownOptionalWasm -notcontains $_ }
                    if ($unknown.Count -eq 0 -and $extraneousPackages.Count -gt 0) {
                        Add-Conflict -Item "frontend/node_modules (wasm optional deps)" -Suggestion "keep" -Reason "Extraneous packages are optional transitive WASM runtime dependencies. Keep frontend lockfile; do not add these packages to package.json."
                    }
                    else {
                        $unknownText = if ($unknown.Count -gt 0) { $unknown -join ", " } else { "unknown package set" }
                        Add-Conflict -Item "frontend/node_modules" -Suggestion "review" -Reason "npm reports unexpected extraneous packages: $unknownText"
                    }
                }
            }
        }
        catch {
            Add-Conflict -Item "frontend/node_modules" -Suggestion "review" -Reason "Unable to parse npm dependency tree for conflict checks."
        }
        finally {
            Pop-Location
        }
    }
}

function Print-Reports {
    Write-Host ""
    Write-Host "=== Start ALL Report ===" -ForegroundColor Cyan
    if ($StatusRows.Count -eq 0) {
        Write-Host "No status entries." -ForegroundColor Yellow
    }
    else {
        $StatusRows | Format-Table -AutoSize | Out-String | Write-Host
    }

    Write-Host ""
    Write-Host "=== Conflict Report (Keep/Remove) ===" -ForegroundColor Cyan
    if ($ConflictRows.Count -eq 0) {
        Write-Host "No conflicts detected." -ForegroundColor Green
    }
    else {
        $ConflictRows | Format-Table -AutoSize | Out-String | Write-Host
    }

    Write-Host ""
    Write-Host "URLs:" -ForegroundColor Cyan
    Write-Host "  FE           : http://localhost:3000"
    Write-Host "  Core BE      : http://localhost:8000/docs"
    Write-Host "  AI Worker    : http://localhost:8001/docs"
    Write-Host "  Notification : http://localhost:8002/docs"
    Write-Host "  MinIO        : http://localhost:9001"

    Write-Host ""
    Write-Host "Logs:" -ForegroundColor Cyan
    Write-Host "  Orchestrator : $ScriptLogFile"
    Write-Host "  Components   : $RepoRoot\infra\logs\*.log"
}

$selected = Get-SelectedComponents

Write-Host "[ALL] Log file: $ScriptLogFile" -ForegroundColor DarkCyan
$effectiveMode = Resolve-EffectiveMode -Mode $Mode -LogPrefix "[ALL]"
Write-Host "[ALL] Mode requested: $Mode" -ForegroundColor DarkCyan
Write-Host "[ALL] Mode effective: $effectiveMode" -ForegroundColor DarkCyan
Write-Host "[ALL] Selected components: $($selected -join ', ')" -ForegroundColor DarkCyan
Write-Host "[ALL] Install policy: $InstallPolicy" -ForegroundColor DarkCyan

# Render generated .env files from infra/env/.env.master. This intentionally
# overwrites generated env files so the master remains the single source.
Write-Host "[ALL] Rendering env files from master..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "sync-env.ps1")

try {
    if ($effectiveMode -eq "docker") {
        Invoke-DockerReadinessValidation -ScriptsRoot $PSScriptRoot -Scope "all" -CheckOnly:$CheckOnly -ErrorPrefix "[ALL]"
        Invoke-DockerComponents -Components $selected
    }
    else {
        foreach ($component in $selected) {
            try {
                switch ($component) {
                    "infra" { Invoke-LocalScript -Component "infra" -ScriptName "start_infra.ps1" -ExtraParams @{ Mode = "local"; InstallPolicy = $InstallPolicy } }
                    "be" { Invoke-LocalScript -Component "be" -ScriptName "start_be.ps1" -ExtraParams @{ Mode = "local" } }
                    "fe" { Invoke-LocalScript -Component "fe" -ScriptName "start_fe.ps1" }
                    "ai" { Invoke-LocalScript -Component "ai" -ScriptName "start_ai_worker.ps1" }
                    "queue" { Invoke-LocalScript -Component "queue" -ScriptName "start_queue_worker.ps1" }
                    "notification" { Invoke-LocalScript -Component "notification" -ScriptName "start_notification.ps1" }
                }
            }
            catch {
                $HasFailure = $true
                Add-Status -Component $component -Status "failed" -Detail $_.Exception.Message
            }
        }
    }
}
catch {
    $HasFailure = $true
    Add-Status -Component "start_all" -Status "failed" -Detail $_.Exception.Message
}

Collect-ConflictReport
Print-Reports

if ($HasFailure) {
    exit 1
}

exit 0
