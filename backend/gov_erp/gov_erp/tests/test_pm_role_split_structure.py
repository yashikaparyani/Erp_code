"""Source-level checks for the PM vs PH role split."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"


def _read(path: Path) -> str:
    return path.read_text()


def test_home_route_sends_project_manager_to_pm_dashboard():
    source = _read(ROOT / "erp_frontend" / "src" / "app" / "page.tsx")
    assert "const { currentUser, isLoading } = useAuth();" in source
    assert "if (isLoading || !currentUser || !currentRole)" in source
    assert "case 'Project Head':" in source
    assert "return <ProjectHeadDashboard />;" in source
    assert "case 'Project Manager':" in source
    assert "return <ProjectManagerDashboard />;" in source


def test_role_context_does_not_default_unauthenticated_users_to_project_manager():
    source = _read(ROOT / "erp_frontend" / "src" / "context" / "RoleContext.tsx")
    assert "?? 'Project Manager'" not in source
    assert "const currentRole = (currentUser?.role as Role | undefined) ?? null;" in source


def test_project_manager_frontend_scope_is_narrowed():
    source = _read(ROOT / "erp_frontend" / "src" / "context" / "RoleContext.tsx")
    section = source.split("'Project Manager': [", 1)[1].split("],", 1)[0]
    for expected in [
        "'/survey'",
        "'/project-manager/dpr'",
        "'/project-manager/inventory'",
        "'/project-manager/petty-cash'",
    ]:
        assert expected in section
    for unexpected in [
        "'/projects'",
        "'/procurement'",
        "'/inventory'",
        "'/grns'",
        "'/reports'",
        "'/documents'",
        "'/execution'",
        "'/engineering'",
        "'/milestones'",
        "'/manpower'",
        "'/purchase-orders'",
        "'/indents'",
        "'/drawings'",
        "'/change-requests'",
        "'/technician-visits'",
    ]:
        assert unexpected not in section


def test_project_manager_loses_approval_mapping_and_gains_inventory_read():
    source = _read(APP_ROOT / "rbac_seed.py")
    assert '("Project Manager",         "inventory",        "assigned_project", "read")' in source
    assert '("Project Manager",         "approval",         "assigned_project", "approve")' not in source
    assert '("Project Manager",         "project_command",  "assigned_project", "read")' in source


def test_permission_engine_has_pm_route_deny_overrides():
    source = _read(APP_ROOT / "permission_engine.py")
    assert '"Project Manager": [' in source
    for expected in [
        '"/projects"',
        '"/procurement"',
        '"/inventory"',
        '"/grns"',
        '"/petty-cash"',
        '"/documents"',
        '"/reports"',
        '"/execution"',
        '"/engineering"',
        '"/milestones"',
        '"/manpower"',
        '"/purchase-orders"',
        '"/indents"',
        '"/stock-position"',
        '"/stock-aging"',
    ]:
        assert expected in source


def test_project_manager_has_project_scoped_inventory_pages():
    source = _read(ROOT / "erp_frontend" / "src" / "components" / "Sidebar.tsx")
    assert "const projectManagerNavLinks" in source
    assert "href: '/project-manager/dpr'" in source
    assert "href: '/project-manager/inventory'" in source
    assert "href: '/project-manager/petty-cash'" in source


def test_project_manager_inventory_page_can_raise_project_indent():
    frontend = _read(ROOT / "erp_frontend" / "src" / "app" / "project-manager" / "inventory" / "page.tsx")
    backend = _read(APP_ROOT / "api.py")

    for expected in [
        "Raise Indent",
        "Project Indent Requests",
        "create_project_indent",
        "get_project_indents",
    ]:
        assert expected in "\n".join([frontend, backend])
