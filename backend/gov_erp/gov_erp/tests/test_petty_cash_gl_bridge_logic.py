"""Regression tests for GE Petty Cash → ERPNext GL bridge.

Tests are pure structural / AST-level — no running Frappe site required.
They verify:
  - _post_petty_cash_to_gl helper exists and has correct structure
  - idempotency guard (linked_journal_entry check)
  - failure-safety (try/except + frappe.log_error)
  - Journal Entry construction (Dr expense, Cr cash, correct fields)
  - approve_petty_cash_entry wires the bridge after commit
  - linked_journal_entry field exists in the doctype JSON
  - the bridge helper is private (not @frappe.whitelist())

Layer: structural (AST + source + JSON inspection)
"""

import ast
import json
from pathlib import Path

import pytest

_APP_ROOT = Path(__file__).resolve().parents[1]
_FINANCE_API = _APP_ROOT / "finance_api.py"
_PETTY_CASH_JSON = _APP_ROOT / "gov_erp" / "doctype" / "ge_petty_cash" / "ge_petty_cash.json"

_SOURCE = _FINANCE_API.read_text()
_TREE = ast.parse(_SOURCE)


# ── helpers ────────────────────────────────────────────────────────────────────

def _get_function(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return node
    return None


def _function_source(name):
    lines = _SOURCE.splitlines()
    node = _get_function(_TREE, name)
    if node is None:
        return ""
    end = getattr(node, "end_lineno", None)
    if end:
        return "\n".join(lines[node.lineno - 1: end])
    return "\n".join(lines[node.lineno - 1: node.lineno + 80])


# ── Doctype JSON ───────────────────────────────────────────────────────────────

def test_petty_cash_doctype_json_exists():
    assert _PETTY_CASH_JSON.exists(), "ge_petty_cash.json not found"


def test_petty_cash_doctype_has_linked_journal_entry_field():
    data = json.loads(_PETTY_CASH_JSON.read_text())
    fieldnames = [f["fieldname"] for f in data["fields"]]
    assert "linked_journal_entry" in fieldnames


def test_petty_cash_linked_journal_entry_is_link_to_journal_entry():
    data = json.loads(_PETTY_CASH_JSON.read_text())
    field = next(f for f in data["fields"] if f["fieldname"] == "linked_journal_entry")
    assert field["fieldtype"] == "Link"
    assert field["options"] == "Journal Entry"


def test_petty_cash_linked_journal_entry_is_read_only():
    data = json.loads(_PETTY_CASH_JSON.read_text())
    field = next(f for f in data["fields"] if f["fieldname"] == "linked_journal_entry")
    assert field.get("read_only") == 1


def test_petty_cash_linked_journal_entry_in_field_order():
    data = json.loads(_PETTY_CASH_JSON.read_text())
    assert "linked_journal_entry" in data["field_order"]


# ── _post_petty_cash_to_gl function ──────────────────────────────────────────

def test_post_petty_cash_to_gl_exists():
    assert _get_function(_TREE, "_post_petty_cash_to_gl") is not None


def test_post_petty_cash_to_gl_is_idempotent():
    src = _function_source("_post_petty_cash_to_gl")
    assert "linked_journal_entry" in src


def test_post_petty_cash_to_gl_is_failure_safe():
    src = _function_source("_post_petty_cash_to_gl")
    assert "try:" in src
    assert "frappe.log_error" in src


def test_post_petty_cash_to_gl_creates_journal_entry():
    src = _function_source("_post_petty_cash_to_gl")
    assert '"Journal Entry"' in src or "'Journal Entry'" in src


def test_post_petty_cash_to_gl_debits_expense_account():
    src = _function_source("_post_petty_cash_to_gl")
    assert "debit_in_account_currency" in src
    assert "expense_account" in src


def test_post_petty_cash_to_gl_credits_cash_account():
    src = _function_source("_post_petty_cash_to_gl")
    assert "credit_in_account_currency" in src
    assert "cash_account" in src


def test_post_petty_cash_to_gl_submits_je():
    src = _function_source("_post_petty_cash_to_gl")
    assert "je.submit()" in src


def test_post_petty_cash_to_gl_sets_link_back():
    src = _function_source("_post_petty_cash_to_gl")
    assert "linked_journal_entry" in src
    assert "je.name" in src


def test_post_petty_cash_to_gl_skips_zero_amount():
    src = _function_source("_post_petty_cash_to_gl")
    assert "<= 0" in src or "== 0" in src


def test_post_petty_cash_to_gl_derives_company():
    src = _function_source("_post_petty_cash_to_gl")
    assert "_get_default_company" in src or "linked_project" in src


def test_post_petty_cash_to_gl_uses_entry_date():
    src = _function_source("_post_petty_cash_to_gl")
    assert "entry_date" in src


def test_post_petty_cash_to_gl_includes_project_on_je_line():
    src = _function_source("_post_petty_cash_to_gl")
    assert "linked_project" in src
    assert '"project"' in src or "'project'" in src


def test_post_petty_cash_to_gl_fallback_accounts():
    """Must check if expense and cash accounts exist before using them."""
    src = _function_source("_post_petty_cash_to_gl")
    assert "frappe.db.exists" in src


def test_post_petty_cash_to_gl_uses_miscellaneous_expenses_as_default():
    src = _function_source("_post_petty_cash_to_gl")
    assert "Miscellaneous Expenses" in src


def test_post_petty_cash_to_gl_uses_cash_as_default():
    src = _function_source("_post_petty_cash_to_gl")
    assert '"Cash"' in src or "'Cash'" in src or "Cash -" in src


# ── approve_petty_cash_entry wiring ───────────────────────────────────────────

def test_approve_petty_cash_entry_calls_bridge():
    src = _function_source("approve_petty_cash_entry")
    assert "_post_petty_cash_to_gl" in src


def test_approve_petty_cash_entry_calls_bridge_after_commit():
    src = _function_source("approve_petty_cash_entry")
    commit_pos = src.find("frappe.db.commit()")
    bridge_pos = src.find("_post_petty_cash_to_gl")
    assert commit_pos != -1 and bridge_pos != -1
    assert bridge_pos > commit_pos, "Bridge must be called after db.commit()"


def test_approve_petty_cash_entry_status_saved_before_bridge():
    src = _function_source("approve_petty_cash_entry")
    save_pos = src.find("doc.save()")
    commit_pos = src.find("frappe.db.commit()")
    bridge_pos = src.find("_post_petty_cash_to_gl")
    assert save_pos < commit_pos < bridge_pos


# ── Bridge helper is private ──────────────────────────────────────────────────

def test_post_petty_cash_to_gl_is_private():
    node = _get_function(_TREE, "_post_petty_cash_to_gl")
    assert node is not None
    for dec in node.decorator_list:
        assert "whitelist" not in ast.dump(dec), (
            "_post_petty_cash_to_gl must NOT be @frappe.whitelist() — internal helper only"
        )


# ── File-level sanity ─────────────────────────────────────────────────────────

def test_finance_api_syntax_still_valid():
    try:
        ast.parse(_SOURCE)
    except SyntaxError as exc:
        pytest.fail(f"finance_api.py has a syntax error after petty cash bridge: {exc}")


# ── Attendance Regularization: keep-custom decision ──────────────────────────

def test_ge_attendance_regularization_doctype_exists():
    """Confirm the custom doctype still exists — it is intentionally kept custom."""
    reg_json = _APP_ROOT / "gov_erp" / "doctype" / "ge_attendance_regularization" / "ge_attendance_regularization.json"
    assert reg_json.exists(), "GE Attendance Regularization doctype JSON not found"


def test_attendance_regularization_writes_back_to_native_attendance():
    """approve_attendance_regularization must write back to native Attendance doctype."""
    hr_api = _APP_ROOT / "hr_api.py"
    src = hr_api.read_text()
    assert '"Attendance"' in src or "'Attendance'" in src
    # Must update the native Attendance record
    assert "attendance_doc.save" in src or "attendance_doc.status" in src


def test_attendance_regularization_has_check_in_out_fields():
    """The EPC-specific check-in/out time correction fields must still exist."""
    reg_json = _APP_ROOT / "gov_erp" / "doctype" / "ge_attendance_regularization" / "ge_attendance_regularization.json"
    data = json.loads(reg_json.read_text())
    fieldnames = [f["fieldname"] for f in data["fields"]]
    assert "requested_check_in" in fieldnames
    assert "requested_check_out" in fieldnames


def test_attendance_regularization_has_epc_specific_statuses():
    """ON_DUTY and WEEK_OFF must exist — these are not in HRMS Attendance Request."""
    reg_json = _APP_ROOT / "gov_erp" / "doctype" / "ge_attendance_regularization" / "ge_attendance_regularization.json"
    data = json.loads(reg_json.read_text())
    status_field = next(f for f in data["fields"] if f["fieldname"] == "requested_status")
    options = status_field.get("options", "")
    assert "ON_DUTY" in options
    assert "WEEK_OFF" in options
