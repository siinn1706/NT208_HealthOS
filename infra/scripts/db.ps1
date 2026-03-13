param(
    [ValidateSet("status", "up", "stop", "psql", "tables", "migrate", "dump", "restore")]
    [string]$Action = "status",

    [ValidateSet("auto", "docker", "local")]
    [string]$Mode = "auto",

    [string]$FilePath = ""
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ComposeFile = Join-Path $RepoRoot "infra\docker\docker-compose.dev.yml"
$BackendDir = Join-Path $RepoRoot "backend"
$BackendEnv = Join-Path $BackendDir ".env"
$BackupDir = Join-Path $RepoRoot "infra\backups"

function Invoke-Compose {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Args
    )
    & docker compose -f $ComposeFile @Args
}

function Test-DockerComposeAvailable {
    try {
        docker compose version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Get-DbUrlFromEnv {
    if (-not (Test-Path $BackendEnv)) {
        return "postgresql+asyncpg://healthos:healthos_dev_pass@localhost:5432/healthos"
    }

    $line = Get-Content $BackendEnv | Where-Object { $_ -match '^DATABASE_URL\s*=' } | Select-Object -First 1
    if (-not $line) {
        return "postgresql+asyncpg://healthos:healthos_dev_pass@localhost:5432/healthos"
    }

    $raw = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
    if ($raw -match '^postgresql\+asyncpg://') {
        return $raw -replace '^postgresql\+asyncpg://', 'postgresql://'
    }
    return $raw
}

function Get-EffectiveMode {
    if ($Mode -eq "docker" -or $Mode -eq "local") {
        return $Mode
    }

    if (Test-DockerComposeAvailable) {
        return "docker"
    }
    return "local"
}

function Get-LocalPgServiceName {
    $candidates = @("postgresql-x64-17", "postgresql-x64-16", "postgresql-x64-15", "postgresql")
    foreach ($svc in $candidates) {
        $result = sc.exe query $svc 2>$null
        if ($LASTEXITCODE -eq 0 -and $result) {
            return $svc
        }
    }
    return ""
}

function Get-PgExecutable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandName,

        [Parameter(Mandatory = $true)]
        [string]$ExeName
    )

    $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $candidates = @(
        "C:\Program Files\PostgreSQL\17\bin\$ExeName",
        "C:\Program Files\PostgreSQL\16\bin\$ExeName",
        "C:\Program Files\PostgreSQL\15\bin\$ExeName"
    )

    foreach ($path in $candidates) {
        if (Test-Path $path) {
            return $path
        }
    }

    return ""
}

function Get-PostgresContainerId {
    try {
        $id = Invoke-Compose ps -q postgres
        if ($id) {
            return $id.Trim()
        }
        return ""
    }
    catch {
        return ""
    }
}

function Get-DbUri {
    $dbUrl = Get-DbUrlFromEnv
    try {
        return [System.Uri]$dbUrl
    }
    catch {
        throw "Invalid DATABASE_URL in backend/.env: $dbUrl"
    }
}

function Resolve-BackupPath {
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir | Out-Null
    }

    if ($FilePath -and $FilePath.Trim() -ne "") {
        if ([System.IO.Path]::IsPathRooted($FilePath)) {
            $targetDir = Split-Path -Path $FilePath -Parent
            if ($targetDir -and -not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir | Out-Null
            }
            return $FilePath
        }

        $combined = Join-Path $RepoRoot $FilePath
        $combinedDir = Split-Path -Path $combined -Parent
        if ($combinedDir -and -not (Test-Path $combinedDir)) {
            New-Item -ItemType Directory -Path $combinedDir | Out-Null
        }
        return $combined
    }

    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    return Join-Path $BackupDir "healthos_$stamp.sql"
}

function Get-DbPassword {
    $dbUri = Get-DbUri
    if (-not $dbUri.UserInfo -or -not ($dbUri.UserInfo.Contains(":"))) {
        return ""
    }

    $parts = $dbUri.UserInfo.Split(':', 2)
    if ($parts.Count -lt 2) {
        return ""
    }

    return [System.Uri]::UnescapeDataString($parts[1])
}

