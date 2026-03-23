"""
ANDA Importer: Issue Log (Tab 6)

Target: GE Ticket + GE Ticket Action

Maps the ANDA Issue Log sheet columns to GE Ticket fields.
The formal mapping (Phase 1A decision):

| ANDA Column          | GE Ticket Field    |
|----------------------|--------------------|
| Issue ID             | source_issue_id |
| Project ID           | linked_project     |
| Location ID          | linked_site        |
| Date Raised          | raised_on          |
| Reported By          | raised_by (matched to User) |
| Issue Description    | title + description |
| Issue Category       | category           |
| Impact Level         | impact_level (NEW) |
| Priority             | priority           |
| Assigned To          | assigned_to (matched to User) |
| Due Date             | due_date (NEW)     |
| Resolution Plan      | resolution_notes   |
| Status               | status             |
"""

import frappe
from frappe.utils import cstr
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, resolve_reference,
)


class IssueLogImporter(BaseImporter):
    tab_name = "Issue Log"
    target_doctype = "GE Ticket"

    CATEGORY_MAP = {
        "HARDWARE": "HARDWARE_ISSUE",
        "HARDWARE ISSUE": "HARDWARE_ISSUE",
        "SOFTWARE": "SOFTWARE_ISSUE",
        "SOFTWARE ISSUE": "SOFTWARE_ISSUE",
        "NETWORK": "NETWORK_ISSUE",
        "NETWORK ISSUE": "NETWORK_ISSUE",
        "PERFORMANCE": "PERFORMANCE",
        "MAINTENANCE": "MAINTENANCE",
    }

    PRIORITY_MAP = {
        "CRITICAL": "CRITICAL",
        "HIGH": "HIGH",
        "MEDIUM": "MEDIUM",
        "LOW": "LOW",
        "P1": "CRITICAL",
        "P2": "HIGH",
        "P3": "MEDIUM",
        "P4": "LOW",
    }

    STATUS_MAP = {
        "OPEN": "NEW",
        "NEW": "NEW",
        "ASSIGNED": "ASSIGNED",
        "IN PROGRESS": "IN_PROGRESS",
        "ON HOLD": "ON_HOLD",
        "RESOLVED": "RESOLVED",
        "CLOSED": "CLOSED",
    }

    IMPACT_MAP = {
        "HIGH": "HIGH",
        "CRITICAL": "HIGH",
        "MEDIUM": "MEDIUM",
        "LOW": "LOW",
    }

    def parse_row(self, row, row_idx):
        description = cstr(
            row.get("issue_description") or row.get("Issue Description")
            or row.get("description") or row.get("Description") or ""
        ).strip()
        issue_id = cstr(
            row.get("issue_id") or row.get("Issue ID") or ""
        ).strip()
        if not description and not issue_id:
            return None

        project = normalize_name(
            row.get("project_id") or row.get("Project ID") or row.get("project")
        )
        raw_cat = cstr(
            row.get("issue_category") or row.get("Issue Category") or row.get("category") or ""
        ).strip().upper()
        raw_priority = cstr(
            row.get("priority") or row.get("Priority") or ""
        ).strip().upper()
        raw_impact = cstr(
            row.get("impact_level") or row.get("Impact Level") or ""
        ).strip().upper()
        raw_status = cstr(
            row.get("status") or row.get("Status") or ""
        ).strip().upper()

        return {
            "issue_id": issue_id,
            "source_issue_id": issue_id,
            "linked_project": project,
            "linked_site": normalize_name(
                row.get("location_id") or row.get("Location ID") or row.get("site")
            ),
            "title": description[:140] if description else issue_id,
            "description": description,
            "category": self.CATEGORY_MAP.get(raw_cat, "OTHER"),
            "impact_level": self.IMPACT_MAP.get(raw_impact),
            "priority": self.PRIORITY_MAP.get(raw_priority, "MEDIUM"),
            "status": self.STATUS_MAP.get(raw_status, "NEW"),
            "raised_on": normalize_date(
                row.get("date_raised") or row.get("Date Raised")
            ),
            "raised_by_name": normalize_name(
                row.get("reported_by") or row.get("Reported By")
            ),
            "assigned_to_name": normalize_name(
                row.get("assigned_to") or row.get("Assigned To")
            ),
            "due_date": normalize_date(
                row.get("due_date") or row.get("Due Date")
            ),
            "resolution_notes": cstr(
                row.get("resolution_plan") or row.get("Resolution Plan") or ""
            ).strip(),
        }

    def validate_row(self, parsed):
        if not parsed.get("title"):
            return False, "Missing issue description"
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
        # Prefer stable ANDA source Issue ID when present.
        if parsed.get("source_issue_id"):
            existing = frappe.db.exists("GE Ticket", {"source_issue_id": parsed["source_issue_id"]})
            if existing:
                return existing

        # By title + project
        filters = {"title": parsed["title"]}
        if parsed.get("linked_project"):
            filters["linked_project"] = parsed["linked_project"]
        exists = frappe.db.exists("GE Ticket", filters)
        return exists if exists else None

    def commit_row(self, parsed):
        doc = frappe.new_doc("GE Ticket")
        doc.title = parsed["title"]
        doc.description = parsed.get("description")
        doc.category = parsed.get("category", "OTHER")
        doc.priority = parsed.get("priority", "MEDIUM")
        doc.status = parsed.get("status", "NEW")

        if parsed.get("linked_project"):
            doc.linked_project = parsed["linked_project"]
        if parsed.get("linked_site"):
            doc.linked_site = parsed["linked_site"]
        if parsed.get("impact_level"):
            doc.impact_level = parsed["impact_level"]
        if parsed.get("due_date"):
            doc.due_date = parsed["due_date"]
        if parsed.get("source_issue_id"):
            doc.source_issue_id = parsed["source_issue_id"]
        if parsed.get("raised_on"):
            doc.raised_on = parsed["raised_on"]
        if parsed.get("resolution_notes"):
            doc.resolution_notes = parsed["resolution_notes"]

        # Try to resolve user references
        if parsed.get("raised_by_name"):
            user = self._resolve_user(parsed["raised_by_name"])
            if user:
                doc.raised_by = user
        if parsed.get("assigned_to_name"):
            user = self._resolve_user(parsed["assigned_to_name"])
            if user:
                doc.assigned_to = user

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name

    def _resolve_user(self, name_or_email):
        if not name_or_email:
            return None
        # Try exact email match
        if "@" in name_or_email:
            exists = frappe.db.exists("User", name_or_email)
            if exists:
                return exists
        # Try full_name match
        users = frappe.get_all(
            "User", filters={"full_name": name_or_email}, fields=["name"], limit=1
        )
        return users[0].name if users else None
