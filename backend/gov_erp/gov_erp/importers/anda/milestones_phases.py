"""
ANDA Importer: Project Milestones & Phases (Tab 3)

Target: GE Milestone
"""

import frappe
from frappe.utils import cstr
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, resolve_reference,
)


class MilestonesPhasesImporter(BaseImporter):
    tab_name = "Project Milestones & Phases"
    target_doctype = "GE Milestone"

    STATUS_MAP = {
        "NOT STARTED": "NOT_STARTED",
        "IN PROGRESS": "IN_PROGRESS",
        "COMPLETED": "COMPLETED",
        "DELAYED": "DELAYED",
        "BLOCKED": "BLOCKED",
        "PENDING": "NOT_STARTED",
        "DONE": "COMPLETED",
    }

    def parse_row(self, row, row_idx):
        name = normalize_name(
            row.get("milestone_name") or row.get("Milestone Name") or row.get("milestone")
        )
        if not name:
            return None

        project = normalize_name(
            row.get("project") or row.get("Project") or row.get("project_id")
        )
        site = normalize_name(row.get("site") or row.get("Site") or row.get("location"))
        raw_status = cstr(row.get("status") or row.get("Status") or "").strip().upper()

        return {
            "milestone_name": name,
            "linked_project": project,
            "linked_site": site,
            "planned_start": normalize_date(
                row.get("planned_start") or row.get("Planned Start")
            ),
            "planned_end": normalize_date(
                row.get("planned_end") or row.get("Planned End")
            ),
            "actual_start": normalize_date(
                row.get("actual_start") or row.get("Actual Start")
            ),
            "actual_end": normalize_date(
                row.get("actual_end") or row.get("Actual End")
            ),
            "status": self.STATUS_MAP.get(raw_status, "NOT_STARTED"),
            "remarks": cstr(row.get("remarks") or row.get("Remarks") or "").strip(),
            "assigned_team": cstr(
                row.get("assigned_team") or row.get("Assigned Team/Role") or ""
            ).strip(),
        }

    def validate_row(self, parsed):
        if not parsed.get("milestone_name"):
            return False, "Missing milestone name"
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
        filters = {"milestone_name": parsed["milestone_name"]}
        if parsed.get("linked_project"):
            filters["linked_project"] = parsed["linked_project"]
        if parsed.get("linked_site"):
            filters["linked_site"] = parsed["linked_site"]
        exists = frappe.db.exists("GE Milestone", filters)
        return exists if exists else None

    def commit_row(self, parsed):
        doc = frappe.new_doc("GE Milestone")
        doc.milestone_name = parsed["milestone_name"]
        doc.linked_project = parsed.get("linked_project")
        doc.linked_site = parsed.get("linked_site")
        doc.status = parsed.get("status", "NOT_STARTED")
        if parsed.get("planned_start"):
            doc.planned_start = parsed["planned_start"]
        if parsed.get("planned_end"):
            doc.planned_end = parsed["planned_end"]
        if parsed.get("actual_start"):
            doc.actual_start = parsed["actual_start"]
        if parsed.get("actual_end"):
            doc.actual_end = parsed["actual_end"]
        if parsed.get("remarks"):
            doc.remarks = parsed["remarks"]
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
