#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.agent-pids"

stop_targets() {
  local pid="$1"
  if kill -0 "$pid" 2>/dev/null; then
    kill "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "-$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
    fi
  fi
}

stop_process() {
  local name="$1"
  local pattern="$2"
  local pid_file="$PID_DIR/${name}.pid"

  if [[ ! -f "$pid_file" ]]; then
    local matched
    matched="$(pgrep -f "$pattern" || true)"
    if [[ -z "${matched:-}" ]]; then
      echo "$name is not running."
      return 0
    fi
    echo "Stopping $name from process scan..."
    while IFS= read -r pid; do
      [[ -n "${pid:-}" ]] && stop_targets "$pid"
    done <<< "$matched"
    return 0
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -z "${pid:-}" ]]; then
    rm -f "$pid_file"
    echo "$name pid file empty. Cleaned up."
    return 0
  fi

  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping $name (pid $pid)..."
    stop_targets "$pid"
  else
    echo "$name not running (stale pid $pid)."
    local matched
    matched="$(pgrep -f "$pattern" || true)"
    while IFS= read -r scanned_pid; do
      [[ -n "${scanned_pid:-}" ]] && stop_targets "$scanned_pid"
    done <<< "$matched"
  fi

  rm -f "$pid_file"
}

stop_process "frontend" "next dev --hostname 0.0.0.0 --port 3000|next-server"
stop_process "bench" "bench serve --port 8000 --noreload"
