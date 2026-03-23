"""
ANDA Phase 4: Transactional Import Orchestrator

Runs per-tab importers in the correct dependency order, with master
data readiness checks before any transactional import begins.

Clean transactional tabs (lower risk, structured):
    1. Project Milestones & Phases    → GE Milestone
    2. Location & Survey Details      → GE Site
    3. Client Payment Milestones      → GE Invoice
    4. Project Communications Log     → GE Project Communication Log
    5. Project Assets & Services      → GE Project Asset
    6. Petty Cash Tracker             → GE Petty Cash
    7. RMA Tracker                    → GE RMA Tracker
    8. Device Uptime Log              → GE Device Uptime Log

Complex / noisy tabs (higher risk, deferred by default):
    9. Project Manpower Log           → GE Project Staffing Assignment
   10. Issue Log                      → GE Ticket
   11. Procurement Tracker            → GE Vendor Comparison
   12. Material Issuance & Consumption → GE Dispatch Challan

The orchestrator can run all tabs, only clean tabs, or a specific subset.
"""

import frappe
from frappe.utils import now_datetime
from gov_erp.importers.anda.base import ImportMode


# Ordered list of (tab_key, label, risk_level)
IMPORT_ORDER = [
    # Phase 4: Clean transactional tabs
    ("project_overview", "Project Overview", "master"),
    ("milestones_phases", "Project Milestones & Phases", "clean"),
    ("location_survey", "Location & Survey Details", "clean"),
    ("client_payment_milestones", "Client Payment Milestones", "clean"),
    ("project_communications", "Project Communications Log", "clean"),
    ("project_assets_services", "Project Assets & Services", "clean"),
    ("petty_cash", "Petty Cash Tracker", "clean"),
    ("rma_tracker", "RMA Tracker", "clean"),
    ("device_uptime", "Device Uptime Log", "clean"),
    # Phase 5: Complex / noisy tabs
    ("project_manpower_assignment", "Project Manpower Log", "complex"),
    ("issue_log", "Issue Log", "complex"),
    ("procurement_tracker", "Procurement Tracker", "complex"),
    ("material_issuance_consumption", "Material Issuance & Consumption", "complex"),
]

CLEAN_TABS = [t[0] for t in IMPORT_ORDER if t[2] == "clean"]
COMPLEX_TABS = [t[0] for t in IMPORT_ORDER if t[2] == "complex"]
ALL_TRANSACTIONAL_TABS = [t[0] for t in IMPORT_ORDER if t[2] in ("clean", "complex")]


def _get_importer(tab_key):
    """Dynamically load an importer class by tab key."""
    from gov_erp.api import _ANDA_IMPORTER_MAP
    if tab_key not in _ANDA_IMPORTER_MAP:
        return None
    module_path, class_name = _ANDA_IMPORTER_MAP[tab_key].rsplit(".", 1)
    module = frappe.get_module(module_path)
    return getattr(module, class_name)()


class OrchestratorReport:
    """Aggregated result of a multi-tab orchestrated import run."""

    def __init__(self, mode):
        self.mode = mode.value if isinstance(mode, ImportMode) else mode
        self.started_at = now_datetime()
        self.finished_at = None
        self.master_check = None
        self.tab_reports = []  # list of {tab_key, label, report_dict, summary}
        self.errors = []

    def add_tab_report(self, tab_key, label, report):
        self.tab_reports.append({
            "tab_key": tab_key,
            "label": label,
            "summary": report.summary(),
            "total_rows": report.total_rows,
            "accepted": report.accepted,
            "rejected": report.rejected,
            "duplicates": report.duplicates,
            "skipped": report.skipped,
            "unresolved_count": len(report.unresolved_references),
        })

    def finalize(self):
        self.finished_at = now_datetime()

    def as_dict(self):
        return {
            "mode": self.mode,
            "started_at": str(self.started_at),
            "finished_at": str(self.finished_at) if self.finished_at else None,
            "master_check": self.master_check,
            "tabs_processed": len(self.tab_reports),
            "total_accepted": sum(t["accepted"] for t in self.tab_reports),
            "total_rejected": sum(t["rejected"] for t in self.tab_reports),
            "total_duplicates": sum(t["duplicates"] for t in self.tab_reports),
            "total_skipped": sum(t["skipped"] for t in self.tab_reports),
            "tab_reports": self.tab_reports,
            "errors": self.errors,
        }

    def summary(self):
        lines = [f"Orchestrated Import ({self.mode}):"]
        if self.master_check:
            ready = self.master_check.get("ready_for_transactional_import", False)
            lines.append(f"  Master data ready: {ready}")
        for t in self.tab_reports:
            lines.append(f"  {t['label']}: accepted={t['accepted']} rejected={t['rejected']} duplicates={t['duplicates']}")
        d = self.as_dict()
        lines.append(
            f"  TOTAL: tabs={d['tabs_processed']} accepted={d['total_accepted']} "
            f"rejected={d['total_rejected']} duplicates={d['total_duplicates']}"
        )
        return "\n".join(lines)


