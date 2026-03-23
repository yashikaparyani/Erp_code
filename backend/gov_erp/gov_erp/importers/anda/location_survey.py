"""
ANDA Importer: Location & Survey Details (Tab 4)

Target: GE Site
"""

import frappe
from frappe.utils import cstr, flt
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, resolve_reference,
)


class LocationSurveyImporter(BaseImporter):
    tab_name = "Location & Survey Details"
    target_doctype = "GE Site"

    SURVEY_STATUS_MAP = {
        "COMPLETED": "COMPLETED",
        "DONE": "COMPLETED",
        "PENDING": "PENDING",
        "NOT STARTED": "PENDING",
        "IN PROGRESS": "IN_PROGRESS",
    }

    def parse_row(self, row, row_idx):
        location_id = normalize_name(
            row.get("location_id") or row.get("Location ID") or row.get("Site ID")
        )
        location_name = normalize_name(
            row.get("location_name") or row.get("Location Name") or row.get("Site Name")
        )
        if not location_id and not location_name:
            return None

        project = normalize_name(
            row.get("project_id") or row.get("Project ID") or row.get("project")
        )

        lat = row.get("latitude") or row.get("Latitude") or row.get("lat")
        lon = row.get("longitude") or row.get("Longitude") or row.get("long")
        raw_survey = cstr(
            row.get("survey_status") or row.get("Survey Status") or ""
        ).strip().upper()

        return {
            "location_id": location_id,
            "site_name": location_name or location_id,
            "linked_project": project,
            "latitude": self._parse_coord(lat),
            "longitude": self._parse_coord(lon),
            "survey_status": self.SURVEY_STATUS_MAP.get(raw_survey),
            "survey_completed_date": normalize_date(
                row.get("survey_completed_date") or row.get("Survey Completed Date")
            ),
        }

    def _parse_coord(self, val):
        if val is None:
            return None
        try:
            v = flt(val)
            if v == 0:
                return None
            return v
        except Exception:
            return None

    def validate_row(self, parsed):
        if not parsed.get("site_name") and not parsed.get("location_id"):
            return False, "Missing location identifier"
        return True, ""

    def check_references(self, parsed):
        unresolved = []
        if parsed.get("linked_project"):
            if not resolve_reference("Project", parsed["linked_project"]):
                unresolved.append({"field": "linked_project", "value": parsed["linked_project"]})
        return unresolved

    def find_duplicate(self, parsed):
        if parsed.get("location_id"):
            exists = frappe.db.exists("GE Site", {"site_id": parsed["location_id"]})
            if exists:
                return exists
        if parsed.get("site_name"):
            filters = {"site_name": parsed["site_name"]}
            if parsed.get("linked_project"):
                filters["linked_project"] = parsed["linked_project"]
            exists = frappe.db.exists("GE Site", filters)
            if exists:
                return exists
        return None

    def commit_row(self, parsed):
        doc = frappe.new_doc("GE Site")
        doc.site_name = parsed["site_name"]
        if parsed.get("location_id"):
            doc.site_id = parsed["location_id"]
        if parsed.get("linked_project"):
            doc.linked_project = parsed["linked_project"]
        if parsed.get("latitude") is not None:
            doc.latitude = parsed["latitude"]
        if parsed.get("longitude") is not None:
            doc.longitude = parsed["longitude"]
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
