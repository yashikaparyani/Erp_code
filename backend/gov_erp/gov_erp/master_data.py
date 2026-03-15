"""
gov_erp.master_data
~~~~~~~~~~~~~~~~~~~~
Idempotent seeder that creates the client org's master records on first
install (and is safe to re-run on migrate).

Covers:
  • Department masters aligned with the HR org chart
  • Designation masters (job-title vocabulary, distinct from permission roles)

Call from install.py:  after_install / after_migrate
"""

import frappe


# ── Departments ────────────────────────────────────────────────────────────
# Keys are the department names that will be created.  The optional value is
# the intended parent department name (used only when the parent already
# exists or will be created in the same run).
CLIENT_DEPARTMENTS = [
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
]


# ── Designations ───────────────────────────────────────────────────────────
# These are job-title vocabulary entries (Frappe Designation doctype) that
# describe *what the person does*.  They are intentionally separate from the
# permission roles listed in role_utils.py (which control *what the person
# can access*).  The two can be linked via the Employee doctype; the lookup
# at login uses permission roles only.
CLIENT_DESIGNATIONS = [
    # Executive leadership
    "Director",
    "General Manager",
    # Department / functional heads
    "Department Head",
    "Project Head",
    "Presales Head",
    "HR Head",
    "Accounts Head",
    "Procurement Head",
    "RMA Head",
    "Store Head",
    "Engineering Head",
    # Mid-level / specialists
    "Project Manager",
    "Project Coordinator",
    "Presales Executive",
    "MIS Executive",
    "Accounts Executive",
    "HR Executive",
    "Procurement Manager",
    "Purchase Executive",
    "Network Engineer",
    "Engineer",
    "Technical Executive",
    # Field / operations
    "Field Technician",
    "Store Executive",
    "Logistics Executive",
    "OM Operator",
    "Operator",
    # Support
    "Admin Executive",
]


def _get_default_company():
    companies = frappe.get_all("Company", fields=["name"], order_by="creation asc", limit_page_length=1)
    return companies[0].name if companies else None


def seed_departments():
    """Create client departments if they don't already exist."""
    company = _get_default_company()
    if not company:
        frappe.log_error("master_data.seed_departments: No Company found, skipping department seed.")
        return

    created = []
    for dept_name in CLIENT_DEPARTMENTS:
        if frappe.db.exists("Department", {"department_name": dept_name, "company": company}):
            continue
        doc = frappe.get_doc({
            "doctype": "Department",
            "department_name": dept_name,
            "company": company,
        })
        doc.insert(ignore_permissions=True)
        created.append(dept_name)

    if created:
        frappe.db.commit()

    return created


def seed_designations():
    """Create client designations if they don't already exist."""
    created = []
    for desig_name in CLIENT_DESIGNATIONS:
        if frappe.db.exists("Designation", {"designation_name": desig_name}):
            continue
        doc = frappe.get_doc({
            "doctype": "Designation",
            "designation_name": desig_name,
        })
        doc.insert(ignore_permissions=True)
        created.append(desig_name)

    if created:
        frappe.db.commit()

    return created


def seed_all():
    """Run all master data seeders.  Safe to call multiple times."""
    seed_departments()
    seed_designations()
