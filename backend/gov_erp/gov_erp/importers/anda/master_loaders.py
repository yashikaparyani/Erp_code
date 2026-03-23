"""
ANDA Phase 3: Master Data Loaders

Ensures all reference/master data is present in ERP before transactional
imports run.  Each loader is idempotent (safe to re-run).

Load order (matches ANDA strategy document):
    1. Departments        — HR org chart vocabulary
    2. Designations       — job-title vocabulary
    3. Role mappings      — permission role aliases
    4. Projects           — project master with normalized names
    5. Sites              — GE Site with project linkage
    6. Vendors/Suppliers  — Supplier master with normalized names
    7. Milestone templates — if any templated milestone data exists
    8. Organization/Client — company-level defaults

The orchestrator function ``load_all_masters`` runs them in order and
returns a combined report.
"""

import frappe
from frappe.utils import cstr, cint


class MasterLoadReport:
    """Lightweight report for master data loading operations."""

    def __init__(self):
        self.steps = []

    def add_step(self, name, created=0, existing=0, errors=None):
        self.steps.append({
            "name": name,
            "created": created,
            "existing": existing,
            "errors": errors or [],
        })

    def as_dict(self):
        total_created = sum(s["created"] for s in self.steps)
        total_existing = sum(s["existing"] for s in self.steps)
        total_errors = sum(len(s["errors"]) for s in self.steps)
        return {
            "total_created": total_created,
            "total_existing": total_existing,
            "total_errors": total_errors,
            "steps": self.steps,
        }

    def summary(self):
        lines = ["Master Data Load Report:"]
        for s in self.steps:
            err = f" errors={len(s['errors'])}" if s["errors"] else ""
            lines.append(
                f"  {s['name']}: created={s['created']} existing={s['existing']}{err}"
            )
        d = self.as_dict()
        lines.append(
            f"  TOTAL: created={d['total_created']} existing={d['total_existing']} errors={d['total_errors']}"
        )
        return "\n".join(lines)


# ─── 1. Departments ─────────────────────────────────────────────────────────

# These come from master_data.py + any ANDA-specific additions
ANDA_DEPARTMENTS = [
    "Accounts Department",
    "Presales Department",
    "Central Team",
    "Project Coordinator Department",
    "Purchase Department",
    "HR/Admin Department",
    "Store Department",
    "Sales Department",
    "RMA",
    "O&M",
    "Engineering",
    "IT",
]


def load_departments(rows=None):
    """Ensure departments exist.  If rows is provided, use those names;
    otherwise use the canonical ANDA list."""
    company = _get_default_company()
    if not company:
        return 0, 0, ["No Company found"]

    names = rows or ANDA_DEPARTMENTS
    created = 0
    existing = 0
    errors = []
    for dept_name in names:
        dept_name = cstr(dept_name).strip()
        if not dept_name:
            continue
        if frappe.db.exists("Department", {"department_name": dept_name, "company": company}):
            existing += 1
            continue
        try:
            frappe.get_doc({
                "doctype": "Department",
                "department_name": dept_name,
                "company": company,
            }).insert(ignore_permissions=True)
            created += 1
        except Exception as e:
            errors.append(f"Department '{dept_name}': {e}")

    if created:
        frappe.db.commit()
    return created, existing, errors


# ─── 2. Designations ────────────────────────────────────────────────────────

ANDA_DESIGNATIONS = [
    "Director", "General Manager",
    "Department Head", "Project Head", "Presales Head",
    "HR Head", "Accounts Head", "Procurement Head", "RMA Head",
    "Store Head", "Engineering Head",
    "Project Manager", "Project Coordinator",
    "Presales Executive", "MIS Executive",
    "Accounts Executive", "HR Executive",
    "Procurement Manager", "Purchase Executive",
    "Network Engineer", "Engineer", "Technical Executive",
    "Field Technician", "Store Executive", "Logistics Executive",
    "OM Operator", "Operator", "Admin Executive",
    "Site Supervisor", "Inspector", "Driver", "Floor Incharge",
]


def load_designations(rows=None):
    """Ensure designations exist."""
    names = rows or ANDA_DESIGNATIONS
    created = 0
    existing = 0
    errors = []
    for desig_name in names:
        desig_name = cstr(desig_name).strip()
        if not desig_name:
            continue
        if frappe.db.exists("Designation", {"designation_name": desig_name}):
            existing += 1
            continue
        try:
            frappe.get_doc({
                "doctype": "Designation",
                "designation_name": desig_name,
            }).insert(ignore_permissions=True)
            created += 1
        except Exception as e:
            errors.append(f"Designation '{desig_name}': {e}")

    if created:
        frappe.db.commit()
    return created, existing, errors


