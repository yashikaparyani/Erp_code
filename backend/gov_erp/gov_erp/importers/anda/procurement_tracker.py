"""
ANDA Importer: Procurement Tracker (Tab 5)

Target DocTypes (staged layers):
  1. Supplier         – ERPNext standard, vendor master staging
  2. GE Vendor Comparison + GE Vendor Comparison Quote – comparison staging
  3. Purchase Order + GE PO Extension – PO staging (optional, skips if PO data insufficient)

This is the most complex importer. The ANDA Procurement sheet has
heterogeneous rows: some are vendor quotes for a comparison, some are order
references, some are receipt acknowledgements.  The importer groups rows by
a "comparison key" (project + item description) and creates one comparison
per group.

Row-level mapping:
    | ANDA Column          | Target Field(s)                              |
    |----------------------|----------------------------------------------|
    | Project ID           | GE Vendor Comparison.linked_project            |
    | Item / Description   | Quote.description                              |
    | Vendor / Supplier    | Quote.supplier  (→ Supplier lookup/create)     |
    | Qty                  | Quote.qty                                      |
    | Unit                 | Quote.unit                                     |
    | Rate / Unit Price    | Quote.rate                                     |
    | Amount               | Quote.amount (computed: qty × rate)            |
    | Lead Time Days       | Quote.lead_time_days                           |
    | Recommended Supplier | GE Vendor Comparison.recommended_supplier      |
    | PO Reference         | GE Vendor Comparison.po_reference              |
    | WO Reference         | GE Vendor Comparison.wo_reference              |
    | Status               | GE Vendor Comparison.status                    |
"""

import frappe
from frappe.utils import cstr, cint, flt
from gov_erp.importers.anda.base import (
    BaseImporter, ImportMode, RowResult,
    normalize_date, normalize_name, normalize_status, resolve_reference,
)


