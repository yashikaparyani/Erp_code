"""
ANDA Importer: Petty Cash Tracker (Tab 12)

Target: GE Petty Cash
"""

import frappe
from frappe.utils import cstr, flt
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, resolve_reference,
)


class PettyCashImporter(BaseImporter):
    tab_name = "Petty Cash Tracker"
    target_doctype = "GE Petty Cash"

    STATUS_MAP = {
        "DRAFT": "Draft",
        "SUBMITTED": "Submitted",
        "APPROVED": "Approved",
        "REJECTED": "Rejected",
        "PENDING": "Submitted",
    }

    def parse_row(self, row, row_idx):
        project = normalize_name(
            row.get("project") or row.get("Project") or row.get("project_id")
        )
        amount = flt(row.get("amount") or row.get("Amount") or 0)
        description = cstr(
            row.get("description") or row.get("Description") or ""
        ).strip()
        if not project and not description:
            return None

        raw_status = cstr(row.get("status") or row.get("Status") or "").strip().upper()

        linked_site = normalize_name(
            row.get("linked_site") or row.get("site") or row.get("Site") or row.get("site_name")
        )

        return {
            "linked_project": project,
            "linked_site": linked_site,
            "petty_cash_id": cstr(
                row.get("petty_cash_id") or row.get("Petty Cash ID") or ""
            ).strip(),
            "transaction_date": normalize_date(
                row.get("date") or row.get("Date") or row.get("transaction_date")
            ),
            "transaction_type": cstr(
                row.get("transaction_type") or row.get("Transaction Type") or ""
            ).strip(),
            "amount": amount,
            "currency": cstr(row.get("currency") or row.get("Currency") or "INR").strip(),
            "description": description,
            "expense_category": cstr(
                row.get("expense_category") or row.get("Expense Category") or ""
            ).strip(),
            "incurred_by": normalize_name(
                row.get("incurred_by") or row.get("Incurred By")
            ),
            "approved_by": normalize_name(
                row.get("approved_by") or row.get("Approved By")
            ),
            "status": self.STATUS_MAP.get(raw_status, "Draft"),
        }

    def validate_row(self, parsed):
        if not parsed.get("linked_project"):
            return False, "Missing project reference"
        if not parsed.get("description"):
            return False, "Missing description"
        return True, ""

    def check_references(self, parsed):
        unresolved = []
        if parsed.get("linked_project"):
            if not resolve_reference("Project", parsed["linked_project"]):
                unresolved.append({"field": "linked_project", "value": parsed["linked_project"]})
        return unresolved

    def find_duplicate(self, parsed):
        if parsed.get("petty_cash_id"):
            exists = frappe.db.exists("GE Petty Cash", {"petty_cash_id": parsed["petty_cash_id"]})
            if exists:
                return exists
        filters = {
            "linked_project": parsed["linked_project"],
            "description": parsed["description"],
        }
        if parsed.get("transaction_date"):
            filters["transaction_date"] = parsed["transaction_date"]
        exists = frappe.db.exists("GE Petty Cash", filters)
        return exists if exists else None

    def commit_row(self, parsed):
        doc = frappe.new_doc("GE Petty Cash")
        for field in [
            "linked_project", "linked_site", "petty_cash_id", "transaction_date",
            "transaction_type", "amount", "currency", "description",
            "expense_category", "incurred_by", "approved_by", "status",
        ]:
            if parsed.get(field) is not None:
                doc.set(field, parsed[field])
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
