param(
    [ValidateSet("auto", "docker", "local")]
    [string]$Mode = "auto",
    [switch]$SkipInstall,
    [switch]$CheckOnly,
    [ValidateSet("prompt", "auto", "never")]
    [string]$InstallPolicy = "prompt",
    [string]$LogFile
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ComposeFile = Join-Path $RepoRoot "infra\docker\docker-compose.dev.yml"

function Resolve-LogFilePath {
    param(
        [string]$DefaultName,
        [string]$RequestedPath
    )

    $logsDir = Join-Path $RepoRoot "infra\logs"
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

    if ([string]::IsNullOrWhiteSpace($RequestedPath)) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss_fff"
        return Join-Path $logsDir ("{0}_{1}.log" -f $DefaultName, $timestamp)
    }

    $resolved = if ([System.IO.Path]::IsPathRooted($RequestedPath)) {
        $RequestedPath
    }
    else {
        Join-Path $RepoRoot $RequestedPath
    }

    $parent = Split-Path -Parent $resolved
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    return $resolved
}

function Test-CommandAvailable {
    param([string]$CommandName)
    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Test-DockerComposeAvailable {
    if (-not (Test-CommandAvailable "docker")) {
        return $false
    }

    try {
        docker compose version | Out-Null
        return ($LASTEXITCODE -eq 0)
    }
    catch {
        return $false
    }
}

function Test-DockerDaemonReachable {
    if (-not (Test-CommandAvailable "docker")) {
        return $false
    }

    try {
        docker info | Out-Null
        return ($LASTEXITCODE -eq 0)
    }
    catch {
        return $false
    }
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-IsCiContext {
    if (-not $env:CI) {
        return $false
    }

    $normalized = "$($env:CI)".Trim().ToLowerInvariant()
    return ($normalized -eq "true" -or $normalized -eq "1")
}

function Resolve-EffectiveMode {
    if ($Mode -eq "docker") {
        if (-not (Test-CommandAvailable "docker")) {
            throw "[Infra] Docker CLI not found. Install Docker Desktop or rerun with -Mode local."
        }
        if (-not (Test-DockerComposeAvailable)) {
            throw "[Infra] docker compose is unavailable. Check Docker Desktop installation."
        }
        if (-not (Test-DockerDaemonReachable)) {
            throw "[Infra] Docker daemon is not reachable. Start Docker Desktop or rerun with -Mode local."
        }
        return "docker"
    }

    if ($Mode -eq "local") {
        return "local"
    }

    if (Test-CommandAvailable "docker") {
        if (Test-DockerComposeAvailable) {
            if (Test-DockerDaemonReachable) {
                return "docker"
            }
            Write-Host "[Infra] Docker CLI detected but daemon is unavailable. Falling back to local mode." -ForegroundColor Yellow
        }
        else {
            Write-Host "[Infra] Docker CLI detected but docker compose is unavailable. Falling back to local mode." -ForegroundColor Yellow
        }
    }

    return "local"
}

function Test-TcpPort {
    param(
        [int]$Port,
        [string]$Address = "127.0.0.1"
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($Address, $Port, $null, $null)
        $connected = $iar.AsyncWaitHandle.WaitOne(800)
        if (-not $connected) {
            return $false
        }
        $client.EndConnect($iar) | Out-Null
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

function Resolve-RedisPaths {
    $redisCli = $null
    $redisServer = $null
    $redisConf = $null

    $knownRoots = @(
        "C:\Program Files\Redis",
        "C:\Redis"
    )

    foreach ($root in $knownRoots) {
        $candidateCli = Join-Path $root "redis-cli.exe"
        $candidateServer = Join-Path $root "redis-server.exe"
        $candidateConf = Join-Path $root "redis.windows.conf"
        if ((Test-Path $candidateCli) -and (Test-Path $candidateServer)) {
            $redisCli = $candidateCli
            $redisServer = $candidateServer
            if (Test-Path $candidateConf) {
                $redisConf = $candidateConf
            }
            break
        }
    }

    if (-not $redisCli) {
        $cliCmd = Get-Command redis-cli -ErrorAction SilentlyContinue
        $serverCmd = Get-Command redis-server -ErrorAction SilentlyContinue
        if ($cliCmd -and $serverCmd) {
            $redisCli = $cliCmd.Source
            $redisServer = $serverCmd.Source
        }
    }

    return [pscustomobject]@{
        Cli = $redisCli
        Server = $redisServer
        Conf = $redisConf
    }
}

function Resolve-PsqlPath {
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlCmd) {
        return $psqlCmd.Source
    }

    $candidates = @(
        "C:\Program Files\PostgreSQL\17\bin\psql.exe",
        "C:\Program Files\PostgreSQL\16\bin\psql.exe",
        "C:\Program Files\PostgreSQL\15\bin\psql.exe"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }
    return $null
}

function Resolve-PostgresService {
    $candidates = @(
        "postgresql-x64-17",
        "postgresql-x64-16",
        "postgresql-x64-15",
        "postgresql"
    )

    foreach ($service in $candidates) {
        sc.exe query $service > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $service
        }
    }

    return $null
}

function Resolve-MinioPath {
    $minioCmd = Get-Command minio -ErrorAction SilentlyContinue
    if ($minioCmd) {
        return $minioCmd.Source
    }

    $candidates = @(
        "C:\Program Files\MinIO\minio.exe",
        "C:\minio\minio.exe"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

function Request-InstallApproval {
    param(
        [string]$Name,
        [string]$PackageId,
        [string]$ManualInstallHint
    )

    switch ($InstallPolicy) {
        "auto" { return $true }
        "never" {
            throw "[$Name] Not installed. Install manually: $ManualInstallHint (or rerun with -InstallPolicy auto)."
        }
        "prompt" {
            if (Test-IsCiContext) {
                throw "[$Name] InstallPolicy=prompt requires an interactive shell. Use -InstallPolicy auto or never in CI."
            }
            $answer = Read-Host "[$Name] Not installed. Install now via winget ($PackageId)? [Y/N]"
            if ($answer -match "^(y|yes)$") {
                return $true
            }
            throw "[$Name] Installation skipped. Install manually: $ManualInstallHint"
        }
    }
}

function Install-WithWinget {
    param(
        [string[]]$PackageIds,
        [string]$Name
    )

    if (-not (Test-IsAdmin)) {
        throw "[$Name] Winget install requires Administrator privileges. Re-run PowerShell as Administrator."
    }

    if (-not (Test-CommandAvailable "winget")) {
        throw "[$Name] winget is required but not found."
    }

    $candidateIds = @($PackageIds | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
    if ($candidateIds.Count -eq 0) {
        throw "[$Name] No winget package ids configured."
    }

    $resultLog = New-Object System.Collections.Generic.List[string]
    $attemptCount = 0

    for ($round = 1; $round -le 2; $round++) {
        foreach ($packageId in $candidateIds) {
            $attemptCount++
            Write-Host "[$Name] Installing via winget ($packageId)..." -ForegroundColor Yellow
            $output = winget install --id $packageId --exact --source winget --silent --accept-package-agreements --accept-source-agreements 2>&1
            $exitCode = $LASTEXITCODE
            if ($exitCode -eq 0) {
                Write-Host "[$Name] Installed via winget ($packageId)." -ForegroundColor Green
                return
            }

            $outputText = ($output -join "`n").Trim()
            if ([string]::IsNullOrWhiteSpace($outputText)) {
                $outputText = "No output from winget."
            }
            $resultLog.Add(("{0}: {1}" -f $packageId, $outputText))
            Write-Host "[$Name] winget install failed for $packageId" -ForegroundColor Yellow
        }

        if ($round -eq 1) {
            Write-Host "[$Name] Refreshing winget sources and retrying..." -ForegroundColor Yellow
            winget source update winget | Out-Null
        }
    }

    $errorSummary = ($resultLog | Select-Object -Last ([Math]::Min(4, $resultLog.Count))) -join " | "
    throw "[$Name] Winget install failed after $attemptCount attempts. Tried ids: $($candidateIds -join ', '). Details: $errorSummary"
}

function Get-InstallPromptText {
    param([string[]]$Ids)
    $clean = @($Ids | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($clean.Count -le 1) {
        return $clean[0]
    }

    return "$($clean[0]) (fallback: $($clean[1..($clean.Count - 1)] -join ', '))"
}

function Get-PrimaryPackageId {
    param([string[]]$Ids)
    $clean = @($Ids | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($clean.Count -eq 0) {
        return ""
    }
    return $clean[0]
}

function Invoke-Psql {
    param(
        [string]$PsqlPath,
        [string]$Sql,
        [string]$Username = "postgres",
        [string]$Database = "postgres",
        [string]$PgHost = "127.0.0.1",
        [string]$PgSecret = ""
    )

    $previousPassword = $env:PGPASSWORD
    try {
        if ($PgSecret) {
            $env:PGPASSWORD = $PgSecret
        }
        else {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        }

        $output = & $PsqlPath -w -h $PgHost -U $Username -d $Database -tAc $Sql 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        if ($null -ne $previousPassword) {
            $env:PGPASSWORD = $previousPassword
        }
        else {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        }
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = ($output -join "`n").Trim()
    }
}

function Start-RedisLocal {
    $manualHint = "Install Redis for Windows and ensure redis-cli/redis-server are available on PATH."
    $wingetIds = @("Redis.Redis")
    $redis = Resolve-RedisPaths
    if (-not $redis.Cli -or -not $redis.Server) {
        if ($CheckOnly) {
            throw "[Redis] Not installed. $manualHint"
        }
        if (Request-InstallApproval -Name "Redis" -PackageId (Get-InstallPromptText -Ids $wingetIds) -ManualInstallHint $manualHint) {
            Install-WithWinget -PackageIds $wingetIds -Name "Redis"
            $redis = Resolve-RedisPaths
        }
    }

    if (-not $redis.Cli -or -not $redis.Server) {
        throw "[Redis] Unable to locate redis-cli.exe or redis-server.exe after installation. $manualHint"
    }

    & $redis.Cli ping > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[Redis] Running on localhost:6379" -ForegroundColor Green
        return
    }

    if ($CheckOnly) {
        throw "[Redis] Installed but not running."
    }

    Write-Host "[Redis] Starting service..." -ForegroundColor Cyan
    if ($redis.Conf -and (Test-Path $redis.Conf)) {
        Start-Process -WindowStyle Minimized -FilePath $redis.Server -ArgumentList @($redis.Conf) | Out-Null
    }
    else {
        Start-Process -WindowStyle Minimized -FilePath $redis.Server -ArgumentList @("--port", "6379", "--loglevel", "notice") | Out-Null
    }

    Start-Sleep -Seconds 2
    & $redis.Cli ping > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "[Redis] Failed to start."
    }

    Write-Host "[Redis] Started on localhost:6379" -ForegroundColor Green
}

function Start-PostgresLocal {
    $manualHint = "Install PostgreSQL 15+ with service enabled and ensure psql.exe is available on PATH."
    $wingetIds = @("PostgreSQL.PostgreSQL.17", "PostgreSQL.PostgreSQL.18")
    $serviceName = Resolve-PostgresService
    if (-not $serviceName) {
        if ($CheckOnly) {
            throw "[PostgreSQL] Service not installed. $manualHint"
        }
        if (Request-InstallApproval -Name "PostgreSQL" -PackageId (Get-InstallPromptText -Ids $wingetIds) -ManualInstallHint $manualHint) {
            Install-WithWinget -PackageIds $wingetIds -Name "PostgreSQL"
            $serviceName = Resolve-PostgresService
        }
    }

    if (-not $serviceName) {
        throw "[PostgreSQL] Service still not found after installation. $manualHint"
    }

    sc.exe query $serviceName | Select-String "RUNNING" > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        if ($CheckOnly) {
            throw "[PostgreSQL] Service '$serviceName' is not running."
        }
        Write-Host "[PostgreSQL] Starting service '$serviceName'..." -ForegroundColor Cyan
        net start $serviceName > $null 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "[PostgreSQL] Failed to start service '$serviceName'."
        }
    }

    $psqlPath = Resolve-PsqlPath
    if (-not $psqlPath) {
        throw "[PostgreSQL] psql.exe not found. $manualHint"
    }

    $appUser = if ($env:POSTGRES_APP_USER) { $env:POSTGRES_APP_USER } else { "healthos" }
    $appPassword = if ($env:POSTGRES_APP_PASSWORD) { $env:POSTGRES_APP_PASSWORD } else { "healthos_dev_pass" }
    $appDb = if ($env:POSTGRES_APP_DB) { $env:POSTGRES_APP_DB } else { "healthos" }
    $superUser = if ($env:POSTGRES_SUPERUSER) { $env:POSTGRES_SUPERUSER } else { "postgres" }
    $superPassword = if ($env:POSTGRES_SUPERUSER_PASSWORD) { $env:POSTGRES_SUPERUSER_PASSWORD } else { "" }

    $verifyApp = Invoke-Psql `
        -PsqlPath $psqlPath `
        -Username $appUser `
        -Database $appDb `
        -PgSecret $appPassword `
        -Sql "SELECT current_database();"
    if ($verifyApp.ExitCode -eq 0 -and $verifyApp.Output -eq $appDb) {
        Write-Host "[PostgreSQL] Ready on localhost:5432 (db=$appDb user=$appUser)" -ForegroundColor Green
        return
    }

    if ($CheckOnly) {
        throw "[PostgreSQL] App DB login failed for user '$appUser' db '$appDb'. $($verifyApp.Output)"
    }

    $escapedAppUser = $appUser.Replace("'", "''")
    $escapedAppDb = $appDb.Replace("'", "''")
    $escapedAppPassword = $appPassword.Replace("'", "''")

    $roleCheck = Invoke-Psql `
        -PsqlPath $psqlPath `
        -Username $superUser `
        -Database "postgres" `
        -PgSecret $superPassword `
        -Sql "SELECT 1 FROM pg_roles WHERE rolname='$escapedAppUser';"
    if ($roleCheck.ExitCode -ne 0) {
        throw "[PostgreSQL] Cannot query roles using postgres superuser '$superUser'. $($roleCheck.Output)"
    }

    if ($roleCheck.Output -ne "1") {
        $createRole = Invoke-Psql `
            -PsqlPath $psqlPath `
            -Username $superUser `
            -Database "postgres" `
            -PgSecret $superPassword `
            -Sql "CREATE USER $appUser WITH PASSWORD '$escapedAppPassword';"
        if ($createRole.ExitCode -ne 0) {
            throw "[PostgreSQL] Failed to create role '$appUser'. $($createRole.Output)"
        }
    }

    $dbCheck = Invoke-Psql `
        -PsqlPath $psqlPath `
        -Username $superUser `
        -Database "postgres" `
        -PgSecret $superPassword `
        -Sql "SELECT 1 FROM pg_database WHERE datname='$escapedAppDb';"
    if ($dbCheck.ExitCode -ne 0) {
        throw "[PostgreSQL] Cannot query databases. $($dbCheck.Output)"
    }

    if ($dbCheck.Output -ne "1") {
        $createDb = Invoke-Psql `
            -PsqlPath $psqlPath `
            -Username $superUser `
            -Database "postgres" `
            -PgSecret $superPassword `
            -Sql "CREATE DATABASE $appDb OWNER $appUser;"
        if ($createDb.ExitCode -ne 0) {
            throw "[PostgreSQL] Failed to create database '$appDb'. $($createDb.Output)"
        }
    }

    $verify = Invoke-Psql `
        -PsqlPath $psqlPath `
        -Username $appUser `
        -Database $appDb `
        -PgSecret $appPassword `
        -Sql "SELECT current_database();"
    if ($verify.ExitCode -ne 0) {
        throw "[PostgreSQL] Verification query failed. $($verify.Output)"
    }

    Write-Host "[PostgreSQL] Ready on localhost:5432 (db=$appDb user=$appUser)" -ForegroundColor Green
}

function Start-MinioLocal {
    $manualHint = "Install MinIO and ensure minio.exe is available on PATH."
    $wingetIds = @("MinIO.Server", "MinIO.MinIO")
    $minioPath = Resolve-MinioPath
    if (-not $minioPath) {
        if ($CheckOnly) {
            throw "[MinIO] Not installed. $manualHint"
        }
        if (Request-InstallApproval -Name "MinIO" -PackageId (Get-InstallPromptText -Ids $wingetIds) -ManualInstallHint $manualHint) {
            Install-WithWinget -PackageIds $wingetIds -Name "MinIO"
            $minioPath = Resolve-MinioPath
        }
    }

    if (-not $minioPath) {
        throw "[MinIO] minio executable not found after installation. $manualHint"
    }

    if (Test-TcpPort -Port 9000) {
        Write-Host "[MinIO] Running on localhost:9000" -ForegroundColor Green
        return
    }

    if ($CheckOnly) {
        throw "[MinIO] Installed but not running."
    }

    $dataDir = Join-Path $RepoRoot ".data\minio"
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    if (-not $env:MINIO_ROOT_USER) { $env:MINIO_ROOT_USER = "minioadmin" }
    if (-not $env:MINIO_ROOT_PASSWORD) { $env:MINIO_ROOT_PASSWORD = "minioadmin" }

    Write-Host "[MinIO] Starting local MinIO..." -ForegroundColor Cyan
    Start-Process -WindowStyle Minimized -FilePath $minioPath -ArgumentList @(
        "server",
        $dataDir,
        "--address",
        ":9000",
        "--console-address",
        ":9001"
    ) | Out-Null

    Start-Sleep -Seconds 3
    if (-not (Test-TcpPort -Port 9000)) {
        throw "[MinIO] Failed to start local MinIO."
    }

    Write-Host "[MinIO] Started (api=http://localhost:9000, console=http://localhost:9001)" -ForegroundColor Green
}

$ScriptLogFile = Resolve-LogFilePath -DefaultName "infra" -RequestedPath $LogFile
try {
    Start-Transcript -Path $ScriptLogFile -Append -Force | Out-Null
}
catch {
    Write-Warning "[Infra] Unable to start transcript at '$ScriptLogFile': $($_.Exception.Message)"
}

Write-Host "[Infra] Log file: $ScriptLogFile" -ForegroundColor Cyan
$effectiveMode = Resolve-EffectiveMode
Write-Host "[Infra] Effective mode: $effectiveMode" -ForegroundColor Cyan
Write-Host "[Infra] Install policy: $InstallPolicy" -ForegroundColor Cyan

if ($effectiveMode -eq "docker") {
    if (-not (Test-Path $ComposeFile)) {
        throw "[Infra] Compose file not found: $ComposeFile"
    }

    if ($CheckOnly) {
        docker compose -f $ComposeFile ps postgres redis minio
        exit $LASTEXITCODE
    }

    Write-Host "[Infra] Starting postgres + redis + minio via Docker..." -ForegroundColor Cyan
    docker compose -f $ComposeFile up -d postgres redis minio
    if ($LASTEXITCODE -ne 0) {
        throw "[Infra] Failed to start docker infrastructure services."
    }

    Write-Host "[Infra] Docker infrastructure started." -ForegroundColor Green
    exit 0
}

Start-RedisLocal
Start-PostgresLocal
Start-MinioLocal

Write-Host ""
Write-Host "=======================================================" -ForegroundColor DarkGray
Write-Host " Infrastructure ready (local mode)" -ForegroundColor Green
Write-Host "   Redis    : localhost:6379"
Write-Host "   Postgres : localhost:5432  db=healthos user=healthos"
Write-Host "   MinIO    : localhost:9000  console=localhost:9001"
Write-Host "   Log file : $ScriptLogFile"
Write-Host "=======================================================" -ForegroundColor DarkGray
