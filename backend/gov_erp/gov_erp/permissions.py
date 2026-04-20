"""
Frappe has_permission hook — single merge point between Frappe's native
doctype permission table and our custom RBAC PermissionEngine.

Frappe fires these hooks on every ``frappe.get_all``, ``doc.insert()``,
``doc.save()``, ``doc.delete()`` etc. *before* the ORM proceeds.
Returning ``True`` tells Frappe "this user is authorised", bypassing its
native DocPerm table check.

Three permission tiers:

  1. **Core Frappe doctypes** (Role, User, Employee …) — allowed for
     admin-level roles only; everyone else falls through to Frappe's
     built-in DocPerm.

  2. **RBAC-infra doctypes** (GE Permission Pack, GE Role Pack Mapping …)
     — read-open for authenticated users, write-open only for settings
     admins.  This keeps PermissionEngine bootstrap-safe without turning
     the ORM into a write-anything lane.

  3. **GE domain doctypes** (GE Tender, GE Site, GE Invoice …) —
     **module-gated**: allowed only when the user holds a Frappe role
     that is mapped to the doctype's RBAC module (presales, execution,
     finance …).  This is the Permission Pack's "checkbox per role" —
     roles that don't have a pack for the module are denied at the ORM
     layer.

Design rules:
  1. Never instantiate PermissionEngine here (avoids recursion — the
     engine itself reads GE doctypes via ``frappe.get_all``).
  2. Use only ``frappe.get_roles()`` (reads from session cache, no
     permission hooks fired).
  3. Return ``True`` to allow, ``None`` to fall through to Frappe's
     default DocPerm check.
"""

import frappe

from gov_erp.rbac_seed import ROLE_PACK_MAPPINGS
from gov_erp.role_utils import (
    ROLE_DEPARTMENT_HEAD,
    ROLE_DIRECTOR,
    ROLE_HR_MANAGER,
    ROLE_PRESALES_HEAD,
    ROLE_PROJECT_HEAD,
    ROLE_SYSTEM_MANAGER,
)

# ── Roles whose holders are allowed through the admin-doctype hook ──────
_ADMIN_ROLES = frozenset({
    ROLE_DIRECTOR,
    ROLE_SYSTEM_MANAGER,
    ROLE_PRESALES_HEAD,
    ROLE_HR_MANAGER,
    ROLE_DEPARTMENT_HEAD,
    ROLE_PROJECT_HEAD,
})

# ── Module → Roles lookup ──────────────────────────────────────────────
# Derived from ROLE_PACK_MAPPINGS so Permission Pack composition is the
# single source of truth for coarse module membership.
_PACK_TO_MODULE = {
    "project_command": "project",
    "execution_ic": "execution",
    "hr_manpower": "hr",
    "om_rma": "om",
    "settings_admin": "settings",
}


def _normalize_module_key(pack_key, module_family=None):
    return module_family or _PACK_TO_MODULE.get(pack_key, pack_key)


def _build_seed_module_roles():
    module_roles = {}
    for role_name, pack_key, _scope, _mode in ROLE_PACK_MAPPINGS:
        module_key = _normalize_module_key(pack_key)
        module_roles.setdefault(module_key, set()).add(role_name)
    return {module_key: frozenset(role_names) for module_key, role_names in module_roles.items()}


def _row_value(row, key):
    if isinstance(row, dict):
        return row.get(key)
    return getattr(row, key, None)


def _build_live_module_roles():
    try:
        mappings = frappe.get_all(
            "GE Role Pack Mapping",
            filters={"is_enabled": 1},
            fields=["role", "permission_pack"],
        )
    except Exception:
        return {}

    if not mappings:
        return {}

    pack_keys = sorted({_row_value(mapping, "permission_pack") for mapping in mappings if _row_value(mapping, "permission_pack")})
    if not pack_keys:
        return {}

    pack_rows = frappe.get_all(
        "GE Permission Pack",
        filters={"pack_key": ["in", pack_keys]},
        fields=["pack_key", "module_family"],
    )
    pack_module_map = {
        _row_value(row, "pack_key"): _normalize_module_key(_row_value(row, "pack_key"), _row_value(row, "module_family"))
        for row in pack_rows
    }

    module_roles = {}
    for mapping in mappings:
        pack_key = _row_value(mapping, "permission_pack")
        role_name = _row_value(mapping, "role")
        module_key = pack_module_map.get(pack_key, _normalize_module_key(pack_key))
        module_roles.setdefault(module_key, set()).add(role_name)

    return {module_key: frozenset(role_names) for module_key, role_names in module_roles.items()}


def _get_module_roles():
    live_roles = _build_live_module_roles()
    if live_roles:
        return live_roles
    return _build_seed_module_roles()

