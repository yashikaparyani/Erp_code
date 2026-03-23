"""Source-level checks for the Phase 5 RBAC closeout layer."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"


def _read(path: Path) -> str:
    return path.read_text()


def test_permission_engine_gates_presales_routes():
    source = _read(APP_ROOT / "permission_engine.py")
    for expected in [
        '"presales":    ["/pre-sales", "/survey"]',
        '"presales":    "presales.module.access"',
    ]:
        assert expected in source


def test_rbac_seed_covers_missing_business_roles_and_support_packs():
    source = _read(APP_ROOT / "rbac_seed.py")
    for expected in [
        '("presales.module.access",        "Access Presales Workspace"',
        '"pack_key": "presales"',
        '("Department Head",         "presales",         "department",       "read")',
        '("Presales Tendering Head", "presales",         "department",       "action")',
        '("Presales Executive",      "presales",         "department",       "read")',
        '("Field Technician",        "execution_ic",     "assigned_site",    "action")',
        '("Field Technician",        "om_rma",           "assigned_site",    "read")',
        '("Store Manager",           "dms",              "department",       "read")',
        '("Engineering Head",        "execution_ic",     "department",       "read")',
    ]:
        assert expected in source


def test_frontend_fallback_settings_roles_match_backend_truth():
    source = _read(ROOT / "erp_frontend" / "src" / "context" / "RoleContext.tsx")
    assert "'Project Head'" not in source.split("export const SETTINGS_ROLES")[1].split("];", 1)[0]
    assert "'Project Manager'" not in source.split("export const SETTINGS_ROLES")[1].split("];", 1)[0]


def test_frontend_smoke_matrix_reflects_phase5_rbac_scope():
    source = _read(ROOT / "erp_frontend" / "src" / "__tests__" / "smoke-routes.test.ts")
    for expected in [
        "'Presales Tendering Head': ['/pre-sales', '/survey', '/reports', '/documents']",
        "'Project Manager': ['/projects', '/engineering', '/procurement', '/execution', '/reports', '/documents']",
        "'Field Technician': ['/execution', '/manpower', '/om-helpdesk', '/rma', '/documents', '/sla']",
    ]:
        assert expected in source
