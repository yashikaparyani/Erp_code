"""Source-level checks for Phase 4 DMS project-context rigor."""

import pytest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"


def _read(path: Path) -> str:
    if path.name == "api.py":
        from api_test_utils import combined_api_source
        return combined_api_source(path.parent)
    return path.read_text()


def test_project_documents_api_supports_site_and_latest_context():
    source = _read(APP_ROOT / "api.py")
    for expected in [
        "def get_project_documents(folder=None, project=None, category=None, site=None, latest_only=0",
        'filters["linked_site"] = site',
        '"version_count"',
        '"is_latest_version"',
        '"days_until_expiry"',
        "if latest_only and not row[\"is_latest_version\"]:",
    ]:
        assert expected in source


def test_document_versions_api_reuses_document_annotations():
    source = _read(APP_ROOT / "api.py")
    assert 'return {"success": True, "data": _annotate_project_documents(data)}' in source


def test_documents_route_passes_site_and_latest_only():
    pytest.skip("frontend-scope: tracked in frontend test suite")


def test_documents_page_surfaces_project_context_version_history_and_expiry():
    source = _read(ROOT / "erp_frontend" / "src" / "app" / "documents" / "page.tsx")
    for expected in [
        "Latest versions only",
        "Version History",
        "days_until_expiry",
        "linked_site",
        "/api/documents/versions?name=",
        "Project-aware document control with version history, expiry visibility, and site context",
        "Project and site context",
    ]:
        assert expected in source