# ── Doctype → Module(s) map ────────────────────────────────────────────
# Maps every GE domain doctype to the RBAC module(s) whose role-holders
# may access it.  A user is allowed if they hold ANY role in ANY of the
# listed modules.  Child doctypes inherit their parent's module.

_DOCTYPE_MODULE_MAP = {
    # ── Project Command ─────────────────────────────────────────────
    "GE Site":                        ("project", "execution"),
    "GE Milestone":                   ("project", "execution"),
    "GE Project Closeout":            ("project",),
    "GE Project Favorite":            ("project",),
    "GE Project Note":                ("project",),
    "GE Project Task":                ("project",),
    "GE Project Team Member":         ("project", "execution"),
    "GE Project Communication Log":   ("project",),
    "GE Project Asset":               ("project",),
    "GE Project Staffing Requirement":("project", "hr"),
    "GE Project Staffing Assignment": ("project", "hr"),

    # ── Presales ────────────────────────────────────────────────────
    "GE Tender":                      ("presales",),
    "GE Bid":                         ("presales",),
    "GE Tender Approval":             ("presales", "approval"),
    "GE Tender Checklist":            ("presales",),
    "GE Tender Checklist Item":       ("presales",),
    "GE Tender Clarification":        ("presales",),
    "GE Tender Compliance Item":      ("presales",),
    "GE Tender Organization":         ("presales",),
    "GE Tender Reminder":             ("presales",),
    "GE Tender Result":               ("presales",),
    "GE Tender Result Bidder":        ("presales",),
    "GE LOI Tracker":                 ("presales",),
    "GE Party":                       ("presales", "master_data"),
    "GE Organization":                ("presales", "master_data"),
    "GE Competitor":                  ("presales",),
    "GE Presales Color Config":       ("presales",),
    "GE Commercial Document":         ("presales", "finance"),
    "GE PDC Instrument":              ("presales", "finance"),

    # ── Engineering ─────────────────────────────────────────────────
    "GE Survey":                      ("engineering",),
    "GE Survey Attachment":           ("engineering",),
    "GE Drawing":                     ("engineering", "execution"),
    "GE Technical Deviation":         ("engineering", "execution"),
    "GE Change Request":              ("engineering", "execution"),

    # ── Procurement ─────────────────────────────────────────────────
    "GE BOQ":                         ("procurement",),
    "GE BOQ Item":                    ("procurement",),
    "GE Cost Sheet":                  ("procurement",),
    "GE Cost Sheet Item":             ("procurement",),
    "GE Vendor Comparison":           ("procurement",),
    "GE Vendor Comparison Quote":     ("procurement",),
    "GE Costing Queue":               ("procurement",),

    # ── Inventory / Stores ──────────────────────────────────────────
    "GE Dispatch Challan":            ("inventory",),
    "GE Dispatch Challan Item":       ("inventory",),
    "GE Project Inventory":           ("inventory",),
    "GE PO Extension":                ("inventory", "procurement"),
    "GE PO Payment Term":             ("inventory", "procurement"),

    # ── Execution / I&C ────────────────────────────────────────────
    "GE Dependency Rule":             ("execution",),
    "GE Dependency Override":         ("execution",),
    "GE DPR":                         ("execution",),
    "GE DPR Item":                    ("execution",),
    "GE DPR Photo":                   ("execution",),
    "GE Document Folder":             ("execution", "dms"),
    "GE Project Document":            ("execution", "dms"),
    "GE Document Requirement":        ("execution", "dms"),
    "GE Test Report":                 ("execution",),
    "GE Test Result Item":            ("execution",),
    "GE Commissioning Checklist":     ("execution",),
    "GE Commissioning Checklist Item":("execution",),
    "GE Client Signoff":              ("execution",),
    "GE Project Issue":               ("execution",),
    "GE PM Request":                  ("execution",),
    "GE Manpower Log":                ("execution", "hr"),
    "GE IP Allocation":               ("execution",),
    "GE IP Pool":                     ("execution",),

    # ── Finance ─────────────────────────────────────────────────────
    "GE Invoice":                     ("finance",),
    "GE Invoice Line":                ("finance",),
    "GE Estimate":                    ("finance",),
    "GE Proforma Invoice":            ("finance",),
    "GE Payment Follow Up":           ("finance",),
    "GE Payment Receipt":             ("finance",),
    "GE Retention Ledger":            ("finance",),
    "GE Petty Cash":                  ("finance",),
    "GE Budget Allocation":           ("finance",),
    "GE Penalty Deduction":           ("finance",),
    "GE EMD PBG Instrument":          ("finance", "presales"),

    # ── HR / Manpower ───────────────────────────────────────────────
    "GE Employee Onboarding":         ("hr",),
    "GE Leave Application":           ("hr",),
    "GE Leave Allocation":            ("hr",),
    "GE Leave Type":                  ("hr",),
    "GE Attendance Log":              ("hr",),
    "GE Attendance Regularization":   ("hr",),
    "GE Travel Log":                  ("hr",),
    "GE Overtime Entry":              ("hr",),
    "GE Statutory Ledger":            ("hr",),
    "GE Technician Visit Log":        ("hr", "execution"),
    "GE Employee Certification":      ("hr",),
    "GE Employee Document":           ("hr",),
    "GE Material Consumption Report": ("hr", "execution"),

    # ── O&M / RMA ──────────────────────────────────────────────────
    "GE Ticket":                      ("om",),
    "GE Ticket Action":               ("om",),
    "GE RMA Tracker":                 ("om",),
    "GE SLA Profile":                 ("om",),
    "GE SLA Timer":                   ("om",),
    "GE SLA Penalty Rule":            ("om",),
    "GE SLA Penalty Record":          ("om",),
    "GE Device Register":             ("om", "execution"),
    "GE Device Uptime Log":           ("om",),

    # ── Approval ────────────────────────────────────────────────────
    "GE PH Approval Item":            ("approval",),

    # ── Reports / Accountability ────────────────────────────────────
    "GE Accountability Event":        ("reports",),
    "GE Accountability Record":       ("reports",),
}