function Ensure-RestoreFile {
    if (-not $FilePath -or $FilePath.Trim() -eq "") {
        throw "Restore requires -FilePath. Example: .\\infra\\scripts\\db.ps1 -Action restore -FilePath .\\infra\\backups\\healthos_20260304_120000.sql"
    }

    $candidate = $FilePath
    if (-not (Test-Path $candidate)) {
        $candidate = Join-Path $RepoRoot $FilePath
    }
    if (-not (Test-Path $candidate)) {
        throw "Restore file not found: $FilePath"
    }
    return (Resolve-Path $candidate).Path
}

function Ensure-Compose {
    if (-not (Test-DockerComposeAvailable)) {
        throw "Docker Compose is not available. Please install Docker Desktop first."
    }
    if (-not (Test-Path $ComposeFile)) {
        throw "Compose file not found: $ComposeFile"
    }
}

function Use-LocalPsql {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Args
    )
    $psqlExe = Get-PgExecutable -CommandName "psql" -ExeName "psql.exe"
    if (-not $psqlExe) {
        throw "psql executable was not found. Install PostgreSQL client tools or use -Mode docker."
    }

    & $psqlExe @Args
}

function Use-LocalPgDump {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Args
    )
    $pgDumpExe = Get-PgExecutable -CommandName "pg_dump" -ExeName "pg_dump.exe"
    if (-not $pgDumpExe) {
        throw "pg_dump executable was not found. Install PostgreSQL client tools or use -Mode docker."
    }

    & $pgDumpExe @Args
}