def run_orchestrated_import(
    tab_data,
    mode="dry_run",
    include_complex=False,
    tabs=None,
    skip_master_check=False,
):
    """Run imports in dependency order.

    Args:
        tab_data: dict mapping tab_key → list of row dicts.
            Example: {"milestones_phases": [...], "location_survey": [...]}
        mode: "dry_run" | "stage_only" | "commit"
        include_complex: if True, also run complex/noisy tabs (Phase 5 scope)
        tabs: optional list of specific tab_keys to run (overrides include_complex)
        skip_master_check: if True, skip master data readiness validation

    Returns:
        OrchestratorReport
    """
    if isinstance(mode, str):
        mode = ImportMode(mode)

    report = OrchestratorReport(mode)

    # 1. Master data readiness check
    if not skip_master_check:
        from gov_erp.importers.anda.master_loaders import check_reference_integrity
        integrity = check_reference_integrity()
        report.master_check = integrity

        if mode == ImportMode.COMMIT and not integrity.get("ready_for_transactional_import"):
            report.errors.append(
                "Master data not ready for transactional import. "
                "Run load_all_masters first or use skip_master_check=True."
            )
            report.finalize()
            return report

    # 2. Determine which tabs to run
    if tabs:
        # User-specified subset
        run_order = [t for t in IMPORT_ORDER if t[0] in tabs]
    elif include_complex:
        run_order = [t for t in IMPORT_ORDER if t[2] in ("clean", "complex")]
    else:
        run_order = [t for t in IMPORT_ORDER if t[2] == "clean"]

    # 3. Run each tab in order
    for tab_key, label, risk_level in run_order:
        rows = tab_data.get(tab_key)
        if not rows:
            continue

        importer = _get_importer(tab_key)
        if not importer:
            report.errors.append(f"No importer found for tab: {tab_key}")
            continue

        try:
            tab_report = importer.run(rows, mode)
            report.add_tab_report(tab_key, label, tab_report)
        except Exception as e:
            report.errors.append(f"Error running {tab_key}: {e}")

    report.finalize()

    # 4. Save orchestrator audit log
    _save_orchestrator_log(report)

    return report


def run_single_tab_import(tab_key, rows, mode="dry_run"):
    """Convenience: run a single tab importer with master check.

    Returns:
        ImportReport from the single tab importer
    """
    if isinstance(mode, str):
        mode = ImportMode(mode)

    importer = _get_importer(tab_key)
    if not importer:
        frappe.throw(f"No importer found for tab: {tab_key}")

    return importer.run(rows, mode)


def get_import_order(include_complex=False):
    """Return the tab import order as a list of dicts."""
    if include_complex:
        tabs = IMPORT_ORDER
    else:
        tabs = [t for t in IMPORT_ORDER if t[2] in ("master", "clean")]
    return [
        {"tab_key": t[0], "label": t[1], "risk_level": t[2]}
        for t in tabs
    ]


def _save_orchestrator_log(report):
    """Save an audit log for the orchestrated run."""
    try:
        frappe.get_doc({
            "doctype": "GE Import Log",
            "tab_name": "ORCHESTRATED_RUN",
            "import_mode": report.mode,
            "total_rows": sum(t.get("total_rows", 0) for t in report.tab_reports),
            "accepted_rows": sum(t["accepted"] for t in report.tab_reports),
            "rejected_rows": sum(t["rejected"] for t in report.tab_reports),
            "duplicate_rows": sum(t["duplicates"] for t in report.tab_reports),
            "skipped_rows": sum(t["skipped"] for t in report.tab_reports),
            "unresolved_count": sum(t["unresolved_count"] for t in report.tab_reports),
            "started_at": report.started_at,
            "finished_at": report.finished_at,
            "report_json": frappe.as_json(report.as_dict()),
        }).insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception:
        frappe.log_error("Orchestrator audit log save failed")
