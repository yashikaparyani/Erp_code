import frappe
from gov_erp.role_utils import ensure_business_roles, sync_rbac_doc_permissions
from gov_erp.master_data import seed_all
from gov_erp.spine_setup import ensure_spine_custom_fields
from gov_erp.rbac_seed import seed_rbac


def _run_bootstrap_step(step_label, phase, fn):
	try:
		fn()
	except Exception:
		frappe.log_error(frappe.get_traceback(), f"gov_erp: {step_label} failed on {phase}")
		raise


def after_install():
	ensure_business_roles()
	ensure_spine_custom_fields()
	_run_bootstrap_step("rbac seed", "install", seed_rbac)
	_run_bootstrap_step("docperm sync", "install", sync_rbac_doc_permissions)
	_run_bootstrap_step("master_data seed", "install", seed_all)


def after_migrate():
	ensure_business_roles()
	ensure_spine_custom_fields()
	_run_bootstrap_step("rbac seed", "migrate", seed_rbac)
	_run_bootstrap_step("docperm sync", "migrate", sync_rbac_doc_permissions)
	_run_bootstrap_step("master_data seed", "migrate", seed_all)
