import frappe
from gov_erp.role_utils import ensure_business_roles
from gov_erp.master_data import seed_all


def after_install():
	ensure_business_roles()
	try:
		seed_all()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "gov_erp: master_data seed failed on install")


def after_migrate():
	ensure_business_roles()
	try:
		seed_all()
	except Exception:
		frappe.log_error(frappe.get_traceback(), "gov_erp: master_data seed failed on migrate")
