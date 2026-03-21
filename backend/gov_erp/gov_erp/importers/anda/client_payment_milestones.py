"""
ANDA Importer: Client Payment Milestones (Tab 7)

Target: GE Invoice + GE Payment Receipt
"""

import frappe
from frappe.utils import cstr, flt
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, normalize_yesno,
    resolve_reference,
)


class ClientPaymentMilestonesImporter(BaseImporter):
    tab_name = "Client Payment Milestones"
    target_doctype = "GE Invoice"

    def parse_row(self, row, row_idx):
        project = normalize_name(
            row.get("project_id") or row.get("Project ID") or row.get("project")
        )
        milestone_desc = cstr(
            row.get("milestone_description") or row.get("Milestone Description")
            or row.get("milestone") or ""
        ).strip()
        if not project and not milestone_desc:
            return None

        return {
            "linked_project": project,
            "work_order_number": cstr(
                row.get("work_order_number") or row.get("Work Order Number") or ""
            ).strip(),
            "milestone_description": milestone_desc,
            "scheduled_date": normalize_date(
                row.get("scheduled_milestone_date") or row.get("Scheduled Date")
            ),
            "actual_date": normalize_date(
                row.get("actual_milestone_date") or row.get("Actual Date")
            ),
            "payment_received": normalize_yesno(
                row.get("payment_received") or row.get("Payment Received")
            ),
            "payment_date": normalize_date(
                row.get("payment_received_date") or row.get("Payment Date")
            ),
            "payment_mode": cstr(
                row.get("payment_mode_reference") or row.get("Payment Mode") or ""
            ).strip(),
            "notes": cstr(row.get("payment_notes") or row.get("Notes") or "").strip(),
            "amount": flt(row.get("amount") or row.get("Amount") or 0),
        }

    def validate_row(self, parsed):
        if not parsed.get("linked_project"):
            return False, "Missing project reference"
        if not parsed.get("milestone_description"):
            return False, "Missing milestone description"
        return True, ""

    def check_references(self, parsed):
        unresolved = []
        if parsed.get("linked_project"):
            if not resolve_reference("Project", parsed["linked_project"]):
                unresolved.append({"field": "linked_project", "value": parsed["linked_project"]})
        return unresolved

    def find_duplicate(self, parsed):
        filters = {
            "linked_project": parsed["linked_project"],
            "description": parsed["milestone_description"],
        }
        exists = frappe.db.exists("GE Invoice", filters)
        return exists if exists else None

    def commit_row(self, parsed):
        doc = frappe.new_doc("GE Invoice")
        doc.linked_project = parsed["linked_project"]
        doc.description = parsed["milestone_description"]
        if parsed.get("amount"):
            doc.amount = parsed["amount"]
        if parsed.get("scheduled_date"):
            doc.invoice_date = parsed["scheduled_date"]
        if parsed.get("notes"):
            doc.remarks = parsed["notes"]
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
