"""Source-level checks for master-data RBAC closeout."""

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


def test_permission_engine_gates_master_data_route():
    source = _read(APP_ROOT / "permission_engine.py")
    for expected in [
        '"master_data": ["/master-data"]',
        '"master_data": "master_data.module.access"',
    ]:
        assert expected in source


def test_rbac_seed_defines_master_data_capability_pack_and_role_grants():
    source = _read(APP_ROOT / "rbac_seed.py")
    for expected in [
        '("master_data.module.access",     "Access Master Data Module"',
        '"pack_key": "master_data"',
        '("Director",                "master_data",      "all",              "action")',
        '("Department Head",         "master_data",      "department",       "action")',
        '("Project Head",            "master_data",      "all",              "read")',
    ]:
        assert expected in source


def test_frontend_fallback_keeps_master_data_narrow():
    source = _read(FRONTEND_ROOT / "context" / "RoleContext.tsx")
    assert source.count("'/master-data'") == 3
    for allowed_role in ["'Director': [", "'Department Head': [", "'Project Head': ["]:
        assert allowed_role in source


def test_frontend_smoke_matrix_has_explicit_master_data_allow_and_deny_coverage():
    pytest.skip("frontend-scope: tracked in frontend test suite")
