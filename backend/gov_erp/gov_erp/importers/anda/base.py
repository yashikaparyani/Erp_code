"""
ANDA Import Framework — Base Module

Provides:
- BaseImporter: abstract class with dry_run / stage_only / commit modes
- ImportReport: structured result from each import run
- Normalizers: shared cleaning functions for dates, statuses, names
- Import audit logging via GE Import Log DocType

Usage:
    from gov_erp.importers.anda.base import BaseImporter, ImportMode

    class MyImporter(BaseImporter):
        tab_name = "Project Overview"
        target_doctype = "Project"

        def parse_row(self, row, row_idx):
            ...
        def validate_row(self, parsed):
            ...
        def find_duplicate(self, parsed):
            ...
        def commit_row(self, parsed):
            ...
"""

import frappe
from frappe.utils import cint, cstr, getdate, today, now_datetime
from enum import Enum
from typing import Any


class ImportMode(Enum):
    DRY_RUN = "dry_run"
    STAGE_ONLY = "stage_only"
    COMMIT = "commit"


class RowResult:
    """Result of processing a single row."""

    __slots__ = ("row_idx", "status", "reason", "source_ref", "target_doc")

    def __init__(self, row_idx, status, reason="", source_ref="", target_doc=""):
        self.row_idx = row_idx
        self.status = status  # "accepted", "rejected", "duplicate", "skipped"
        self.reason = reason
        self.source_ref = source_ref
        self.target_doc = target_doc

    def as_dict(self):
        return {
            "row_idx": self.row_idx,
            "status": self.status,
            "reason": self.reason,
            "source_ref": self.source_ref,
            "target_doc": self.target_doc,
        }


class ImportReport:
    """Aggregated result of an import run."""

    def __init__(self, tab_name, mode):
        self.tab_name = tab_name
        self.mode = mode.value if isinstance(mode, ImportMode) else mode
        self.total_rows = 0
        self.accepted = 0
        self.rejected = 0
        self.duplicates = 0
        self.skipped = 0
        self.rows = []  # list of RowResult
        self.unresolved_references = []  # list of {"field": ..., "value": ...}
        self.started_at = now_datetime()
        self.finished_at = None

    def add(self, result: RowResult):
        self.total_rows += 1
        self.rows.append(result)
        if result.status == "accepted":
            self.accepted += 1
        elif result.status == "rejected":
            self.rejected += 1
        elif result.status == "duplicate":
            self.duplicates += 1
        elif result.status == "skipped":
            self.skipped += 1

    def add_unresolved(self, field, value):
        self.unresolved_references.append({"field": field, "value": value})

    def finalize(self):
        self.finished_at = now_datetime()

    def as_dict(self):
        return {
            "tab_name": self.tab_name,
            "mode": self.mode,
            "total_rows": self.total_rows,
            "accepted": self.accepted,
            "rejected": self.rejected,
            "duplicates": self.duplicates,
            "skipped": self.skipped,
            "unresolved_references": self.unresolved_references,
            "started_at": str(self.started_at),
            "finished_at": str(self.finished_at) if self.finished_at else None,
            "rows": [r.as_dict() for r in self.rows],
        }

    def summary(self):
        return (
            f"[{self.tab_name}] mode={self.mode} total={self.total_rows} "
            f"accepted={self.accepted} rejected={self.rejected} "
            f"duplicates={self.duplicates} skipped={self.skipped} "
            f"unresolved={len(self.unresolved_references)}"
        )