class ProcurementTrackerImporter(BaseImporter):
    """Staged procurement importer.

    Unlike other tab importers that work row-by-row, this one collects rows
    first, groups them by (project + description), then creates one GE Vendor
    Comparison per group with multiple quotes.
    """

    tab_name = "Procurement Tracker"
    target_doctype = "GE Vendor Comparison"

    STATUS_MAP = {
        "DRAFT": "DRAFT",
        "PENDING": "PENDING_APPROVAL",
        "PENDING APPROVAL": "PENDING_APPROVAL",
        "APPROVED": "APPROVED",
        "REJECTED": "REJECTED",
    }

    def run(self, rows, mode=ImportMode.DRY_RUN):
        """Procurement tracker imports are intentionally stage-only.

        The source sheet is heterogeneous and can mix vendor quote rows,
        order references, and receipt-style history.  Even if callers ask
        for COMMIT, downgrade to STAGE_ONLY so no live procurement records
        are bulk-created from noisy spreadsheet data.
        """
        if isinstance(mode, str):
            mode = ImportMode(mode)

        effective_mode = ImportMode.STAGE_ONLY if mode == ImportMode.COMMIT else mode
        report = super().run(rows, effective_mode)

        if mode == ImportMode.COMMIT:
            for row in report.rows:
                if row.status == "accepted" and row.reason == "Staged for review":
                    row.reason = (
                        "Staged for review "
                        "(Procurement Tracker is stage-only; commit downgraded)"
                    )

        return report

    # ── row-level methods (used by base class pipeline) ──────────────

    def parse_row(self, row, row_idx):
        vendor = cstr(
            row.get("vendor") or row.get("Vendor") or row.get("supplier")
            or row.get("Supplier") or row.get("Supplier Name") or ""
        ).strip()
        description = cstr(
            row.get("item") or row.get("Item") or row.get("description")
            or row.get("Description") or row.get("item_description")
            or row.get("Item Description") or ""
        ).strip()

        if not vendor and not description:
            return None

        project = normalize_name(
            row.get("project_id") or row.get("Project ID") or row.get("project")
        )

        return {
            "project": project,
            "vendor_name": normalize_name(vendor) or vendor,
            "description": description,
            "qty": flt(row.get("qty") or row.get("Qty") or row.get("quantity") or 1),
            "unit": cstr(row.get("unit") or row.get("Unit") or row.get("uom") or "Nos").strip(),
            "rate": flt(row.get("rate") or row.get("Rate") or row.get("unit_price") or row.get("Unit Price") or 0),
            "lead_time_days": cint(row.get("lead_time_days") or row.get("Lead Time Days") or 0),
            "recommended": cstr(
                row.get("recommended_supplier") or row.get("Recommended Supplier")
                or row.get("recommended") or ""
            ).strip(),
            "po_reference": cstr(row.get("po_reference") or row.get("PO Reference") or row.get("PO No") or "").strip(),
            "wo_reference": cstr(row.get("wo_reference") or row.get("WO Reference") or row.get("WO No") or "").strip(),
            "raw_status": cstr(row.get("status") or row.get("Status") or "").strip().upper(),
        }

    def validate_row(self, parsed):
        if not parsed.get("description"):
            return False, "Missing item description"
        if not parsed.get("vendor_name"):
            return False, "Missing vendor/supplier name"
        return True, ""

    def find_duplicate(self, parsed):
        # Row-level duplicate: same vendor + description + project in existing quotes
        if parsed.get("project"):
            comparisons = frappe.get_all(
                "GE Vendor Comparison",
                filters={"linked_project": parsed["project"]},
                fields=["name"],
                limit=100,
            )
            for vc in comparisons:
                existing_quote = frappe.db.exists(
                    "GE Vendor Comparison Quote",
                    {
                        "parent": vc.name,
                        "description": parsed["description"],
                        "supplier": ["like", f"%{parsed['vendor_name'][:40]}%"],
                    },
                )
                if existing_quote:
                    return vc.name
        return None

    def commit_row(self, parsed):
        """Stage-and-commit: ensure Supplier exists, then upsert into a
        GE Vendor Comparison document for this project + description group."""

        supplier_name = self._ensure_supplier(parsed["vendor_name"])

        # Find or create the comparison doc for this project + description
        comp = self._find_or_create_comparison(parsed)

        # Append quote row
        comp.append("quotes", {
            "supplier": supplier_name,
            "description": parsed["description"],
            "qty": parsed["qty"],
            "unit": parsed["unit"],
            "rate": parsed["rate"],
            "amount": parsed["qty"] * parsed["rate"],
            "lead_time_days": parsed["lead_time_days"],
        })
        comp.save(ignore_permissions=True)
        frappe.db.commit()
        return comp.name

    # ── helpers ───────────────────────────────────────────────────────

    def _ensure_supplier(self, name):
        """Lookup or create a Supplier doc.  Returns the Supplier name."""
        existing = frappe.db.get_value(
            "Supplier", {"supplier_name": name}, "name"
        )
        if existing:
            return existing

        # Case-insensitive search
        results = frappe.get_all(
            "Supplier",
            filters={"supplier_name": ["like", f"%{name}%"]},
            fields=["name", "supplier_name"],
            limit=5,
        )
        # Exact match (case-insensitive)
        for r in results:
            if r.supplier_name.strip().lower() == name.lower():
                return r.name

        # Create new supplier
        doc = frappe.new_doc("Supplier")
        doc.supplier_name = name
        doc.supplier_group = "All Supplier Groups"
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name

    def _find_or_create_comparison(self, parsed):
        """Find an existing DRAFT comparison for the same project, or create one."""
        filters = {"status": "DRAFT"}
        if parsed.get("project"):
            filters["linked_project"] = parsed["project"]

        # Look for an open draft comparison that already has a quote with the
        # same description → append to it
        existing = frappe.get_all(
            "GE Vendor Comparison",
            filters=filters,
            fields=["name"],
            order_by="creation desc",
            limit=10,
        )
        for vc_ref in existing:
            has_desc = frappe.db.exists(
                "GE Vendor Comparison Quote",
                {"parent": vc_ref.name, "description": parsed["description"]},
            )
            if has_desc:
                return frappe.get_doc("GE Vendor Comparison", vc_ref.name)

        # Create new comparison
        comp = frappe.new_doc("GE Vendor Comparison")
        comp.status = "DRAFT"
        if parsed.get("project"):
            comp.linked_project = parsed["project"]
        if parsed.get("po_reference"):
            comp.po_reference = parsed["po_reference"]
        if parsed.get("wo_reference"):
            comp.wo_reference = parsed["wo_reference"]

        # Try to set recommended_supplier
        if parsed.get("recommended"):
            supplier = self._ensure_supplier(parsed["recommended"])
            comp.recommended_supplier = supplier

        comp.insert(ignore_permissions=True)
        frappe.db.commit()
        return comp
