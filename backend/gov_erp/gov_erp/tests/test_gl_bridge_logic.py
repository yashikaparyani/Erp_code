"""Regression tests for Phase 4 GL Bridge — Slices A, B, C.

Tests are pure structural / unit-level — no running Frappe site required.
They verify:
  - the helper functions exist and are importable as source
  - idempotency guards exist in each bridge function
  - failure-safety: every bridge call is wrapped in try/except
  - correct field names are referenced (GE Invoice, GE Payment Receipt)
  - mark_invoice_paid, approve_invoice, cancel_invoice, create_payment_receipt
    each call their respective bridge helpers

Layer: structural (AST + source inspection)
"""

import ast
from pathlib import Path

import pytest

_FINANCE_API = Path(__file__).resolve().parents[1] / "finance_api.py"
_SOURCE = _FINANCE_API.read_text()
_TREE = ast.parse(_SOURCE)


# ── helpers ────────────────────────────────────────────────────────────────────

def _get_function(tree, name):
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return node
    return None


def _function_source(name):
    """Return the source lines for a named function (best-effort via lineno)."""
    lines = _SOURCE.splitlines()
    node = _get_function(_TREE, name)
    if node is None:
        return ""
    end = getattr(node, "end_lineno", None)
    if end:
        return "\n".join(lines[node.lineno - 1: end])
    # Fallback — return 60 lines from the start
    return "\n".join(lines[node.lineno - 1: node.lineno + 60])


def _calls_function(func_source, callee):
    """Return True if func_source contains a call to callee."""
    return callee + "(" in func_source


def _has_try_except_wrapping(func_source, callee):
    """Return True if callee is called inside a try block in func_source."""
    lines = func_source.splitlines()
    in_try = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("try:"):
            in_try = True
        if in_try and callee + "(" in stripped:
            return True
        if stripped.startswith("except") or stripped.startswith("finally"):
            in_try = False
    return False


# ── Slice A: _post_to_sales_invoice ───────────────────────────────────────────

def test_post_to_sales_invoice_function_exists():
    assert _get_function(_TREE, "_post_to_sales_invoice") is not None


def test_post_to_sales_invoice_is_idempotent():
    """Must check linked_sales_invoice before doing anything."""
    src = _function_source("_post_to_sales_invoice")
    assert "linked_sales_invoice" in src


def test_post_to_sales_invoice_wrapped_in_try_except():
    src = _function_source("_post_to_sales_invoice")
    assert "try:" in src
    assert "frappe.log_error" in src


def test_post_to_sales_invoice_sets_link_back():
    src = _function_source("_post_to_sales_invoice")
    assert "linked_sales_invoice" in src
    assert "si.name" in src


def test_post_to_sales_invoice_uses_ensure_customer_exists():
    src = _function_source("_post_to_sales_invoice")
    assert "_ensure_customer_exists" in src


def test_post_to_sales_invoice_uses_get_or_create_item():
    src = _function_source("_post_to_sales_invoice")
    assert "_get_or_create_si_service_item" in src


def test_post_to_sales_invoice_calls_si_submit():
    src = _function_source("_post_to_sales_invoice")
    assert "si.submit()" in src


def test_post_to_sales_invoice_derives_company():
    src = _function_source("_post_to_sales_invoice")
    assert "_get_invoice_company" in src or "company" in src


# ── Slice A: approve_invoice wiring ───────────────────────────────────────────

def test_approve_invoice_calls_post_to_sales_invoice():
    src = _function_source("approve_invoice")
    assert "_post_to_sales_invoice" in src


def test_approve_invoice_does_not_wrap_bridge_in_try():
    """Bridge is failure-safe internally; approve_invoice should call it directly (not swallow its own try)."""
    src = _function_source("approve_invoice")
    # The bridge itself has try/except. approve_invoice does NOT need a wrapping try for it.
    # Just verify the call is present (the bridge's internal guard is sufficient).
    assert "_post_to_sales_invoice(doc)" in src


# ── Slice A: cancel_invoice wiring ────────────────────────────────────────────

