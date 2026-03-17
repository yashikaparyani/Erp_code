import frappe
from gov_erp.role_utils import ensure_business_roles
from gov_erp.master_data import seed_all
from gov_erp.spine_setup import ensure_spine_custom_fields


def after_install():
	ensure_business_roles()
	ensure_spine_custom_fields()
	try:
		seed_all()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "gov_erp: master_data seed failed on install")


def after_migrate():
	ensure_business_roles()
	ensure_spine_custom_fields()
	try:
		seed_all()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "gov_erp: master_data seed failed on migrate")
