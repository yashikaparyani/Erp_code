"""Source-level checks for accountability access guards and dashboard sanity."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"


def _read(path: Path) -> str:
    return path.read_text()


def test_accountability_subject_reads_apply_pm_project_scope():
    source = _read(APP_ROOT / "api.py")

    for expected in [
        "def _enforce_accountability_subject_scope(subject_doctype, subject_name):",
        '_enforce_accountability_subject_scope(subject_doctype, subject_name)',
        '"GE Accountability Record"',
        '"linked_project"',
        '"Project Managers can only inspect project-linked accountability records."',
    ]:
        assert expected in source


def test_accountability_collection_reads_require_pm_project_scope():
    source = _read(APP_ROOT / "api.py")

    for expected in [
        "def _enforce_accountability_project_scope(project=None, require_project_for_pm=False):",
        "_enforce_accountability_project_scope(project, require_project_for_pm=True)",
        '"Project Managers must supply a project for accountability queries."',
    ]:
        assert expected in source


def test_accountability_dashboard_recent_windows_are_time_bounded():
    source = _read(APP_ROOT / "api.py")

    for expected in [
        'thirty_days_ago = add_days(today(), -30)',
        'ninety_days_ago = add_days(today(), -90)',
        '"event_time": [">=", thirty_days_ago]',
        '"event_time": [">=", ninety_days_ago]',
    ]:
        assert expected in source