switch ($Action) {
    "status" {
        $effectiveMode = Get-EffectiveMode
        if ($effectiveMode -eq "docker") {
            Ensure-Compose
            Write-Host "[DB] Mode: docker" -ForegroundColor Cyan
            Invoke-Compose ps postgres

            Write-Host "`n[DB] Volumes" -ForegroundColor Cyan
            $volumes = docker volume ls --format "{{.Name}}" | Select-String "postgres_data"
            if ($volumes) {
                $volumes | ForEach-Object { Write-Host $_.Line }
            }
            else {
                Write-Host "No postgres_data volume found yet (it will be created on first up)." -ForegroundColor Yellow
            }

            Write-Host "`nTip: avoid 'docker compose down -v' if you want to keep DB data." -ForegroundColor Yellow
        }
        else {
            Write-Host "[DB] Mode: local" -ForegroundColor Cyan
            $serviceName = Get-LocalPgServiceName
            if ($serviceName) {
                Write-Host "PostgreSQL service detected: $serviceName"
                sc.exe query $serviceName | Select-String "STATE"
            }
            else {
                Write-Host "No PostgreSQL Windows service detected." -ForegroundColor Yellow
            }

            $dbUrl = Get-DbUrlFromEnv
            Write-Host "DATABASE_URL (psql-compatible): $dbUrl"
        }
    }

    "up" {
        $effectiveMode = Get-EffectiveMode
        if ($effectiveMode -eq "docker") {
            Ensure-Compose
            Write-Host "[DB] Starting postgres with persistent volume..." -ForegroundColor Cyan
            Invoke-Compose up -d postgres
            Invoke-Compose ps postgres
        }
        else {
            $serviceName = Get-LocalPgServiceName
            if (-not $serviceName) {
                throw "No PostgreSQL service detected. Install PostgreSQL or use -Mode docker."
            }

            Write-Host "[DB] Starting local service $serviceName..." -ForegroundColor Cyan
            net start $serviceName
        }
    }

    "stop" {
        $effectiveMode = Get-EffectiveMode
        if ($effectiveMode -eq "docker") {
            Ensure-Compose
            Write-Host "[DB] Stopping postgres container (volume is kept)." -ForegroundColor Cyan
            Invoke-Compose stop postgres
        }
        else {
            $serviceName = Get-LocalPgServiceName
            if (-not $serviceName) {
                throw "No PostgreSQL service detected."
            }

            Write-Host "[DB] Stopping local service $serviceName" -ForegroundColor Cyan
            net stop $serviceName
        }
    }

    "psql" {
        $effectiveMode = Get-EffectiveMode
        if ($effectiveMode -eq "docker") {
            Ensure-Compose
            $containerId = Get-PostgresContainerId
            if (-not $containerId) {
                throw "Postgres container is not running. Run: .\infra\scripts\db.ps1 -Action up"
            }

            Write-Host "[DB] Opening psql shell..." -ForegroundColor Cyan
            Invoke-Compose exec postgres psql -U healthos -d healthos
        }
        else {
            $dbUrl = Get-DbUrlFromEnv
            Write-Host "[DB] Opening local psql shell..." -ForegroundColor Cyan
            Use-LocalPsql $dbUrl
        }
    }

    "tables" {
        $effectiveMode = Get-EffectiveMode
        if ($effectiveMode -eq "docker") {
            Ensure-Compose
            $containerId = Get-PostgresContainerId
            if (-not $containerId) {
                throw "Postgres container is not running. Run: .\infra\scripts\db.ps1 -Action up"
            }

            Write-Host "[DB] Listing tables" -ForegroundColor Cyan
            Invoke-Compose exec postgres psql -U healthos -d healthos -c "\dt"
        }
        else {
            $dbUrl = Get-DbUrlFromEnv
            Write-Host "[DB] Listing tables (local)" -ForegroundColor Cyan
            Use-LocalPsql $dbUrl -c "\dt"
        }
    }

    "migrate" {
        Write-Host "[DB] Running python -m alembic upgrade head in backend" -ForegroundColor Cyan
        Push-Location $BackendDir
        try {
            $pyExe = ".venv\Scripts\python.exe"
            if (-not (Test-Path $pyExe)) {
                throw "Backend virtual environment is missing. Create it first in backend/.venv"
            }
            & $pyExe -m alembic upgrade head
        }
        finally {
            Pop-Location
        }
    }

    "dump" {
        $outputPath = Resolve-BackupPath
        $effectiveMode = Get-EffectiveMode
        if ($effectiveMode -eq "docker") {
            Ensure-Compose
            $containerId = Get-PostgresContainerId
            if (-not $containerId) {
                throw "Postgres container is not running. Run: .\infra\scripts\db.ps1 -Action up"
            }

            Write-Host "[DB] Creating backup (docker) => $outputPath" -ForegroundColor Cyan
            $sql = Invoke-Compose exec -T postgres pg_dump -U healthos -d healthos
            $sql | Out-File -FilePath $outputPath -Encoding utf8
        }
        else {
            $dbUrl = Get-DbUrlFromEnv
            $password = Get-DbPassword
            if ($password) {
                $env:PGPASSWORD = $password
            }
            try {
                Write-Host "[DB] Creating backup (local) => $outputPath" -ForegroundColor Cyan
                Use-LocalPgDump $dbUrl -f $outputPath
            }
            finally {
                Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
            }
        }

        Write-Host "[DB] Backup completed: $outputPath" -ForegroundColor Green
    }

    "restore" {
        $restorePath = Ensure-RestoreFile
        $effectiveMode = Get-EffectiveMode
        if ($effectiveMode -eq "docker") {
            Ensure-Compose
            $containerId = Get-PostgresContainerId
            if (-not $containerId) {
                throw "Postgres container is not running. Run: .\infra\scripts\db.ps1 -Action up"
            }

            Write-Host "[DB] Restoring backup (docker) from $restorePath" -ForegroundColor Cyan
            Get-Content -Raw -Path $restorePath | Invoke-Compose exec -T postgres psql -U healthos -d healthos
        }
        else {
            $dbUrl = Get-DbUrlFromEnv
            $password = Get-DbPassword
            if ($password) {
                $env:PGPASSWORD = $password
            }
            try {
                Write-Host "[DB] Restoring backup (local) from $restorePath" -ForegroundColor Cyan
                Use-LocalPsql $dbUrl -f $restorePath
            }
            finally {
                Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
            }
        }

        Write-Host "[DB] Restore completed." -ForegroundColor Green
    }
}
