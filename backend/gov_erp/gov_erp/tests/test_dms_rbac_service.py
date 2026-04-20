import types

import pytest

from gov_erp import dms_api


def _call(func, *args, **kwargs):
    return getattr(func, "__wrapped__", func)(*args, **kwargs)


@pytest.mark.service
def test_get_documents_uses_document_read_capability(monkeypatch):
    calls = {"guard": 0, "ignore_permissions": None}

    monkeypatch.setattr(dms_api, "_require_document_read_access", lambda: calls.__setitem__("guard", calls["guard"] + 1))

    def fake_get_all(doctype, **kwargs):
        assert doctype == "File"
        calls["ignore_permissions"] = kwargs.get("ignore_permissions")
        return []

    monkeypatch.setattr(dms_api.frappe, "get_all", fake_get_all)

    result = _call(dms_api.get_documents)

    assert result["success"] is True
    assert calls["guard"] == 1
    assert calls["ignore_permissions"] is True


@pytest.mark.service
def test_get_document_folders_non_custom_uses_document_read_capability(monkeypatch):
    calls = {"guard": 0, "ignore_permissions": None}

    monkeypatch.setattr(dms_api, "_require_document_read_access", lambda: calls.__setitem__("guard", calls["guard"] + 1))

    def fake_get_all(doctype, **kwargs):
        assert doctype == "File"
        calls["ignore_permissions"] = kwargs.get("ignore_permissions")
        return []

    monkeypatch.setattr(dms_api.frappe, "get_all", fake_get_all)
    monkeypatch.setattr(dms_api.frappe, "db", types.SimpleNamespace(sql=lambda *args, **kwargs: []), raising=False)

    result = _call(dms_api.get_document_folders)

    assert result["success"] is True
    assert calls["guard"] == 1
    assert calls["ignore_permissions"] is True


@pytest.mark.service
def test_delete_uploaded_project_file_uses_delete_capability_guard(monkeypatch):
    calls = {"delete_guard": 0, "deleted": None}

    monkeypatch.setattr(dms_api, "_require_document_delete_access", lambda project=None, site=None: calls.__setitem__("delete_guard", calls["delete_guard"] + 1))
    monkeypatch.setattr(
        dms_api.frappe,
        "db",
        types.SimpleNamespace(get_value=lambda doctype, filters, fieldname: "FILE-0001", commit=lambda: None),
        raising=False,
    )
    monkeypatch.setattr(dms_api.frappe, "get_roles", lambda user=None: ["Engineer"])
    monkeypatch.setattr(dms_api.frappe, "delete_doc", lambda doctype, name, ignore_permissions=False: calls.__setitem__("deleted", (doctype, name, ignore_permissions)))
    monkeypatch.setattr(dms_api, "_is_temp_upload_file_referenced", lambda file_url: False)
    monkeypatch.setattr(dms_api.frappe.utils, "now_datetime", lambda: "now")
    monkeypatch.setattr(dms_api.frappe.utils, "time_diff_in_seconds", lambda now, creation: 60)
    monkeypatch.setattr(dms_api.frappe, "session", types.SimpleNamespace(user="engineer@technosys.local"))

    file_doc = types.SimpleNamespace(
        owner="engineer@technosys.local",
        attached_to_doctype="",
        attached_to_name="",
        attached_to_field="",
        creation="earlier",
        is_folder=0,
    )
    monkeypatch.setattr(dms_api.frappe, "get_doc", lambda doctype, name, ignore_permissions=False: file_doc)

    result = _call(dms_api.delete_uploaded_project_file, "/files/test.txt")

    assert result["success"] is True
    assert calls["delete_guard"] == 1
    assert calls["deleted"] == ("File", "FILE-0001", True)