# ─── 3. Role Mappings ───────────────────────────────────────────────────────

# The ANDA sheet sometimes uses informal role labels.  This mapping normalizes
# them to the canonical ERP permission roles defined in role_utils.py.
ANDA_ROLE_ALIASES = {
    "Director": "Director",
    "MD": "Director",
    "Managing Director": "Director",
    "Project Head": "Project Head",
    "Project Manager": "Project Manager",
    "PM": "Project Manager",
    "Engineering Head": "Engineering Head",
    "Eng Head": "Engineering Head",
    "Engineer": "Engineer",
    "Purchase": "Purchase",
    "Procurement": "Purchase",
    "Procurement Head": "Procurement Head",
    "Accounts": "Accounts",
    "Accounts Head": "Accounts Head",
    "HR Manager": "HR Manager",
    "HR": "HR Manager",
    "RMA Manager": "RMA Manager",
    "RMA": "RMA Manager",
    "Store": "Stores Logistics Head",
    "Stores": "Stores Logistics Head",
    "Stores Logistics Head": "Stores Logistics Head",
    "Presales Head": "Presales Head",
    "Department Head": "Department Head",
    "Field Technician": "Field Technician",
}


def resolve_role_alias(raw_role):
    """Resolve an ANDA sheet role label to the canonical ERP role name."""
    if not raw_role:
        return None
    raw = cstr(raw_role).strip()
    return ANDA_ROLE_ALIASES.get(raw, ANDA_ROLE_ALIASES.get(raw.title(), raw))


def load_role_mappings():
    """Ensure all ERP permission roles exist.  Roles are created by
    role_utils.ensure_business_roles() on install/migrate, so this just
    validates they are present and returns a report."""
    from gov_erp.role_utils import BUSINESS_ROLES
    existing = 0
    missing = []
    for role in BUSINESS_ROLES:
        if frappe.db.exists("Role", role):
            existing += 1
        else:
            missing.append(role)
    return 0, existing, [f"Missing role: {r}" for r in missing]


# ─── 4. Projects ────────────────────────────────────────────────────────────

def load_projects(rows=None):
    """Ensure projects exist from a list of dicts with at least
    'project_name' or 'name' keys."""
    if not rows:
        return 0, 0, []

    created = 0
    existing = 0
    errors = []
    for row in rows:
        if isinstance(row, str):
            row = {"project_name": row}
        name = cstr(row.get("project_name") or row.get("name") or "").strip()
        if not name:
            continue
        if frappe.db.exists("Project", {"project_name": name}):
            existing += 1
            continue
        if frappe.db.exists("Project", name):
            existing += 1
            continue
        try:
            doc = frappe.new_doc("Project")
            doc.project_name = name
            if row.get("status"):
                doc.status = row["status"]
            if row.get("expected_start_date"):
                doc.expected_start_date = row["expected_start_date"]
            if row.get("expected_end_date"):
                doc.expected_end_date = row["expected_end_date"]
            if row.get("company"):
                doc.company = row["company"]
            else:
                company = _get_default_company()
                if company:
                    doc.company = company
            doc.insert(ignore_permissions=True)
            created += 1
        except Exception as e:
            errors.append(f"Project '{name}': {e}")

    if created:
        frappe.db.commit()
    return created, existing, errors


# ─── 5. Sites ───────────────────────────────────────────────────────────────

def load_sites(rows=None):
    """Ensure GE Sites exist from a list of dicts with
    'site_name' or 'site_id' keys."""
    if not rows:
        return 0, 0, []

    created = 0
    existing = 0
    errors = []
    for row in rows:
        if isinstance(row, str):
            row = {"site_name": row}
        site_name = cstr(row.get("site_name") or row.get("name") or "").strip()
        site_id = cstr(row.get("site_id") or "").strip()
        if not site_name and not site_id:
            continue

        # Check duplicates by site_id or site_name
        if site_id and frappe.db.exists("GE Site", {"site_id": site_id}):
            existing += 1
            continue
        if site_name and frappe.db.exists("GE Site", {"site_name": site_name}):
            existing += 1
            continue

        try:
            doc = frappe.new_doc("GE Site")
            if site_name:
                doc.site_name = site_name
            if site_id:
                doc.site_id = site_id
            if row.get("linked_project"):
                doc.linked_project = row["linked_project"]
            if row.get("latitude"):
                doc.latitude = row["latitude"]
            if row.get("longitude"):
                doc.longitude = row["longitude"]
            doc.insert(ignore_permissions=True)
            created += 1
        except Exception as e:
            errors.append(f"Site '{site_name or site_id}': {e}")

    if created:
        frappe.db.commit()
    return created, existing, errors


