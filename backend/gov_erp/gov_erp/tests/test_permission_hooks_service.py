import types

import pytest

from gov_erp import permissions as permission_hooks


def _doc(doctype: str):
    return types.SimpleNamespace(doctype=doctype)


def _set_roles(monkeypatch, roles):
    monkeypatch.setattr(permission_hooks.frappe, "get_roles", lambda user=None: list(roles))


@pytest.mark.service
def test_admin_roles_use_canonical_presales_head_name(monkeypatch):
    _set_roles(monkeypatch, ["Presales Tendering Head"])
    assert permission_hooks.has_core_doctype_permission(_doc("Role"), "read", "presales.head@technosys.local") is True


@pytest.mark.service
def test_module_roles_are_derived_from_seed_mappings():
    module_roles = permission_hooks._build_seed_module_roles()
    assert "Presales Tendering Head" in module_roles["presales"]
    assert "Presales Head" not in module_roles["presales"]
    assert "Store Manager" in module_roles["inventory"]
    assert "Accounts" in module_roles["finance"]


@pytest.mark.service
def test_live_role_pack_mappings_expand_module_roles_for_custom_roles(monkeypatch):
    def fake_get_all(doctype, filters=None, fields=None, order_by=None):
        if doctype == "GE Role Pack Mapping":
            return [
                types.SimpleNamespace(role="Custom Finance Reviewer", permission_pack="finance", is_enabled=1),
            ]
        if doctype == "GE Permission Pack":
            return [
                types.SimpleNamespace(pack_key="finance", module_family="finance"),
            ]
        raise AssertionError(f"Unexpected doctype lookup: {doctype}")

    monkeypatch.setattr(permission_hooks.frappe, "get_all", fake_get_all)
    module_roles = permission_hooks._get_module_roles()
    assert "Custom Finance Reviewer" in module_roles["finance"]


@pytest.mark.service
def test_inventory_role_can_access_inventory_but_not_finance(monkeypatch):
    _set_roles(monkeypatch, ["Store Manager"])
    assert permission_hooks.has_ge_module_permission(_doc("GE Dispatch Challan"), "read", "store.manager@technosys.local") is True
    assert permission_hooks.has_ge_module_permission(_doc("GE Invoice"), "read", "store.manager@technosys.local") is False


@pytest.mark.service
def test_type_level_checks_use_explicit_doctype_and_fail_closed(monkeypatch):
    _set_roles(monkeypatch, ["Accounts"])
    assert permission_hooks.has_ge_module_permission("GE Invoice", "read", "accounts@technosys.local") is True

    _set_roles(monkeypatch, ["Store Manager"])
    assert permission_hooks.has_ge_module_permission("GE Invoice", "read", "store.manager@technosys.local") is False
    assert permission_hooks.has_ge_module_permission("GE Unknown", "read", "store.manager@technosys.local") is False
    assert permission_hooks.has_ge_module_permission(None, "read", "store.manager@technosys.local") is False


@pytest.mark.service
def test_rbac_infra_doctypes_are_read_open_but_write_limited(monkeypatch):
    _set_roles(monkeypatch, ["Engineer"])
    assert permission_hooks.has_ge_doctype_permission(_doc("GE Role Pack Mapping"), "read", "engineer@technosys.local") is True
    assert permission_hooks.has_ge_doctype_permission(_doc("GE Role Pack Mapping"), "write", "engineer@technosys.local") is False

    _set_roles(monkeypatch, ["Department Head"])
    assert permission_hooks.has_ge_doctype_permission(_doc("GE Role Pack Mapping"), "write", "dept.head@technosys.local") is True


@pytest.mark.service
def test_cross_cutting_user_doctypes_remain_available_to_authenticated_users(monkeypatch):
    _set_roles(monkeypatch, ["Engineer"])
    assert permission_hooks.has_ge_doctype_permission(_doc("GE User Reminder"), "write", "engineer@technosys.local") is True
    assert permission_hooks.has_ge_doctype_permission(_doc("GE Alert"), "read", "engineer@technosys.local") is True


@pytest.mark.service
def test_director_can_pass_core_doctype_hook_for_role_and_user_creation(monkeypatch):
    _set_roles(monkeypatch, ["Director"])
    assert permission_hooks.has_core_doctype_permission(_doc("Role"), "write", "director@technosys.local") is True
    assert permission_hooks.has_core_doctype_permission(_doc("User"), "write", "director@technosys.local") is True
