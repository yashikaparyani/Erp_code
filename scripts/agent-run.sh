#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BENCH_DIR="$ROOT_DIR/../frappe-bench"
FRONTEND_DIR="$ROOT_DIR/erp_frontend"
PID_DIR="$ROOT_DIR/.agent-pids"
LOG_DIR="$ROOT_DIR/logs"

mkdir -p "$PID_DIR" "$LOG_DIR"

find_existing_pid() {
  local pattern="$1"
  pgrep -f "$pattern" | head -n 1 || true
}

is_healthy() {
  local url="$1"
  curl -sS -m 2 -o /dev/null "$url"
}

start_process() {
  local name="$1"
  local cmd="$2"
  local pattern="$3"
  local health_url="$4"
  local pid_file="$PID_DIR/${name}.pid"
  local log_file="$LOG_DIR/${name}.log"

  if [[ -f "$pid_file" ]]; then
    local existing_pid
    existing_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "${existing_pid:-}" ]] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "$name already running (pid $existing_pid)."
      return 0
    fi
    rm -f "$pid_file"
  fi

  local discovered_pid
  discovered_pid="$(find_existing_pid "$pattern")"
  if [[ -n "${discovered_pid:-}" ]] && is_healthy "$health_url"; then
    echo "$discovered_pid" >"$pid_file"
    echo "$name already available on ${health_url} (pid $discovered_pid)."
    return 0
  fi

  echo "Starting $name..."
  : >"$log_file"
  setsid bash -lc "$cmd" >>"$log_file" 2>&1 < /dev/null &
  local pid=$!
  echo "$pid" >"$pid_file"
  sleep 2
  if kill -0 "$pid" 2>/dev/null || is_healthy "$health_url"; then
    discovered_pid="$(find_existing_pid "$pattern")"
    if [[ -n "${discovered_pid:-}" ]]; then
      echo "$discovered_pid" >"$pid_file"
      pid="$discovered_pid"
    fi
    echo "$name started (pid $pid). Logs: $log_file"
  else
    rm -f "$pid_file"
    echo "$name failed to stay running. Check logs: $log_file"
    return 1
  fi
}

if [[ ! -d "$BENCH_DIR" ]]; then
  echo "Bench folder not found at $BENCH_DIR"
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend folder not found at $FRONTEND_DIR"
  exit 1
fi

start_process \
  "bench" \
  "cd \"$BENCH_DIR\" && source env/bin/activate && exec bench serve --port 8000 --noreload" \
  "bench serve --port 8000 --noreload" \
  "http://127.0.0.1:8000"

start_process \
  "frontend" \
  "cd \"$FRONTEND_DIR\" && exec ./node_modules/.bin/next dev --hostname 0.0.0.0 --port 3000" \
  "next dev --hostname 0.0.0.0 --port 3000|next-server" \
  "http://127.0.0.1:3000"

echo ""
echo "All set. To stop: $ROOT_DIR/scripts/agent-stop.sh"
