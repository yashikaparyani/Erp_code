"""Source-level checks for dossier and document-traceability behavior."""

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


def test_site_dossier_returns_project_and_stage_checks_can_infer_it():
    source = _read(APP_ROOT / "api.py")

    for expected in [
        'project = frappe.db.get_value("GE Site", site, "linked_project")',
        '"data": {"site": site, "project": project, "stages": stages, "total_documents": len(docs)}',
        "if not project and site:",
        'project = frappe.db.get_value("GE Site", site, "linked_project")',
    ]:
        assert expected in source


def test_rejected_documents_do_not_satisfy_completeness_or_progression_gates():
    source = _read(APP_ROOT / "api.py")

    for expected in [
        'if (d.status or "").strip().lower() == "rejected":',
        'if (d.get("status") or "").strip().lower() == "rejected":',
    ]:
        assert expected in source


def test_dossier_pages_render_requirement_stages_even_without_documents():
    project_page = _read(FRONTEND_ROOT / "app" / "projects" / "[id]" / "dossier" / "page.tsx")
    site_page = _read(FRONTEND_ROOT / "app" / "sites" / "[id]" / "dossier" / "page.tsx")

    for source in [project_page, site_page]:
        assert 'const stages = STAGE_ORDER.filter((s) => s !== \'Unclassified\');' in source
        assert 'const sortedStages = STAGE_ORDER.filter((stage) => {' in source
        assert 'Boolean(completeness?.total)' in source
        assert 'Boolean(completeness?.missing_mandatory_count)' in source

    assert "args: { project: dossier.project || '', stage, site: siteId }" in site_page


def test_sidebar_does_not_expose_fake_project_dossier_hash_link():
    sidebar = _read(FRONTEND_ROOT / "components" / "Sidebar.tsx")

    assert "/documents#dossier" not in sidebar


def test_workspace_files_tab_surfaces_progression_gate_and_record_bundles():
    pytest.skip("frontend-scope: tracked in frontend test suite")
