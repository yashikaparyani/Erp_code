"""
Frappe has_permission hook — single merge point between Frappe's native
doctype permission table and our custom RBAC PermissionEngine.

Frappe fires these hooks on every ``frappe.get_all``, ``doc.insert()``,
``doc.save()``, ``doc.delete()`` etc. *before* the ORM proceeds.
Returning ``True`` tells Frappe "this user is authorised", bypassing its
native DocPerm table check.

All API endpoints already run their own guards (``_require_roles()``,
``_require_settings_capability()``) before any ORM call, so the hook
only needs to confirm the user *can plausibly* hold the required
authorisation.

Design rules:
  1. Never instantiate PermissionEngine here (avoids recursion — the
     engine itself reads GE doctypes via ``frappe.get_all``).
  2. Use only ``frappe.get_roles()`` (reads from session cache, no
     permission hooks fired).
  3. Return ``True`` to allow, ``None`` to fall through to Frappe's
     default DocPerm check.
"""

import frappe

# ── Roles whose holders are allowed through the admin-doctype hook ──────
# This is the union of every role accepted by ``_require_roles()`` in
# admin_api.py.  Keep it in sync when new admin endpoints are added.
_ADMIN_ROLES = frozenset({
    "Director",
    "System Manager",
    "Presales Head",
    "HR Manager",
    "Department Head",
    "Project Head",
})


def _has_admin_role(user):
    """True when *user* holds at least one of the admin-api roles."""
    if not user:
        user = frappe.session.user
    if user == "Administrator":
        return True
    return bool(_ADMIN_ROLES & set(frappe.get_roles(user)))


# ── Core doctype hook ───────────────────────────────────────────────────

def has_core_doctype_permission(doc, ptype, user):
    """Hook for core Frappe doctypes used by admin_api.py and
    permission_engine.py: Role, Department, Designation, User, Company,
    Has Role, Employee, Project.

    Users who hold an admin role are allowed all operations; everyone
    else falls through to Frappe's default DocPerm table.
    """
    if _has_admin_role(user):
        return True
    return None


# ── GE custom doctype hook ──────────────────────────────────────────────

def has_ge_doctype_permission(doc, ptype, user):
    """Hook for GE custom doctypes (GE Permission Pack, GE Role Pack
    Mapping, GE User Context, etc.).

    Every authenticated user can read/write GE doctypes.  Read access is
    required so that PermissionEngine can resolve any user's own
    capabilities.  Write access is required so that rbac_api.py
    endpoints (which already enforce ``_require_settings_capability()``)
    can persist changes.

    Guests are rejected (fall through to Frappe's deny).
    """
    if not user:
        user = frappe.session.user
    if user == "Guest":
        return None
    return True
