import frappe


ROLE_SYSTEM_MANAGER = "System Manager"
ROLE_PRESALES_HEAD = "Presales Tendering Head"
ROLE_PRESALES_EXECUTIVE = "Presales Executive"
ROLE_ENGINEERING_HEAD = "Engineering Head"
ROLE_ENGINEER = "Engineer"
ROLE_DEPARTMENT_HEAD = "Department Head"
ROLE_PROJECT_HEAD = "Project Head"
ROLE_ACCOUNTS = "Accounts"
ROLE_HR_MANAGER = "HR Manager"
ROLE_PROCUREMENT_MANAGER = "Procurement Manager"
ROLE_PURCHASE = "Purchase"
ROLE_PROJECT_MANAGER = "Project Manager"
ROLE_STORE_MANAGER = "Store Manager"
ROLE_STORES_LOGISTICS_HEAD = "Stores Logistics Head"
ROLE_DIRECTOR = "Director"
ROLE_FIELD_TECHNICIAN = "Field Technician"
ROLE_OM_OPERATOR = "OM Operator"
ROLE_RMA_MANAGER = "RMA Manager"

# ── Head-level aliases ──────────────────────────────────────────────────────
# These map functional titles that appear in the org chart to the underlying
# permission role. Code throughout the codebase should use the alias when the
# context is domain-specific (e.g. ROLE_HR_HEAD in HR guards instead of
# ROLE_HR_MANAGER) so that the role name shown in the UI is meaningful and
# can diverge from the permission role in a future refactor without touching
# every guard.
ROLE_PRESALES_CHIEF     = ROLE_PRESALES_HEAD          # Presales Head alias
ROLE_HR_HEAD            = ROLE_HR_MANAGER             # HR Head alias
ROLE_ACCOUNTS_HEAD      = ROLE_ACCOUNTS               # Accounts Head alias
ROLE_PROCUREMENT_HEAD   = ROLE_PROCUREMENT_MANAGER    # Procurement Head alias
ROLE_RMA_HEAD           = ROLE_RMA_MANAGER            # RMA Head alias


BUSINESS_ROLES = [
	ROLE_PRESALES_HEAD,
	ROLE_PRESALES_EXECUTIVE,
	ROLE_ENGINEERING_HEAD,
	ROLE_ENGINEER,
	ROLE_DEPARTMENT_HEAD,
	ROLE_PROJECT_HEAD,
	ROLE_ACCOUNTS,
	ROLE_HR_MANAGER,
	ROLE_PROCUREMENT_MANAGER,
	ROLE_PURCHASE,
	ROLE_PROJECT_MANAGER,
	ROLE_STORE_MANAGER,
	ROLE_STORES_LOGISTICS_HEAD,
	ROLE_DIRECTOR,
	ROLE_FIELD_TECHNICIAN,
	ROLE_OM_OPERATOR,
	ROLE_RMA_MANAGER,
]


def ensure_business_roles():
	"""Create the custom business roles required by the app."""
	for role_name in BUSINESS_ROLES:
		if frappe.db.exists("Role", role_name):
			continue

		frappe.get_doc(
			{
				"doctype": "Role",
				"role_name": role_name,
				"desk_access": 1,
			}
		).insert(ignore_permissions=True)

	frappe.db.commit()
