"""
ANDA Importer: Project Assets & Services (Tab 11)

Target: GE Project Asset
"""

import frappe
from frappe.utils import cstr
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, resolve_reference,
)


class ProjectAssetsServicesImporter(BaseImporter):
    tab_name = "Project Assets & Services"
    target_doctype = "GE Project Asset"

    def parse_row(self, row, row_idx):
        asset_name = normalize_name(
            row.get("asset_name") or row.get("Asset Name")
            or row.get("asset_id") or row.get("Asset ID")
        )
        if not asset_name:
            return None

        project = normalize_name(
            row.get("project") or row.get("Project") or row.get("project_id")
        )

        return {
            "linked_project": project,
            "linked_site": normalize_name(
                row.get("site") or row.get("Site") or row.get("location")
            ),
            "asset_name": asset_name,
            "asset_id": cstr(
                row.get("asset_id") or row.get("Asset ID") or ""
            ).strip(),
            "category": cstr(
                row.get("category") or row.get("Category") or ""
            ).strip(),
            "make_model": cstr(
                row.get("make_model") or row.get("Make/Model") or ""
            ).strip(),
            "serial_number": cstr(
                row.get("serial_number") or row.get("Serial Number") or ""
            ).strip(),
            "deployed_date": normalize_date(
                row.get("deployed_date") or row.get("Deployed/Acquired Date")
            ),
            "current_status": cstr(
                row.get("current_status") or row.get("Current Status") or ""
            ).strip(),
            "last_service_date": normalize_date(
                row.get("last_service_date") or row.get("Last Service Date")
            ),
        }

    def validate_row(self, parsed):
        if not parsed.get("asset_name"):
            return False, "Missing asset name"
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
        if parsed.get("serial_number"):
            exists = frappe.db.exists("GE Project Asset", {"serial_number": parsed["serial_number"]})
            if exists:
                return exists
        if parsed.get("asset_id"):
            exists = frappe.db.exists("GE Project Asset", {"asset_id": parsed["asset_id"]})
            if exists:
                return exists
        return None

    def commit_row(self, parsed):
        doc = frappe.new_doc("GE Project Asset")
        for field in [
            "linked_project", "linked_site", "asset_name", "asset_id",
            "category", "make_model", "serial_number", "deployed_date",
            "current_status", "last_service_date",
        ]:
            if parsed.get(field):
                doc.set(field, parsed[field])
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
