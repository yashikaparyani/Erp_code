"""Source-level tests for DPR and Project Team modules.

Pure-logic and structure tests that don't need a running site.
"""

import ast
import json
from pathlib import Path


APP_ROOT = Path(__file__).resolve().parents[1]
DOCTYPE_ROOT = APP_ROOT / "gov_erp" / "doctype"


def _load_doctype_json(slug):
    path = DOCTYPE_ROOT / slug / f"{slug}.json"
    with open(path) as f:
        return json.load(f)


# ── DPR DocType structure ──────────────────────────────────

def test_dpr_has_required_fields():
    dt = _load_doctype_json("ge_dpr")
    field_names = {f["fieldname"] for f in dt["fields"]}
    required = {"linked_project", "report_date", "summary", "items", "photos"}
    assert required.issubset(field_names)


def test_dpr_has_naming_series():
    dt = _load_doctype_json("ge_dpr")
    assert dt.get("autoname") == "naming_series:"
    ns_field = [f for f in dt["fields"] if f["fieldname"] == "naming_series"]
    assert len(ns_field) == 1
    assert "DPR" in ns_field[0].get("options", "")


def test_dpr_items_table():
    dt = _load_doctype_json("ge_dpr")
    items_field = [f for f in dt["fields"] if f["fieldname"] == "items"][0]
    assert items_field["fieldtype"] == "Table"
    assert items_field["options"] == "GE DPR Item"


def test_dpr_photos_table():
    dt = _load_doctype_json("ge_dpr")
    photos_field = [f for f in dt["fields"] if f["fieldname"] == "photos"][0]
    assert photos_field["fieldtype"] == "Table"
    assert photos_field["options"] == "GE DPR Photo"


def test_dpr_item_has_description_and_qty():
    dt = _load_doctype_json("ge_dpr_item")
    assert dt.get("istable") == 1
    field_names = {f["fieldname"] for f in dt["fields"]}
    assert "description" in field_names
    assert "qty" in field_names


def test_dpr_photo_has_attach():
    dt = _load_doctype_json("ge_dpr_photo")
    assert dt.get("istable") == 1
    photo_field = [f for f in dt["fields"] if f["fieldname"] == "photo"][0]
    assert photo_field["fieldtype"] == "Attach Image"


# ── Project Team Member structure ──────────────────────────

def test_project_team_member_has_required_fields():
    dt = _load_doctype_json("ge_project_team_member")
    field_names = {f["fieldname"] for f in dt["fields"]}
    required = {"linked_project", "user", "role_in_project", "start_date", "end_date", "is_active"}
    assert required.issubset(field_names)


def test_project_team_member_roles():
    dt = _load_doctype_json("ge_project_team_member")
    role_field = [f for f in dt["fields"] if f["fieldname"] == "role_in_project"][0]
    options = role_field["options"].split("\n")
    assert "PROJECT_MANAGER" in options
    assert "ENGINEER" in options
    assert "TECHNICIAN" in options
    assert "SITE_SUPERVISOR" in options
    assert "INSPECTOR" in options
    assert len(options) >= 5


def test_project_team_member_has_naming_series():
    dt = _load_doctype_json("ge_project_team_member")
    assert dt.get("autoname") == "naming_series:"


# ── API coverage check ──────────────────────────────────────

def _load_api_whitelist_names():
    api_path = APP_ROOT / "api.py"
    tree = ast.parse(api_path.read_text())
    names = []
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for dec in node.decorator_list:
                dec_str = ast.dump(dec)
                if "whitelist" in dec_str:
                    names.append(node.name)
                    break
    return set(names)


def test_dpr_apis_exist():
    names = _load_api_whitelist_names()
    expected = {"get_dprs", "get_dpr", "create_dpr", "update_dpr", "delete_dpr", "get_dpr_stats"}
    assert expected.issubset(names)


def test_project_team_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "get_project_team_members", "get_project_team_member",
        "create_project_team_member", "update_project_team_member",
        "delete_project_team_member",
    }
    assert expected.issubset(names)


def test_invoice_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "get_invoices", "get_invoice", "create_invoice", "update_invoice",
        "delete_invoice", "submit_invoice", "approve_invoice", "reject_invoice",
        "mark_invoice_paid", "cancel_invoice", "get_invoice_stats",
    }
    assert expected.issubset(names)


def test_ticket_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "get_tickets", "get_ticket", "create_ticket", "update_ticket",
        "delete_ticket", "assign_ticket", "start_ticket", "pause_ticket",
        "resume_ticket", "resolve_ticket", "close_ticket", "escalate_ticket",
        "add_ticket_comment", "get_ticket_stats",
    }
    assert expected.issubset(names)


def test_sla_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "get_sla_profiles", "get_sla_profile", "create_sla_profile",
        "update_sla_profile", "delete_sla_profile",
        "get_sla_timers", "get_sla_timer", "create_sla_timer",
        "close_sla_timer", "pause_sla_timer", "resume_sla_timer",
        "get_sla_penalty_rules", "create_sla_penalty_rule",
        "update_sla_penalty_rule", "delete_sla_penalty_rule",
        "get_sla_penalty_records", "get_sla_penalty_record",
        "create_sla_penalty_record", "approve_sla_penalty",
        "reject_sla_penalty", "waive_sla_penalty", "get_sla_penalty_stats",
    }
    assert expected.issubset(names)


def test_rma_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "get_rma_trackers", "get_rma_tracker", "create_rma_tracker",
        "update_rma_tracker", "delete_rma_tracker", "approve_rma",
        "reject_rma", "update_rma_status", "close_rma", "get_rma_stats",
        "convert_ticket_to_rma",
    }
    assert expected.issubset(names)


def test_po_hook_api_exists():
    names = _load_api_whitelist_names()
    assert "create_po_from_comparison" in names


def test_payment_receipt_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "get_payment_receipts", "get_payment_receipt", "create_payment_receipt",
        "update_payment_receipt", "delete_payment_receipt", "get_payment_receipt_stats",
    }
    assert expected.issubset(names)


def test_retention_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "get_retention_ledgers", "get_retention_ledger", "create_retention_ledger",
        "update_retention_ledger", "delete_retention_ledger",
        "release_retention", "get_retention_stats",
    }
    assert expected.issubset(names)


def test_penalty_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "get_penalty_deductions", "get_penalty_deduction", "create_penalty_deduction",
        "update_penalty_deduction", "delete_penalty_deduction",
        "approve_penalty_deduction", "apply_penalty_deduction",
        "reverse_penalty_deduction", "get_penalty_stats",
    }
    assert expected.issubset(names)


# ── Total endpoint count ────────────────────────────────────

def test_total_api_endpoints_at_least_200():
    """Verify we have a substantial API surface."""
    names = _load_api_whitelist_names()
    assert len(names) >= 200, f"Expected >= 200 endpoints, got {len(names)}"
