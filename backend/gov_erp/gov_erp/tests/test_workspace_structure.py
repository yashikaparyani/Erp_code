"""Source-level checks for the Phase 1 PM workspace cockpit."""

import pytest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"


def _read(path: Path) -> str:
    if path.name == "api.py":
        from api_test_utils import combined_api_source
        return combined_api_source(path.parent)
    return path.read_text()


def test_pm_cockpit_summary_supports_stage_scoping_and_signal_summary():
    source = _read(APP_ROOT / "api.py")
    for expected in [
        "def get_pm_cockpit_summary(project=None, stages=None):",
        "stage_scope = [cstr(stage).strip().upper() for stage in _parse_json_list(stages)",
        '"status": ["in", ["REQUESTED", "APPROVED"]]',
        '"pending_overrides": [o for o in project_overrides if o.status == "REQUESTED"]',
        '"signal_summary": {',
        '"unread_alerts_count": len(unread_alerts)',
        '"active_reminders_count": len(project_reminders)',
        '"due_reminders_count": len(due_reminders)',
    ]:
        assert expected in source


def test_pm_cockpit_document_expiry_uses_non_overwriting_filters():
    source = _read(APP_ROOT / "api.py")
    assert 'filters=[["linked_project", "=", project], ["expiry_date", "is", "set"]]' in source
    assert '"expiry_date": ["<=", month_ahead]' not in source


def test_workspace_shell_passes_stage_scope_to_pm_cockpit_calls():
    pytest.skip("frontend-scope: tracked in frontend test suite")
