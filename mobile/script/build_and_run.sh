#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-start}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

show_usage() {
  cat <<'USAGE'
usage: ./script/build_and_run.sh [mode]

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
USAGE
}

run_npm_script() {
  local script_name="$1"
  shift || true

  if command -v npm >/dev/null 2>&1; then
    exec npm run "$script_name" -- "$@"
  fi

  echo "npm is required to run this Expo app." >&2
  exit 127
}

run_expo() {
  if [[ -n "${EXPO_CLI:-}" ]]; then
    # Optional escape hatch for machines that need a wrapper command.
    # shellcheck disable=SC2206
    local expo_cmd=(${EXPO_CLI})
    exec "${expo_cmd[@]}" "$@"
  fi

  if command -v npx >/dev/null 2>&1; then
    exec npx expo "$@"
  fi

  echo "npx is required to run Expo when EXPO_CLI is not set." >&2
  exit 127
}

run_doctor() {
  if command -v npx >/dev/null 2>&1; then
    exec npx expo-doctor
  fi

  echo "npx is required to run Expo diagnostics." >&2
  exit 127
}

case "$MODE" in
  start|run)
    run_npm_script start
    ;;
  --android|android)
    run_npm_script android
    ;;
  --android-native|android-native)
    run_npm_script android:native
    ;;
  --ios|ios)
    run_npm_script ios
    ;;
  --dev-client|dev-client)
    run_expo start --dev-client
    ;;
  --tunnel|tunnel)
    run_expo start --tunnel
    ;;
  --doctor|doctor)
    run_doctor
    ;;
  --help|help)
    show_usage
    ;;
  *)
    show_usage >&2
    exit 2
    ;;
esac
