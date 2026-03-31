import frappe
from frappe.utils import cint


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

# Head-level aliases
ROLE_PRESALES_CHIEF = ROLE_PRESALES_HEAD
ROLE_HR_HEAD = ROLE_HR_MANAGER
ROLE_ACCOUNTS_HEAD = ROLE_ACCOUNTS
ROLE_PROCUREMENT_HEAD = ROLE_PROCUREMENT_MANAGER
ROLE_RMA_HEAD = ROLE_RMA_MANAGER


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

DOC_PERMISSION_FLAGS = [
	"read",
	"write",
	"create",
	"delete",
	"report",
	"export",
	"import",
	"share",
	"print",
	"email",
	"select",
]

SUBMITTABLE_FLAGS = ["submit", "cancel", "amend"]

PACK_DOCTYPE_GRANTS = {
	"project_command": [
		"Project",
		"GE Site",
		"GE Milestone",
		"GE Project Team Member",
		"GE Project Asset",
		"GE Project Communication Log",
		"GE Project Issue",
		"GE PM Request",
	],
	"presales": [
		"GE Tender",
		"GE Tender Approval",
		"GE Tender Checklist",
		"GE Tender Clarification",
		"GE Survey",
		"GE BOQ",
		"GE Estimate",
		"GE Commercial Document",
		"GE EMD PBG Instrument",
	],
	"engineering": [
		"GE Survey",
		"GE BOQ",
		"GE Cost Sheet",
		"GE Drawing",
		"GE Technical Deviation",
		"GE Change Request",
		"GE Test Report",
	],
	"procurement": [
		"Material Request",
		"Purchase Order",
		"Supplier",
		"Item",
		"Project",
		"GE Vendor Comparison",
		"GE PO Extension",
		"GE PO Payment Term",
	],
	"inventory": [
		"GE Dispatch Challan",
		"Purchase Receipt",
		"Item",
		"Bin",
		"Warehouse",
		"Project",
		"GE Project Inventory",
		"GE Material Consumption Report",
	],
	"execution_ic": [
		"GE Site",
		"GE DPR",
		"GE Test Report",
		"GE Commissioning Checklist",
		"GE Client Signoff",
		"GE Device Register",
		"GE Dependency Override",
		"GE Dependency Rule",
	],
	"finance": [
		"GE Invoice",
		"GE Payment Receipt",
		"GE Retention Ledger",
		"GE Penalty Deduction",
		"GE PDC Instrument",
		"Purchase Order",
		"Project",
	],
	"hr_manpower": [
		"GE Manpower Log",
		"GE Attendance Log",
		"GE Attendance Regularization",
		"GE Travel Log",
		"GE Leave Application",
		"GE Leave Allocation",
		"GE Leave Type",
		"GE Overtime Entry",
		"GE Employee Onboarding",
		"GE Employee Document",
		"GE Employee Certification",
	],
	"om_rma": [
		"GE Ticket",
		"GE RMA Tracker",
		"GE SLA Timer",
		"GE SLA Profile",
		"GE SLA Penalty Rule",
		"GE SLA Penalty Record",
		"GE Device Register",
		"GE Device Uptime Log",
		"GE Technician Visit Log",
	],
	"dms": [
		"GE Document Folder",
		"GE Document Requirement",
		"GE Project Document",
	],
	"reports": [],
	"master_data": [
		"GE Party",
		"GE Organization",
		"GE Competitor",
		"GE Presales Color Config",
	],
	"approval": [
		"GE Tender Approval",
		"GE Dependency Override",
		"GE PO Payment Term",
		"GE Invoice",
		"GE RMA Tracker",
	],
	"settings_admin": [
		"GE User Context",
		"GE User Pack Override",
		"GE Role Pack Mapping",
		"GE Permission Pack",
		"GE Permission Pack Item",
		"GE Permission Capability",
		"GE RBAC Audit Log",
	],
}