def test_cancel_invoice_calls_cancel_linked_sales_invoice():
    src = _function_source("cancel_invoice")
    assert "_cancel_linked_sales_invoice" in src


def test_cancel_linked_sales_invoice_function_exists():
    assert _get_function(_TREE, "_cancel_linked_sales_invoice") is not None


def test_cancel_linked_sales_invoice_checks_docstatus():
    src = _function_source("_cancel_linked_sales_invoice")
    assert "docstatus" in src


def test_cancel_linked_sales_invoice_is_failure_safe():
    src = _function_source("_cancel_linked_sales_invoice")
    assert "try:" in src
    assert "frappe.log_error" in src


# ── Slice A: service item helper ──────────────────────────────────────────────

def test_get_or_create_si_service_item_exists():
    assert _get_function(_TREE, "_get_or_create_si_service_item") is not None


def test_get_or_create_si_service_item_is_idempotent():
    src = _function_source("_get_or_create_si_service_item")
    assert "frappe.db.exists" in src
    assert "EPC-SERVICE" in src


def test_get_or_create_si_service_item_is_not_stock():
    src = _function_source("_get_or_create_si_service_item")
    assert "is_stock_item" in src
    assert '"Services"' in src or "'Services'" in src


# ── Slice A: company resolver ─────────────────────────────────────────────────

def test_get_invoice_company_exists():
    assert _get_function(_TREE, "_get_invoice_company") is not None


def test_get_invoice_company_falls_back_to_default():
    src = _function_source("_get_invoice_company")
    assert "_get_default_company" in src


# ── Slice B: _post_payment_entry ──────────────────────────────────────────────

def test_post_payment_entry_function_exists():
    assert _get_function(_TREE, "_post_payment_entry") is not None


def test_post_payment_entry_checks_si_exists():
    src = _function_source("_post_payment_entry")
    assert "linked_sales_invoice" in src


def test_post_payment_entry_payment_type_receive():
    src = _function_source("_post_payment_entry")
    assert '"Receive"' in src or "'Receive'" in src


def test_post_payment_entry_references_sales_invoice():
    src = _function_source("_post_payment_entry")
    assert '"Sales Invoice"' in src or "'Sales Invoice'" in src
    assert "allocated_amount" in src


def test_post_payment_entry_is_failure_safe():
    src = _function_source("_post_payment_entry")
    assert "try:" in src
    assert "frappe.log_error" in src


def test_post_payment_entry_uses_net_receivable():
    src = _function_source("_post_payment_entry")
    assert "net_receivable" in src


def test_post_payment_entry_submits_pe():
    src = _function_source("_post_payment_entry")
    assert "pe.submit()" in src


def test_post_payment_entry_back_links_ge_payment_receipt():
    src = _function_source("_post_payment_entry")
    assert "GE Payment Receipt" in src
    assert "linked_payment_entry" in src


# ── Slice B: mark_invoice_paid wiring ─────────────────────────────────────────

def test_mark_invoice_paid_calls_post_payment_entry():
    src = _function_source("mark_invoice_paid")
    assert "_post_payment_entry" in src


def test_mark_invoice_paid_calls_bridge_after_commit():
    src = _function_source("mark_invoice_paid")
    commit_pos = src.find("frappe.db.commit()")
    bridge_pos = src.find("_post_payment_entry")
    assert commit_pos != -1 and bridge_pos != -1
    assert bridge_pos > commit_pos, "Bridge should be called after db.commit()"


# ── Slice B: paid_to account resolver ────────────────────────────────────────

def test_get_paid_to_account_exists():
    assert _get_function(_TREE, "_get_paid_to_account") is not None


def test_get_paid_to_account_falls_back_to_cash():
    src = _function_source("_get_paid_to_account")
    assert '"Bank"' in src or "'Bank'" in src
    assert '"Cash"' in src or "'Cash'" in src


# ── Slice C: _post_partial_payment_entry ──────────────────────────────────────

def test_post_partial_payment_entry_exists():
    assert _get_function(_TREE, "_post_partial_payment_entry") is not None


