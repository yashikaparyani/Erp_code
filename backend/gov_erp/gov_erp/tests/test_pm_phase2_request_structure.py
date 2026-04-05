"""Source-level closeout checks for PM request / approval layer."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"
DOCTYPE_ROOT = APP_ROOT / "gov_erp" / "doctype"


def _read(path: Path) -> str:
    if path.name == "api.py":
        from api_test_utils import combined_api_source
        return combined_api_source(path.parent)
    return path.read_text()


def test_pm_request_doctype_has_expected_workflow_fields():
    source = _read(DOCTYPE_ROOT / "ge_pm_request" / "ge_pm_request.json")

    for expected in [
        '"name": "GE PM Request"',
        '"options": "PMR-.#####"',
        '"fieldname": "request_type"',
        '"fieldname": "current_deadline"',
        '"fieldname": "positions_needed"',
        '"fieldname": "amount_requested"',
        '"fieldname": "reviewer_remarks"',
        '"options": "Draft\\nPending\\nApproved\\nRejected\\nWithdrawn"',
    ]:
        assert expected in source


def test_pm_request_api_enforces_safe_create_and_update_contracts():
    source = _read(APP_ROOT / "api.py")

    for expected in [
        'def create_pm_request(data):',
        'if values["status"] not in ("Draft", "Pending"):',
        'values.pop("reviewed_by", None)',
        'values.pop("reviewed_date", None)',
        'def update_pm_request(name, data):',
        'immutable_fields = {',
        '"status", "requested_by", "requested_date",',
        'def submit_pm_request(name):',
        'doc.status = "Pending"',
        'def approve_pm_request(name, remarks=None):',
        'doc.status = "Approved"',
        'def reject_pm_request(name, remarks=None):',
        'doc.status = "Rejected"',
        'def withdraw_pm_request(name):',
        'doc.status = "Withdrawn"',
    ]:
        assert expected in source


def test_pm_request_controller_enforces_type_specific_payload_rules():
    source = _read(DOCTYPE_ROOT / "ge_pm_request" / "ge_pm_request.py")

    for expected in [
        "class GEPMRequest(Document):",
        'if request_type == "Timeline Extension":',
        'frappe.throw("Timeline Extension requests need current and proposed deadlines")',
        'elif request_type == "Staffing Request":',
        'frappe.throw("Staffing Request needs positions needed")',
        'elif request_type == "Petty Cash Exception":',
        'frappe.throw("Petty Cash Exception needs amount requested")',
        'elif request_type in {"Hold Recommendation", "Escalation Memo"}:',
        'frappe.throw(f"{request_type} needs justification")',
    ]:
        assert expected in source


def test_requests_tab_matches_backend_rules_and_workspace_tab_is_wired():
    requests_source = _read(ROOT / "erp_frontend" / "src" / "components" / "project-workspace" / "RequestsTab.tsx")
    workspace_source = _read(ROOT / "erp_frontend" / "src" / "app" / "projects" / "[id]" / "page.tsx")

    for expected in [
        "const canSubmit =",
        "form.request_type === 'Timeline Extension' && !!form.current_deadline && !!form.proposed_deadline",
        "form.request_type === 'Staffing Request' && !!form.positions_needed && !!form.position_type.trim() && !!form.duration_needed.trim()",
        "form.request_type === 'Petty Cash Exception' && !!form.amount_requested && Number(form.amount_requested) > 0",
        "form.request_type === 'Hold Recommendation' || form.request_type === 'Escalation Memo'",
        "disabled={creating || !canSubmit}",
    ]:
        assert expected in requests_source

    assert "'requests'" in workspace_source