DIRECTOR_STANDARD_DOCTYPES = {
	"Project",
	"Purchase Order",
	"Purchase Receipt",
	"Material Request",
	"Item",
	"Bin",
	"Supplier",
	"Warehouse",
}

EXTRA_ROLE_DOCTYPE_GRANTS = {
	ROLE_PRESALES_HEAD: {
		"Project": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE Project Team Member": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE Project Asset": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE Site": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE Milestone": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE Project Communication Log": {"read": 1, "write": 1, "create": 1, "report": 1},
	},
	ROLE_PROJECT_HEAD: {
		"GE Ticket": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE Site": {"read": 1, "write": 1, "create": 1, "delete": 1, "report": 1},
		"GE Project Team Member": {"read": 1, "write": 1, "create": 1, "delete": 1, "report": 1},
		"GE Payment Receipt": {"read": 1, "report": 1},
		"GE SLA Timer": {"read": 1, "report": 1},
		"GE SLA Penalty Rule": {"read": 1, "report": 1},
		"GE SLA Profile": {"read": 1, "report": 1},
		"GE SLA Penalty Record": {"read": 1, "report": 1},
		"GE Technician Visit Log": {"read": 1, "report": 1},
	},
	ROLE_PROJECT_MANAGER: {
		"GE Technician Visit Log": {"read": 1, "report": 1},
	},
	ROLE_OM_OPERATOR: {
		"GE Ticket": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE SLA Timer": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE SLA Penalty Rule": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE SLA Profile": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE SLA Penalty Record": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE Device Uptime Log": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE Device Register": {"read": 1, "write": 1, "create": 1, "report": 1},
		"GE Technician Visit Log": {"read": 1, "write": 1, "create": 1, "report": 1},
	},
	ROLE_RMA_MANAGER: {
		"GE SLA Timer": {"read": 1, "write": 1, "report": 1},
		"GE SLA Penalty Rule": {"read": 1, "write": 1, "report": 1},
		"GE SLA Profile": {"read": 1, "write": 1, "report": 1},
		"GE SLA Penalty Record": {"read": 1, "write": 1, "report": 1},
		"GE Device Register": {"read": 1, "write": 1, "report": 1},
	},
	ROLE_PROCUREMENT_MANAGER: {
		"GE Ticket": {"read": 1, "write": 1, "report": 1},
	},
	ROLE_FIELD_TECHNICIAN: {
		"GE Technician Visit Log": {"read": 1, "write": 1, "create": 1, "report": 1},
	},
	ROLE_ENGINEERING_HEAD: {
		"GE BOQ": {"read": 1, "write": 1, "report": 1},
		"GE Cost Sheet": {"read": 1, "write": 1, "report": 1},
	},
	ROLE_ENGINEER: {
		"GE BOQ": {"read": 1, "report": 1},
		"GE Cost Sheet": {"read": 1, "report": 1},
	},
}


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


def _merge_flags(current, incoming):
	merged = dict(current or {})
	for key, value in (incoming or {}).items():
		merged[key] = max(cint(merged.get(key) or 0), cint(value or 0))
	return merged


def _flags_for_mode(mode, is_submittable):
	flags = {"if_owner": 0}
	if mode == "override":
		for flag in DOC_PERMISSION_FLAGS:
			flags[flag] = 1
		for flag in SUBMITTABLE_FLAGS:
			flags[flag] = 1 if is_submittable else 0
		return flags

	base_read = {
		"read": 1,
		"report": 1,
		"print": 1,
		"email": 1,
		"select": 1,
	}
	if mode == "read":
		return base_read

	base_action = dict(base_read)
	base_action.update({"write": 1, "create": 1})
	if mode == "action":
		return base_action

	base_approve = dict(base_action)
	for flag in SUBMITTABLE_FLAGS:
		base_approve[flag] = 1 if is_submittable else 0
	return base_approve


