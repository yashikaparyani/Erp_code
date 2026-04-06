"""Source-level checks for Phase 2 execution and commissioning polish."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"


def _read(path: Path) -> str:
    if path.name == "api.py":
        from api_test_utils import combined_api_source
        return combined_api_source(path.parent)
    return path.read_text()


def test_execution_summary_uses_real_commissioning_fields():
    source = _read(APP_ROOT / "api.py")
    section = source.split("def get_execution_summary(project=None):", 1)[1]
    section = section.split("def _get_commissioning_checklist_item_counts", 1)[0]
    for expected in [
        "def get_execution_summary(project=None):",
        '_get_commissioning_checklist_item_counts([c.name for c in checklists])',
        'fields=["name", "linked_project", "linked_site", "checklist_name", "status", "commissioned_by", "commissioned_date"]',
        'fields=["name", "linked_project", "linked_site", "test_type", "test_date", "status", "tested_by"]',
        'fields=["name", "linked_project", "linked_site", "signoff_type", "signoff_date", "signed_by_client", "status"]',
        'filters={"linked_site": s.name, "active": 1, "hard_block": 1}',
        'fields=["name", "linked_task", "prerequisite_reference_name", "block_message"]',
        'filters={"dependency_rule": ["in", rule_names], "status": "APPROVED"}',
        '"prerequisite_task": r.prerequisite_reference_name or r.linked_task',
        "Client signatory pending",
        "def _get_commissioning_checklist_item_counts(checklist_names):",
        "tabGE Commissioning Checklist Item",
        'dpr_filters["linked_project"] = project',
        'cl_filters["linked_project"] = project',
        'tr_filters["linked_project"] = project',
        'so_filters["linked_project"] = project',
    ]:
        assert expected in source

    for stale in [
        'fields=["name", "linked_project", "linked_site", "checklist_name", "total_items", "done_items", "status", "assigned_to"]',
        "client_name",
        "prepared_by",
        "is_active",
    ]:
        assert stale not in section


def test_commissioning_list_apis_expose_ui_fields():
    source = _read(APP_ROOT / "api.py")
    for expected in [
        'item_counts = _get_commissioning_checklist_item_counts([row["name"] for row in data])',
        'row["total_items"] = counts["total_items"]',
        '"file", "remarks"',
        '"attachment", "remarks"',
        'values.setdefault("status", "Submitted")',
        'values.setdefault("tested_by", frappe.session.user)',
        "Signed By Client is required before recording signoff.",
    ]:
        assert expected in source


def test_test_report_route_supports_binary_upload_and_cleanup():
    source = _read(
        ROOT / "erp_frontend" / "src" / "app" / "api" / "execution" / "commissioning" / "test-reports" / "route.ts"
    )
    for expected in [
        "uploadFrappeFile",
        "multipart/form-data",
        "report_name",
        "Please select a report file to upload",
        "uploadBody.append('file', file)",
        "delete_uploaded_project_file",
    ]:
        assert expected in source


def test_test_report_ui_matches_real_backend_fields():
    source = _read(
        ROOT / "erp_frontend" / "src" / "app" / "execution" / "commissioning" / "test-reports" / "page.tsx"
    )
    for expected in [
        "report_name",
        'type="file"',
        "FormData()",
        "tested_by",
        "commissioned_by",
        "signed_by_client",
        "Open file",
        "New reports are created in",
    ]:
        assert expected in source

    for stale in ["client_designation", "client_name", "reference_document", "test_description", "prepared_by"]:
        assert stale not in source


def test_site_bulk_upload_api_surface_exists():
    source = _read(APP_ROOT / "api.py")
    for expected in [
        "SITE_BULK_UPLOAD_FIELDS = [",
        "def download_site_bulk_upload_template():",
        "def bulk_upload_sites(file_url, default_project=None, default_tender=None, dry_run=0):",
        "build_xlsx_response(",
        "read_xlsx_file_from_attached_file",
        "read_csv_content(",
        "Only .xlsx and .csv site upload files are supported",
        "site_code is required",
        "linked_project is required",
        '"headers": SITE_BULK_UPLOAD_FIELDS',
    ]:
        assert expected in source
