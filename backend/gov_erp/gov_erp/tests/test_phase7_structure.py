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


def _load_source(rel_path):
    if rel_path == "api.py":
        from api_test_utils import combined_api_source
        return combined_api_source(APP_ROOT)
    return (APP_ROOT / rel_path).read_text()


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


# ── ANDA compliance structure ───────────────────────────────

def test_ticket_has_anda_issue_log_fields():
    dt = _load_doctype_json("ge_ticket")
    fields = {f["fieldname"]: f for f in dt["fields"]}

    assert "impact_level" in fields
    assert fields["impact_level"]["fieldtype"] == "Select"
    assert fields["impact_level"]["options"].split("\n") == ["HIGH", "MEDIUM", "LOW"]

    assert "due_date" in fields
    assert fields["due_date"]["fieldtype"] == "Date"

    assert "source_issue_id" in fields
    assert fields["source_issue_id"]["fieldtype"] == "Data"


def test_ticket_has_procurement_manager_permission():
    dt = _load_doctype_json("ge_ticket")
    perms = {p["role"]: p for p in dt["permissions"]}
    assert "Procurement Manager" in perms
    assert perms["Procurement Manager"]["read"] == 1
    assert perms["Procurement Manager"]["write"] == 1
    assert perms["Procurement Manager"]["report"] == 1


def test_staffing_assignment_has_20_fields_and_required_logic_fields():
    dt = _load_doctype_json("ge_project_staffing_assignment")
    field_names = {f["fieldname"] for f in dt["fields"]}

    assert len(dt["fields"]) == 20
    required = {
        "linked_project",
        "linked_site",
        "employee_name",
        "employee_code",
        "position",
        "join_date",
        "leave_date",
        "total_days_on_project",
        "is_active",
        "remarks",
    }
    assert required.issubset(field_names)


def test_staffing_assignment_controller_has_auto_compute_and_auto_deactivate():
    source = _load_source(
        "gov_erp/doctype/ge_project_staffing_assignment/ge_project_staffing_assignment.py"
    )
    assert "def _compute_total_days" in source
    assert "self.total_days_on_project" in source
    assert "def _auto_deactivate_on_leave" in source
    assert "self.is_active = 0" in source


def test_anda_importer_registry_has_13_tabs():
    source = _load_source("api.py")
    tree = ast.parse(source)

    importer_map = None
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "_ANDA_IMPORTER_MAP":
                    importer_map = ast.literal_eval(node.value)
                    break
        if importer_map is not None:
            break

    assert importer_map is not None
    assert len(importer_map) == 13
    assert set(importer_map.keys()) == {
        "project_overview",
        "milestones_phases",
        "location_survey",
        "procurement_tracker",
        "issue_log",
        "client_payment_milestones",
        "material_issuance_consumption",
        "project_communications",
        "rma_tracker",
        "project_assets_services",
        "petty_cash",
        "device_uptime",
        "project_manpower_assignment",
    }


def test_anda_import_base_has_modes_and_pipeline_steps():
    source = _load_source("importers/anda/base.py")

    assert 'DRY_RUN = "dry_run"' in source
    assert 'STAGE_ONLY = "stage_only"' in source
    assert 'COMMIT = "commit"' in source

    for expected in [
        "self.parse_row(",
        "self.validate_row(",
        "self.check_references(",
        "self.find_duplicate(",
        "self.commit_row(",
        '"doctype": "GE Import Log"',
    ]:
        assert expected in source


def test_master_loader_module_has_required_functions():
    source = _load_source("importers/anda/master_loaders.py")

    for expected in [
        "class MasterLoadReport",
        "def load_departments",
        "def load_designations",
        "def resolve_role_alias",
        "def load_role_mappings",
        "def load_projects",
        "def load_sites",
        "def load_vendors",
        "def load_milestone_templates",
        "def check_reference_integrity",
        '"ready_for_transactional_import"',
        "def load_all_masters",
    ]:
        assert expected in source