# Union of every business role — used as fallback when the doctype can't
_RBAC_INFRA_DOCTYPES = frozenset({
    "GE Permission Pack",
    "GE Permission Pack Item",
    "GE Role Pack Mapping",
    "GE User Context",
    "GE Permission Capability",
    "GE User Pack Override",
    "GE RBAC Audit Log",
    "GE Import Log",
})

_CROSS_CUTTING_DOCTYPES = frozenset({
    "GE Alert",
    "GE User Reminder",
})

_READ_LIKE_PERMISSION_TYPES = frozenset({
    "read",
    "select",
    "report",
    "print",
    "email",
})


def _resolve_doctype(doc):
    if isinstance(doc, str):
        return doc
    if isinstance(doc, dict):
        return doc.get("doctype")
    return getattr(doc, "doctype", None)


def _has_module_role(user_roles, module_key):
    return bool(user_roles & _get_module_roles().get(module_key, frozenset()))


def _is_settings_admin(user_roles):
    return bool(user_roles & _get_module_roles().get("settings", frozenset()))


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


# ── RBAC-infrastructure doctype hook (blanket allow) ────────────────────

def has_ge_doctype_permission(doc, ptype, user):
    """Hook for RBAC-infrastructure doctypes (GE Permission Pack,
    GE Role Pack Mapping, GE User Context …) and cross-cutting doctypes
    (GE Alert, GE User Reminder, GE Import Log).

    Read access is open to authenticated users for RBAC bootstrap.
    Writes are limited to settings-admin roles. Cross-cutting personal
    doctypes (alerts and reminders) remain open to authenticated users
    and rely on API/controller ownership checks for fine-grained safety.
    """
    if not user:
        user = frappe.session.user
    if user == "Guest":
        return False
    if user == "Administrator":
        return True

    user_roles = set(frappe.get_roles(user))
    if ROLE_SYSTEM_MANAGER in user_roles:
        return True

    dt = _resolve_doctype(doc)
    if dt in _CROSS_CUTTING_DOCTYPES:
        return True

    if dt in _RBAC_INFRA_DOCTYPES:
        if not ptype or ptype in _READ_LIKE_PERMISSION_TYPES:
            return True
        return _is_settings_admin(user_roles)

    return False


# ── Module-gated GE domain doctype hook ─────────────────────────────────

def has_ge_module_permission(doc, ptype, user):
    """Hook for GE domain doctypes (GE Tender, GE Site, GE Invoice …).

    Allowed when the user holds a Frappe role that is mapped (via
    Permission Pack) to the RBAC module that owns this doctype.

    This is the "permission checkbox per role" — if your role's packs
    don't include the module, Frappe blocks the ORM call.  Fine-grained
    capability checks (read vs write, scope, project filtering) are
    still enforced by each API endpoint.

    Uses explicit doctype resolution for both document-level and
    type-level checks. Unknown or unmapped doctypes fail closed.
    """
    if not user:
        user = frappe.session.user
    if user == "Guest":
        return False
    if user == "Administrator":
        return True

    user_roles = set(frappe.get_roles(user))
    if ROLE_SYSTEM_MANAGER in user_roles:
        return True

    dt = _resolve_doctype(doc)
    if not dt:
        return False

    modules = _DOCTYPE_MODULE_MAP.get(dt)
    if not modules:
        return False

    for mod in modules:
        if _has_module_role(user_roles, mod):
            return True
    return False
