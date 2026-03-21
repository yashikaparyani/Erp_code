"""
ANDA Importer: RMA Tracker (Tab 10)

Target: GE RMA Tracker
"""

import frappe
from frappe.utils import cstr, flt, cint
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, resolve_reference,
)


class RMATrackerImporter(BaseImporter):
    tab_name = "RMA Tracker"
    target_doctype = "GE RMA Tracker"

    STATUS_MAP = {
        "OPEN": "OPEN",
        "NEW": "OPEN",
        "IN TRANSIT": "IN_TRANSIT",
        "UNDER REPAIR": "UNDER_REPAIR",
        "REPAIRED": "REPAIRED",
        "REPLACED": "REPLACED",
        "RETURNED": "RETURNED",
        "CLOSED": "CLOSED",
        "CANCELLED": "CANCELLED",
    }

    def parse_row(self, row, row_idx):
        item = normalize_name(row.get("item") or row.get("Item") or row.get("item_name"))
        if not item:
            return None

        project = normalize_name(
            row.get("project") or row.get("Project") or row.get("linked_project")
        )
        raw_status = cstr(row.get("status") or row.get("Status") or "").strip().upper()

        return {
            "linked_project": project,
            "linked_site": normalize_name(
                row.get("site") or row.get("Site") or row.get("location")
            ),
            "item_name": item,
            "serial_no": cstr(
                row.get("serial_number") or row.get("Serial Number") or row.get("serial_no") or ""
            ).strip(),
            "quantity": cint(row.get("quantity") or row.get("Quantity") or 1),
            "date_reported": normalize_date(
                row.get("date_reported") or row.get("Date Reported")
            ),
            "reported_by": normalize_name(
                row.get("reported_by") or row.get("Reported By")
            ),
            "reason": cstr(row.get("reason") or row.get("Reason") or "").strip(),
            "status": self.STATUS_MAP.get(raw_status, "OPEN"),
        }

    def validate_row(self, parsed):
        if not parsed.get("item_name"):
            return False, "Missing item name"
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
        filters = {"item_name": parsed["item_name"]}
        if parsed.get("serial_no"):
            filters["serial_no"] = parsed["serial_no"]
        if parsed.get("date_reported"):
            filters["date_reported"] = parsed["date_reported"]
        exists = frappe.db.exists("GE RMA Tracker", filters)
        return exists if exists else None

    def commit_row(self, parsed):
        doc = frappe.new_doc("GE RMA Tracker")
        for field in [
            "linked_project", "linked_site", "item_name", "serial_no",
            "quantity", "date_reported", "reported_by", "reason", "status",
        ]:
            if parsed.get(field) is not None:
                doc.set(field, parsed[field])
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
