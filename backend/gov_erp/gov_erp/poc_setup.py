import os

import frappe
from frappe.installer import update_site_config
from frappe.utils.password import update_password


POC_PASSWORD_ENV_KEY = "GOV_ERP_POC_PASSWORD"
POC_PASSWORD_CONFIG_KEY = "gov_erp_poc_password"
ROLE_TO_STRIP = "Top Management"

POC_USERS = [
	("director@technosys.local", "Rajesh", "Sharma", "Director"),
	("dept.head@technosys.local", "Priya", "Mehta", "Department Head"),
	("project.head@technosys.local", "Ravi", "Sharma", "Project Head"),
	("hr.manager@technosys.local", "Anjali", "Rao", "HR Manager"),
	("presales.head@technosys.local", "Amit", "Verma", "Presales Tendering Head"),
	("presales.exec@technosys.local", "Pooja", "Kulkarni", "Presales Executive"),
	("eng.head@technosys.local", "Suresh", "Nair", "Engineering Head"),
	("engineer@technosys.local", "Neha", "Singh", "Engineer"),
	("proc.manager@technosys.local", "Manish", "Tiwari", "Procurement Manager"),
	("purchase@technosys.local", "Vikram", "Desai", "Purchase"),
	("store.manager@technosys.local", "Arun", "Bhatt", "Store Manager"),
	("stores.head@technosys.local", "Kavita", "Joshi", "Stores Logistics Head"),
	("project.manager@technosys.local", "Ravi", "Kumar", "Project Manager"),
	("accounts@technosys.local", "Sunita", "Patel", "Accounts"),
	("field.tech@technosys.local", "Rohit", "Gupta", "Field Technician"),
	("om.operator@technosys.local", "Deepak", "Mali", "OM Operator"),
	("rma.manager@technosys.local", "Kiran", "Saxena", "RMA Manager"),
]


def _remove_role_if_present(user, role_name):
	"""Remove an unwanted role from a user and return True when a change is made."""
	current_roles = list(user.roles)
	filtered_roles = [row for row in current_roles if row.role != role_name]
	if len(filtered_roles) == len(current_roles):
		return False

	user.set("roles", filtered_roles)
	return True


def _resolve_poc_password(password=None, required=True):
	resolved_password = password or os.environ.get(POC_PASSWORD_ENV_KEY) or frappe.conf.get(POC_PASSWORD_CONFIG_KEY)
	if required and not resolved_password:
		frappe.throw(
			f"Set {POC_PASSWORD_ENV_KEY} or store {POC_PASSWORD_CONFIG_KEY} via gov_erp.poc_setup.set_poc_password."
		)
	return resolved_password


def create_poc_users(password=None):
	resolved_password = _resolve_poc_password(password=password)

	created = []
	updated = []
	roles_stripped = []

	for email, first_name, last_name, role in POC_USERS:
		if frappe.db.exists("User", email):
			user = frappe.get_doc("User", email)
			updated.append(email)
		else:
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": email,
					"first_name": first_name,
					"last_name": last_name,
					"enabled": 1,
					"user_type": "System User",
					"send_welcome_email": 0,
				}
			)
			user.insert(ignore_permissions=True)
			created.append(email)

		if role not in {row.role for row in user.roles}:
			user.append("roles", {"role": role})

		if _remove_role_if_present(user, ROLE_TO_STRIP):
			roles_stripped.append(email)

		user.enabled = 1
		user.user_type = "System User"
		user.send_welcome_email = 0
		user.save(ignore_permissions=True)
		update_password(user=email, pwd=resolved_password, logout_all_sessions=True)

	frappe.db.commit()
	return {
		"created": created,
		"updated": updated,
		"roles_stripped": roles_stripped,
		"count": len(POC_USERS),
	}


def set_poc_password(password, reprovision=True):
	"""Persist the POC password in site config and optionally reprovision all POC users."""
	if not password:
		frappe.throw("Password is required.")

	update_site_config(POC_PASSWORD_CONFIG_KEY, password)
	frappe.clear_cache()

	result = {
		"stored_in_site_config": True,
		"site_config_key": POC_PASSWORD_CONFIG_KEY,
		"reprovisioned": False,
	}

	if reprovision:
		result["provisioning"] = create_poc_users(password=password)
		result["reprovisioned"] = True

	return result


def get_poc_credential_status():
	"""Return non-secret credential state for operators debugging login issues."""
	users = []
	for email, *_ in POC_USERS:
		enabled = None
		if frappe.db.exists("User", email):
			enabled = frappe.db.get_value("User", email, "enabled")
		users.append({"email": email, "exists": enabled is not None, "enabled": bool(enabled) if enabled is not None else False})

	return {
		"has_env_password": bool(os.environ.get(POC_PASSWORD_ENV_KEY)),
		"has_site_config_password": bool(frappe.conf.get(POC_PASSWORD_CONFIG_KEY)),
		"site_config_key": POC_PASSWORD_CONFIG_KEY,
		"users": users,
	}


def strip_non_poc_roles():
	"""Remove Top Management role from POC users to keep frontend role mapping stable."""
	updated = []
	for email, *_ in POC_USERS:
		if not frappe.db.exists("User", email):
			continue

		user = frappe.get_doc("User", email)
		if _remove_role_if_present(user, ROLE_TO_STRIP):
			user.save(ignore_permissions=True)
			updated.append(email)

	frappe.db.commit()
	return {
		"updated": updated,
		"removed_role": ROLE_TO_STRIP,
		"count": len(updated),
	}
