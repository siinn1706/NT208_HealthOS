@echo off
setlocal enabledelayedexpansion
title HealthOS — Infrastructure (Redis + PostgreSQL)

echo =======================================================
echo  HealthOS Infrastructure Startup
echo  Redis ^| PostgreSQL
echo =======================================================
echo.

:: ── Redis ─────────────────────────────────────────────────────────────
echo [Redis] Checking installation...
set REDIS_CLI=
set REDIS_SERVER=
for %%P in (
    "C:\Program Files\Redis"
    "C:\Redis"
    "%PROGRAMFILES%\Redis"
) do (
    if exist "%%~P\redis-cli.exe" (
        set REDIS_CLI=%%~P\redis-cli.exe
        set REDIS_SERVER=%%~P\redis-server.exe
        set REDIS_CONF=%%~P\redis.windows.conf
    )
)

if "!REDIS_CLI!"=="" (
    echo [Redis] Not found. Installing via winget...
    winget install --id Redis.Redis --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo [Redis] winget install failed. Install manually: winget install Redis.Redis
        pause & exit /b 1
    )
    set REDIS_CLI=C:\Program Files\Redis\redis-cli.exe
    set REDIS_SERVER=C:\Program Files\Redis\redis-server.exe
    set REDIS_CONF=C:\Program Files\Redis\redis.windows.conf
)

"!REDIS_CLI!" ping >nul 2>&1
if %errorlevel% equ 0 (
    echo [Redis] Already running on port 6379. OK
) else (
    echo [Redis] Starting server...
    start "Redis Server" /min "!REDIS_SERVER!" "!REDIS_CONF!"
    timeout /t 2 /nobreak >nul
    "!REDIS_CLI!" ping >nul 2>&1
    if %errorlevel% equ 0 (
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
for %%P in (
    "C:\Program Files\PostgreSQL\17\bin"
    "C:\Program Files\PostgreSQL\16\bin"
    "C:\Program Files\PostgreSQL\15\bin"
) do (
    if exist "%%~P\psql.exe" (
        if "!PSQL_BIN!"=="" set PSQL_BIN=%%~P
    )
)

for %%N in (postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql) do (
    if "!PG_SERVICE_NAME!"=="" (
        sc query %%N >nul 2>&1
        if %errorlevel% equ 0 set PG_SERVICE_NAME=%%N
    )
)

if "!PG_SERVICE_NAME!"=="" (
    echo [PostgreSQL] Service not found. Installing via winget...
    winget install --id PostgreSQL.PostgreSQL.17 --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo [PostgreSQL] winget install failed.
        echo             Install manually: winget install PostgreSQL.PostgreSQL.17
    ) else (
        set PG_SERVICE_NAME=postgresql-x64-17
        set PSQL_BIN=C:\Program Files\PostgreSQL\17\bin
    )
)

if not "!PG_SERVICE_NAME!"=="" (
    sc query "!PG_SERVICE_NAME!" | findstr "RUNNING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [PostgreSQL] Service '!PG_SERVICE_NAME!' already running. OK
    ) else (
        echo [PostgreSQL] Starting service '!PG_SERVICE_NAME!'...
        net start "!PG_SERVICE_NAME!" >nul 2>&1
        if %errorlevel% equ 0 (
            echo [PostgreSQL] Started OK
        ) else (
            echo [PostgreSQL] WARNING: Could not start service.
            echo              Try (as Admin): net start !PG_SERVICE_NAME!
        )
    )

    :: Ensure healthos DB and user exist
    if not "!PSQL_BIN!"=="" (
        echo [PostgreSQL] Ensuring user and database 'healthos' exist...
        set PGPASSWORD=
        "!PSQL_BIN!\psql" -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='healthos'" 2>nul | findstr "1" >nul 2>&1
        if %errorlevel% neq 0 (
            "!PSQL_BIN!\psql" -U postgres -c "CREATE USER healthos WITH PASSWORD 'healthos_dev_pass';" >nul 2>&1
            echo [PostgreSQL] User 'healthos' created.
        )
        "!PSQL_BIN!\psql" -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='healthos'" 2>nul | findstr "1" >nul 2>&1
        if %errorlevel% neq 0 (
            "!PSQL_BIN!\psql" -U postgres -c "CREATE DATABASE healthos OWNER healthos;" >nul 2>&1
            echo [PostgreSQL] Database 'healthos' created.
        )
        echo [PostgreSQL] Database ready.
    )
)

echo.
echo =======================================================
echo  Infrastructure ready:
echo    Redis    : localhost:6379
echo    Postgres : localhost:5432  db=healthos user=healthos
echo =======================================================
echo.


