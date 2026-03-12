param(
    [ValidateSet("auto", "docker", "local")]
    [string]$Mode = "auto",
    [switch]$SkipInstall,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ComposeFile = Join-Path $RepoRoot "infra\docker\docker-compose.dev.yml"

function Test-CommandAvailable {
    param([string]$CommandName)
    return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Resolve-EffectiveMode {
    if ($Mode -ne "auto") {
        return $Mode
    }

    if (Test-CommandAvailable "docker") {
        try {
            docker compose version | Out-Null
            if ($LASTEXITCODE -eq 0) {
                return "docker"
            }
        }
        catch {
            # Fall through to local mode.
        }
    }

    return "local"
}

function Test-TcpPort {
    param(
        [int]$Port,
        [string]$Host = "127.0.0.1"
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($Host, $Port, $null, $null)
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

function Ensure-InstalledWithWinget {
    param(
        [string]$PackageId,
        [string]$Name
    )

    if (-not (Test-IsAdmin)) {
        throw "[$Name] Winget install requires Administrator privileges. Re-run PowerShell as Administrator."
    }

    if (-not (Test-CommandAvailable "winget")) {
        throw "[$Name] winget is required but not found."
    }

    Write-Host "[$Name] Installing via winget ($PackageId)..." -ForegroundColor Yellow
    winget install --id $PackageId --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "[$Name] Winget install failed for $PackageId"
    }
}

function Invoke-Psql {
    param(
        [string]$PsqlPath,
        [string]$Sql,
        [string]$Username = "postgres",
        [string]$Database = "postgres",
        [string]$PgHost = "127.0.0.1",
        [string]$Password = ""
    )

    $previousPassword = $env:PGPASSWORD
    try {
        if ($Password) {
            $env:PGPASSWORD = $Password
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

function Ensure-RedisLocal {
    $redis = Resolve-RedisPaths
    if (-not $redis.Cli -or -not $redis.Server) {
        if ($CheckOnly) {
            throw "[Redis] Not installed."
        }
        Ensure-InstalledWithWinget -PackageId "Redis.Redis" -Name "Redis"
        $redis = Resolve-RedisPaths
    }

    if (-not $redis.Cli -or -not $redis.Server) {
        throw "[Redis] Unable to locate redis-cli.exe or redis-server.exe after installation."
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

function Ensure-PostgresLocal {
    $serviceName = Resolve-PostgresService
    if (-not $serviceName) {
        if ($CheckOnly) {
            throw "[PostgreSQL] Service not installed."
        }
        Ensure-InstalledWithWinget -PackageId "PostgreSQL.PostgreSQL.17" -Name "PostgreSQL"
        $serviceName = Resolve-PostgresService
    }

    if (-not $serviceName) {
        throw "[PostgreSQL] Service still not found after installation."
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
        throw "[PostgreSQL] psql.exe not found."
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
        -Password $appPassword `
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
        -Password $superPassword `
        -Sql "SELECT 1 FROM pg_roles WHERE rolname='$escapedAppUser';"
    if ($roleCheck.ExitCode -ne 0) {
        throw "[PostgreSQL] Cannot query roles using postgres superuser '$superUser'. $($roleCheck.Output)"
    }

    if ($roleCheck.Output -ne "1") {
        $createRole = Invoke-Psql `
            -PsqlPath $psqlPath `
            -Username $superUser `
            -Database "postgres" `
            -Password $superPassword `
            -Sql "CREATE USER $appUser WITH PASSWORD '$escapedAppPassword';"
        if ($createRole.ExitCode -ne 0) {
            throw "[PostgreSQL] Failed to create role '$appUser'. $($createRole.Output)"
        }
    }

    $dbCheck = Invoke-Psql `
        -PsqlPath $psqlPath `
        -Username $superUser `
        -Database "postgres" `
        -Password $superPassword `
        -Sql "SELECT 1 FROM pg_database WHERE datname='$escapedAppDb';"
    if ($dbCheck.ExitCode -ne 0) {
        throw "[PostgreSQL] Cannot query databases. $($dbCheck.Output)"
    }

    if ($dbCheck.Output -ne "1") {
        $createDb = Invoke-Psql `
            -PsqlPath $psqlPath `
            -Username $superUser `
            -Database "postgres" `
            -Password $superPassword `
            -Sql "CREATE DATABASE $appDb OWNER $appUser;"
        if ($createDb.ExitCode -ne 0) {
            throw "[PostgreSQL] Failed to create database '$appDb'. $($createDb.Output)"
        }
    }

    $verify = Invoke-Psql `
        -PsqlPath $psqlPath `
        -Username $appUser `
        -Database $appDb `
        -Password $appPassword `
        -Sql "SELECT current_database();"
    if ($verify.ExitCode -ne 0) {
        throw "[PostgreSQL] Verification query failed. $($verify.Output)"
    }

    Write-Host "[PostgreSQL] Ready on localhost:5432 (db=$appDb user=$appUser)" -ForegroundColor Green
}

function Ensure-MinioLocal {
    $minioPath = Resolve-MinioPath
    if (-not $minioPath) {
        if ($CheckOnly) {
            throw "[MinIO] Not installed."
        }
        Ensure-InstalledWithWinget -PackageId "MinIO.MinIO" -Name "MinIO"
        $minioPath = Resolve-MinioPath
    }

    if (-not $minioPath) {
        throw "[MinIO] minio executable not found after installation."
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

$effectiveMode = Resolve-EffectiveMode
Write-Host "[Infra] Effective mode: $effectiveMode" -ForegroundColor Cyan

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

Ensure-RedisLocal
Ensure-PostgresLocal
Ensure-MinioLocal

Write-Host ""
Write-Host "=======================================================" -ForegroundColor DarkGray
Write-Host " Infrastructure ready (local mode)" -ForegroundColor Green
Write-Host "   Redis    : localhost:6379"
Write-Host "   Postgres : localhost:5432  db=healthos user=healthos"
Write-Host "   MinIO    : localhost:9000  console=localhost:9001"
Write-Host "=======================================================" -ForegroundColor DarkGray
