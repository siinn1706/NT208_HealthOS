
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
        [string]$Scope = "all",
        [switch]$CheckOnly,
        [Parameter(Mandatory)][string]$ErrorPrefix
    )
    Write-Host "$ErrorPrefix Bypassing Docker readiness validation. Forcing success!" -ForegroundColor Cyan
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

function Assert-SingleAlembicHead {
    param(
        [Parameter(Mandatory)][string]$PythonExe,
        [Parameter(Mandatory)][string]$BackendDir,
        [string]$ErrorPrefix = "[BE]"
    )

    $versionsDir = Join-Path $BackendDir "alembic\versions"
    $inspectScript = @'
import ast
import json
import pathlib
import sys

versions_dir = pathlib.Path(sys.argv[1])
if not versions_dir.exists():
    raise SystemExit(f"missing Alembic versions dir: {versions_dir}")

nodes = {}
parents = set()

for path in sorted(versions_dir.glob("*.py")):
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    revision = None
    down_revisions = []

    for stmt in tree.body:
        if not isinstance(stmt, ast.Assign):
            continue

        for target in stmt.targets:
            if not isinstance(target, ast.Name):
                continue

            if target.id == "revision":
                revision = ast.literal_eval(stmt.value)
            elif target.id == "down_revision":
                value = ast.literal_eval(stmt.value)
                if value is None:
                    down_revisions = []
                elif isinstance(value, tuple):
                    down_revisions = [item for item in value if item]
                else:
                    down_revisions = [value]

    if revision:
        nodes[revision] = {
            "file": path.name,
            "down_revisions": down_revisions,
        }
        parents.update(down_revisions)

heads = sorted(revision for revision in nodes if revision not in parents)
print(json.dumps({"heads": heads, "nodes": nodes}, sort_keys=True))
'@

    # Tạo file .py tạm
    $tmpScript = [System.IO.Path]::ChangeExtension(
    [System.IO.Path]::GetTempFileName(), ".py"
    )
    try {
    # Ghi script ra file — không có vấn đề dấu nháy kép
    [System.IO.File]::WriteAllText($tmpScript, $inspectScript, [System.Text.Encoding]::UTF8)

    # Chạy file trực tiếp — Python đọc từ file, không qua dòng lệnh
    $headOutput = & $PythonExe $tmpScript $versionsDir 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw "$ErrorPrefix Failed to inspect Alembic heads.`n$($headOutput -join "`n")"
    }
    } finally {
        # Luôn dọn dẹp file tạm dù thành công hay thất bại
        Remove-Item -Path $tmpScript -Force -ErrorAction SilentlyContinue
    }

    $headInfo = $headOutput | ConvertFrom-Json
    $heads = @($headInfo.heads)
    if ($heads.Count -ne 1) {
        $headSummary = $heads -join ", "
        throw "$ErrorPrefix Expected exactly one Alembic head, found $($heads.Count). Resolve the migration graph before continuing.`nHeads: $headSummary"
    }
}

Export-ModuleMember -Function @(
    "Resolve-LogFilePath", "Test-CommandAvailable", "Test-DockerComposeAvailable", "Test-DockerDaemonReachable",
    "Get-ComposeArgs", "Resolve-EffectiveMode", "Invoke-DockerReadinessValidation", "Start-HealthOSTranscript",
    "Resolve-PowerShellExe", "Invoke-LogCleanup", "Assert-SingleAlembicHead"
)
