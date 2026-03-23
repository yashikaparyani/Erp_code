"""
ANDA Importer: Project Manpower Log (Tab 15)

Target: GE Project Staffing Assignment (new Phase 1B DocType)

This importer targets staffing/assignment history, NOT daily labour logs.
Daily deployment and costing remain in GE Manpower Log.
"""

import frappe
from frappe.utils import cstr, cint
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, resolve_reference,
)


class ProjectManpowerAssignmentImporter(BaseImporter):
    tab_name = "Project Manpower Log"
    target_doctype = "GE Project Staffing Assignment"

    POSITION_MAP = {
        "PROJECT MANAGER": "Project Manager",
        "PM": "Project Manager",
        "ENGINEER": "Engineer",
        "TECHNICIAN": "Technician",
        "SITE SUPERVISOR": "Site Supervisor",
        "SUPERVISOR": "Site Supervisor",
        "INSPECTOR": "Inspector",
        "OPERATOR": "Operator",
        "DRIVER": "Driver",
        "NETWORK ENGINEER": "Network Engineer",
        "TECHNICAL EXECUTIVE": "Technical Executive",
        "FLOOR INCHARGE": "Floor Incharge",
    }

    def parse_row(self, row, row_idx):
        employee_name = normalize_name(
            row.get("employee_name") or row.get("Employee Name")
            or row.get("Name") or row.get("name")
        )
        if not employee_name:
            return None

        project = normalize_name(
            row.get("project_id") or row.get("Project ID") or row.get("project")
        )
        raw_position = cstr(
            row.get("position") or row.get("Position") or row.get("role")
            or row.get("Role") or ""
        ).strip().upper()

        return {
            "linked_project": project,
            "linked_site": normalize_name(
                row.get("site") or row.get("Site") or row.get("location")
            ),
            "employee_name": employee_name,
            "employee_code": cstr(
                row.get("employee_code") or row.get("Employee Code")
                or row.get("Emp Code") or ""
            ).strip(),
            "position": self.POSITION_MAP.get(raw_position, "Other"),
            "qualifications": cstr(
                row.get("qualifications") or row.get("Qualifications") or ""
            ).strip(),
            "contact_number": cstr(
                row.get("contact_number") or row.get("Contact Number")
                or row.get("Phone") or ""
            ).strip(),
            "email": cstr(
                row.get("email") or row.get("Email") or ""
            ).strip(),
            "join_date": normalize_date(
                row.get("project_join_date") or row.get("Join Date")
                or row.get("Project Join Date")
            ),
            "leave_date": normalize_date(
                row.get("project_leave_date") or row.get("Leave Date")
                or row.get("Project Leave Date")
            ),
            "remarks": cstr(row.get("remarks") or row.get("Remarks") or "").strip(),
        }

    def validate_row(self, parsed):
        if not parsed.get("employee_name"):
            return False, "Missing employee name"
        if not parsed.get("linked_project"):
            return False, "Missing project reference"
        return True, ""

    def check_references(self, parsed):
        unresolved = []
        if parsed.get("linked_project"):
            if not resolve_reference("Project", parsed["linked_project"]):
                unresolved.append({"field": "linked_project", "value": parsed["linked_project"]})
        if parsed.get("linked_site"):
            if not resolve_reference("GE Site", parsed["linked_site"]):
                unresolved.append({"field": "linked_site", "value": parsed["linked_site"]})
        return unresolved

    def find_duplicate(self, parsed):
        filters = {
            "linked_project": parsed["linked_project"],
            "employee_name": parsed["employee_name"],
        }
        if parsed.get("employee_code"):
            filters["employee_code"] = parsed["employee_code"]
        exists = frappe.db.exists("GE Project Staffing Assignment", filters)
        return exists if exists else None

    def commit_row(self, parsed):
        doc = frappe.new_doc("GE Project Staffing Assignment")
        for field in [
            "linked_project", "linked_site", "employee_name", "employee_code",
            "position", "qualifications", "contact_number", "email",
            "join_date", "leave_date", "remarks",
        ]:
            if parsed.get(field):
                doc.set(field, parsed[field])
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
