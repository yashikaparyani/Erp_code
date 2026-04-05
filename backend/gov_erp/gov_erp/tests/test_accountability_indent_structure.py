"""Source-level checks for accountability-backed indent workflow surfaces."""

import pytest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"
FRONTEND_ROOT = ROOT / "erp_frontend" / "src"


def _read(path: Path) -> str:
    if path.name == "api.py":
        from api_test_utils import combined_api_source
        return combined_api_source(path.parent)
    return path.read_text()


def test_indent_approval_inbox_uses_accountability_records():
    source = _read(APP_ROOT / "api.py")
    section = source.split("def get_pending_approvals():", 1)[1]
    section = section.split("def _get_sla_dashboard_summary(", 1)[0]

    for expected in [
        '"GE Accountability Record"',
        '"subject_doctype": "Material Request"',
        '"current_status": ["in", ["Submitted", "Acknowledged", "Escalated"]]',
        '"approval_for": "Indent Approval"',
        '"type": "Indent"',
    ]:
        assert expected in section


def test_indent_actions_emit_alerts_and_record_traceability():
    source = _read(APP_ROOT / "api.py")

    for expected in [
        "from gov_erp.alert_dispatcher import on_indent_event",
        'on_indent_event(\n\t\t\tproject,\n\t\t\tname,\n\t\t\t"submitted"',
        'on_indent_event(\n\t\t\tproject,\n\t\t\tname,\n\t\t\t"acknowledged"',
        'on_indent_event(\n\t\t\tproject,\n\t\t\tname,\n\t\t\t"accepted"',
        'on_indent_event(\n\t\t\tproject,\n\t\t\tname,\n\t\t\t"rejected"',
        'on_indent_event(\n\t\t\tproject,\n\t\t\tname,\n\t\t\t"returned"',
        'on_indent_event(project, name, "escalated"',
        "current_owner_role=ROLE_PROJECT_HEAD",
        "current_owner_role=ROLE_PROCUREMENT_MANAGER",
        "current_owner_role=ROLE_DIRECTOR",
    ]:
        assert expected in source


def test_frontend_indents_page_surfaces_actions_and_trace():
    pytest.skip("frontend-scope: tracked in frontend test suite")
    source = _read(FRONTEND_ROOT / "app" / "indents" / "page.tsx")

    for expected in [
        "AccountabilityTimeline",
        "submit_indent",
        "acknowledge_indent",
        "accept_indent",
        "reject_indent",
        "return_indent",
        "escalate_indent",
        "Hide Trace",
        "Trace",
    ]:
        assert expected in source


def test_frontend_approvals_route_handles_indent_and_accountability_page_is_known():
    approvals_route = _read(FRONTEND_ROOT / "app" / "api" / "approvals" / "route.ts")
    role_context = _read(FRONTEND_ROOT / "context" / "RoleContext.tsx")
    smoke = _read(FRONTEND_ROOT / "__tests__" / "smoke-routes.test.ts")

    for expected in [
        "kind === 'indent' && action === 'approve'",
        "accept_indent",
        "kind === 'indent' && action === 'reject'",
        "reject_indent",
        "'/accountability'",
    ]:
        combined = "\n".join([approvals_route, role_context, smoke])
        assert expected in combined
