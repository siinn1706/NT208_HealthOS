@echo off
setlocal enabledelayedexpansion
title HealthOS - Infrastructure (Redis + PostgreSQL)

echo =======================================================
echo  HealthOS Infrastructure Startup
echo  Redis ^| PostgreSQL
echo =======================================================
echo.

:: ── Redis ─────────────────────────────────────────────────────────────
echo [Redis] Checking installation...
set REDIS_CLI=
set REDIS_SERVER=
set REDIS_CONF=

if exist "C:\Program Files\Redis\redis-cli.exe" (
    set REDIS_CLI=C:\Program Files\Redis\redis-cli.exe
    set REDIS_SERVER=C:\Program Files\Redis\redis-server.exe
    set REDIS_CONF=C:\Program Files\Redis\redis.windows.conf
) else if exist "C:\Redis\redis-cli.exe" (
    set REDIS_CLI=C:\Redis\redis-cli.exe
    set REDIS_SERVER=C:\Redis\redis-server.exe
    set REDIS_CONF=C:\Redis\redis.windows.conf
) else (
    where redis-cli >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "tokens=*" %%i in ('where redis-cli') do set REDIS_CLI=%%i
        for /f "tokens=*" %%i in ('where redis-server') do set REDIS_SERVER=%%i
    )
)

if "!REDIS_CLI!"=="" (
    echo [Redis] Not found. Installing via winget...
    winget install --id Redis.Redis --silent --accept-package-agreements --accept-source-agreements
    if !errorlevel! neq 0 (
        echo [Redis] winget install failed. Install manually: winget install Redis.Redis
        pause ^& exit /b 1
    )
    set REDIS_CLI=C:\Program Files\Redis\redis-cli.exe
    set REDIS_SERVER=C:\Program Files\Redis\redis-server.exe
    set REDIS_CONF=C:\Program Files\Redis\redis.windows.conf
)

"!REDIS_CLI!" ping >nul 2>&1
if !errorlevel! equ 0 (
    echo [Redis] Already running on port 6379. OK
) else (
    echo [Redis] Starting server...
    if exist "!REDIS_CONF!" (
        start "Redis Server" /min "!REDIS_SERVER!" "!REDIS_CONF!"
    ) else (
        start "Redis Server" /min "!REDIS_SERVER!" --port 6379 --loglevel notice
    )
    timeout /t 2 /nobreak >nul
    "!REDIS_CLI!" ping >nul 2>&1
    if !errorlevel! equ 0 (
        echo [Redis] Started OK on port 6379
    ) else (
        echo [Redis] WARNING: Could not confirm Redis is running.
        echo          Try manually: "!REDIS_SERVER!" --port 6379
    )
)

echo.

:: ── PostgreSQL ─────────────────────────────────────────────────────────
echo [PostgreSQL] Checking service...
set PG_SERVICE_NAME=
set PSQL_BIN=

if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set PSQL_BIN=C:\Program Files\PostgreSQL\17\bin
if "!PSQL_BIN!"=="" if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set PSQL_BIN=C:\Program Files\PostgreSQL\16\bin
if "!PSQL_BIN!"=="" if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set PSQL_BIN=C:\Program Files\PostgreSQL\15\bin

sc query postgresql-x64-17 >nul 2>&1
if !errorlevel! equ 0 set PG_SERVICE_NAME=postgresql-x64-17
if "!PG_SERVICE_NAME!"=="" (
    sc query postgresql-x64-16 >nul 2>&1
    if !errorlevel! equ 0 set PG_SERVICE_NAME=postgresql-x64-16
)
if "!PG_SERVICE_NAME!"=="" (
    sc query postgresql-x64-15 >nul 2>&1
    if !errorlevel! equ 0 set PG_SERVICE_NAME=postgresql-x64-15
)
if "!PG_SERVICE_NAME!"=="" (
    sc query postgresql >nul 2>&1
    if !errorlevel! equ 0 set PG_SERVICE_NAME=postgresql
)

if "!PG_SERVICE_NAME!"=="" (
    echo [PostgreSQL] Service not found. Installing via winget...
    winget install --id PostgreSQL.PostgreSQL.17 --silent --accept-package-agreements --accept-source-agreements
    if !errorlevel! neq 0 (
        echo [PostgreSQL] winget install failed.
        echo             Install manually: winget install PostgreSQL.PostgreSQL.17
    ) else (
        set PG_SERVICE_NAME=postgresql-x64-17
        set PSQL_BIN=C:\Program Files\PostgreSQL\17\bin
    )
)

if not "!PG_SERVICE_NAME!"=="" (
    sc query "!PG_SERVICE_NAME!" | findstr "RUNNING" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [PostgreSQL] Service '!PG_SERVICE_NAME!' already running. OK
    ) else (
        echo [PostgreSQL] Starting service '!PG_SERVICE_NAME!'...
        net start "!PG_SERVICE_NAME!" >nul 2>&1
        if !errorlevel! equ 0 (
            echo [PostgreSQL] Started OK
        ) else (
            echo [PostgreSQL] WARNING: Could not start service.
            echo              Try (as Admin): net start !PG_SERVICE_NAME!
        )
    )

    if not "!PSQL_BIN!"=="" (
        echo [PostgreSQL] Ensuring user and database 'healthos' exist...
        set PGPASSWORD=
        "!PSQL_BIN!\psql" -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='healthos'" 2>nul | findstr "1" >nul 2>&1
        if !errorlevel! neq 0 (
            "!PSQL_BIN!\psql" -U postgres -c "CREATE USER healthos WITH PASSWORD 'healthos_dev_pass';" >nul 2>&1
            echo [PostgreSQL] User 'healthos' created.
        )
        "!PSQL_BIN!\psql" -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='healthos'" 2>nul | findstr "1" >nul 2>&1
        if !errorlevel! neq 0 (
            "!PSQL_BIN!\psql" -U postgres -c "CREATE DATABASE healthos OWNER healthos;" >nul 2>&1
            echo [PostgreSQL] Database 'healthos' created.
        )
        echo [PostgreSQL] Database ready.
    ) else (
        echo [PostgreSQL] psql.exe not found. Skipping DB creation check.
        echo             Run manually if needed: createdb -U postgres healthos
    )
)

echo.
echo =======================================================
echo  Infrastructure ready:
echo    Redis    : localhost:6379
echo    Postgres : localhost:5432  db=healthos user=healthos
echo =======================================================
echo.
