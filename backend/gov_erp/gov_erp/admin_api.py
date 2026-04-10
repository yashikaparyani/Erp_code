"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

def _get_default_company_name():
	companies = frappe.get_all("Company", fields=["name"], order_by="creation asc", limit_page_length=1)
	return companies[0].name if companies else None


def _apply_creation_date_filters(filters, from_date=None, to_date=None, fieldname="creation"):
	if from_date and to_date:
		filters[fieldname] = ["between", [from_date, to_date]]
	elif from_date:
		filters[fieldname] = [">=", from_date]
	elif to_date:
		filters[fieldname] = ["<=", to_date]


@frappe.whitelist()
def get_departments():
	"""Return built-in Department masters for the settings UI."""
	_require_roles(ROLE_PRESALES_HEAD, ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	data = frappe.get_all(
		"Department",
		fields=["name", "department_name", "company", "disabled", "creation", "owner"],
		order_by="department_name asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_department(data):
	"""Create a Department using the default company in the site."""
	_require_roles(ROLE_PRESALES_HEAD, ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	values = json.loads(data) if isinstance(data, str) else data
	department_name = (values.get("department_name") or "").strip()
	if not department_name:
		frappe.throw("Department name is required")

	company = values.get("company") or _get_default_company_name()
	if not company:
		frappe.throw("No Company is configured for department creation")

	if frappe.db.exists("Department", {"department_name": department_name, "company": company}):
		frappe.throw(f"Department already exists for company {company}")

	doc = frappe.get_doc(
		{
			"doctype": "Department",
			"department_name": department_name,
			"company": company,
			"parent_department": values.get("parent_department"),
			"is_group": values.get("is_group", 0),
		}
	)
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Department created"}


@frappe.whitelist()
def toggle_department(name):
	"""Toggle a Department's disabled state."""
	_require_roles(ROLE_PRESALES_HEAD, ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	doc = frappe.get_doc("Department", name)
	doc.disabled = 0 if cint(doc.disabled) else 1
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Department updated"}


@frappe.whitelist()
def get_designations():
	"""Return built-in Designation masters for the settings UI."""
	_require_roles(ROLE_PRESALES_HEAD, ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	data = frappe.get_all(
		"Designation",
		fields=["name", "designation_name", "description", "creation", "owner"],
		order_by="designation_name asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_designation(data):
	"""Create a Designation master."""
	_require_roles(ROLE_PRESALES_HEAD, ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	values = json.loads(data) if isinstance(data, str) else data
	designation_name = (values.get("designation_name") or "").strip()
	if not designation_name:
		frappe.throw("Designation name is required")

	if frappe.db.exists("Designation", {"designation_name": designation_name}):
		frappe.throw("Designation already exists")

	doc = frappe.get_doc(
		{
			"doctype": "Designation",
			"designation_name": designation_name,
			"description": values.get("description"),
		}
	)
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Designation created"}


@frappe.whitelist()
def get_roles():
	"""Return Frappe roles for the settings UI."""
	_require_roles(ROLE_PRESALES_HEAD, ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	data = frappe.get_all(
		"Role",
		fields=["name", "role_name", "disabled", "is_custom", "creation", "owner"],
		order_by="role_name asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_role(data):
	"""Create a custom Frappe role."""
	_require_roles(ROLE_DIRECTOR)
	values = json.loads(data) if isinstance(data, str) else data
	role_name = (values.get("role_name") or "").strip()
	if not role_name:
		frappe.throw("Role name is required")

	if frappe.db.exists("Role", {"role_name": role_name}):
		frappe.throw("Role already exists")

	doc = frappe.get_doc({"doctype": "Role", "role_name": role_name})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Role created"}


@frappe.whitelist()
def toggle_role(name):
	"""Toggle a role's disabled state."""
	_require_roles(ROLE_DIRECTOR)
	doc = frappe.get_doc("Role", name)
	doc.disabled = 0 if cint(doc.disabled) else 1
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Role updated"}


@frappe.whitelist()
def get_users():
	"""Return Frappe system users, enriched with role and employee context."""
	_require_roles(ROLE_PRESALES_HEAD, ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_PROJECT_HEAD, ROLE_DIRECTOR)
	users = frappe.get_all(
		"User",
		filters={"name": ["not in", ["Administrator", "Guest"]], "user_type": "System User"},
		fields=["name", "full_name", "username", "email", "enabled", "phone", "mobile_no", "creation"],
		order_by="creation desc",
	)
	user_names = [user.name for user in users]

	role_rows = frappe.get_all(
		"Has Role",
		filters={"parent": ["in", user_names]},
		fields=["parent", "role"],
		order_by="modified desc",
	) if user_names else []
	roles_by_user = {}
	for row in role_rows:
		roles_by_user.setdefault(row.parent, []).append(row.role)

	employee_rows = frappe.get_all(
		"Employee",
		filters={"user_id": ["in", user_names]},
		fields=["user_id", "department", "designation"],
	) if user_names and frappe.db.exists("DocType", "Employee") else []
	employee_by_user = {row.user_id: row for row in employee_rows}

	data = []
	for user in users:
		employee = employee_by_user.get(user.name)
		data.append(
			{
				"name": user.name,
				"full_name": user.full_name,
				"username": user.username,
				"email": user.email,
				"enabled": user.enabled,
				"phone": user.phone,
				"mobile_no": user.mobile_no,
				"department": employee.department if employee else "",
				"designation": employee.designation if employee else "",
				"roles": sorted(roles_by_user.get(user.name, [])),
				"creation": user.creation,
			}
		)

	return {"success": True, "data": data}


@frappe.whitelist()
def create_user(data):
	"""Create a system user for the admin settings UI."""
	_require_roles(ROLE_DIRECTOR)
	values = json.loads(data) if isinstance(data, str) else data
	email = (values.get("email") or "").strip().lower()
	first_name = (values.get("first_name") or values.get("name") or "").strip()
	password = values.get("password")
	username = (values.get("username") or email.split("@")[0]).strip()

	if not email:
		frappe.throw("Email is required")
	if not first_name:
		frappe.throw("First name is required")
	if not password:
		frappe.throw("Password is required")
	if frappe.db.exists("User", email):
		frappe.throw("User already exists")

	doc = frappe.get_doc(
		{
			"doctype": "User",
			"email": email,
			"first_name": first_name,
			"username": username,
			"phone": values.get("contact_no") or values.get("phone"),
			"mobile_no": values.get("contact_no") or values.get("mobile_no"),
			"user_type": "System User",
			"send_welcome_email": 0,
			"enabled": 1,
		}
	)
	doc.new_password = password
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "User created"}


