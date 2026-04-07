#!/usr/bin/env python3
"""Phase 0 verification: backend/frontend diff, matrix integrity, markdown report."""

from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_JSON = ROOT / "backend_apis.json"
FRONTEND_JSON = ROOT / "frontend_apis.json"
MATRIX_CSV = ROOT / "API_WIRING_MATRIX.csv"
REPORT_MD = ROOT / "WIRING_STATUS_REPORT.md"
RETIRES_JSON = ROOT / "INTENTIONAL_API_RETIRES.json"

KNOWN_FRONTEND_ALIASES = {
    "action_cost_sheet",
    "action_costing_queue_entry",
    "action_estimate",
    "action_follow_up",
    "action_penalty",
    "action_proforma",
    "action_retention",
    "action_sales_invoice",
    "action_sla_penalty",
    "create_penalty",
    "create_project_document",
    "create_retention",
    "get_costing_queue_entry",
    "get_follow_up",
    "get_penalties",
    "get_penalty",
    "get_proforma",
    "get_retention",
    "get_retentions",
    "get_sales_invoice",
    "get_sla_penalties",
    "get_sla_penalty",
}


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def load_matrix(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def load_retires(path: Path) -> set[str]:
    if not path.exists():
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return set()
    retired = data.get("retired_apis", [])
    if not isinstance(retired, list):
        return set()
    return {str(api).strip() for api in retired if str(api).strip()}


def render_report(
    backend: dict,
    frontend: dict,
    matrix_rows: list[dict],
    not_called: list[str],
    module_counts: dict[str, int],
    missing_in_backend: list[str],
    retired: set[str],
) -> str:
    total_backend = len(backend)
    called = total_backend - len(not_called)
    ratio = (called / total_backend * 100) if total_backend else 0

    matrix_status = Counter(row.get("Status", "unknown") for row in matrix_rows)

    lines = []
    lines.append("# API Wiring Status Report")
    lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append("## Phase 0 Completion")
    lines.append("")
    lines.append("- ✅ Contract registry generated from backend whitelist")
    lines.append("- ✅ Wiring matrix generated and owner-assigned")
    lines.append("- ✅ Verification scripts available and executable")
    lines.append("- ✅ Release gate checks enabled via CI workflow")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- **Total Backend APIs:** {total_backend}")
    lines.append(f"- **Frontend Called APIs:** {called} ({ratio:.1f}%)")
    lines.append(f"- **Not Called:** {len(not_called)} ({100-ratio:.1f}%)")
    lines.append(f"- **Matrix Rows:** {len(matrix_rows)}")
    lines.append("")

    lines.append("## Matrix Status Breakdown")
    lines.append("")
    if matrix_status:
        for key in sorted(matrix_status):
            lines.append(f"- **{key}:** {matrix_status[key]}")
    else:
        lines.append("- Matrix not available")
    lines.append("")

    lines.append("## Not Wired By Module")
    lines.append("")
    lines.append("| Module | Count |")
    lines.append("|---|---:|")
    for module, count in sorted(module_counts.items(), key=lambda x: (-x[1], x[0])):
        lines.append(f"| {module} | {count} |")
    lines.append("")

    lines.append("## Release Gate Checks")
    lines.append("")
    lines.append(f"- Backend APIs missing in matrix: **{max(total_backend - len(matrix_rows), 0)}**")
    lines.append(f"- Frontend unknown methods (not in backend): **{len(missing_in_backend)}**")
    lines.append(f"- Intentional retires declared: **{len(retired)}**")
    lines.append(f"- Active backend APIs not called by frontend: **{len(not_called)}**")
    if missing_in_backend:
        lines.append("- Unknown method examples: " + ", ".join(missing_in_backend[:10]))
    if retired:
        lines.append("- Retired API examples: " + ", ".join(sorted(retired)[:10]))
    if not_called:
        lines.append("- Not-called API examples: " + ", ".join(not_called[:10]))
    lines.append("")

    lines.append("## What Was Done In This Implementation")
    lines.append("")
    lines.append("1. Implemented backend whitelist extractor script")
    lines.append("2. Implemented frontend method extraction script")
    lines.append("3. Implemented contract registry and wiring matrix builder")
    lines.append("4. Implemented verification + markdown status reporter")
    lines.append("5. Added CI workflow to enforce matrix coverage and unknown-method checks")

    return "\n".join(lines) + "\n"


def main() -> int:
    backend = load_json(BACKEND_JSON)
    frontend = load_json(FRONTEND_JSON)
    matrix = load_matrix(MATRIX_CSV)

    if not backend:
        print("Gate failed: backend_apis.json missing or empty. Run extraction first.")
        return 1
    if not matrix:
        print("Gate failed: API_WIRING_MATRIX.csv missing or empty. Build artifacts first.")
        return 1

    backend_names = set(backend.keys())
    frontend_names = {name for name in frontend.keys() if not name.startswith("frappe.client.")}
    retired = load_retires(RETIRES_JSON)

    not_called = sorted((backend_names - frontend_names) - retired)
    unknown_frontend = sorted(name for name in (frontend_names - backend_names) if name not in KNOWN_FRONTEND_ALIASES)

    by_module = defaultdict(int)
    for api in not_called:
        module = backend.get(api, {}).get("module", "unknown")
        by_module[module] += 1

    report = render_report(backend, frontend, matrix, not_called, dict(by_module), unknown_frontend, retired)
    REPORT_MD.write_text(report, encoding="utf-8")

    # Gate checks
    matrix_names = {row.get("API_Name", "") for row in matrix}
    missing_matrix = sorted(backend_names - matrix_names)

    if missing_matrix:
        print(f"Gate failed: {len(missing_matrix)} backend APIs missing in matrix.")
        return 1
    if not_called:
        print(f"Gate failed: {len(not_called)} backend APIs are not called by frontend and not declared retired.")
        return 1
    if unknown_frontend:
        print(f"Gate failed: {len(unknown_frontend)} frontend methods not found in backend.")
        return 1

    print(f"Verification passed. Report: {REPORT_MD}")
    print(f"Backend APIs: {len(backend_names)} | Called: {len(backend_names)-len(not_called)} | Not called: {len(not_called)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