# ─── 6. Vendors / Suppliers ─────────────────────────────────────────────────

def load_vendors(rows=None):
    """Ensure Suppliers exist from a list of names or dicts."""
    if not rows:
        return 0, 0, []

    created = 0
    existing = 0
    errors = []
    for row in rows:
        if isinstance(row, str):
            row = {"supplier_name": row}
        name = cstr(row.get("supplier_name") or row.get("vendor_name") or row.get("name") or "").strip()
        if not name:
            continue

        # Check by supplier_name (case-insensitive)
        exist_check = frappe.db.get_value("Supplier", {"supplier_name": name}, "name")
        if exist_check:
            existing += 1
            continue
        # Fuzzy match
        results = frappe.get_all(
            "Supplier",
            filters={"supplier_name": ["like", f"%{name}%"]},
            fields=["name", "supplier_name"],
            limit=5,
        )
        if any(r.supplier_name.strip().lower() == name.lower() for r in results):
            existing += 1
            continue

        try:
            doc = frappe.new_doc("Supplier")
            doc.supplier_name = name
            doc.supplier_group = row.get("supplier_group", "All Supplier Groups")
            doc.insert(ignore_permissions=True)
            created += 1
        except Exception as e:
            errors.append(f"Supplier '{name}': {e}")

    if created:
        frappe.db.commit()
    return created, existing, errors


# ─── 7. Milestone Templates ─────────────────────────────────────────────────

def load_milestone_templates():
    """Milestone templates are project-specific and created during
    transactional import (Phase 4), not as standalone masters.
    This is a no-op placeholder for completeness."""
    return 0, 0, []


# ─── Reference Integrity Checker ────────────────────────────────────────────

def check_reference_integrity():
    """Verify that master data references are healthy.

    Returns a dict with integrity check results:
    - projects_without_company
    - sites_without_project
    - orphan counts
    """
    results = {}

    # Projects without company
    results["projects_without_company"] = frappe.db.count(
        "Project", {"company": ["in", ["", None]]}
    )

    # Sites without linked project
    results["sites_without_project"] = frappe.db.count(
        "GE Site", {"linked_project": ["in", ["", None]]}
    )

    # Total master counts
    results["total_departments"] = frappe.db.count("Department")
    results["total_designations"] = frappe.db.count("Designation")
    results["total_projects"] = frappe.db.count("Project")
    results["total_sites"] = frappe.db.count("GE Site")
    results["total_suppliers"] = frappe.db.count("Supplier")
    results["total_users"] = frappe.db.count("User", {"enabled": 1})
    results["total_milestones"] = frappe.db.count("GE Milestone")

    # Check if key reference targets exist for transactional imports
    results["has_projects"] = results["total_projects"] > 0
    results["has_sites"] = results["total_sites"] > 0
    results["has_suppliers"] = results["total_suppliers"] > 0
    results["ready_for_transactional_import"] = (
        results["has_projects"]
        and results["total_departments"] > 0
        and results["total_designations"] > 0
    )

    return results


# ─── Orchestrator ────────────────────────────────────────────────────────────

def load_all_masters(
    departments=None, designations=None,
    projects=None, sites=None, vendors=None,
):
    """Run all master loaders in the correct order.

    Args:
        departments: optional list of department name strings
        designations: optional list of designation name strings
        projects: optional list of project dicts or name strings
        sites: optional list of site dicts or name strings
        vendors: optional list of supplier/vendor name strings or dicts

    Returns:
        MasterLoadReport with per-step results
    """
    report = MasterLoadReport()

    # 1. Departments
    c, e, err = load_departments(departments)
    report.add_step("Departments", created=c, existing=e, errors=err)

    # 2. Designations
    c, e, err = load_designations(designations)
    report.add_step("Designations", created=c, existing=e, errors=err)

    # 3. Role mappings (validation only)
    c, e, err = load_role_mappings()
    report.add_step("Role Mappings", created=c, existing=e, errors=err)

    # 4. Projects
    c, e, err = load_projects(projects)
    report.add_step("Projects", created=c, existing=e, errors=err)

    # 5. Sites
    c, e, err = load_sites(sites)
    report.add_step("Sites", created=c, existing=e, errors=err)

    # 6. Vendors
    c, e, err = load_vendors(vendors)
    report.add_step("Vendors/Suppliers", created=c, existing=e, errors=err)

    # 7. Milestone templates (no-op)
    c, e, err = load_milestone_templates()
    report.add_step("Milestone Templates", created=c, existing=e, errors=err)

    frappe.db.commit()
    return report


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_default_company():
    companies = frappe.get_all(
        "Company", fields=["name"], order_by="creation asc", limit_page_length=1
    )
    return companies[0].name if companies else None
