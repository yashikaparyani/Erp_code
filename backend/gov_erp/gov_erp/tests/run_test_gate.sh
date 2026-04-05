#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# gov_erp backend release gate
# ──────────────────────────────────────────────────────────────
# Exit codes:
#   0 = all gate checks passed
#   1 = one or more gates failed
#
# Usage:
#   ./run_test_gate.sh              # structural + service only (no site needed)
#   ./run_test_gate.sh --full       # includes runtime tests (needs bench site)
# ──────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# SCRIPT_DIR = .../apps/gov_erp/gov_erp/tests
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# APP_ROOT = .../apps/gov_erp

DEFAULT_BENCH_ROOT="$(cd "$APP_ROOT/../.." && pwd)"
ALT_BENCH_ROOT="$(cd "$APP_ROOT/../../.." && pwd)/frappe-bench"

if [ -x "$DEFAULT_BENCH_ROOT/env/bin/python" ]; then
  BENCH_ROOT="$DEFAULT_BENCH_ROOT"
elif [ -x "$ALT_BENCH_ROOT/env/bin/python" ]; then
  BENCH_ROOT="$ALT_BENCH_ROOT"
else
  BENCH_ROOT="$DEFAULT_BENCH_ROOT"
fi

PYTHON_BIN="${PYTHON_BIN:-$BENCH_ROOT/env/bin/python}"
if [ ! -x "$PYTHON_BIN" ]; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
  else
    PYTHON_BIN="$(command -v python)"
  fi
fi

SITE="${BENCH_SITE:-dev.localhost}"
FULL=false

for arg in "$@"; do
  case "$arg" in
    --full) FULL=true ;;
  esac
done

cd "$APP_ROOT"

GATE_PASS=0
GATE_FAIL=0

run_gate() {
  local label="$1"; shift
  echo ""
  echo "━━━ GATE: $label ━━━"
  if "$@"; then
    echo "✓ $label PASSED"
    GATE_PASS=$((GATE_PASS + 1))
  else
    echo "✗ $label FAILED"
    GATE_FAIL=$((GATE_FAIL + 1))
  fi
}

# ── Gate 1: py_compile ────────────────────────────────────────
run_gate "py_compile (api.py)" \
  "$PYTHON_BIN" -m py_compile gov_erp/api.py

run_gate "py_compile (permission_engine.py)" \
  "$PYTHON_BIN" -m py_compile gov_erp/permission_engine.py

run_gate "py_compile (hooks.py)" \
  "$PYTHON_BIN" -m py_compile gov_erp/hooks.py

# ── Gate 2: Structural tests ─────────────────────────────────
run_gate "Structural + service tests" \
  "$PYTHON_BIN" -m pytest gov_erp/tests/ \
    --ignore=gov_erp/tests/test_app_runtime.py \
    --ignore=gov_erp/tests/test_execution_runtime.py \
    --ignore=gov_erp/tests/test_pm_dms_ph_runtime.py \
    -m "structural or service" \
    -q --tb=line --override-ini="addopts="

# ── Gate 3: Service smoke ────────────────────────────────────
run_gate "Service smoke (hook + permission + import integrity)" \
  "$PYTHON_BIN" -m pytest gov_erp/tests/test_service_smoke.py \
    -q --tb=short --override-ini="addopts="

# ── Gate 4: Runtime tests (only with --full) ─────────────────
if $FULL; then
  run_gate "Runtime: execution dependency tests" \
    "$BENCH_ROOT/env/bin/python" -c "
import subprocess, sys
result = subprocess.run(
    ['bench', '--site', '$SITE', 'run-tests', '--app', 'gov_erp',
     '--module', 'gov_erp.tests.test_execution_runtime'],
    cwd='$BENCH_ROOT', capture_output=True, text=True
)
print(result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)
if result.returncode != 0:
    print(result.stderr[-500:] if len(result.stderr) > 500 else result.stderr)
sys.exit(result.returncode)
"

  run_gate "Runtime: full app integration tests" \
    "$BENCH_ROOT/env/bin/python" -c "
import subprocess, sys
result = subprocess.run(
    ['bench', '--site', '$SITE', 'run-tests', '--app', 'gov_erp',
     '--module', 'gov_erp.tests.test_app_runtime'],
    cwd='$BENCH_ROOT', capture_output=True, text=True
)
print(result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)
if result.returncode != 0:
    print(result.stderr[-500:] if len(result.stderr) > 500 else result.stderr)
sys.exit(result.returncode)
"

  run_gate "Runtime: PM request + DMS + PH flows" \
    "$BENCH_ROOT/env/bin/python" -c "
import subprocess, sys
result = subprocess.run(
    ['bench', '--site', '$SITE', 'run-tests', '--app', 'gov_erp',
     '--module', 'gov_erp.tests.test_pm_dms_ph_runtime'],
    cwd='$BENCH_ROOT', capture_output=True, text=True
)
print(result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)
if result.returncode != 0:
    print(result.stderr[-500:] if len(result.stderr) > 500 else result.stderr)
sys.exit(result.returncode)
"
fi

# ── Summary ──────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════"
echo "  GATE SUMMARY: $GATE_PASS passed, $GATE_FAIL failed"
echo "══════════════════════════════════════════════════════════"

if [ "$GATE_FAIL" -gt 0 ]; then
  echo "  ✗ RELEASE GATE FAILED — do not ship"
  exit 1
else
  echo "  ✓ RELEASE GATE PASSED"
  exit 0
fi
