"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

# ─── ANDA Import Framework ───────────────────────────────────────────────────

_ANDA_IMPORTER_MAP = {
	"project_overview": "gov_erp.importers.anda.project_overview.ProjectOverviewImporter",
	"milestones_phases": "gov_erp.importers.anda.milestones_phases.MilestonesPhasesImporter",
	"location_survey": "gov_erp.importers.anda.location_survey.LocationSurveyImporter",
	"procurement_tracker": "gov_erp.importers.anda.procurement_tracker.ProcurementTrackerImporter",
	"issue_log": "gov_erp.importers.anda.issue_log.IssueLogImporter",
	"client_payment_milestones": "gov_erp.importers.anda.client_payment_milestones.ClientPaymentMilestonesImporter",
	"material_issuance_consumption": "gov_erp.importers.anda.material_issuance_consumption.MaterialIssuanceImporter",
	"project_communications": "gov_erp.importers.anda.project_communications.ProjectCommunicationsImporter",
	"rma_tracker": "gov_erp.importers.anda.rma_tracker.RMATrackerImporter",
	"project_assets_services": "gov_erp.importers.anda.project_assets_services.ProjectAssetsServicesImporter",
	"petty_cash": "gov_erp.importers.anda.petty_cash.PettyCashImporter",
	"device_uptime": "gov_erp.importers.anda.device_uptime.DeviceUptimeImporter",
	"project_manpower_assignment": "gov_erp.importers.anda.project_manpower_assignment.ProjectManpowerAssignmentImporter",
}


def _require_import_access():
	"""Only System Manager and Director can run ANDA imports."""
	roles = frappe.get_roles(frappe.session.user)
	if "System Manager" not in roles and "Director" not in roles:
		frappe.throw("Import access denied", frappe.PermissionError)


@frappe.whitelist()
def run_anda_import(tab_name, rows, mode="dry_run"):
	"""Run an ANDA tab importer.

	Args:
		tab_name: key from _ANDA_IMPORTER_MAP (e.g. "project_overview")
		rows: JSON array of dicts (one per row from the sheet)
		mode: "dry_run" | "stage_only" | "commit"

	Returns:
		dict with summary, accepted, rejected, duplicate, skipped counts
	"""
	_require_import_access()

	if tab_name not in _ANDA_IMPORTER_MAP:
		frappe.throw(f"Unknown tab: {tab_name}. Valid: {', '.join(sorted(_ANDA_IMPORTER_MAP.keys()))}")

	if isinstance(rows, str):
		rows = json.loads(rows)

	from gov_erp.importers.anda.base import ImportMode
	mode_enum = ImportMode[mode.upper()]

	# Dynamic import of the importer class
	module_path, class_name = _ANDA_IMPORTER_MAP[tab_name].rsplit(".", 1)
	module = frappe.get_module(module_path)
	importer_cls = getattr(module, class_name)

	importer = importer_cls()
	report = importer.run(rows, mode_enum)

	return report.as_dict()


@frappe.whitelist()
def get_anda_import_logs(tab_name=None, limit=20):
	"""Return recent ANDA import audit logs."""
	_require_import_access()

	filters = {}
	if tab_name:
		filters["tab_name"] = tab_name

	logs = frappe.get_all(
		"GE Import Log",
		filters=filters,
		fields=[
			"name", "tab_name", "import_mode",
			"total_rows", "accepted_rows", "rejected_rows",
			"duplicate_rows", "skipped_rows", "unresolved_count",
			"started_at", "finished_at",
		],
		order_by="started_at desc",
		limit_page_length=cint(limit) or 20,
	)
	return logs


@frappe.whitelist()
def get_anda_import_tabs():
	"""Return the list of available ANDA import tab names."""
	_require_import_access()
	return sorted(_ANDA_IMPORTER_MAP.keys())


# ─── Phase 3: Master Data Loading ────────────────────────────────────────────

@frappe.whitelist()
def load_anda_masters(departments=None, designations=None, projects=None, sites=None, vendors=None):
	"""Load master data in dependency order (Phase 3).

	All arguments are optional JSON arrays.  If omitted, canonical ANDA
	defaults are used for departments and designations.

	Returns:
		dict with per-step create/existing counts and any errors.
	"""
	_require_import_access()

	if isinstance(departments, str):
		departments = json.loads(departments)
	if isinstance(designations, str):
		designations = json.loads(designations)
	if isinstance(projects, str):
		projects = json.loads(projects)
	if isinstance(sites, str):
		sites = json.loads(sites)
	if isinstance(vendors, str):
		vendors = json.loads(vendors)

	from gov_erp.importers.anda.master_loaders import load_all_masters
	report = load_all_masters(
		departments=departments,
		designations=designations,
		projects=projects,
		sites=sites,
		vendors=vendors,
	)
	return report.as_dict()


@frappe.whitelist()
def check_anda_master_integrity():
	"""Check reference integrity of master data (Phase 3).

	Returns:
		dict with master counts and readiness flags.
	"""
	_require_import_access()

	from gov_erp.importers.anda.master_loaders import check_reference_integrity
	return check_reference_integrity()


# ─── Phase 4: Orchestrated Transactional Import ──────────────────────────────

@frappe.whitelist()
def run_anda_orchestrated_import(tab_data, mode="dry_run", include_complex=False, tabs=None, skip_master_check=False):
	"""Run imports across multiple tabs in dependency order (Phase 4).

	Args:
		tab_data: JSON object mapping tab_key → list of row dicts.
			Example: {"milestones_phases": [...], "location_survey": [...]}
		mode: "dry_run" | "stage_only" | "commit"
		include_complex: if true, also run complex/noisy tabs
		tabs: optional JSON array of specific tab_keys to run
		skip_master_check: if true, skip master data readiness check

	Returns:
		OrchestratorReport dict with per-tab results and totals.
	"""
	_require_import_access()

	if isinstance(tab_data, str):
		tab_data = json.loads(tab_data)
	if isinstance(tabs, str):
		tabs = json.loads(tabs)

	from gov_erp.importers.anda.orchestrator import run_orchestrated_import
	report = run_orchestrated_import(
		tab_data=tab_data,
		mode=mode,
		include_complex=include_complex,
		tabs=tabs,
		skip_master_check=skip_master_check,
	)
	return report.as_dict()


@frappe.whitelist()
def get_anda_import_order(include_complex=False):
	"""Return the recommended tab import order (Phase 4).

	Returns:
		list of {tab_key, label, risk_level} in dependency order.
	"""
	_require_import_access()

	from gov_erp.importers.anda.orchestrator import get_import_order
	return get_import_order(include_complex=include_complex)


# ─── PM Cockpit Summary ──────────────────────────────────────

