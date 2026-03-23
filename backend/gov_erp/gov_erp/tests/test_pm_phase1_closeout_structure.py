"""Source-level closeout checks for PM workspace shell expansion."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"
DOCTYPE_ROOT = APP_ROOT / "gov_erp" / "doctype"


def _read(path: Path) -> str:
    return path.read_text()


def test_phase1_doctypes_exist_for_issue_and_petty_cash():
    issue_json = _read(DOCTYPE_ROOT / "ge_project_issue" / "ge_project_issue.json")
    petty_json = _read(DOCTYPE_ROOT / "ge_petty_cash" / "ge_petty_cash.json")

    for expected in [
        '"name": "GE Project Issue"',
        '"fieldname": "linked_project"',
        '"fieldname": "severity"',
        '"fieldname": "status"',
        '"fieldname": "assigned_to"',
        '"options": "Open\\nIn Progress\\nResolved\\nClosed"',
    ]:
        assert expected in issue_json

    for expected in [
        '"name": "GE Petty Cash"',
        '"fieldname": "linked_project"',
        '"fieldname": "entry_date"',
        '"fieldname": "amount"',
        '"fieldname": "status"',
        '"options": "Draft\\nPending\\nApproved\\nRejected\\nCancelled"',
    ]:
        assert expected in petty_json


def test_pm_central_status_uses_real_models_and_fields():
    source = _read(APP_ROOT / "api.py")
    section = source.split("def get_pm_central_status(project=None):", 1)[1]
    section = section.split('return {\n\t\t"success": True,', 1)[0]

    for expected in [
        '_get_indent_names_for_project(project)',
        'fields=["name", "title", "revision", "status", "client_approval_status", "file", "modified"]',
        'row["file_url"] = row.pop("file", None)',
        'fields=["name", "status", "version", "total_amount", "modified"]',
        'row["title"] = f"BOQ v{row.get(\'version\') or 1}"',
        'fields=["name", "cr_number", "status", "cost_impact", "schedule_impact_days", "creation"]',
        'frappe.get_all(\n\t\t"Purchase Receipt"',
        'frappe.get_all(\n\t\t"GE Payment Receipt"',
        'frappe.get_all(\n\t\t"GE Petty Cash"',
        '_get_commissioning_checklist_item_counts([row["name"] for row in checklists])',
    ]:
        assert expected in section

    for stale in [
        '"GE Indent"',
        '"GE GRN"',
        '"GE Petty Cash Entry"',
        '"number", "status", "invoice_type", "total_amount", "paid_amount", "due_date"',
    ]:
        assert stale not in section


def test_comm_log_create_flow_has_summary_and_direction_normalization():
    source = _read(APP_ROOT / "api.py")
    for expected in [
        '"client call": "Call"',
        '"site visit": "Site Visit"',
        'if direction == "incoming":',
        'values["direction"] = "Inbound"',
        'elif direction == "outgoing":',
        'values["direction"] = "Outbound"',
        'values.setdefault("summary", values.get("subject"))',
        'values.setdefault("communication_date", frappe.utils.today())',
        'values.setdefault("logged_by", frappe.session.user)',
    ]:
        assert expected in source


def test_pm_central_status_counts_approved_petty_cash_case_insensitively():
    source = _read(APP_ROOT / "api.py")
    assert 'if cstr(r.get("status") or "").strip().lower() == "approved"' in source


def test_communications_tab_matches_backend_contract():
    source = _read(ROOT / "erp_frontend" / "src" / "components" / "project-workspace" / "CommunicationsTab.tsx")
    for expected in [
        "summary: ''",
        "summary: form.summary.trim() || form.subject.trim()",
        "<option>Outbound</option>",
        "<option>Inbound</option>",
        "<option>Internal</option>",
        "<option>WhatsApp</option>",
        "<option>Site Visit</option>",
        "Summary / Notes *",
        "!form.summary.trim()",
    ]:
        assert expected in source

    assert "Outgoing" not in source
    assert "Incoming" not in source
