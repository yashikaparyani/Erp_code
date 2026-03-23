"""
ANDA Importer: Material Issuance & Consumption (Tab 8)

Target DocType: GE Dispatch Challan + GE Dispatch Challan Item

Maps ANDA Material Issuance sheet columns to GE Dispatch Challan:

| ANDA Column         | GE Dispatch Challan Field                     |
|----------------------|-----------------------------------------------|
| Project              | linked_project                                |
| Location / Site      | target_site_name                              |
| Issuance ID          | (used for duplicate detection)                |
| Issue Date           | dispatch_date                                 |
| Requested By         | requested_by (→ User)                         |
| Approved By          | approved_by (→ User) — only if not read_only  |
| Work Order           | (stored in remarks for traceability)          |

Item-level mapping → GE Dispatch Challan Item rows:
| Item / Material      | item_link (→ Item) or description             |
| Make / Model         | description suffix                            |
| Quantity             | qty                                           |
| Serial Numbers       | serial_numbers                                |
| Remarks              | remarks                                       |
"""

import frappe
from frappe.utils import cstr, flt
from gov_erp.importers.anda.base import (
    BaseImporter, normalize_date, normalize_name, resolve_reference,
)


class MaterialIssuanceImporter(BaseImporter):
    tab_name = "Material Issuance & Consumption"
    target_doctype = "GE Dispatch Challan"

    DISPATCH_TYPE_MAP = {
        "WAREHOUSE TO WAREHOUSE": "WAREHOUSE_TO_WAREHOUSE",
        "WAREHOUSE TO SITE": "WAREHOUSE_TO_SITE",
        "VENDOR TO SITE": "VENDOR_TO_SITE",
    }

    STATUS_MAP = {
        "DRAFT": "DRAFT",
        "PENDING": "PENDING_APPROVAL",
        "PENDING APPROVAL": "PENDING_APPROVAL",
        "APPROVED": "APPROVED",
        "DISPATCHED": "DISPATCHED",
        "REJECTED": "REJECTED",
        "CANCELLED": "CANCELLED",
    }

    def parse_row(self, row, row_idx):
        item_desc = cstr(
            row.get("item") or row.get("Item") or row.get("material")
            or row.get("Material") or row.get("description")
            or row.get("Description") or ""
        ).strip()
        issuance_id = cstr(
            row.get("issuance_id") or row.get("Issuance ID")
            or row.get("issuance_no") or row.get("Issuance No") or ""
        ).strip()

        if not item_desc and not issuance_id:
            return None

        make_model = cstr(
            row.get("make_model") or row.get("Make/Model")
            or row.get("make") or row.get("Make") or ""
        ).strip()
        if make_model and item_desc:
            full_desc = f"{item_desc} — {make_model}"
        else:
            full_desc = item_desc or make_model

        project_name = normalize_name(
            row.get("project") or row.get("Project") or row.get("project_id")
        )
        site_name = cstr(
            row.get("location") or row.get("Location") or row.get("site")
            or row.get("Site") or ""
        ).strip()

        raw_type = cstr(
            row.get("dispatch_type") or row.get("Dispatch Type") or ""
        ).strip().upper()
        raw_status = cstr(
            row.get("status") or row.get("Status") or ""
        ).strip().upper()

        return {
            "issuance_id": issuance_id,
            "project": project_name,
            "site": site_name,
            "dispatch_date": normalize_date(
                row.get("issue_date") or row.get("Issue Date")
                or row.get("dispatch_date") or row.get("date")
            ),
            "dispatch_type": self.DISPATCH_TYPE_MAP.get(raw_type, "WAREHOUSE_TO_SITE"),
            "status": self.STATUS_MAP.get(raw_status, "DRAFT"),
            "requested_by_name": normalize_name(
                row.get("requested_by") or row.get("Requested By")
            ),
            "work_order": cstr(
                row.get("work_order") or row.get("Work Order") or ""
            ).strip(),
            # Item-level data
            "item_description": full_desc,
            "qty": flt(row.get("qty") or row.get("Qty") or row.get("quantity") or row.get("Quantity") or 1),
            "serial_numbers": cstr(
                row.get("serial_numbers") or row.get("Serial Numbers")
                or row.get("serial_no") or row.get("Serial No") or ""
            ).strip(),
            "item_remarks": cstr(
                row.get("remarks") or row.get("Remarks") or ""
            ).strip(),
        }

    def validate_row(self, parsed):
        if not parsed.get("item_description"):
            return False, "Missing item/material description"
        if not parsed.get("dispatch_date"):
            return False, "Missing issue/dispatch date"
        return True, ""

    def check_references(self, parsed):
        unresolved = []
        if parsed.get("project"):
            if not resolve_reference("Project", parsed["project"]):
                unresolved.append({"field": "project", "value": parsed["project"]})
        return unresolved

    def find_duplicate(self, parsed):
        # By issuance_id first
        if parsed.get("issuance_id"):
            existing = frappe.get_all(
                "GE Dispatch Challan",
                filters={"remarks": ["like", f"%{parsed['issuance_id']}%"]},
                fields=["name"],
                limit=1,
            )
            if existing:
                return existing[0].name

        # By project + date + item description in child
        if parsed.get("project") and parsed.get("dispatch_date"):
            challans = frappe.get_all(
                "GE Dispatch Challan",
                filters={
                    "linked_project": parsed["project"],
                    "dispatch_date": parsed["dispatch_date"],
                },
                fields=["name"],
                limit=50,
            )
            for ch in challans:
                has_item = frappe.db.exists(
                    "GE Dispatch Challan Item",
                    {
                        "parent": ch.name,
                        "description": parsed["item_description"][:140],
                    },
                )
                if has_item:
                    return ch.name
        return None

    def commit_row(self, parsed):
        """Create or append to a GE Dispatch Challan."""
        # Try to find an existing challan for same project + date to group items
        existing_challan = self._find_groupable_challan(parsed)

        if existing_challan:
            doc = frappe.get_doc("GE Dispatch Challan", existing_challan)
        else:
            doc = frappe.new_doc("GE Dispatch Challan")
            doc.dispatch_type = parsed.get("dispatch_type", "WAREHOUSE_TO_SITE")
            doc.dispatch_date = parsed["dispatch_date"]
            doc.status = "DRAFT"

            if parsed.get("project"):
                doc.linked_project = parsed["project"]
            if parsed.get("site"):
                doc.target_site_name = parsed["site"]
            if parsed.get("requested_by_name"):
                user = self._resolve_user(parsed["requested_by_name"])
                if user:
                    doc.requested_by = user

            remarks_parts = []
            if parsed.get("issuance_id"):
                remarks_parts.append(f"Issuance ID: {parsed['issuance_id']}")
            if parsed.get("work_order"):
                remarks_parts.append(f"Work Order: {parsed['work_order']}")
            if remarks_parts:
                doc.remarks = " | ".join(remarks_parts)

            doc.insert(ignore_permissions=True)
            frappe.db.commit()

        # Try to match item
        item_link = self._resolve_item(parsed["item_description"])

        doc.append("items", {
            "item_link": item_link,
            "description": parsed["item_description"][:140],
            "qty": parsed["qty"],
            "uom": "Nos",
            "serial_numbers": parsed.get("serial_numbers") or "",
            "remarks": parsed.get("item_remarks") or "",
        })
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return doc.name

    # ── helpers ───────────────────────────────────────────────────────

    def _find_groupable_challan(self, parsed):
        """Find a DRAFT challan for same project + date to group items."""
        if not parsed.get("project") or not parsed.get("dispatch_date"):
            return None
        existing = frappe.get_all(
            "GE Dispatch Challan",
            filters={
                "linked_project": parsed["project"],
                "dispatch_date": parsed["dispatch_date"],
                "status": "DRAFT",
            },
            fields=["name"],
            order_by="creation desc",
            limit=1,
        )
        return existing[0].name if existing else None

    def _resolve_user(self, name_or_email):
        if not name_or_email:
            return None
        if "@" in name_or_email:
            if frappe.db.exists("User", name_or_email):
                return name_or_email
        users = frappe.get_all(
            "User", filters={"full_name": name_or_email}, fields=["name"], limit=1
        )
        return users[0].name if users else None

    def _resolve_item(self, description):
        """Try to find an existing Item by name or description."""
        if not description:
            return None
        # Exact name match
        if frappe.db.exists("Item", description):
            return description
        # Partial description match
        items = frappe.get_all(
            "Item",
            filters={"description": ["like", f"%{description[:60]}%"]},
            fields=["name"],
            limit=1,
        )
        return items[0].name if items else None