def _upsert_docperm(doctype_name, role, flags):
	perm_name = frappe.db.get_value(
		"DocPerm",
		{
			"parent": doctype_name,
			"parenttype": "DocType",
			"parentfield": "permissions",
			"role": role,
			"permlevel": 0,
		},
		"name",
	)
	if not perm_name:
		perm_doc = frappe.get_doc(
			{
				"doctype": "DocPerm",
				"parent": doctype_name,
				"parenttype": "DocType",
				"parentfield": "permissions",
				"role": role,
				"permlevel": 0,
			}
		)
		perm_doc.insert(ignore_permissions=True)
		perm_name = perm_doc.name

	frappe.db.set_value("DocPerm", perm_name, flags, update_modified=False)
	return perm_name


def _build_rbac_docperm_plan():
	plan = {}

	def add_grant(role, doctype_name, flags):
		if not frappe.db.exists("DocType", doctype_name):
			return
		plan.setdefault(role, {})
		plan[role][doctype_name] = _merge_flags(plan[role].get(doctype_name), flags)

	role_pack_mappings = frappe.get_all(
		"GE Role Pack Mapping",
		filters={"is_enabled": 1},
		fields=["role", "permission_pack", "scope", "mode"],
	)
	for mapping in role_pack_mappings:
		role = mapping.role
		pack_key = mapping.permission_pack
		mode = mapping.mode
		for doctype_name in PACK_DOCTYPE_GRANTS.get(pack_key, []):
			if not frappe.db.exists("DocType", doctype_name):
				continue
			is_submittable = cint(frappe.db.get_value("DocType", doctype_name, "is_submittable") or 0) == 1
			add_grant(role, doctype_name, _flags_for_mode(mode, is_submittable))

	gov_erp_doctypes = set(
		frappe.get_all("DocType", filters={"module": "Gov ERP", "istable": 0}, pluck="name")
	)
	for doctype_name in sorted(gov_erp_doctypes | DIRECTOR_STANDARD_DOCTYPES):
		if not frappe.db.exists("DocType", doctype_name):
			continue
		is_submittable = cint(frappe.db.get_value("DocType", doctype_name, "is_submittable") or 0) == 1
		add_grant(ROLE_DIRECTOR, doctype_name, _flags_for_mode("override", is_submittable))

	for role, grants in EXTRA_ROLE_DOCTYPE_GRANTS.items():
		for doctype_name, flags in grants.items():
			add_grant(role, doctype_name, flags)

	return plan


def sync_rbac_doc_permissions(roles=None):
	"""Sync Frappe DocPerm rows from the custom RBAC model."""
	role_filter = set(roles or [])
	plan = _build_rbac_docperm_plan()
	updated = []

	for role, doctype_map in plan.items():
		if role_filter and role not in role_filter:
			continue
		for doctype_name, flags in sorted(doctype_map.items()):
			_upsert_docperm(doctype_name, role, flags)
			updated.append(f"{role} -> {doctype_name}")

	if updated:
		frappe.db.commit()

	return {
		"updated": updated,
		"count": len(updated),
		"roles": sorted(set(entry.split(" -> ", 1)[0] for entry in updated)),
	}


def grant_director_full_access():
	"""Compatibility wrapper for Director-specific DocPerm sync."""
	return sync_rbac_doc_permissions(roles=[ROLE_DIRECTOR])


def grant_presales_head_project_flow_access():
	"""Compatibility wrapper for Presales Head project-flow DocPerm sync."""
	return sync_rbac_doc_permissions(roles=[ROLE_PRESALES_HEAD])


def ensure_anda_role_permissions():
	"""Compatibility wrapper for ANDA/UAT DocPerm sync."""
	return sync_rbac_doc_permissions(
		roles=[
			ROLE_PROJECT_HEAD,
			ROLE_PROJECT_MANAGER,
			ROLE_OM_OPERATOR,
			ROLE_RMA_MANAGER,
			ROLE_PROCUREMENT_MANAGER,
			ROLE_FIELD_TECHNICIAN,
			ROLE_ENGINEERING_HEAD,
			ROLE_ENGINEER,
		]
	)