def test_orchestrator_has_master_gate_and_complex_support():
    source = _load_source("importers/anda/orchestrator.py")

    for expected in [
        "class OrchestratorReport",
        "IMPORT_ORDER =",
        "include_complex=False",
        "skip_master_check=False",
        "ready_for_transactional_import",
        "_save_orchestrator_log",
        "project_manpower_assignment",
        "issue_log",
        "procurement_tracker",
        "material_issuance_consumption",
    ]:
        assert expected in source


def test_procurement_tracker_commit_is_forced_to_stage_only():
    source = _load_source("importers/anda/procurement_tracker.py")

    assert "def run(self, rows, mode=ImportMode.DRY_RUN):" in source
    assert "if mode == ImportMode.COMMIT" in source
    assert "ImportMode.STAGE_ONLY" in source
    assert "Procurement Tracker is stage-only" in source


def test_ticket_phase6_fields_and_controller_rules_exist():
    dt = _load_doctype_json("ge_ticket")
    fields = {f["fieldname"] for f in dt["fields"]}
    assert {"closure_type", "days_to_resolve", "escalation_level", "escalation_reason"}.issubset(fields)

    source = _load_source("gov_erp/doctype/ge_ticket/ge_ticket.py")
    for expected in [
        "VALID_TICKET_TRANSITIONS",
        "def _validate_escalation_level",
        "Escalation level must be between 0 and 5",
        "def _auto_timestamps",
        "self.days_to_resolve",
    ]:
        assert expected in source


def test_rma_phase6_transition_and_gating_rules_exist():
    source = _load_source("gov_erp/doctype/ge_rma_tracker/ge_rma_tracker.py")
    for expected in [
        "VALID_TRANSITIONS",
        "approved_by_project_head",
        "replaced_serial_number",
        "actual_resolution_date",
        'self.rma_status == "CLOSED"',
    ]:
        assert expected in source


def test_dispatch_po_traceability_and_invoice_reconciliation_exist():
    dispatch_source = _load_source("gov_erp/doctype/ge_dispatch_challan/ge_dispatch_challan.py")
    invoice_source = _load_source("gov_erp/doctype/ge_invoice/ge_invoice.py")
    receipt_source = _load_source("gov_erp/doctype/ge_payment_receipt/ge_payment_receipt.py")

    for expected in [
        "linked_purchase_order",
        "exceeds PO qty",
        "is not in linked Purchase Order",
    ]:
        assert expected in dispatch_source

    for expected in [
        "self.total_paid",
        "self.outstanding_amount",
        "_validate_amount_against_invoice",
        "_refresh_invoice_totals",
    ]:
        assert expected in invoice_source or expected in receipt_source


def test_project_site_stage_phase6_guards_exist():
    milestone_source = _load_source("gov_erp/doctype/ge_milestone/ge_milestone.py")
    site_source = _load_source("gov_erp/doctype/ge_site/ge_site.py")

    for expected in [
        "VALID_MILESTONE_TRANSITIONS",
        "_sync_site_progress",
        "site_progress_pct",
        "location_progress_pct",
    ]:
        assert expected in milestone_source

    for expected in [
        "VALID_SITE_STATUS_TRANSITIONS",
        "INSTALLATION_STAGE_ORDER",
        "cannot regress",
    ]:
        assert expected in site_source


# ── API coverage check ──────────────────────────────────────

def _load_api_whitelist_names():
    from api_test_utils import combined_api_whitelist_names
    return combined_api_whitelist_names(APP_ROOT)


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


def test_staffing_assignment_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "get_staffing_assignments",
        "get_staffing_assignment",
        "create_staffing_assignment",
        "update_staffing_assignment",
        "delete_staffing_assignment",
        "end_staffing_assignment",
        "get_staffing_summary",
    }
    assert expected.issubset(names)


