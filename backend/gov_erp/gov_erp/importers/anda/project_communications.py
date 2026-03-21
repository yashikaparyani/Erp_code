"""
ANDA Importer: Project Communications Log (Tab 9)

Target: GE Project Communication Log
"""

import frappe
from frappe.utils import cstr
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, resolve_reference,
)


class ProjectCommunicationsImporter(BaseImporter):
    tab_name = "Project Communications Log"
    target_doctype = "GE Project Communication Log"

    def parse_row(self, row, row_idx):
        project = normalize_name(
            row.get("project_id") or row.get("Project ID") or row.get("project")
        )
        subject = cstr(
            row.get("subject") or row.get("Subject") or ""
        ).strip()
        if not project and not subject:
            return None

        return {
            "linked_project": project,
            "communication_type": cstr(
                row.get("communication_type") or row.get("Communication Type") or ""
            ).strip(),
            "communication_date": normalize_date(
                row.get("communication_date") or row.get("Date")
            ),
            "reference_number": cstr(
                row.get("reference_number") or row.get("Reference Number") or ""
            ).strip(),
            "subject": subject,
            "sender": normalize_name(row.get("sender") or row.get("Sender") or row.get("From")),
            "recipient": normalize_name(
                row.get("recipient") or row.get("Recipient") or row.get("To")
            ),
            "status": cstr(row.get("status") or row.get("Status") or "").strip(),
            "responsible_person": normalize_name(
                row.get("responsible_person") or row.get("Responsible Person")
            ),
            "remarks": cstr(row.get("remarks") or row.get("Remarks") or "").strip(),
        }

    def validate_row(self, parsed):
        if not parsed.get("linked_project"):
            return False, "Missing project reference"
        if not parsed.get("subject"):
            return False, "Missing subject"
        return True, ""

    def check_references(self, parsed):
        unresolved = []
        if parsed.get("linked_project"):
            if not resolve_reference("Project", parsed["linked_project"]):
                unresolved.append({"field": "linked_project", "value": parsed["linked_project"]})
        return unresolved

    def find_duplicate(self, parsed):
        filters = {"linked_project": parsed["linked_project"], "subject": parsed["subject"]}
        if parsed.get("communication_date"):
            filters["communication_date"] = parsed["communication_date"]
        exists = frappe.db.exists("GE Project Communication Log", filters)
        return exists if exists else None

    def commit_row(self, parsed):
        doc = frappe.new_doc("GE Project Communication Log")
        for field in [
            "linked_project", "communication_type", "communication_date",
            "reference_number", "subject", "sender", "recipient",
            "status", "responsible_person", "remarks",
        ]:
            if parsed.get(field):
                doc.set(field, parsed[field])
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
