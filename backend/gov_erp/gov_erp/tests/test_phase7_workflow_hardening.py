"""Phase 7 structural tests — workflow invariant hardening.

Verify that:
  1. PROJECT_EDITABLE_FIELDS cannot mutate workflow-controlled fields
  2. Accountability record_and_log calls exist in all critical action functions
  3. DMS document controller enforces a status transition map
  4. Costing queue has a strict VALID_TRANSITIONS map
"""

import ast
import json
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]


def _combined_api_source():
    parts = []
    utils = APP_ROOT / "api_utils.py"
    if utils.exists():
        parts.append(utils.read_text())
    for p in sorted(APP_ROOT.glob("*_api.py")):
        parts.append(p.read_text())
    parts.append((APP_ROOT / "api.py").read_text())
    return "\n".join(parts)


API_SOURCE = _combined_api_source()
API_TREE = ast.parse(API_SOURCE)


def _load_source(rel_path):
    if rel_path == "api.py":
        return API_SOURCE
    return (APP_ROOT / rel_path).read_text()


def _find_top_level_set(name):
    """Return the evaluated set/frozenset assigned to *name* at module level."""
    for node in API_TREE.body:
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            for t in targets:
                if isinstance(t, ast.Name) and t.id == name:
                    return ast.literal_eval(node.value)
    return None


def _function_source(func_name):
    """Return the AST node and raw source lines for a top-level or nested def."""
    for node in ast.walk(API_TREE):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == func_name:
            start = node.lineno - 1
            end = node.end_lineno
            return API_SOURCE.splitlines()[start:end]
    return None


# ── 1. PROJECT_EDITABLE_FIELDS bypass is closed ──────────────────────────

def test_project_editable_fields_excludes_stage():
    """current_project_stage must NOT be in PROJECT_EDITABLE_FIELDS."""
    fields = _find_top_level_set("PROJECT_EDITABLE_FIELDS")
    assert fields is not None, "PROJECT_EDITABLE_FIELDS not found"
    assert "current_project_stage" not in fields, \
        "current_project_stage must be removed from PROJECT_EDITABLE_FIELDS"


def test_project_editable_fields_excludes_stage_status():
    """current_stage_status must NOT be in PROJECT_EDITABLE_FIELDS."""
    fields = _find_top_level_set("PROJECT_EDITABLE_FIELDS")
    assert fields is not None
    assert "current_stage_status" not in fields


# ── 2. Accountability trail completeness ──────────────────────────────────

_FUNCTIONS_REQUIRING_ACCOUNTABILITY = [
    "submit_project_stage_for_approval",
    "approve_project_stage",
    "reject_project_stage",
    "restart_project_stage",
    "override_project_stage",
    "submit_po_to_ph",
    "submit_petty_cash_to_ph",
    "submit_rma_po_to_ph",
    "create_po_from_comparison",
    "submit_invoice",
    "apply_penalty_deduction",
    "approve_invoice",
    "reject_invoice",
    "mark_invoice_paid",
    "cancel_invoice",
    "release_retention",
    "approve_penalty_deduction",
    "reverse_penalty_deduction",
]


def test_critical_functions_have_accountability_logging():
    """Every critical workflow action must contain a record_and_log call."""
    missing = []
    for func_name in _FUNCTIONS_REQUIRING_ACCOUNTABILITY:
        lines = _function_source(func_name)
        if lines is None:
            missing.append(f"{func_name} (function not found)")
            continue
        body = "\n".join(lines)
        if "record_and_log" not in body:
            missing.append(func_name)
    assert not missing, f"Missing record_and_log in: {', '.join(missing)}"


def test_costing_queue_action_has_accountability():
    """_costing_queue_action (shared by release/hold/reject) must log."""
    lines = _function_source("_costing_queue_action")
    assert lines is not None, "_costing_queue_action not found"
    body = "\n".join(lines)
    assert "record_and_log" in body


# ── 3. DMS transition map enforcement ────────────────────────────────────

def test_dms_controller_has_transition_map():
    """GE Project Document controller must define VALID_DMS_TRANSITIONS."""
    source = _load_source("gov_erp/doctype/ge_project_document/ge_project_document.py")
    assert "VALID_DMS_TRANSITIONS" in source


def test_dms_transition_map_covers_all_statuses():
    """Every allowed DMS status must appear as a key in the transition map."""
    source = _load_source("gov_erp/doctype/ge_project_document/ge_project_document.py")
    tree = ast.parse(source)
    transitions = None
    allowed = None
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name) and t.id == "VALID_DMS_TRANSITIONS":
                    transitions = ast.literal_eval(node.value)
                if isinstance(t, ast.Name) and t.id == "ALLOWED_DMS_STATUSES":
                    allowed = ast.literal_eval(node.value)
    assert transitions is not None, "VALID_DMS_TRANSITIONS not found"
    assert allowed is not None, "ALLOWED_DMS_STATUSES not found"
    assert set(transitions.keys()) == set(allowed), \
        f"Mismatch: transitions keys={set(transitions.keys())}, allowed={set(allowed)}"


def test_dms_validate_status_enforces_transitions():
    """_validate_status must reference VALID_DMS_TRANSITIONS to block illegal jumps."""
    source = _load_source("gov_erp/doctype/ge_project_document/ge_project_document.py")
    assert "VALID_DMS_TRANSITIONS" in source
    # Check that the transition check is in _validate_status
    in_validate = False
    for line in source.splitlines():
        if "def _validate_status" in line:
            in_validate = True
        elif in_validate and line.strip().startswith("def "):
            break
        if in_validate and "VALID_DMS_TRANSITIONS" in line:
            return  # found it
    assert False, "_validate_status does not reference VALID_DMS_TRANSITIONS"


# ── 4. Costing queue transition map ──────────────────────────────────────

def test_costing_queue_has_valid_transitions():
    """_costing_queue_action must define a VALID_TRANSITIONS map."""
    lines = _function_source("_costing_queue_action")
    assert lines is not None
    body = "\n".join(lines)
    assert "VALID_TRANSITIONS" in body


# ── 5. Project stage cannot be set via normalize_project_payload ──────────

def test_normalize_payload_excludes_stage_from_string_fields():
    """_normalize_project_payload string_fields must not include current_project_stage."""
    lines = _function_source("_normalize_project_payload")
    assert lines is not None
    # Find the string_fields list definition and check it doesn't contain the stage field
    in_string_fields = False
    for line in lines:
        stripped = line.strip()
        if "string_fields" in stripped and "[" in stripped:
            in_string_fields = True
        if in_string_fields:
            assert "current_project_stage" not in stripped, \
                "current_project_stage must be removed from string_fields in _normalize_project_payload"
            if "]" in stripped:
                break
