"""Source-level checks for Phase 3 notification and collaboration maturity."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"


def _read(path: Path) -> str:
    return path.read_text()


def test_notification_center_uses_real_alert_and_approval_sources():
    source = _read(APP_ROOT / "api.py")
    section = source.split("def get_notification_center():", 1)[1]
    section = section.split("@frappe.whitelist(methods=[\"POST\"])\ndef mark_mention_read", 1)[0]

    for expected in [
        "def _is_mention_alert(alert_row):",
        "def _get_mention_alerts(project=None, limit=20):",
        "mentions = _get_mention_alerts(limit=30)",
        "mention_names = {row.get(\"name\") for row in mentions}",
        "alerts = [row for row in all_alerts if row.get(\"name\") not in mention_names]",
        "pending_approvals = get_pending_approvals().get(\"data\", [])",
        '["submission_date", "is", "set"]',
        '["status", "not in", ["SUBMITTED", "WON", "LOST", "CANCELLED", "DROPPED", "CONVERTED_TO_PROJECT"]]',
        'fields=["name", "title", "tender_number", "submission_date", "status"]',
        '"/pre-sales/{t.name}"',
    ]:
        assert expected in source

    for stale in ["GE Mention Record", "GE Approval Entry", "/tenders/"]:
        assert stale not in section


def test_mentions_api_uses_alerts_not_missing_doctype():
    source = _read(APP_ROOT / "api.py")
    mentions_section = source.split("def mark_mention_read(mention_name=None):", 1)[1]
    mentions_section = mentions_section.split("return {\"success\": True, \"data\": mentions}", 1)[0]

    for expected in [
        "from gov_erp.gov_erp.doctype.ge_alert.ge_alert import mark_alert_read",
        "mark_alert_read(mention_name)",
        "mentions = _get_mention_alerts(project=project, limit=limit)",
    ]:
        assert expected in source

    assert "GE Mention Record" not in mentions_section


def test_frontend_notification_surfaces_use_phase3_routes_and_filters():
    bell = _read(ROOT / "erp_frontend" / "src" / "components" / "alerts" / "AlertBell.tsx")
    notifications_page = _read(ROOT / "erp_frontend" / "src" / "app" / "notifications" / "page.tsx")
    mentions_panel = _read(ROOT / "erp_frontend" / "src" / "components" / "mentions" / "MentionsPanel.tsx")

    assert "user_mentioned: 'Mentioned You'" in bell
    assert "site_status_changed: 'Site Status Changed'" in bell
    assert "site_installation_stage_changed: 'Installation Stage Changed'" in bell
    assert "useSearchParams" in notifications_page
    assert "searchParams.get('filter')" in notifications_page
    assert "Project: `/projects/${name}`" in mentions_panel
    assert "'GE Tender': `/pre-sales/${name}`" in mentions_panel


def test_site_updates_emit_alerts_for_status_and_installation_progress():
    handlers = _read(APP_ROOT / "doc_event_handlers.py")
    dispatcher = _read(APP_ROOT / "alert_dispatcher.py")
    alert_doctype = _read(APP_ROOT / "gov_erp" / "doctype" / "ge_alert" / "ge_alert.json")

    for expected in [
        'if doc.has_value_changed("status"):',
        "on_site_status_changed(project, doc.name, doc.status)",
        'if doc.has_value_changed("installation_stage"):',
        "on_site_installation_stage_changed(project, doc.name, doc.installation_stage)",
        'def on_site_status_changed(project_name: str, site_name: str, status: str, **kwargs):',
        'def on_site_installation_stage_changed(project_name: str, site_name: str, installation_stage: str, **kwargs):',
        '"site_status_changed"',
        '"site_installation_stage_changed"',
        "site_status_changed\\nsite_installation_stage_changed",
    ]:
        combined = "\n".join([handlers, dispatcher, alert_doctype])
        assert expected in combined
