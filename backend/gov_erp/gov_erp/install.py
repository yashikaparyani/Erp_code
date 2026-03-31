import frappe
from gov_erp.role_utils import ensure_business_roles, sync_rbac_doc_permissions
from gov_erp.master_data import seed_all
from gov_erp.spine_setup import ensure_spine_custom_fields
from gov_erp.rbac_seed import seed_rbac


def after_install():
	ensure_business_roles()
	ensure_spine_custom_fields()
	try:
		seed_rbac()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "gov_erp: rbac seed failed on install")
	try:
		sync_rbac_doc_permissions()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "gov_erp: docperm sync failed on install")
	try:
		seed_all()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "gov_erp: master_data seed failed on install")


def after_migrate():
	ensure_business_roles()
	ensure_spine_custom_fields()
	try:
		seed_rbac()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "gov_erp: rbac seed failed on migrate")
	try:
		sync_rbac_doc_permissions()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "gov_erp: docperm sync failed on migrate")
	try:
		seed_all()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "gov_erp: master_data seed failed on migrate")
