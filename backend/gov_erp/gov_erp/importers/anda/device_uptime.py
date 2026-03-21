"""
ANDA Importer: Device Uptime Log (Tab 14)

Target: GE Device Uptime Log
"""

import frappe
from frappe.utils import cstr, flt
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, resolve_reference,
)


class DeviceUptimeImporter(BaseImporter):
    tab_name = "Device Uptime Log"
    target_doctype = "GE Device Uptime Log"

    def parse_row(self, row, row_idx):
        device_id = cstr(
            row.get("device_id") or row.get("Device ID") or ""
        ).strip()
        project = normalize_name(
            row.get("project_id") or row.get("Project ID") or row.get("project")
        )
        log_date = normalize_date(row.get("date") or row.get("Date") or row.get("log_date"))

        if not device_id and not project:
            return None

        return {
            "linked_project": project,
            "device_id": device_id,
            "log_date": log_date,
            "uptime_hours": flt(row.get("uptime_hours") or row.get("Uptime Hours") or 0),
            "downtime_hours": flt(row.get("downtime_hours") or row.get("Downtime Hours") or 0),
            "sla_target": flt(row.get("sla_target") or row.get("SLA Target") or 0),
            "uptime_percentage": flt(
                row.get("uptime_percentage") or row.get("Uptime Percentage") or 0
            ),
            "issue_nature": cstr(
                row.get("issue_nature") or row.get("Issue Nature") or ""
            ).strip(),
            "serial_number": cstr(
                row.get("serial_number") or row.get("Serial Number") or ""
            ).strip(),
        }

    def validate_row(self, parsed):
        if not parsed.get("device_id"):
            return False, "Missing device ID"
        if not parsed.get("log_date"):
            return False, "Missing log date"
        return True, ""

    def check_references(self, parsed):
        unresolved = []
        if parsed.get("linked_project"):
            if not resolve_reference("Project", parsed["linked_project"]):
                unresolved.append({"field": "linked_project", "value": parsed["linked_project"]})
        return unresolved

    def find_duplicate(self, parsed):
        filters = {"device_id": parsed["device_id"], "log_date": parsed["log_date"]}
        exists = frappe.db.exists("GE Device Uptime Log", filters)
        return exists if exists else None

    def commit_row(self, parsed):
        doc = frappe.new_doc("GE Device Uptime Log")
        for field in [
            "linked_project", "device_id", "log_date", "uptime_hours",
            "downtime_hours", "sla_target", "uptime_percentage",
            "issue_nature", "serial_number",
        ]:
            if parsed.get(field) is not None:
                doc.set(field, parsed[field])
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
