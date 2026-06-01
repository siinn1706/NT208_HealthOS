param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ModeArgs
)

$ErrorActionPreference = "Stop"
$RootDir = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location -LiteralPath $RootDir
$Mode = if ($ModeArgs.Count -gt 0) { $ModeArgs[0] } else { "start" }

function Show-Usage {
  @"
usage: .\script\build_and_run.ps1 [mode]

Modes:
  start, run        Start the Expo dev server
  --android, android
                   Run the Android Expo Go startup path with ADB preflight
  --android-native, android-native
                   Build/run the Android native app path for Health Connect smoke
  --ios, ios        Start Expo and open iOS
  --dev-client, dev-client
                   Start Expo in development-client mode
  --tunnel, tunnel Start Expo using tunnel transport
  --doctor, doctor Run Expo diagnostics
  --help, help     Show this help
"@
}

function Invoke-NpmScript {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptName
  )

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if (-not $npm) {
    Write-Error "npm is required to run this Expo app."
  }

  & $npm.Source run $ScriptName
  exit $LASTEXITCODE
}

function Invoke-Expo {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  if ($env:EXPO_CLI) {
    & $env:EXPO_CLI @Args
    exit $LASTEXITCODE
  }

  $npx = Get-Command npx -ErrorAction SilentlyContinue
  if (-not $npx) {
    Write-Error "npx is required to run Expo when EXPO_CLI is not set."
  }

  & $npx.Source expo @Args
  exit $LASTEXITCODE
}

function Invoke-Doctor {
  $npx = Get-Command npx -ErrorAction SilentlyContinue
  if (-not $npx) {
    Write-Error "npx is required to run Expo diagnostics."
  }

  & $npx.Source expo-doctor
  exit $LASTEXITCODE
}

switch ($Mode) {
  { $_ -in @("start", "run") } { Invoke-NpmScript -ScriptName "start" }
  { $_ -in @("--android", "android") } { Invoke-NpmScript -ScriptName "android" }
  { $_ -in @("--android-native", "android-native") } { Invoke-NpmScript -ScriptName "android:native" }
  { $_ -in @("--ios", "ios") } { Invoke-NpmScript -ScriptName "ios" }
  { $_ -in @("--dev-client", "dev-client") } { Invoke-Expo start --dev-client }
  { $_ -in @("--tunnel", "tunnel") } { Invoke-Expo start --tunnel }
  { $_ -in @("--doctor", "doctor") } { Invoke-Doctor }
  { $_ -in @("--help", "help") } { Show-Usage }
  default {
    Show-Usage | Write-Error
    exit 2
  }
}
