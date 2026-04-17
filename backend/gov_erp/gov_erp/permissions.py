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
     — blanket allow for any authenticated user.  Required so
     PermissionEngine can read its own data without recursion.

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

# ── Roles whose holders are allowed through the admin-doctype hook ──────
_ADMIN_ROLES = frozenset({
    "Director",
    "System Manager",
    "Presales Head",
    "HR Manager",
    "Department Head",
    "Project Head",
})

# ── Module → Roles lookup ──────────────────────────────────────────────
# Derived from rbac_seed.ROLE_PACK_MAPPINGS.  Each entry lists every
# Frappe role that holds *any* pack in the given RBAC module.
# Keep in sync when new roles or pack-mappings are added.

_MODULE_ROLES = {
    "project":     frozenset({"Director", "Project Head", "Project Manager"}),
    "presales":    frozenset({"Director", "Presales Tendering Head", "Presales Executive", "Department Head"}),
    "engineering": frozenset({"Director", "Project Head", "Project Manager", "Department Head", "Engineering Head", "Engineer"}),
    "procurement": frozenset({"Director", "Project Head", "Project Manager", "Department Head", "Procurement Manager", "Purchase", "Store Manager", "Stores Logistics Head"}),
    "inventory":   frozenset({"Director", "Project Manager", "Department Head", "Procurement Manager", "Purchase", "Store Manager", "Stores Logistics Head"}),
    "execution":   frozenset({"Director", "Project Head", "Project Manager", "Department Head", "Engineering Head", "Engineer", "Field Technician"}),
    "finance":     frozenset({"Director", "Project Head", "Department Head", "Accounts"}),
    "hr":          frozenset({"Director", "Department Head", "HR Manager"}),
    "om":          frozenset({"Director", "Department Head", "OM Operator", "RMA Manager", "Field Technician"}),
    "dms":         frozenset({"Director", "Project Head", "Project Manager", "Department Head",
                              "Engineering Head", "Engineer", "Procurement Manager", "Purchase",
                              "Store Manager", "Stores Logistics Head", "Accounts", "HR Manager",
                              "Field Technician", "OM Operator", "RMA Manager",
                              "Presales Tendering Head", "Presales Executive"}),
    "reports":     frozenset({"Director", "Project Head", "Project Manager", "Department Head",
                              "Engineering Head", "Procurement Manager", "Accounts", "HR Manager",
                              "OM Operator", "RMA Manager", "Presales Tendering Head"}),
    "master_data": frozenset({"Director", "Project Head", "Department Head"}),
    "approval":    frozenset({"Director", "Project Head", "Department Head", "Engineering Head",
                              "Procurement Manager", "Accounts", "RMA Manager"}),
    "settings":    frozenset({"Director", "Department Head"}),
}

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
# be determined (type-level permission check with doc=None).
_ALL_BUSINESS_ROLES = frozenset().union(*_MODULE_ROLES.values())


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

    Every authenticated user can read/write these.  Required so that
    PermissionEngine can resolve any user's capabilities without
    recursion, and so that cross-cutting features (alerts, reminders)
    work for all roles.

    Guests are rejected (fall through to Frappe's deny).
    """
    if not user:
        user = frappe.session.user
    if user == "Guest":
        return None
    return True


# ── Module-gated GE domain doctype hook ─────────────────────────────────

def has_ge_module_permission(doc, ptype, user):
    """Hook for GE domain doctypes (GE Tender, GE Site, GE Invoice …).

    Allowed when the user holds a Frappe role that is mapped (via
    Permission Pack) to the RBAC module that owns this doctype.

    This is the "permission checkbox per role" — if your role's packs
    don't include the module, Frappe blocks the ORM call.  Fine-grained
    capability checks (read vs write, scope, project filtering) are
    still enforced by each API endpoint.

    Falls back to "any GE business role" when the specific doctype
    can't be determined (type-level check with doc=None).
    """
    if not user:
        user = frappe.session.user
    if user == "Guest":
        return None
    if user == "Administrator":
        return True

    user_roles = set(frappe.get_roles(user))
    if "System Manager" in user_roles:
        return True

    # Try module-level check when the doctype is known
    dt = doc.doctype if doc is not None and hasattr(doc, "doctype") else None
    if dt:
        modules = _DOCTYPE_MODULE_MAP.get(dt)
        if modules:
            for mod in modules:
                if user_roles & _MODULE_ROLES.get(mod, frozenset()):
                    return True
            return None  # no matching module role → deny

    # Fallback for type-level checks (doc=None) or unmapped doctypes:
    # allow any user with a GE business role.
    if user_roles & _ALL_BUSINESS_ROLES:
        return True
    return None