:: ── Redis ─────────────────────────────────────────────────────────────
echo [Redis] Checking installation...
where redis-server >nul 2>&1
if %errorlevel% neq 0 (
    echo [Redis] Not found. Installing via winget...
    winget install --id Redis.Redis --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo [Redis] winget install failed. Try manually: winget install Redis.Redis
        pause & exit /b 1
    )
    :: Reload PATH
    for /f "tokens=*" %%i in ('where redis-server 2^>nul') do set REDIS_EXE=%%i
) else (
    for /f "tokens=*" %%i in ('where redis-server') do set REDIS_EXE=%%i
)

:: Check if already running
redis-cli ping >nul 2>&1
if %errorlevel% equ 0 (
    echo [Redis] Already running on port 6379. OK
) else (
    echo [Redis] Starting server...
    start "Redis Server" /min redis-server --port 6379 --loglevel notice
    timeout /t 2 /nobreak >nul
    redis-cli ping >nul 2>&1
    if %errorlevel% equ 0 (
        echo [Redis] Started OK on port 6379
    ) else (
        echo [Redis] WARNING: Could not confirm Redis is running.
    )
)

echo.

:: ── PostgreSQL ─────────────────────────────────────────────────────────
echo [PostgreSQL] Checking service...
sc query postgresql-x64-17 >nul 2>&1
set PG_SERVICE_NAME=
if %errorlevel% equ 0 set PG_SERVICE_NAME=postgresql-x64-17
if "!PG_SERVICE_NAME!"=="" (
    sc query postgresql-x64-16 >nul 2>&1
    if %errorlevel% equ 0 set PG_SERVICE_NAME=postgresql-x64-16
)
if "!PG_SERVICE_NAME!"=="" (
    sc query postgresql >nul 2>&1
    if %errorlevel% equ 0 set PG_SERVICE_NAME=postgresql
)

if "!PG_SERVICE_NAME!"=="" (
    echo [PostgreSQL] Service not found. Installing via winget...
    winget install --id PostgreSQL.PostgreSQL.17 --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo [PostgreSQL] winget install failed.
        echo             Try manually: winget install PostgreSQL.PostgreSQL.17
        echo             Or run: wsl sudo apt-get install postgresql
    ) else (
        :: After install, find the service
        for /f "tokens=1" %%s in ('sc query type= all state= all ^| findstr /i "SERVICE_NAME.*postgresql"') do (
            set PG_SERVICE_NAME=%%s
        )
    )
)

if not "!PG_SERVICE_NAME!"=="" (
    sc query "!PG_SERVICE_NAME!" | findstr "RUNNING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [PostgreSQL] Service '!PG_SERVICE_NAME!' already running. OK
    ) else (
        echo [PostgreSQL] Starting service '!PG_SERVICE_NAME!'...
        net start "!PG_SERVICE_NAME!" >nul 2>&1
        if %errorlevel% equ 0 (
            echo [PostgreSQL] Started OK
        ) else (
            echo [PostgreSQL] WARNING: Could not start service. Try: net start !PG_SERVICE_NAME!
        )
    )

    :: Ensure healthos DB and user exist
    echo [PostgreSQL] Ensuring database 'healthos' exists...
    set PGPASSWORD=
    for %%P in ("%PROGRAMFILES%\PostgreSQL\17\bin" "%PROGRAMFILES%\PostgreSQL\16\bin") do (
        if exist "%%~P\psql.exe" set PSQL_BIN=%%~P
    )
    if not "!PSQL_BIN!"=="" (
        "!PSQL_BIN!\psql" -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='healthos'" 2>nul | findstr "1" >nul 2>&1
        if %errorlevel% neq 0 (
            echo [PostgreSQL] Creating user 'healthos'...
            "!PSQL_BIN!\psql" -U postgres -c "CREATE USER healthos WITH PASSWORD 'healthos_dev_pass';" 2>nul
        )
        "!PSQL_BIN!\psql" -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='healthos'" 2>nul | findstr "1" >nul 2>&1
        if %errorlevel% neq 0 (
            echo [PostgreSQL] Creating database 'healthos'...
            "!PSQL_BIN!\psql" -U postgres -c "CREATE DATABASE healthos OWNER healthos;" 2>nul
        )
        echo [PostgreSQL] Database ready.
    ) else (
        echo [PostgreSQL] psql.exe not found in common paths. Skipping DB creation check.
        echo             Run manually if needed: createdb -U postgres healthos
    )
)

echo.
echo =======================================================
echo  Done. Infrastructure services are up (or instructions above).
echo  Redis  : localhost:6379
echo  Postgres: localhost:5432  db=healthos user=healthos
echo =======================================================
echo.
