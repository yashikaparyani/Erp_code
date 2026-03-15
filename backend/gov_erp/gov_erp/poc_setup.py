import os

import frappe
from frappe.utils.password import update_password


POC_PASSWORD = os.environ.get("GOV_ERP_POC_PASSWORD")

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


def create_poc_users():
	if not POC_PASSWORD:
		frappe.throw("Set GOV_ERP_POC_PASSWORD to provision POC users.")

	created = []
	updated = []

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

		user.enabled = 1
		user.user_type = "System User"
		user.send_welcome_email = 0
		user.save(ignore_permissions=True)
		update_password(user=email, pwd=POC_PASSWORD, logout_all_sessions=True)

	frappe.db.commit()
	return {
		"created": created,
		"updated": updated,
		"count": len(POC_USERS),
	}
