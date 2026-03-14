import frappe


ROLE_SYSTEM_MANAGER = "System Manager"
ROLE_PRESALES_HEAD = "Presales Tendering Head"
ROLE_PRESALES_EXECUTIVE = "Presales Executive"
ROLE_ENGINEERING_HEAD = "Engineering Head"
ROLE_ENGINEER = "Engineer"
ROLE_DEPARTMENT_HEAD = "Department Head"
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


BUSINESS_ROLES = [
	ROLE_PRESALES_HEAD,
	ROLE_PRESALES_EXECUTIVE,
	ROLE_ENGINEERING_HEAD,
	ROLE_ENGINEER,
	ROLE_DEPARTMENT_HEAD,
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