class BaseImporter:
    """
    Abstract base for ANDA tab importers.

    Subclasses must implement:
        tab_name: str           — ANDA sheet tab name
        target_doctype: str     — primary ERP DocType to create/update
        parse_row(row, idx)     — extract fields from raw row dict
        validate_row(parsed)    — return (is_valid, reason)
        find_duplicate(parsed)  — return existing doc name or None
        commit_row(parsed)      — actually create/update ERP doc, return doc name
    """

    tab_name = ""
    target_doctype = ""

    def run(self, rows, mode=ImportMode.DRY_RUN):
        """
        Run the importer over a list of row dicts.

        Args:
            rows: list of dicts (one per spreadsheet row)
            mode: ImportMode.DRY_RUN | STAGE_ONLY | COMMIT

        Returns:
            ImportReport
        """
        if isinstance(mode, str):
            mode = ImportMode(mode)

        report = ImportReport(self.tab_name, mode)

        for idx, raw_row in enumerate(rows):
            row_idx = idx + 1  # 1-based for human readability

            # Skip empty rows
            if self._is_empty_row(raw_row):
                report.add(RowResult(row_idx, "skipped", "Empty row"))
                continue

            # Parse
            try:
                parsed = self.parse_row(raw_row, row_idx)
            except Exception as e:
                report.add(RowResult(row_idx, "rejected", f"Parse error: {e}"))
                continue

            if parsed is None:
                report.add(RowResult(row_idx, "skipped", "Non-data row"))
                continue

            # Validate
            is_valid, reason = self.validate_row(parsed)
            if not is_valid:
                report.add(RowResult(row_idx, "rejected", reason))
                continue

            # Check references
            unresolved = self.check_references(parsed)
            for u in unresolved:
                report.add_unresolved(u["field"], u["value"])
            if unresolved and mode == ImportMode.COMMIT:
                report.add(
                    RowResult(
                        row_idx,
                        "rejected",
                        f"Unresolved references: {', '.join(u['field'] for u in unresolved)}",
                    )
                )
                continue

            # Duplicate check
            existing = self.find_duplicate(parsed)
            if existing:
                report.add(
                    RowResult(row_idx, "duplicate", f"Matches {existing}", target_doc=existing)
                )
                continue

            # Mode-based action
            if mode == ImportMode.DRY_RUN:
                report.add(RowResult(row_idx, "accepted", "Would be imported (dry run)"))
            elif mode == ImportMode.STAGE_ONLY:
                report.add(RowResult(row_idx, "accepted", "Staged for review"))
            elif mode == ImportMode.COMMIT:
                try:
                    doc_name = self.commit_row(parsed)
                    report.add(RowResult(row_idx, "accepted", "Imported", target_doc=doc_name))
                except Exception as e:
                    report.add(RowResult(row_idx, "rejected", f"Commit error: {e}"))

        report.finalize()

        # Save audit log
        self._save_audit_log(report)

        return report

    # ── Subclass hooks ─────────────────────────────────────

    def parse_row(self, row: dict, row_idx: int) -> dict | None:
        """Parse raw row into normalized dict. Return None to skip."""
        raise NotImplementedError

    def validate_row(self, parsed: dict) -> tuple[bool, str]:
        """Validate parsed row. Return (True, '') or (False, reason)."""
        raise NotImplementedError

    def find_duplicate(self, parsed: dict) -> str | None:
        """Return existing doc name if duplicate, else None."""
        raise NotImplementedError

    def commit_row(self, parsed: dict) -> str:
        """Create/update ERP doc. Return created doc name."""
        raise NotImplementedError

    def check_references(self, parsed: dict) -> list[dict]:
        """
        Check foreign-key references in parsed row.
        Return list of {"field": ..., "value": ...} for unresolved.
        Default: no checks.
        """
        return []

    # ── Helpers ────────────────────────────────────────────

    def _is_empty_row(self, row):
        if not row:
            return True
        return all(not cstr(v).strip() for v in row.values())

    def _save_audit_log(self, report: ImportReport):
        """Save a lightweight audit record."""
        try:
            frappe.get_doc(
                {
                    "doctype": "GE Import Log",
                    "tab_name": report.tab_name,
                    "import_mode": report.mode,
                    "total_rows": report.total_rows,
                    "accepted_rows": report.accepted,
                    "rejected_rows": report.rejected,
                    "duplicate_rows": report.duplicates,
                    "skipped_rows": report.skipped,
                    "unresolved_count": len(report.unresolved_references),
                    "started_at": report.started_at,
                    "finished_at": report.finished_at,
                    "report_json": frappe.as_json(report.as_dict()),
                }
            ).insert(ignore_permissions=True)
            frappe.db.commit()
        except Exception:
            # Don't let audit logging failure break imports
            frappe.log_error("Import audit log save failed")


# ── Shared Normalizers ─────────────────────────────────────────


def normalize_date(val):
    """Attempt to parse various date formats into YYYY-MM-DD string."""
    if not val:
        return None
    val = cstr(val).strip()
    if not val:
        return None
    try:
        return str(getdate(val))
    except Exception:
        return None


def normalize_status(val, status_map):
    """Map raw status string to canonical ERP value using a lookup dict."""
    if not val:
        return None
    val = cstr(val).strip().upper()
    return status_map.get(val, status_map.get(val.lower(), None))


def normalize_name(val):
    """Clean a person/vendor/project name: strip, title-case."""
    if not val:
        return None
    val = cstr(val).strip()
    if not val:
        return None
    return val.strip()


def normalize_yesno(val):
    """Parse yes/no/true/false/1/0 into boolean."""
    if val is None:
        return None
    val = cstr(val).strip().upper()
    return val in ("YES", "Y", "TRUE", "1", "T")


def resolve_reference(doctype, value, match_field="name"):
    """
    Try to resolve a reference value to an existing doc.
    Returns the doc name or None.
    """
    if not value:
        return None
    value = cstr(value).strip()
    if not value:
        return None
    exists = frappe.db.exists(doctype, {match_field: value})
    return exists if exists else None
