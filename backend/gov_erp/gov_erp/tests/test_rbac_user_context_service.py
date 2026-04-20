import types

import pytest

from gov_erp import rbac_api


class _UserDoc:
    def __init__(self, roles):
        self.roles = [types.SimpleNamespace(role=role) for role in roles]
        self.saved_with_ignore_permissions = None

    def append(self, fieldname, value):
        assert fieldname == "roles"
        self.roles.append(types.SimpleNamespace(role=value["role"]))

    def save(self, ignore_permissions=False):
        self.saved_with_ignore_permissions = ignore_permissions


@pytest.mark.service
def test_sync_user_managed_roles_replaces_context_managed_roles_only(monkeypatch):
    user_doc = _UserDoc(["System Manager", "Store Manager", "Legacy Custom Role"])
    monkeypatch.setattr(rbac_api.frappe, "get_doc", lambda doctype, name, ignore_permissions=False: user_doc)

    resulting_roles = rbac_api._sync_user_managed_roles(
        "director@technosys.local",
        ["Accounts", "Custom Finance Reviewer"],
        current_context_roles=["Store Manager", "Legacy Custom Role"],
    )

    assert resulting_roles == ["Accounts", "Custom Finance Reviewer"]
    assert sorted(role.role for role in user_doc.roles) == [
        "Accounts",
        "Custom Finance Reviewer",
        "System Manager",
    ]
    assert user_doc.saved_with_ignore_permissions is True