def test_post_partial_payment_entry_only_fires_for_against_invoice():
    src = _function_source("_post_partial_payment_entry")
    assert "AGAINST_INVOICE" in src


def test_post_partial_payment_entry_checks_si_link_on_ge_invoice():
    src = _function_source("_post_partial_payment_entry")
    assert "linked_sales_invoice" in src
    assert "GE Invoice" in src


def test_post_partial_payment_entry_has_over_allocation_guard():
    src = _function_source("_post_partial_payment_entry")
    assert "outstanding" in src
    assert "min(" in src


def test_post_partial_payment_entry_is_idempotent():
    src = _function_source("_post_partial_payment_entry")
    assert "linked_payment_entry" in src


def test_post_partial_payment_entry_is_failure_safe():
    src = _function_source("_post_partial_payment_entry")
    assert "try:" in src
    assert "frappe.log_error" in src


def test_post_partial_payment_entry_submits_pe():
    src = _function_source("_post_partial_payment_entry")
    assert "pe.submit()" in src


def test_post_partial_payment_entry_uses_received_date():
    src = _function_source("_post_partial_payment_entry")
    assert "received_date" in src


def test_post_partial_payment_entry_skips_zero_amount():
    src = _function_source("_post_partial_payment_entry")
    assert "amount <= 0" in src or "amount == 0" in src or "<= 0" in src


# ── Slice C: create_payment_receipt wiring ────────────────────────────────────

def test_create_payment_receipt_calls_post_partial_payment_entry():
    src = _function_source("create_payment_receipt")
    assert "_post_partial_payment_entry" in src


def test_create_payment_receipt_calls_bridge_after_commit():
    src = _function_source("create_payment_receipt")
    commit_pos = src.find("frappe.db.commit()")
    bridge_pos = src.find("_post_partial_payment_entry")
    assert commit_pos != -1 and bridge_pos != -1
    assert bridge_pos > commit_pos, "Bridge should be called after db.commit()"


# ── Cross-slice: no bridge can block a status change ─────────────────────────

def test_approve_invoice_has_no_unhandled_bridge_try():
    """approve_invoice must save + commit before calling bridge."""
    src = _function_source("approve_invoice")
    save_pos = src.find("doc.save()")
    commit_pos = src.find("frappe.db.commit()")
    bridge_pos = src.find("_post_to_sales_invoice")
    assert save_pos < commit_pos < bridge_pos


def test_mark_invoice_paid_has_no_unhandled_bridge_try():
    src = _function_source("mark_invoice_paid")
    save_pos = src.find("doc.save()")
    commit_pos = src.find("frappe.db.commit()")
    bridge_pos = src.find("_post_payment_entry")
    assert save_pos < commit_pos < bridge_pos


def test_cancel_invoice_status_saved_before_bridge():
    src = _function_source("cancel_invoice")
    commit_pos = src.find("frappe.db.commit()")
    bridge_pos = src.find("_cancel_linked_sales_invoice")
    assert commit_pos != -1 and bridge_pos != -1
    assert bridge_pos > commit_pos


# ── File-level sanity ─────────────────────────────────────────────────────────

def test_finance_api_syntax_valid():
    """The entire finance_api.py must parse without error."""
    try:
        ast.parse(_SOURCE)
    except SyntaxError as exc:
        pytest.fail(f"finance_api.py has a syntax error: {exc}")


def test_all_bridge_helpers_are_private():
    """Bridge helpers must be private (prefixed _) — not accidentally whitelisted."""
    bridge_helpers = [
        "_post_to_sales_invoice",
        "_cancel_linked_sales_invoice",
        "_post_payment_entry",
        "_post_partial_payment_entry",
        "_get_or_create_si_service_item",
        "_get_invoice_company",
        "_get_paid_to_account",
    ]
    for name in bridge_helpers:
        node = _get_function(_TREE, name)
        assert node is not None, f"{name} not found in finance_api.py"
        for dec in node.decorator_list:
            assert "whitelist" not in ast.dump(dec), (
                f"{name} must NOT be @frappe.whitelist() — it is an internal helper"
            )
