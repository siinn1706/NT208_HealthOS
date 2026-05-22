# smoke.ps1 — post-deploy smoke test for HealthOS BFF (PowerShell)
# Usage: .\infra\scripts\smoke.ps1 [BASE_URL]
# Env:   SMOKE_BASE_URL   default http://localhost:3000
#        SMOKE_USERNAME   required
#        SMOKE_PASSWORD   required (never echoed)
param([string]$BaseUrl = "")
$ErrorActionPreference = 'Stop'

if (-not $BaseUrl) { $BaseUrl = if ($env:SMOKE_BASE_URL) { $env:SMOKE_BASE_URL } else { "http://localhost:3000" } }
$Username = $env:SMOKE_USERNAME
$Password = $env:SMOKE_PASSWORD

if (-not $Username -or -not $Password) {
    Write-Error "Set SMOKE_USERNAME and SMOKE_PASSWORD env vars."
    exit 1
}

$Session   = $null
$TotalStart = [System.Diagnostics.Stopwatch]::StartNew()

function Invoke-Step {
    param([string]$Name, [int]$Expected, [scriptblock]$Request)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $resp = & $Request
        $sw.Stop()
        $status = [int]$resp.StatusCode
        $rid    = if ($resp.Headers["X-Request-ID"]) { $resp.Headers["X-Request-ID"] } else { "-" }
    } catch {
        $sw.Stop()
        $msg = $_.Exception.Message
        Write-Host ("SMOKE  step={0,-12} FAIL (exception: {1}) elapsed_ms={2}" -f $Name, $msg, $sw.ElapsedMilliseconds) -ForegroundColor Red
        exit 1
    }
    if ($status -eq $Expected) {
        Write-Host ("SMOKE  step={0,-12} status={1} rid={2,-36} elapsed_ms={3} ok" -f $Name, $status, $rid, $sw.ElapsedMilliseconds)
    } else {
        Write-Host ("SMOKE  step={0,-12} status={1} (expected {2}) rid={3,-36} elapsed_ms={4} FAIL" -f $Name, $status, $Expected, $rid, $sw.ElapsedMilliseconds) -ForegroundColor Red
        exit 1
    }
}

# Step 1: health liveness
Invoke-Step "health" 200 {
    Invoke-WebRequest -Uri "$BaseUrl/api/v1/health" -Method GET -SessionVariable script:Session -UseBasicParsing
}

# Step 2: login — establishes session cookies
Invoke-Step "login" 200 {
    $body = @{ identifier = $Username; password = $Password } | ConvertTo-Json
    Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth" -Method POST `
        -Body $body -ContentType "application/json" `
        -WebSession $script:Session -UseBasicParsing
}

# Step 3: protected call (current user)
Invoke-Step "protected" 200 {
    Invoke-WebRequest -Uri "$BaseUrl/api/v1/users/me" -Method GET `
        -WebSession $script:Session -UseBasicParsing
}

# Step 4: token refresh
Invoke-Step "refresh" 200 {
    Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/refresh" -Method POST `
        -WebSession $script:Session -UseBasicParsing
}

# Step 5: logout (DELETE /api/v1/auth/session)
Invoke-Step "logout" 200 {
    Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/session" -Method DELETE `
        -WebSession $script:Session -UseBasicParsing
}

$TotalStart.Stop()
Write-Host ("SMOKE  result=pass total_ms={0}" -f $TotalStart.ElapsedMilliseconds)
