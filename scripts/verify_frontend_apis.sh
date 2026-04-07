#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if command -v python >/dev/null 2>&1; then
	PYTHON_BIN="python"
elif command -v python3 >/dev/null 2>&1; then
	PYTHON_BIN="python3"
elif [ -x "./python.cmd" ]; then
	PYTHON_BIN="./python.cmd"
else
	echo "No python executable found (python/python3/python.cmd)." >&2
	exit 1
fi

"$PYTHON_BIN" scripts/extract_backend_apis.py
"$PYTHON_BIN" scripts/extract_frontend_apis.py
"$PYTHON_BIN" scripts/build_phase0_artifacts.py
"$PYTHON_BIN" scripts/verify_frontend_apis.py

echo "Phase 0 verification completed successfully."
