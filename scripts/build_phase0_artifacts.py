#!/usr/bin/env python3
"""Build Phase 0 artifacts: contract registry + wiring matrix."""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_JSON = ROOT / "backend_apis.json"
FRONTEND_JSON = ROOT / "frontend_apis.json"
CONTRACT_OUT = ROOT / "API_CONTRACT_REGISTRY.json"
MATRIX_OUT = ROOT / "API_WIRING_MATRIX.csv"

MODULE_OWNER = {
    "accountability_api": "squad-c-audit",
    "admin_api": "squad-c-admin",
    "alerts_api": "squad-c-collab",
    "anda_import_api": "squad-c-data",
    "dms_api": "squad-b-dms",
    "execution_api": "squad-b-execution",
    "finance_api": "squad-a-finance",
    "hr_api": "squad-c-hr",
    "inventory_api": "squad-a-inventory",
    "om_api": "squad-c-om",
    "pm_workspace_api": "squad-b-project",
    "presales_api": "squad-a-presales",
    "procurement_api": "squad-a-procurement",
    "project_api": "squad-b-project",
    "rbac_api": "platform-auth",
    "reporting_api": "squad-c-dashboard",
    "survey_api": "squad-b-execution",
    "system_api": "platform-core",
    "tender_api": "squad-a-presales",
    "api_utils": "platform-core",
}

MUTATION_PREFIXES = (
    "create_",
    "update_",
    "delete_",
    "submit_",
    "approve_",
    "reject_",
    "mark_",
    "toggle_",
    "convert_",
    "close_",
    "start_",
    "stop_",
    "revoke_",
    "assign_",
    "upload_",
)


def _load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _request_schema(arguments: list[str]) -> dict:
    return {
        "type": "object",
        "required": arguments,
        "properties": {arg: {"type": "any"} for arg in arguments},
    }


def _response_schema() -> dict:
    return {
        "type": "object",
        "properties": {
            "message": {"type": "any"},
            "status": {"type": "string"},
            "data": {"type": "any"},
        },
    }


def _is_mutation(api_name: str) -> bool:
    return api_name.startswith(MUTATION_PREFIXES)


def build_contract_registry(backend: dict) -> dict:
    out = {}
    for api_name, meta in sorted(backend.items()):
        args = meta.get("arguments", [])
        methods = meta.get("methods", ["POST"])
        out[api_name] = {
            "module": meta.get("module"),
            "file": meta.get("file"),
            "docstring": meta.get("docstring", ""),
            "arguments": args,
            "method": methods[0] if methods else "POST",
            "request_schema": _request_schema(args),
            "response_schema": _response_schema(),
            "auth_role": meta.get("auth_role", "authenticated"),
            "idempotent": bool(meta.get("idempotent", not _is_mutation(api_name))),
            "last_synced_utc": datetime.now(timezone.utc).isoformat(),
        }
    return out


def build_wiring_matrix(backend: dict, frontend: dict) -> list[dict]:
    rows = []
    for api_name, meta in sorted(backend.items()):
        refs = frontend.get(api_name, [])
        module = meta.get("module", "unknown")
        owner = MODULE_OWNER.get(module, "unassigned")
        route = refs[0]["file"] if refs else ""
        status = "wired" if refs else "not-started"
        rollback = "required" if _is_mutation(api_name) else "optional"

        rows.append(
            {
                "API_Name": api_name,
                "Module": module,
                "Frontend_Route": route,
                "Owner": owner,
                "Status": status,
                "Test_ID": f"it-{api_name}",
                "Rollback_Flag": rollback,
                "Notes": "auto-generated-phase0",
            }
        )
    return rows


def write_matrix(rows: list[dict]) -> None:
    fields = [
        "API_Name",
        "Module",
        "Frontend_Route",
        "Owner",
        "Status",
        "Test_ID",
        "Rollback_Flag",
        "Notes",
    ]
    with MATRIX_OUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    backend = _load_json(BACKEND_JSON)
    frontend = _load_json(FRONTEND_JSON)

    if not backend:
        raise SystemExit("backend_apis.json is missing or empty. Run extract_backend_apis.py first.")

    contract = build_contract_registry(backend)
    CONTRACT_OUT.write_text(json.dumps(contract, indent=2), encoding="utf-8")

    rows = build_wiring_matrix(backend, frontend)
    write_matrix(rows)

    print(f"Contract registry written: {CONTRACT_OUT} ({len(contract)} APIs)")
    print(f"Wiring matrix written: {MATRIX_OUT} ({len(rows)} rows)")


if __name__ == "__main__":
    main()
