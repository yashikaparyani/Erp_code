"""Service smoke tests — verify hook integrity, permission engine structure,
and migration readiness.  These need Frappe importable (on sys.path) but do
NOT require a running site or DB connection.
"""

import ast
import importlib
import sys
from pathlib import Path

import pytest

APP_ROOT = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------------------
# 1. Hook import integrity
# ---------------------------------------------------------------------------


def _parse_hooks_scheduler():
    """Extract scheduler_events callables from hooks.py without importing Frappe."""
    hooks_text = (APP_ROOT / "hooks.py").read_text()
    tree = ast.parse(hooks_text)
    callables = []

    def _collect_strings(node):
        """Recursively collect all string constants from nested dicts/lists."""
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            callables.append(node.value)
        elif isinstance(node, ast.List):
            for elt in node.elts:
                _collect_strings(elt)
        elif isinstance(node, ast.Dict):
            for val in node.values:
                _collect_strings(val)

    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == "scheduler_events":
                _collect_strings(node.value)
    return callables


def test_scheduler_hooks_reference_importable_paths():
    """Every scheduler method in hooks.py must be importable by dotted path."""
    callables = _parse_hooks_scheduler()
    assert len(callables) >= 3, f"Expected at least 3 scheduler hooks, got {callables}"
    for dotted in callables:
        module_path, _, func_name = dotted.rpartition(".")
        mod = importlib.import_module(module_path)
        assert hasattr(mod, func_name), f"{dotted} not found after import"
        assert callable(getattr(mod, func_name)), f"{dotted} is not callable"


def _parse_hooks_string(key):
    """Extract a string-valued hooks key from hooks.py."""
    hooks_text = (APP_ROOT / "hooks.py").read_text()
    tree = ast.parse(hooks_text)
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == key:
                if isinstance(node.value, ast.Constant):
                    return node.value.value
                if isinstance(node.value, ast.List) and node.value.elts:
                    return [e.value for e in node.value.elts if isinstance(e, ast.Constant)]
    return None


def test_after_install_hook_importable():
    val = _parse_hooks_string("after_install")
    assert val, "after_install hook missing"
    module_path, _, func_name = val.rpartition(".")
    mod = importlib.import_module(module_path)
    assert callable(getattr(mod, func_name)), f"{val} not callable"


def test_after_migrate_hook_importable():
    val = _parse_hooks_string("after_migrate")
    assert val, "after_migrate hook missing"
    targets = val if isinstance(val, list) else [val]
    for dotted in targets:
        module_path, _, func_name = dotted.rpartition(".")
        mod = importlib.import_module(module_path)
        assert callable(getattr(mod, func_name)), f"{dotted} not callable"


# ---------------------------------------------------------------------------
# 2. Permission engine import integrity
# ---------------------------------------------------------------------------


def test_permission_engine_importable():
    mod = importlib.import_module("gov_erp.permission_engine")
    assert hasattr(mod, "PermissionEngine"), "PermissionEngine class missing"


def test_permission_engine_has_core_methods():
    mod = importlib.import_module("gov_erp.permission_engine")
    engine_cls = mod.PermissionEngine
    required = [
        "can_access_module",
        "can_access_route",
        "can_view_project",
        "get_visible_tabs",
        "get_effective_summary",
    ]
    for method in required:
        assert hasattr(engine_cls, method), f"PermissionEngine missing {method}"


def test_permission_engine_route_map_covers_critical_modules():
    mod = importlib.import_module("gov_erp.permission_engine")
    route_map = getattr(mod, "MODULE_ROUTE_MAP", {})
    critical = ["project", "procurement", "execution", "reports"]
    for module in critical:
        assert module in route_map, f"MODULE_ROUTE_MAP missing {module}"


def test_permission_engine_has_public_routes():
    mod = importlib.import_module("gov_erp.permission_engine")
    public = getattr(mod, "PUBLIC_ROUTES", None)
    assert public is not None, "PUBLIC_ROUTES not defined"
    assert "/login" in public, "/login must be in PUBLIC_ROUTES"


# ---------------------------------------------------------------------------
# 3. Alert dispatcher integrity
# ---------------------------------------------------------------------------


def test_alert_dispatcher_importable():
    mod = importlib.import_module("gov_erp.alert_dispatcher")
    assert hasattr(mod, "on_indent_event"), "on_indent_event missing from alert_dispatcher"


# ---------------------------------------------------------------------------
# 4. RBAC seed integrity
# ---------------------------------------------------------------------------


def test_rbac_seed_importable():
    mod = importlib.import_module("gov_erp.rbac_seed")
    assert hasattr(mod, "seed_rbac"), "seed_rbac missing from rbac_seed"


def test_role_utils_importable():
    mod = importlib.import_module("gov_erp.role_utils")
    assert hasattr(mod, "BUSINESS_ROLES"), "BUSINESS_ROLES missing"
    assert hasattr(mod, "ensure_business_roles"), "ensure_business_roles missing"
    assert hasattr(mod, "sync_rbac_doc_permissions"), "sync_rbac_doc_permissions missing"
    assert len(mod.BUSINESS_ROLES) >= 15, f"Expected >= 15 business roles, got {len(mod.BUSINESS_ROLES)}"


# ---------------------------------------------------------------------------
# 5. Core module import canaries
# ---------------------------------------------------------------------------


def test_api_module_importable():
    mod = importlib.import_module("gov_erp.api")
    assert hasattr(mod, "health_check"), "health_check endpoint missing from api"
    assert hasattr(mod, "get_health_payload"), "get_health_payload missing from api"


def test_spine_setup_importable():
    mod = importlib.import_module("gov_erp.spine_setup")
    assert hasattr(mod, "ensure_spine_custom_fields"), "ensure_spine_custom_fields missing"


def test_install_module_importable():
    mod = importlib.import_module("gov_erp.install")
    assert hasattr(mod, "after_install"), "after_install missing from install"
    assert hasattr(mod, "after_migrate"), "after_migrate missing from install"
