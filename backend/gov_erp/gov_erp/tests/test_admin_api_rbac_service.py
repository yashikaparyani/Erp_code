import types

import pytest

from gov_erp import admin_api


def _call(func, *args, **kwargs):
    return getattr(func, "__wrapped__", func)(*args, **kwargs)


@pytest.mark.service
def test_departments_use_settings_department_capability(monkeypatch):
    calls = []

    monkeypatch.setattr(admin_api, "_require_settings_capability", lambda key: calls.append(key))

    def fake_get_all(doctype, **kwargs):
        assert doctype == "Department"
        assert kwargs.get("ignore_permissions") is True
        return []

    monkeypatch.setattr(admin_api.frappe, "get_all", fake_get_all)

    result = _call(admin_api.get_departments)

    assert result["success"] is True
    assert calls == ["settings.department.manage"]


@pytest.mark.service
def test_designations_use_settings_designation_capability(monkeypatch):
    calls = []

    monkeypatch.setattr(admin_api, "_require_settings_capability", lambda key: calls.append(key))

    def fake_get_all(doctype, **kwargs):
        assert doctype == "Designation"
        assert kwargs.get("ignore_permissions") is True
        return []

    monkeypatch.setattr(admin_api.frappe, "get_all", fake_get_all)

    result = _call(admin_api.get_designations)

    assert result["success"] is True
    assert calls == ["settings.designation.manage"]


@pytest.mark.service
def test_roles_use_settings_role_capability(monkeypatch):
    calls = []

    monkeypatch.setattr(admin_api, "_require_settings_capability", lambda key: calls.append(key))

    def fake_get_all(doctype, **kwargs):
        assert doctype == "Role"
        assert kwargs.get("ignore_permissions") is True
        return []

    monkeypatch.setattr(admin_api.frappe, "get_all", fake_get_all)

    result = _call(admin_api.get_roles)

    assert result["success"] is True
    assert calls == ["settings.role.manage"]


@pytest.mark.service
def test_users_use_settings_user_role_capability(monkeypatch):
    calls = []

    monkeypatch.setattr(admin_api, "_require_settings_capability", lambda key: calls.append(key))
    monkeypatch.setattr(
        admin_api.frappe,
        "get_all",
        lambda doctype, **kwargs: [] if doctype in {"User", "Has Role", "Employee"} else [],
    )
    monkeypatch.setattr(admin_api.frappe, "db", types.SimpleNamespace(exists=lambda doctype, name=None: doctype == "DocType" and name == "Employee"), raising=False)

    result = _call(admin_api.get_users)

    assert result["success"] is True
    assert calls == ["settings.user_role.manage"]
