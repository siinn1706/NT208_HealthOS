# Shared helpers for HealthOS Windows dev scripts (Import-Module from $PSScriptRoot).
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-LogFilePath {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [Parameter(Mandatory)][string]$DefaultName,
        [string]$RequestedPath
    )
    $logsDir = Join-Path $RepoRoot "infra\logs"
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    if ([string]::IsNullOrWhiteSpace($RequestedPath)) {
        $ts = Get-Date -Format "yyyyMMdd_HHmmss_fff"
        return Join-Path $logsDir ("{0}_{1}.log" -f $DefaultName, $ts)
    }
    $resolved = if ([System.IO.Path]::IsPathRooted($RequestedPath)) { $RequestedPath } else { Join-Path $RepoRoot $RequestedPath }
    $parent = Split-Path -Parent $resolved
    if ($parent -and -not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    return $resolved
}

function Test-CommandAvailable {
    param([Parameter(Mandatory)][string]$CommandName)
    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Test-DockerComposeAvailable {
    if (-not (Test-CommandAvailable "docker")) { return $false }
    try {
        docker compose version | Out-Null
        return ($LASTEXITCODE -eq 0)
    } catch { return $false }
}

function Test-DockerDaemonReachable {
    if (-not (Test-CommandAvailable "docker")) { return $false }
    try {
        docker info | Out-Null
        return ($LASTEXITCODE -eq 0)
    } catch { return $false }
}

function Get-ComposeArgs {
    param(
        [Parameter(Mandatory)][string]$ComposeFile,
        [string]$ComposeEnvFile
    )
    $a = @("-f", $ComposeFile)
    if ($ComposeEnvFile -and (Test-Path $ComposeEnvFile)) { $a += @("--env-file", $ComposeEnvFile) }
    return $a
}

function Resolve-EffectiveMode {
    param(
        [Parameter(Mandatory)][ValidateSet("auto", "docker", "local")][string]$Mode,
        [Parameter(Mandatory)][string]$LogPrefix
    )
    if ($Mode -eq "docker") {
        if (-not (Test-CommandAvailable "docker")) { throw "$LogPrefix Docker CLI not found. Install Docker Desktop or rerun with -Mode local." }
        if (-not (Test-DockerComposeAvailable)) { throw "$LogPrefix docker compose is unavailable. Check Docker Desktop installation." }
        if (-not (Test-DockerDaemonReachable)) { throw "$LogPrefix Docker daemon is not reachable. Start Docker Desktop or rerun with -Mode local." }
        return "docker"
    }
    if ($Mode -eq "local") { return "local" }
    if (Test-CommandAvailable "docker") {
        if (Test-DockerComposeAvailable) {
            if (Test-DockerDaemonReachable) { return "docker" }
            Write-Host "$LogPrefix Docker CLI detected but daemon is unavailable. Falling back to local mode." -ForegroundColor Yellow
        } else {
            Write-Host "$LogPrefix Docker CLI detected but docker compose is unavailable. Falling back to local mode." -ForegroundColor Yellow
        }
    }
    return "local"
}

function Invoke-DockerReadinessValidation {
    param(
        [Parameter(Mandatory)][string]$ScriptsRoot,
        [ValidateSet("all", "infra")][string]$Scope = "all",
        [switch]$CheckOnly,
        [Parameter(Mandatory)][string]$ErrorPrefix
    )
    $validatorPath = Join-Path $ScriptsRoot "validate_docker_ready.ps1"
    if (-not (Test-Path $validatorPath)) { throw "$ErrorPrefix Docker readiness validator is missing: $validatorPath" }
    $validatorArgs = @("-Scope", $Scope)
    if ($CheckOnly) { $validatorArgs += "-CheckOnly" }
    & $validatorPath @validatorArgs
    if ($LASTEXITCODE -ne 0) { throw "$ErrorPrefix Docker readiness validation failed. Resolve the reported issues and retry." }
}

function Start-HealthOSTranscript {
    param([Parameter(Mandatory)][string]$LogFilePath)
    try { Start-Transcript -Path $LogFilePath -Append -Force | Out-Null }
    catch { Write-Warning "Unable to start transcript at '$LogFilePath': $($_.Exception.Message)" }
}

function Resolve-PowerShellExe {
    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($pwsh) { return $pwsh.Source }
    $legacy = Get-Command powershell -ErrorAction SilentlyContinue
    if ($legacy) { return $legacy.Source }
    return "powershell"
}

function Invoke-LogCleanup {
    param(
        [Parameter(Mandatory)][string]$LogDir,
        [int]$MaxAgeDays = 7
    )
    if (-not (Test-Path $LogDir)) { return }
    $cutoff = (Get-Date).AddDays(-$MaxAgeDays)
    Get-ChildItem $LogDir -Filter "*.log" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

Export-ModuleMember -Function @(
    "Resolve-LogFilePath", "Test-CommandAvailable", "Test-DockerComposeAvailable", "Test-DockerDaemonReachable",
    "Get-ComposeArgs", "Resolve-EffectiveMode", "Invoke-DockerReadinessValidation", "Start-HealthOSTranscript",
    "Resolve-PowerShellExe", "Invoke-LogCleanup"
)