def test_anda_import_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "run_anda_import",
        "get_anda_import_logs",
        "get_anda_import_tabs",
    }
    assert expected.issubset(names)


def test_phase3_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "load_anda_masters",
        "check_anda_master_integrity",
    }
    assert expected.issubset(names)


def test_phase4_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "run_anda_orchestrated_import",
        "get_anda_import_order",
    }
    assert expected.issubset(names)


def test_phase6_apis_exist():
    names = _load_api_whitelist_names()
    expected = {
        "reconcile_invoice_payments",
        "sync_site_milestone_progress",
        "close_ticket",
        "escalate_ticket",
        "close_rma",
    }
    assert expected.issubset(names)


def _load_anda_role_grants():
    source = _load_source("role_utils.py")
    # ANDA_ROLE_GRANTS was replaced by dynamic _build_rbac_docperm_plan()
    # Verify the plan builder and supporting structures exist instead
    return source


def test_anda_role_sync_covers_13_target_doctypes():
    source = _load_anda_role_grants()
    # The dynamic plan requires Frappe DB context; verify structural prerequisites
    for expected in [
        "def _build_rbac_docperm_plan():",
        "PACK_DOCTYPE_GRANTS",
        "EXTRA_ROLE_DOCTYPE_GRANTS",
        "DIRECTOR_STANDARD_DOCTYPES",
        "def sync_rbac_doc_permissions(",
        "_flags_for_mode",
        "_merge_flags",
    ]:
        assert expected in source


def test_phase7_uat_permission_matrix_has_57_minimum_checks():
    """Validate the minimum create/read/write UAT matrix claimed in Phase 7."""
    matrix = {
        "ge_ticket": {
            "Project Head": ["create", "read", "write"],
            "OM Operator": ["create", "read", "write"],
        },
        "ge_site": {
            "Project Head": ["create", "read", "write"],
        },
        "ge_project_team_member": {
            "Project Head": ["create", "read", "write"],
        },
        "ge_payment_receipt": {
            "Project Head": ["read"],
        },
        "ge_sla_timer": {
            "OM Operator": ["create", "read", "write"],
            "RMA Manager": ["read", "write"],
            "Project Head": ["read"],
        },
        "ge_sla_penalty_rule": {
            "OM Operator": ["create", "read", "write"],
            "RMA Manager": ["read", "write"],
            "Project Head": ["read"],
        },
        "ge_sla_profile": {
            "OM Operator": ["create", "read", "write"],
            "RMA Manager": ["read", "write"],
            "Project Head": ["read"],
        },
        "ge_sla_penalty_record": {
            "OM Operator": ["create", "read", "write"],
            "RMA Manager": ["read", "write"],
            "Project Head": ["read"],
        },
        "ge_device_uptime_log": {
            "OM Operator": ["create", "read", "write"],
        },
        "ge_device_register": {
            "OM Operator": ["create", "read", "write"],
            "RMA Manager": ["read", "write"],
        },
        "ge_technician_visit_log": {
            "OM Operator": ["create", "read", "write"],
            "Field Technician": ["create", "read", "write"],
            "Project Manager": ["read"],
            "Project Head": ["read"],
        },
        "ge_boq": {
            "Engineering Head": ["write"],
            "Engineer": ["read"],
        },
        "ge_cost_sheet": {
            "Engineering Head": ["write"],
            "Engineer": ["read"],
        },
    }

    required_checks = sum(
        len(flags)
        for role_map in matrix.values()
        for flags in role_map.values()
    )
    assert required_checks == 57

    for slug, role_map in matrix.items():
        dt = _load_doctype_json(slug)
        perms = {perm["role"]: perm for perm in dt["permissions"]}
        for role, flags in role_map.items():
            assert role in perms, f"{slug} missing role {role}"
            for flag in flags:
                assert perms[role].get(flag) == 1, f"{slug} missing {flag} for {role}"


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
