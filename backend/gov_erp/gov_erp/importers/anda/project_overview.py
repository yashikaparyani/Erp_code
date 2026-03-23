"""
ANDA Importer: Project Overview (Tab 2)

Target: Project
"""

import frappe
from frappe.utils import cstr
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, resolve_reference,
)


class ProjectOverviewImporter(BaseImporter):
    tab_name = "Project Overview"
    target_doctype = "Project"

    # Expected columns from ANDA sheet
    FIELD_MAP = {
        "project_id": "name",
        "project_name": "project_name",
        "work_order_number": "work_order_number",
        "planned_start": "expected_start_date",
        "planned_end": "expected_end_date",
        "current_status": "status",
    }

    STATUS_MAP = {
        "OPEN": "Open",
        "ACTIVE": "Open",
        "IN PROGRESS": "Open",
        "COMPLETED": "Completed",
        "CLOSED": "Completed",
        "CANCELLED": "Cancelled",
        "ON HOLD": "Open",
    }

    def parse_row(self, row, row_idx):
        project_id = normalize_name(row.get("project_id") or row.get("Project ID"))
        project_name = normalize_name(
            row.get("project_name") or row.get("Project Name") or row.get("project name")
        )
        if not project_id and not project_name:
            return None

        raw_status = cstr(row.get("current_status") or row.get("Status") or "").strip().upper()

        return {
            "project_id": project_id,
            "project_name": project_name or project_id,
            "work_order_number": cstr(
                row.get("work_order_number") or row.get("Work Order Number") or ""
            ).strip(),
            "expected_start_date": normalize_date(
                row.get("planned_start") or row.get("Planned Start")
            ),
            "expected_end_date": normalize_date(
                row.get("planned_end") or row.get("Planned End")
            ),
            "status": self.STATUS_MAP.get(raw_status, "Open"),
        }

    def validate_row(self, parsed):
        if not parsed.get("project_id") and not parsed.get("project_name"):
            return False, "Missing project identifier"
        return True, ""

    def find_duplicate(self, parsed):
        pid = parsed.get("project_id")
        if pid:
            exists = frappe.db.exists("Project", pid)
            if exists:
                return exists
        pname = parsed.get("project_name")
        if pname:
            exists = frappe.db.exists("Project", {"project_name": pname})
            if exists:
                return exists
        return None

    def commit_row(self, parsed):
        doc = frappe.new_doc("Project")
        if parsed.get("project_id"):
            doc.name = parsed["project_id"]
        doc.project_name = parsed["project_name"]
        doc.status = parsed.get("status", "Open")
        if parsed.get("expected_start_date"):
            doc.expected_start_date = parsed["expected_start_date"]
        if parsed.get("expected_end_date"):
            doc.expected_end_date = parsed["expected_end_date"]
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
