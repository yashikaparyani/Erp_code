import json

import frappe
from frappe.sessions import delete_session
from frappe.utils import cint
from gov_erp.gov_erp.doctype.ge_dependency_rule.ge_dependency_rule import (
	evaluate_dependency_state,
	resolve_reference_status,
)
from gov_erp.role_utils import (
	ROLE_ACCOUNTS,
	ROLE_ACCOUNTS_HEAD,
	ROLE_DEPARTMENT_HEAD,
	ROLE_DIRECTOR,
	ROLE_ENGINEERING_HEAD,
	ROLE_ENGINEER,
	ROLE_FIELD_TECHNICIAN,
	ROLE_HR_HEAD,
	ROLE_HR_MANAGER,
	ROLE_OM_OPERATOR,
	ROLE_PRESALES_EXECUTIVE,
	ROLE_PRESALES_HEAD,
	ROLE_PROCUREMENT_HEAD,
	ROLE_PROCUREMENT_MANAGER,
	ROLE_PURCHASE,
	ROLE_PROJECT_HEAD,
	ROLE_PROJECT_MANAGER,
	ROLE_RMA_HEAD,
	ROLE_RMA_MANAGER,
	ROLE_SYSTEM_MANAGER,
	ROLE_STORE_MANAGER,
	ROLE_STORES_LOGISTICS_HEAD,
)


FRONTEND_ROLE_PRIORITY = [
	ROLE_DIRECTOR,
	ROLE_DEPARTMENT_HEAD,
	ROLE_PROJECT_HEAD,
	ROLE_HR_MANAGER,
	ROLE_PRESALES_HEAD,
	ROLE_PRESALES_EXECUTIVE,
	ROLE_ENGINEERING_HEAD,
	ROLE_ENGINEER,
	ROLE_PROCUREMENT_MANAGER,
	ROLE_PURCHASE,
	ROLE_STORE_MANAGER,
	ROLE_STORES_LOGISTICS_HEAD,
	ROLE_PROJECT_MANAGER,
	ROLE_ACCOUNTS,
	ROLE_FIELD_TECHNICIAN,
	ROLE_RMA_MANAGER,
	ROLE_OM_OPERATOR,
]


def _require_authenticated_user():
	if frappe.session.user == "Guest":
		frappe.throw("Authentication required", frappe.PermissionError)


def _require_roles(*roles):
	_require_authenticated_user()
	user_roles = set(frappe.get_roles(frappe.session.user))
	if ROLE_DIRECTOR in user_roles:
		return

	allowed_roles = set(roles) | {ROLE_SYSTEM_MANAGER}
	if user_roles.isdisjoint(allowed_roles):
		role_list = ", ".join(sorted(allowed_roles))
		frappe.throw(f"Insufficient role access. One of these roles is required: {role_list}", frappe.PermissionError)


def _require_tender_read_access():
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)


def _require_tender_write_access():
	_require_roles(ROLE_PRESALES_HEAD, ROLE_PRESALES_EXECUTIVE, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)


def _require_tender_conversion_access():
	_require_roles(ROLE_PRESALES_HEAD, ROLE_DEPARTMENT_HEAD, ROLE_PROJECT_HEAD)


def _require_survey_read_access():
	_require_roles(
		ROLE_PROJECT_MANAGER,
		ROLE_PROJECT_HEAD,
		ROLE_ENGINEERING_HEAD,
		ROLE_ENGINEER,
		ROLE_DIRECTOR,
	)


def _require_survey_write_access():
	_require_roles(ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD, ROLE_ENGINEERING_HEAD, ROLE_ENGINEER)


def _require_boq_read_access():
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_ENGINEERING_HEAD,
		ROLE_DEPARTMENT_HEAD,
		ROLE_ACCOUNTS,
		ROLE_DIRECTOR,
	)


def _require_boq_write_access():
	_require_roles(ROLE_PRESALES_HEAD, ROLE_PRESALES_EXECUTIVE)


def _require_boq_approval_access():
	_require_roles(ROLE_DEPARTMENT_HEAD, ROLE_PROJECT_HEAD)


def _require_cost_sheet_read_access():
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_ENGINEERING_HEAD,
		ROLE_DEPARTMENT_HEAD,
		ROLE_ACCOUNTS,
		ROLE_DIRECTOR,
	)


def _require_cost_sheet_write_access():
	_require_roles(ROLE_PRESALES_HEAD, ROLE_PRESALES_EXECUTIVE)


def _require_cost_sheet_approval_access():
	_require_roles(ROLE_DEPARTMENT_HEAD, ROLE_PROJECT_HEAD)


def _require_procurement_read_access():
	_require_roles(
		ROLE_PROCUREMENT_HEAD,
		ROLE_PURCHASE,
		ROLE_PROJECT_HEAD,
		ROLE_ENGINEERING_HEAD,
		ROLE_DIRECTOR,
	)


def _require_procurement_write_access():
	_require_roles(ROLE_PROCUREMENT_HEAD, ROLE_PURCHASE)


def _require_procurement_approval_access():
	_require_roles(ROLE_PROJECT_HEAD, ROLE_ENGINEERING_HEAD, ROLE_DIRECTOR)


def _require_store_read_access():
	_require_roles(
		ROLE_STORE_MANAGER,
		ROLE_STORES_LOGISTICS_HEAD,
		ROLE_PROCUREMENT_HEAD,
		ROLE_PURCHASE,
		ROLE_PROJECT_MANAGER,
		ROLE_PROJECT_HEAD,
		ROLE_DIRECTOR,
	)


def _require_store_write_access():
	_require_roles(ROLE_STORE_MANAGER, ROLE_STORES_LOGISTICS_HEAD, ROLE_PROCUREMENT_HEAD, ROLE_PURCHASE)


def _require_store_approval_access():
	_require_roles(ROLE_PROJECT_HEAD, ROLE_PROCUREMENT_HEAD, ROLE_DIRECTOR)


def _require_milestone_read_access():
	_require_roles(
		ROLE_PROJECT_MANAGER,
		ROLE_PROJECT_HEAD,
		ROLE_ENGINEERING_HEAD,
		ROLE_DIRECTOR,
	)


def _require_milestone_write_access():
	_require_roles(
		ROLE_PROJECT_MANAGER,
		ROLE_PROJECT_HEAD,
		ROLE_ENGINEERING_HEAD,
	)


def _require_document_read_access():
	_require_roles(
		ROLE_PROJECT_HEAD,
		ROLE_PROJECT_MANAGER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
		ROLE_ACCOUNTS,
	)


def _require_document_write_access():
	_require_roles(
		ROLE_PROJECT_HEAD,
		ROLE_PROJECT_MANAGER,
		ROLE_DEPARTMENT_HEAD,
	)


def _require_execution_read_access():
	_require_roles(
		ROLE_PROJECT_MANAGER,
		ROLE_PROJECT_HEAD,
		ROLE_ENGINEERING_HEAD,
		ROLE_ENGINEER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)


def _require_execution_write_access():
	_require_roles(ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD, ROLE_ENGINEERING_HEAD, ROLE_ENGINEER)


def _require_comm_log_read_access():
	_require_roles(
		ROLE_PROJECT_HEAD,
		ROLE_PROJECT_MANAGER,
		ROLE_ENGINEERING_HEAD,
		ROLE_DIRECTOR,
	)


def _require_comm_log_write_access():
	_require_roles(
		ROLE_PROJECT_HEAD,
		ROLE_PROJECT_MANAGER,
		ROLE_ENGINEERING_HEAD,
	)


def _require_project_asset_access():
	_require_roles(ROLE_PROJECT_HEAD, ROLE_PROJECT_MANAGER)


def _require_hr_read_access():
	_require_roles(
		ROLE_HR_MANAGER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)


def _require_hr_write_access():
	_require_roles(ROLE_HR_MANAGER)


def _require_hr_approval_access():
	_require_roles(ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD)


def _require_manpower_read_access():
	_require_roles(
		ROLE_PROJECT_HEAD,
		ROLE_PROJECT_MANAGER,
		ROLE_HR_HEAD,
		ROLE_DIRECTOR,
	)


def _require_manpower_write_access():
	_require_roles(ROLE_PROJECT_HEAD, ROLE_PROJECT_MANAGER, ROLE_HR_HEAD)


def _require_rma_read_access():
	_require_roles(
		ROLE_OM_OPERATOR,
		ROLE_PROJECT_HEAD,
		ROLE_PROJECT_MANAGER,
		ROLE_RMA_HEAD,
		ROLE_PROCUREMENT_HEAD,
		ROLE_DIRECTOR,
	)


def _require_rma_write_access():
	_require_roles(
		ROLE_OM_OPERATOR,
		ROLE_PROJECT_HEAD,
		ROLE_PROJECT_MANAGER,
		ROLE_RMA_HEAD,
		ROLE_PROCUREMENT_HEAD,
	)


def _require_rma_approval_access():
	_require_roles(ROLE_PROJECT_HEAD, ROLE_RMA_HEAD, ROLE_DIRECTOR)


def _require_device_uptime_read_access():
	_require_roles(
		ROLE_PROJECT_HEAD,
		ROLE_PROJECT_MANAGER,
		ROLE_RMA_HEAD,
		ROLE_ENGINEERING_HEAD,
		ROLE_DIRECTOR,
	)


def _require_device_uptime_write_access():
	_require_roles(
		ROLE_PROJECT_HEAD,
		ROLE_PROJECT_MANAGER,
		ROLE_RMA_HEAD,
		ROLE_ENGINEERING_HEAD,
	)


def _require_dependency_override_approval_access():
	_require_roles(ROLE_DEPARTMENT_HEAD, ROLE_PROJECT_HEAD)


def _get_primary_frontend_role(user_roles):
	for role in FRONTEND_ROLE_PRIORITY:
		if role in user_roles:
			return role

	if ROLE_SYSTEM_MANAGER in user_roles:
		return ROLE_DIRECTOR

	return None


@frappe.whitelist()
def get_session_context():
	"""Return the authenticated user's basic context for the frontend shell."""
	_require_authenticated_user()
	user = frappe.get_cached_doc("User", frappe.session.user)
	user_roles = set(frappe.get_roles(user.name))
	frontend_roles = [role for role in FRONTEND_ROLE_PRIORITY if role in user_roles]

	return {
		"success": True,
		"data": {
			"user": user.name,
			"email": user.email,
			"full_name": user.full_name,
			"roles": sorted(user_roles),
			"frontend_roles": frontend_roles,
			"primary_role": _get_primary_frontend_role(user_roles),
		},
	}


@frappe.whitelist()
def logout_current_session():
	"""Force-clear the authenticated user's current session."""
	_require_authenticated_user()
	sid = frappe.session.sid
	user = frappe.session.user
	frappe.local.login_manager.run_trigger("on_logout")
	delete_session(sid, user=user, reason="User Manually Logged Out")
	frappe.local.login_manager.clear_cookies()
	if frappe.request:
		frappe.local.login_manager.login_as_guest()
	return {"success": True, "message": "Logged out successfully"}


def _require_billing_read_access():
	_require_roles(
		ROLE_ACCOUNTS_HEAD,
		ROLE_PROJECT_HEAD,
		ROLE_PROJECT_MANAGER,
		ROLE_DIRECTOR,
	)


def _require_billing_write_access():
	_require_roles(ROLE_ACCOUNTS_HEAD)


def _require_billing_approval_access():
	_require_roles(ROLE_ACCOUNTS_HEAD, ROLE_PROJECT_HEAD, ROLE_DIRECTOR)


def _require_om_read_access():
	_require_roles(
		ROLE_OM_OPERATOR,
		ROLE_PROJECT_MANAGER,
		ROLE_ENGINEERING_HEAD,
		ROLE_ENGINEER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
		ROLE_RMA_MANAGER,
	)


def _require_om_write_access():
	_require_roles(ROLE_OM_OPERATOR, ROLE_PROJECT_MANAGER, ROLE_ENGINEERING_HEAD, ROLE_ENGINEER, ROLE_RMA_MANAGER)


def _require_om_approval_access():
	_require_roles(ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR, ROLE_RMA_MANAGER)


def get_health_payload():
	return {
		"success": True,
		"app": "gov_erp",
		"message": "Gov ERP backend is reachable",
	}


def _get_default_company():
	return frappe.defaults.get_user_default("company") or frappe.db.get_single_value(
		"Global Defaults", "default_company"
	)


def _get_default_warehouse(company):
	return frappe.db.get_value(
		"Warehouse",
		{"company": company, "is_group": 0},
		"name",
		order_by="creation asc",
	)


def _parse_payload(data):
	if isinstance(data, str):
		return json.loads(data) if data else {}
	return data or {}


def _get_indent_names_for_project(project):
	rows = frappe.db.sql(
		"""
			select distinct parent
			from `tabMaterial Request Item`
			where project = %s
		""",
		(project,),
		as_dict=True,
	)
	return [row.parent for row in rows]


def _attach_indent_project_summary(rows):
	if not rows:
		return rows

	indent_names = [row.name for row in rows]
	project_rows = frappe.db.sql(
		"""
			select parent, project
			from `tabMaterial Request Item`
			where parent in %(parents)s and ifnull(project, '') != ''
			group by parent, project
		""",
		{"parents": tuple(indent_names)},
		as_dict=True,
	)
	project_map = {}
	for row in project_rows:
		project_map.setdefault(row.parent, []).append(row.project)

	for row in rows:
		projects = project_map.get(row.name, [])
		row["projects"] = projects
		row["project"] = projects[0] if len(projects) == 1 else None

	return rows


def _get_stock_age_bucket(age_days):
	if age_days is None:
		return "unknown"
	if age_days <= 30:
		return "age_0_30"
	if age_days <= 60:
		return "age_31_60"
	if age_days <= 90:
		return "age_61_90"
	return "age_90_plus"


@frappe.whitelist(allow_guest=True)
def health_check():
	return get_health_payload()


# ── Tender APIs ──────────────────────────────────────────────

@frappe.whitelist()
def get_tenders(filters=None, limit_page_length=50, limit_start=0):
	"""Return list of tenders with pagination."""
	_require_tender_read_access()
	parsed_filters = json.loads(filters) if isinstance(filters, str) and filters else filters
	data = frappe.get_all(
		"GE Tender",
		filters=parsed_filters,
		fields=[
			"name", "tender_number", "title", "client", "organization",
			"submission_date", "status", "emd_amount",
			"pbg_amount", "estimated_value", "creation", "modified",
		],
		order_by="creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
	)
	total = frappe.db.count("GE Tender", filters=parsed_filters)
	return {"success": True, "data": data, "total": total}


@frappe.whitelist()
def get_tender(name):
	"""Return a single tender with all fields."""
	_require_tender_read_access()
	doc = frappe.get_doc("GE Tender", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_tender(data):
	"""Create a new tender."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Tender", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender created"}


@frappe.whitelist()
def update_tender(name, data):
	"""Update an existing tender."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Tender", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender updated"}


@frappe.whitelist()
def delete_tender(name):
	"""Delete a tender."""
	_require_tender_write_access()
	frappe.delete_doc("GE Tender", name)
	frappe.db.commit()
	return {"success": True, "message": "Tender deleted"}


@frappe.whitelist()
def get_tender_stats():
	"""Aggregate tender stats for the dashboard."""
	_require_tender_read_access()
	tenders = frappe.get_all(
		"GE Tender",
		fields=["status", "estimated_value"],
	)
	total_pipeline = sum(t.estimated_value or 0 for t in tenders)
	won = sum(1 for t in tenders if t.status == "WON")
	submitted = sum(1 for t in tenders if t.status == "SUBMITTED")
	draft = sum(1 for t in tenders if t.status == "DRAFT")
	under_evaluation = sum(1 for t in tenders if t.status == "UNDER_EVALUATION")
	lost = sum(1 for t in tenders if t.status == "LOST")
	cancelled = sum(1 for t in tenders if t.status == "CANCELLED")
	dropped = sum(1 for t in tenders if t.status == "DROPPED")
	return {
		"success": True,
		"data": {
			"total": len(tenders),
			"won": won,
			"submitted": submitted,
			"draft": draft,
			"under_evaluation": under_evaluation,
			"lost": lost,
			"cancelled": cancelled,
			"dropped": dropped,
			"total_pipeline": total_pipeline,
		},
	}


# ── Tender → Project Conversion ─────────────────────────────

@frappe.whitelist()
def convert_tender_to_project(tender_name):
	"""Manually convert a WON tender into an ERPNext Project."""
	_require_tender_conversion_access()
	doc = frappe.get_doc("GE Tender", tender_name)
	if doc.status != "WON":
		return {"success": False, "message": "Only WON tenders can be converted to a project"}
	if doc.linked_project:
		return {"success": False, "message": f"Tender already linked to project {doc.linked_project}"}
	doc._convert_to_project()
	frappe.db.commit()
	return {
		"success": True,
		"data": {"project": doc.linked_project},
		"message": f"Project {doc.linked_project} created from tender {doc.tender_number}",
	}


# ── Tender Organization APIs ────────────────────────────────

@frappe.whitelist()
def get_tender_organizations(tender=None):
	"""Return organizations linked to tenders."""
	_require_tender_read_access()
	filters = {}
	if tender:
		filters["linked_tender"] = tender
	data = frappe.get_all(
		"GE Tender Organization",
		filters=filters,
		fields=[
			"name", "linked_tender", "organization", "role_in_tender",
			"share_percentage", "scope_of_work", "is_lead",
		],
		order_by="is_lead desc, creation asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_tender_organization(data):
	"""Link an organization to a tender."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Tender Organization", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Organization linked to tender"}


@frappe.whitelist()
def delete_tender_organization(name):
	"""Remove an organization link from a tender."""
	_require_tender_write_access()
	frappe.delete_doc("GE Tender Organization", name)
	frappe.db.commit()
	return {"success": True, "message": "Organization removed from tender"}


# ── Party APIs ───────────────────────────────────────────────

@frappe.whitelist()
def get_parties(party_type=None, active=None):
	"""Return list of parties (clients / vendors)."""
	_require_tender_read_access()
	filters = {}
	if party_type:
		if party_type == "CLIENT":
			filters["party_type"] = ["in", ["CLIENT", "BOTH"]]
		elif party_type == "VENDOR":
			filters["party_type"] = ["in", ["VENDOR", "BOTH"]]
		else:
			filters["party_type"] = party_type
	if active:
		filters["active"] = 1
	data = frappe.get_all(
		"GE Party",
		filters=filters,
		fields=[
			"name", "party_name", "party_type", "gstin",
			"pan", "phone", "email", "city", "state", "active",
		],
		order_by="party_name asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_party(data):
	"""Create a party (client/vendor) for tendering and master data flows."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Party", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Party created"}


@frappe.whitelist()
def update_party(name, data):
	"""Update a party."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Party", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Party updated"}


@frappe.whitelist()
def delete_party(name):
	"""Delete a party."""
	_require_tender_write_access()
	frappe.delete_doc("GE Party", name)
	frappe.db.commit()
	return {"success": True, "message": "Party deleted"}


@frappe.whitelist()
def get_organizations(active=None):
	"""Return list of organizations for tendering flows."""
	_require_tender_read_access()
	filters = {}
	if active:
		filters["active"] = 1
	data = frappe.get_all(
		"GE Organization",
		filters=filters,
		fields=[
			"name", "organization_name", "gstin",
			"pan", "phone", "email", "city", "state", "active",
		],
		order_by="organization_name asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_organization(data):
	"""Create an organization master used by tendering flows."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Organization", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Organization created"}


@frappe.whitelist()
def get_emd_pbg_instruments(tender=None, instrument_type=None, status=None):
	"""Return EMD/PBG instruments, optionally filtered by tender and type."""
	_require_tender_read_access()
	filters = {}
	if tender:
		filters["linked_tender"] = tender
	if instrument_type:
		filters["instrument_type"] = instrument_type
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE EMD PBG Instrument",
		filters=filters,
		fields=[
			"name", "instrument_type", "linked_tender", "instrument_number",
			"amount", "status", "bank_name", "issue_date", "expiry_date", "remarks",
			"creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_emd_pbg_instrument(data):
	"""Create an EMD/PBG instrument row."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	linked_tender = (values.get("linked_tender") or "").strip()
	if not linked_tender:
		frappe.throw("Linked tender is required")
	amount = float(values.get("amount") or 0)
	if amount <= 0:
		frappe.throw("Amount must be greater than zero")

	payload = {
		"doctype": "GE EMD PBG Instrument",
		**values,
		"linked_tender": linked_tender,
		"amount": amount,
		"status": values.get("status") or "Pending",
	}
	doc = frappe.get_doc(payload)
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Instrument created"}


@frappe.whitelist()
def get_tender_results(tender=None, result_stage=None, is_fresh=None):
	"""Return tender result rows."""
	_require_tender_read_access()
	filters = {}
	if tender:
		filters["tender"] = tender
	if result_stage:
		filters["result_stage"] = result_stage
	if is_fresh is not None and str(is_fresh) != "":
		filters["is_fresh"] = int(is_fresh)
	data = frappe.get_all(
		"GE Tender Result",
		filters=filters,
		fields=[
			"name", "result_id", "tender", "reference_no", "organization_name",
			"result_stage", "publication_date", "winning_amount", "winner_company",
			"is_fresh", "site_location", "creation", "modified",
		],
		order_by="publication_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_tender_result(name):
	"""Return one tender result row with bidders."""
	_require_tender_read_access()
	doc = frappe.get_doc("GE Tender Result", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_tender_result(data):
	"""Create a tender result row."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Tender Result", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender result created"}


@frappe.whitelist()
def update_tender_result(name, data):
	"""Update a tender result row."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Tender Result", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender result updated"}


@frappe.whitelist()
def delete_tender_result(name):
	"""Delete a tender result row."""
	_require_tender_write_access()
	frappe.delete_doc("GE Tender Result", name)
	frappe.db.commit()
	return {"success": True, "message": "Tender result deleted"}


@frappe.whitelist()
def get_tender_result_stats():
	"""Aggregate tender result stats."""
	_require_tender_read_access()
	rows = frappe.get_all("GE Tender Result", fields=["result_stage", "winning_amount", "is_fresh"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"fresh": sum(1 for row in rows if row.is_fresh),
			"aoc": sum(1 for row in rows if row.result_stage == "AOC"),
			"loi_issued": sum(1 for row in rows if row.result_stage == "LoI Issued"),
			"work_order": sum(1 for row in rows if row.result_stage == "Work Order"),
			"total_winning_amount": sum(row.winning_amount or 0 for row in rows),
		},
	}


@frappe.whitelist()
def get_tender_checklists(status=None, checklist_type=None):
	"""Return tender checklist templates."""
	_require_tender_read_access()
	filters = {}
	if status:
		filters["status"] = status
	if checklist_type:
		filters["checklist_type"] = checklist_type
	data = frappe.get_all(
		"GE Tender Checklist",
		filters=filters,
		fields=["name", "checklist_name", "description", "checklist_type", "status", "creation", "modified"],
		order_by="checklist_name asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_tender_checklist(name):
	"""Return one tender checklist template."""
	_require_tender_read_access()
	doc = frappe.get_doc("GE Tender Checklist", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_tender_checklist(data):
	"""Create a tender checklist template."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Tender Checklist", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender checklist created"}


@frappe.whitelist()
def update_tender_checklist(name, data):
	"""Update a tender checklist template."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Tender Checklist", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender checklist updated"}


@frappe.whitelist()
def delete_tender_checklist(name):
	"""Delete a tender checklist template."""
	_require_tender_write_access()
	frappe.delete_doc("GE Tender Checklist", name)
	frappe.db.commit()
	return {"success": True, "message": "Tender checklist deleted"}


@frappe.whitelist()
def get_tender_reminders(tender=None, status=None, remind_user=None):
	"""Return tender reminders."""
	_require_tender_read_access()
	filters = {}
	if tender:
		filters["tender"] = tender
	if status:
		filters["status"] = status
	if remind_user:
		filters["remind_user"] = remind_user
	data = frappe.get_all(
		"GE Tender Reminder",
		filters=filters,
		fields=[
			"name", "tender", "reminder_date", "reminder_time",
			"remind_user", "status", "sent_on", "creation", "modified",
		],
		order_by="reminder_date asc, reminder_time asc, creation asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_tender_reminder(name):
	"""Return one tender reminder."""
	_require_tender_read_access()
	doc = frappe.get_doc("GE Tender Reminder", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_tender_reminder(data):
	"""Create a tender reminder."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Tender Reminder", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender reminder created"}


@frappe.whitelist()
def update_tender_reminder(name, data):
	"""Update a tender reminder."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Tender Reminder", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender reminder updated"}


@frappe.whitelist()
def delete_tender_reminder(name):
	"""Delete a tender reminder."""
	_require_tender_write_access()
	frappe.delete_doc("GE Tender Reminder", name)
	frappe.db.commit()
	return {"success": True, "message": "Tender reminder deleted"}


@frappe.whitelist()
def mark_tender_reminder_sent(name):
	"""Mark a tender reminder as sent."""
	_require_tender_write_access()
	doc = frappe.get_doc("GE Tender Reminder", name)
	doc.status = "Sent"
	doc.sent_on = frappe.utils.now_datetime()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender reminder marked sent"}


@frappe.whitelist()
def dismiss_tender_reminder(name):
	"""Dismiss a tender reminder."""
	_require_tender_write_access()
	doc = frappe.get_doc("GE Tender Reminder", name)
	doc.status = "Dismissed"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender reminder dismissed"}


@frappe.whitelist()
def get_tender_reminder_stats():
	"""Aggregate tender reminder stats."""
	_require_tender_read_access()
	rows = frappe.get_all("GE Tender Reminder", fields=["status"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"pending": sum(1 for row in rows if row.status == "Pending"),
			"sent": sum(1 for row in rows if row.status == "Sent"),
			"dismissed": sum(1 for row in rows if row.status == "Dismissed"),
		},
	}


@frappe.whitelist()
def get_competitors():
	"""Return competitor master rows."""
	_require_tender_read_access()
	data = frappe.get_all(
		"GE Competitor",
		fields=[
			"name", "organization", "company_name", "win_count",
			"loss_count", "win_rate", "typical_bid_range_min",
			"typical_bid_range_max", "creation", "modified",
		],
		order_by="company_name asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_competitor(name):
	"""Return one competitor master row."""
	_require_tender_read_access()
	doc = frappe.get_doc("GE Competitor", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_competitor(data):
	"""Create a competitor master row."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Competitor", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Competitor created"}


@frappe.whitelist()
def update_competitor(name, data):
	"""Update a competitor master row."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Competitor", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Competitor updated"}


@frappe.whitelist()
def delete_competitor(name):
	"""Delete a competitor master row."""
	_require_tender_write_access()
	frappe.delete_doc("GE Competitor", name)
	frappe.db.commit()
	return {"success": True, "message": "Competitor deleted"}


@frappe.whitelist()
def get_competitor_stats():
	"""Aggregate competitor stats."""
	_require_tender_read_access()
	rows = frappe.get_all("GE Competitor", fields=["win_count", "loss_count", "win_rate"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"total_wins": sum(row.win_count or 0 for row in rows),
			"total_losses": sum(row.loss_count or 0 for row in rows),
			"average_win_rate": (sum(row.win_rate or 0 for row in rows) / len(rows)) if rows else 0,
		},
	}


# ── Survey APIs ──────────────────────────────────────────────

@frappe.whitelist()
def get_surveys(tender=None, status=None):
	"""Return surveys, optionally filtered by tender and/or status."""
	_require_survey_read_access()
	filters = {}
	if tender:
		filters["linked_tender"] = tender
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Survey",
		filters=filters,
		fields=[
			"name", "linked_tender", "site_name", "status",
			"survey_date", "surveyed_by", "coordinates", "summary",
			"creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_survey(name):
	"""Return a single survey with all fields."""
	_require_survey_read_access()
	doc = frappe.get_doc("GE Survey", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_survey(data):
	"""Create a new survey."""
	_require_survey_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Survey", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Survey created"}


@frappe.whitelist()
def update_survey(name, data):
	"""Update an existing survey."""
	_require_survey_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Survey", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Survey updated"}


@frappe.whitelist()
def delete_survey(name):
	"""Delete a survey."""
	_require_survey_write_access()
	frappe.delete_doc("GE Survey", name)
	frappe.db.commit()
	return {"success": True, "message": "Survey deleted"}


@frappe.whitelist()
def get_survey_stats():
	"""Aggregate survey stats for the dashboard."""
	_require_survey_read_access()
	surveys = frappe.get_all("GE Survey", fields=["status"])
	total = len(surveys)
	completed = sum(1 for s in surveys if s.status == "Completed")
	in_progress = sum(1 for s in surveys if s.status == "In Progress")
	pending = sum(1 for s in surveys if s.status == "Pending")
	return {
		"success": True,
		"data": {
			"total": total,
			"completed": completed,
			"in_progress": in_progress,
			"pending": pending,
		},
	}


@frappe.whitelist()
def check_survey_complete(tender):
	"""Check if all surveys for a tender are completed (gate for BOQ)."""
	_require_boq_read_access()
	surveys = frappe.get_all(
		"GE Survey",
		filters={"linked_tender": tender},
		fields=["status"],
	)
	if not surveys:
		return {"success": True, "complete": False, "reason": "No surveys found for this tender"}
	incomplete = [s for s in surveys if s.status != "Completed"]
	return {
		"success": True,
		"complete": len(incomplete) == 0,
		"total": len(surveys),
		"completed": len(surveys) - len(incomplete),
		"pending": len(incomplete),
	}


# ── BOQ APIs ─────────────────────────────────────────────────

@frappe.whitelist()
def get_boqs(tender=None, status=None):
	"""Return BOQs, optionally filtered by tender and/or status."""
	_require_boq_read_access()
	filters = {}
	if tender:
		filters["linked_tender"] = tender
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE BOQ",
		filters=filters,
		fields=[
			"name", "linked_tender", "linked_project", "version",
			"status", "total_amount", "total_items",
			"created_by_user", "approved_by", "approved_at",
			"creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_boq(name):
	"""Return a single BOQ with all fields and line items."""
	_require_boq_read_access()
	doc = frappe.get_doc("GE BOQ", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_boq(data):
	"""Create a new BOQ."""
	_require_boq_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE BOQ", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "BOQ created"}


@frappe.whitelist()
def update_boq(name, data):
	"""Update an existing BOQ."""
	_require_boq_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE BOQ", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "BOQ updated"}


@frappe.whitelist()
def delete_boq(name):
	"""Delete a BOQ."""
	_require_boq_write_access()
	doc = frappe.get_doc("GE BOQ", name)
	if doc.status == "APPROVED":
		return {"success": False, "message": "Cannot delete an approved BOQ"}
	frappe.delete_doc("GE BOQ", name)
	frappe.db.commit()
	return {"success": True, "message": "BOQ deleted"}


@frappe.whitelist()
def submit_boq_for_approval(name):
	"""Move BOQ from DRAFT to PENDING_APPROVAL (enforces survey gate)."""
	_require_boq_write_access()
	doc = frappe.get_doc("GE BOQ", name)
	if doc.status != "DRAFT":
		return {"success": False, "message": f"BOQ is in {doc.status} status, must be DRAFT to submit"}
	doc.status = "PENDING_APPROVAL"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "BOQ submitted for approval"}


@frappe.whitelist()
def approve_boq(name):
	"""Approve a BOQ that is PENDING_APPROVAL."""
	_require_boq_approval_access()
	doc = frappe.get_doc("GE BOQ", name)
	if doc.status != "PENDING_APPROVAL":
		return {"success": False, "message": f"BOQ is in {doc.status} status, must be PENDING_APPROVAL to approve"}
	doc.status = "APPROVED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "BOQ approved"}


@frappe.whitelist()
def reject_boq(name, reason=None):
	"""Reject a BOQ that is PENDING_APPROVAL."""
	_require_boq_approval_access()
	doc = frappe.get_doc("GE BOQ", name)
	if doc.status != "PENDING_APPROVAL":
		return {"success": False, "message": f"BOQ is in {doc.status} status, must be PENDING_APPROVAL to reject"}
	doc.status = "REJECTED"
	doc.rejected_by = frappe.session.user
	if reason:
		doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "BOQ rejected"}


@frappe.whitelist()
def revise_boq(name):
	"""Create a new revision of a BOQ by copying it with incremented version."""
	_require_boq_write_access()
	original = frappe.get_doc("GE BOQ", name)
	new_doc = frappe.copy_doc(original)
	new_doc.version = (original.version or 1) + 1
	new_doc.status = "DRAFT"
	new_doc.approved_by = None
	new_doc.approved_at = None
	new_doc.rejected_by = None
	new_doc.rejection_reason = None
	new_doc.insert()
	frappe.db.commit()
	return {
		"success": True,
		"data": new_doc.as_dict(),
		"message": f"BOQ revision v{new_doc.version} created from {original.name}",
	}


@frappe.whitelist()
def get_boq_stats():
	"""Aggregate BOQ stats for the dashboard."""
	_require_boq_read_access()
	boqs = frappe.get_all("GE BOQ", fields=["status", "total_amount"])
	total = len(boqs)
	draft = sum(1 for b in boqs if b.status == "DRAFT")
	pending = sum(1 for b in boqs if b.status == "PENDING_APPROVAL")
	approved = sum(1 for b in boqs if b.status == "APPROVED")
	rejected = sum(1 for b in boqs if b.status == "REJECTED")
	total_value = sum(b.total_amount or 0 for b in boqs)
	return {
		"success": True,
		"data": {
			"total": total,
			"draft": draft,
			"pending_approval": pending,
			"approved": approved,
			"rejected": rejected,
			"total_value": total_value,
		},
	}


# ── Cost Sheet APIs ──────────────────────────────────────────

@frappe.whitelist()
def get_cost_sheets(tender=None, status=None):
	"""Return cost sheets, optionally filtered by tender and/or status."""
	_require_cost_sheet_read_access()
	filters = {}
	if tender:
		filters["linked_tender"] = tender
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Cost Sheet",
		filters=filters,
		fields=[
			"name", "linked_tender", "linked_project", "linked_boq", "version",
			"status", "margin_percent", "base_cost", "sell_value", "total_items",
			"created_by_user", "approved_by", "approved_at", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_cost_sheet(name):
	"""Return a single cost sheet with all fields and line items."""
	_require_cost_sheet_read_access()
	doc = frappe.get_doc("GE Cost Sheet", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_cost_sheet(data):
	"""Create a new cost sheet."""
	_require_cost_sheet_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Cost Sheet", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Cost Sheet created"}


@frappe.whitelist()
def update_cost_sheet(name, data):
	"""Update an existing cost sheet."""
	_require_cost_sheet_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Cost Sheet", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Cost Sheet updated"}


@frappe.whitelist()
def delete_cost_sheet(name):
	"""Delete a cost sheet unless it is approved."""
	_require_cost_sheet_write_access()
	doc = frappe.get_doc("GE Cost Sheet", name)
	if doc.status == "APPROVED":
		return {"success": False, "message": "Cannot delete an approved Cost Sheet"}
	frappe.delete_doc("GE Cost Sheet", name)
	frappe.db.commit()
	return {"success": True, "message": "Cost Sheet deleted"}


@frappe.whitelist()
def submit_cost_sheet_for_approval(name):
	"""Move Cost Sheet from DRAFT to PENDING_APPROVAL."""
	_require_cost_sheet_write_access()
	doc = frappe.get_doc("GE Cost Sheet", name)
	if doc.status != "DRAFT":
		return {"success": False, "message": f"Cost Sheet is in {doc.status} status, must be DRAFT to submit"}
	doc.status = "PENDING_APPROVAL"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Cost Sheet submitted for approval"}


@frappe.whitelist()
def approve_cost_sheet(name):
	"""Approve a cost sheet that is pending approval."""
	_require_cost_sheet_approval_access()
	doc = frappe.get_doc("GE Cost Sheet", name)
	if doc.status != "PENDING_APPROVAL":
		return {"success": False, "message": f"Cost Sheet is in {doc.status} status, must be PENDING_APPROVAL to approve"}
	doc.status = "APPROVED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Cost Sheet approved"}


@frappe.whitelist()
def reject_cost_sheet(name, reason=None):
	"""Reject a cost sheet that is pending approval."""
	_require_cost_sheet_approval_access()
	doc = frappe.get_doc("GE Cost Sheet", name)
	if doc.status != "PENDING_APPROVAL":
		return {"success": False, "message": f"Cost Sheet is in {doc.status} status, must be PENDING_APPROVAL to reject"}
	doc.status = "REJECTED"
	doc.rejected_by = frappe.session.user
	if reason:
		doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Cost Sheet rejected"}


@frappe.whitelist()
def revise_cost_sheet(name):
	"""Create a new revision of a cost sheet by copying it with incremented version."""
	_require_cost_sheet_write_access()
	original = frappe.get_doc("GE Cost Sheet", name)
	new_doc = frappe.copy_doc(original)
	new_doc.version = (original.version or 1) + 1
	new_doc.status = "DRAFT"
	new_doc.approved_by = None
	new_doc.approved_at = None
	new_doc.rejected_by = None
	new_doc.rejection_reason = None
	new_doc.insert()
	frappe.db.commit()
	return {
		"success": True,
		"data": new_doc.as_dict(),
		"message": f"Cost Sheet revision v{new_doc.version} created from {original.name}",
	}


@frappe.whitelist()
def get_cost_sheet_stats():
	"""Aggregate cost sheet stats for the dashboard."""
	_require_cost_sheet_read_access()
	cost_sheets = frappe.get_all("GE Cost Sheet", fields=["status", "base_cost", "sell_value"])
	total = len(cost_sheets)
	draft = sum(1 for row in cost_sheets if row.status == "DRAFT")
	pending = sum(1 for row in cost_sheets if row.status == "PENDING_APPROVAL")
	approved = sum(1 for row in cost_sheets if row.status == "APPROVED")
	rejected = sum(1 for row in cost_sheets if row.status == "REJECTED")
	total_base_cost = sum(row.base_cost or 0 for row in cost_sheets)
	total_sell_value = sum(row.sell_value or 0 for row in cost_sheets)
	return {
		"success": True,
		"data": {
			"total": total,
			"draft": draft,
			"pending_approval": pending,
			"approved": approved,
			"rejected": rejected,
			"total_base_cost": total_base_cost,
			"total_sell_value": total_sell_value,
		},
	}


@frappe.whitelist()
def create_cost_sheet_from_boq(boq_name):
	"""Create a DRAFT Cost Sheet pre-populated from an approved GE BOQ."""
	from gov_erp.gov_erp.doctype.ge_cost_sheet.ge_cost_sheet import map_boq_items_to_cost_sheet_items

	_require_cost_sheet_write_access()

	boq = frappe.get_doc("GE BOQ", boq_name)
	if boq.status != "APPROVED":
		return {"success": False, "message": f"BOQ {boq_name} is not approved (status: {boq.status})"}

	if frappe.db.exists("GE Cost Sheet", {"linked_boq": boq_name}):
		existing = frappe.db.get_value("GE Cost Sheet", {"linked_boq": boq_name}, "name")
		return {"success": False, "message": f"A Cost Sheet already exists for this BOQ: {existing}"}

	mapped_items = map_boq_items_to_cost_sheet_items(boq.items)

	doc = frappe.get_doc({
		"doctype": "GE Cost Sheet",
		"linked_tender": boq.linked_tender,
		"linked_project": boq.linked_project,
		"linked_boq": boq.name,
		"version": 1,
		"status": "DRAFT",
		"margin_percent": 0,
		"items": mapped_items,
	})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": f"Cost Sheet created from BOQ {boq_name}"}


# ── Procurement APIs ────────────────────────────────────────

@frappe.whitelist()
def get_vendor_comparisons(material_request=None, status=None):
	"""Return vendor comparison sheets."""
	_require_procurement_read_access()
	filters = {}
	if material_request:
		filters["linked_material_request"] = material_request
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Vendor Comparison",
		filters=filters,
		fields=[
			"name", "linked_material_request", "linked_rfq", "linked_project",
			"linked_tender", "status", "recommended_supplier", "quote_count",
			"distinct_supplier_count", "lowest_total_amount", "selected_total_amount",
			"approved_by", "approved_at", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_vendor_comparison(name):
	"""Return a single vendor comparison with quote rows."""
	_require_procurement_read_access()
	doc = frappe.get_doc("GE Vendor Comparison", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_vendor_comparison(data):
	"""Create a vendor comparison sheet."""
	_require_procurement_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Vendor Comparison", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Vendor comparison created"}


@frappe.whitelist()
def update_vendor_comparison(name, data):
	"""Update a vendor comparison sheet."""
	_require_procurement_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Vendor Comparison", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Vendor comparison updated"}


@frappe.whitelist()
def delete_vendor_comparison(name):
	"""Delete a vendor comparison unless approved."""
	_require_procurement_write_access()
	doc = frappe.get_doc("GE Vendor Comparison", name)
	if doc.status == "APPROVED":
		return {"success": False, "message": "Cannot delete an approved vendor comparison"}
	frappe.delete_doc("GE Vendor Comparison", name)
	frappe.db.commit()
	return {"success": True, "message": "Vendor comparison deleted"}


@frappe.whitelist()
def submit_vendor_comparison_for_approval(name):
	"""Move vendor comparison from draft to pending approval."""
	_require_procurement_write_access()
	doc = frappe.get_doc("GE Vendor Comparison", name)
	if doc.status != "DRAFT":
		return {
			"success": False,
			"message": f"Vendor comparison is in {doc.status} status, must be DRAFT to submit",
		}
	doc.status = "PENDING_APPROVAL"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Vendor comparison submitted for approval"}


@frappe.whitelist()
def approve_vendor_comparison(name, exception_reason=None):
	"""Approve a vendor comparison sheet."""
	_require_procurement_approval_access()
	doc = frappe.get_doc("GE Vendor Comparison", name)
	if doc.status != "PENDING_APPROVAL":
		return {
			"success": False,
			"message": f"Vendor comparison is in {doc.status} status, must be PENDING_APPROVAL to approve",
		}
	if exception_reason:
		doc.exception_reason = exception_reason
		doc.exception_approved_by = frappe.session.user
	doc.status = "APPROVED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Vendor comparison approved"}


@frappe.whitelist()
def reject_vendor_comparison(name, reason=None):
	"""Reject a vendor comparison sheet."""
	_require_procurement_approval_access()
	doc = frappe.get_doc("GE Vendor Comparison", name)
	if doc.status != "PENDING_APPROVAL":
		return {
			"success": False,
			"message": f"Vendor comparison is in {doc.status} status, must be PENDING_APPROVAL to reject",
		}
	doc.status = "REJECTED"
	if reason:
		doc.exception_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Vendor comparison rejected"}


@frappe.whitelist()
def revise_vendor_comparison(name):
	"""Create a draft revision of an existing vendor comparison."""
	_require_procurement_write_access()
	original = frappe.get_doc("GE Vendor Comparison", name)
	new_doc = frappe.copy_doc(original)
	new_doc.status = "DRAFT"
	new_doc.approved_by = None
	new_doc.approved_at = None
	new_doc.exception_approved_by = None
	new_doc.exception_reason = None
	new_doc.insert()
	frappe.db.commit()
	return {
		"success": True,
		"data": new_doc.as_dict(),
		"message": f"Vendor comparison revision created from {original.name}",
	}


@frappe.whitelist()
def get_vendor_comparison_stats():
	"""Aggregate procurement comparison stats."""
	_require_procurement_read_access()
	rows = frappe.get_all(
		"GE Vendor Comparison",
		fields=["status", "distinct_supplier_count", "selected_total_amount"],
	)
	total = len(rows)
	draft = sum(1 for row in rows if row.status == "DRAFT")
	pending = sum(1 for row in rows if row.status == "PENDING_APPROVAL")
	approved = sum(1 for row in rows if row.status == "APPROVED")
	rejected = sum(1 for row in rows if row.status == "REJECTED")
	three_quote_ready = sum(1 for row in rows if (row.distinct_supplier_count or 0) >= 3)
	selected_total = sum(row.selected_total_amount or 0 for row in rows)
	return {
		"success": True,
		"data": {
			"total": total,
			"draft": draft,
			"pending_approval": pending,
			"approved": approved,
			"rejected": rejected,
			"three_quote_ready": three_quote_ready,
			"selected_total_amount": selected_total,
		},
	}


# ── Stores APIs ─────────────────────────────────────────────

@frappe.whitelist()
def get_dispatch_challans(status=None, warehouse=None):
	"""Return dispatch challans for store/logistics workflow."""
	_require_store_read_access()
	filters = {}
	if status:
		filters["status"] = status
	if warehouse:
		filters["from_warehouse"] = warehouse
	data = frappe.get_all(
		"GE Dispatch Challan",
		filters=filters,
		fields=[
			"name", "dispatch_date", "dispatch_type", "status", "from_warehouse",
			"to_warehouse", "target_site_name", "linked_project", "total_items",
			"total_qty", "linked_stock_entry", "approved_by", "approved_at", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_dispatch_challan(name):
	"""Return a single dispatch challan with line items."""
	_require_store_read_access()
	doc = frappe.get_doc("GE Dispatch Challan", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_dispatch_challan(data):
	"""Create a dispatch challan draft."""
	_require_store_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Dispatch Challan", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dispatch challan created"}


@frappe.whitelist()
def update_dispatch_challan(name, data):
	"""Update a dispatch challan."""
	_require_store_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Dispatch Challan", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dispatch challan updated"}


@frappe.whitelist()
def delete_dispatch_challan(name):
	"""Delete a dispatch challan unless it has been dispatched."""
	_require_store_write_access()
	doc = frappe.get_doc("GE Dispatch Challan", name)
	if doc.status == "DISPATCHED":
		return {"success": False, "message": "Cannot delete a dispatched challan"}
	frappe.delete_doc("GE Dispatch Challan", name)
	frappe.db.commit()
	return {"success": True, "message": "Dispatch challan deleted"}


@frappe.whitelist()
def submit_dispatch_challan_for_approval(name):
	"""Move dispatch challan to pending approval."""
	_require_store_write_access()
	doc = frappe.get_doc("GE Dispatch Challan", name)
	if doc.status != "DRAFT":
		return {
			"success": False,
			"message": f"Dispatch challan is in {doc.status} status, must be DRAFT to submit",
		}
	doc.status = "PENDING_APPROVAL"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dispatch challan submitted for approval"}


@frappe.whitelist()
def approve_dispatch_challan(name):
	"""Approve a dispatch challan."""
	_require_store_approval_access()
	doc = frappe.get_doc("GE Dispatch Challan", name)
	if doc.status != "PENDING_APPROVAL":
		return {
			"success": False,
			"message": f"Dispatch challan is in {doc.status} status, must be PENDING_APPROVAL to approve",
		}
	doc.status = "APPROVED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dispatch challan approved"}


@frappe.whitelist()
def reject_dispatch_challan(name):
	"""Reject a dispatch challan."""
	_require_store_approval_access()
	doc = frappe.get_doc("GE Dispatch Challan", name)
	if doc.status != "PENDING_APPROVAL":
		return {
			"success": False,
			"message": f"Dispatch challan is in {doc.status} status, must be PENDING_APPROVAL to reject",
		}
	doc.status = "REJECTED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dispatch challan rejected"}


@frappe.whitelist()
def mark_dispatch_challan_dispatched(name):
	"""Mark an approved dispatch challan as dispatched after stock validation."""
	_require_store_write_access()
	doc = frappe.get_doc("GE Dispatch Challan", name)
	if doc.status != "APPROVED":
		return {
			"success": False,
			"message": f"Dispatch challan is in {doc.status} status, must be APPROVED to dispatch",
		}
	doc.status = "DISPATCHED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dispatch challan marked as dispatched"}


@frappe.whitelist()
def get_dispatch_challan_stats():
	"""Aggregate dispatch challan stats for the stores dashboard."""
	_require_store_read_access()
	rows = frappe.get_all("GE Dispatch Challan", fields=["status", "total_qty"])
	total = len(rows)
	draft = sum(1 for row in rows if row.status == "DRAFT")
	pending = sum(1 for row in rows if row.status == "PENDING_APPROVAL")
	approved = sum(1 for row in rows if row.status == "APPROVED")
	dispatched = sum(1 for row in rows if row.status == "DISPATCHED")
	cancelled = sum(1 for row in rows if row.status == "CANCELLED")
	total_qty = sum(row.total_qty or 0 for row in rows)
	return {
		"success": True,
		"data": {
			"total": total,
			"draft": draft,
			"pending_approval": pending,
			"approved": approved,
			"dispatched": dispatched,
			"cancelled": cancelled,
			"total_qty": total_qty,
		},
	}


@frappe.whitelist()
def get_store_stock_snapshot(warehouse=None, item_code=None, limit_page_length=50):
	"""Return ERPNext stock snapshot from Bin for stores dashboard / dispatch validation."""
	_require_store_read_access()
	filters = {}
	if warehouse:
		filters["warehouse"] = warehouse
	if item_code:
		filters["item_code"] = item_code
	data = frappe.get_all(
		"Bin",
		filters=filters,
		fields=["warehouse", "item_code", "actual_qty", "reserved_qty", "ordered_qty", "projected_qty"],
		order_by="modified desc",
		page_length=int(limit_page_length),
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_indents(project=None, status=None, limit_page_length=50, limit_start=0):
	"""Return purchase indents backed by ERPNext Material Request."""
	_require_procurement_read_access()
	filters = {"material_request_type": "Purchase"}
	if status:
		filters["status"] = status
	if project:
		indent_names = _get_indent_names_for_project(project)
		if not indent_names:
			return {"success": True, "data": [], "total": 0}
		filters["name"] = ["in", indent_names]

	data = frappe.get_all(
		"Material Request",
		filters=filters,
		fields=[
			"name",
			"material_request_type",
			"transaction_date",
			"schedule_date",
			"status",
			"company",
			"set_warehouse",
			"docstatus",
			"per_ordered",
			"creation",
			"modified",
		],
		order_by="transaction_date desc, creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
	)
	total = frappe.db.count("Material Request", filters=filters)
	return {"success": True, "data": _attach_indent_project_summary(data), "total": total}


@frappe.whitelist()
def get_indent(name):
	"""Return one indent backed by Material Request."""
	_require_procurement_read_access()
	doc = frappe.get_doc("Material Request", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_indent(data):
	"""Create an indent backed by Material Request."""
	_require_procurement_write_access()
	values = _parse_payload(data)
	project = values.pop("project", None)
	company = values.get("company") or _get_default_company()
	default_warehouse = values.get("set_warehouse") or _get_default_warehouse(company)
	prepared_items = []
	for item in values.get("items") or []:
		row = dict(item)
		if project and not row.get("project"):
			row["project"] = project
		if not row.get("schedule_date"):
			row["schedule_date"] = values.get("schedule_date") or frappe.utils.add_days(frappe.utils.nowdate(), 7)
		if default_warehouse and not row.get("warehouse"):
			row["warehouse"] = default_warehouse
		prepared_items.append(row)

	doc_values = {"doctype": "Material Request", **values}
	doc_values["material_request_type"] = values.get("material_request_type") or "Purchase"
	if company:
		doc_values["company"] = company
	if default_warehouse and not doc_values.get("set_warehouse"):
		doc_values["set_warehouse"] = default_warehouse
	doc_values["items"] = prepared_items

	doc = frappe.get_doc(doc_values)
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Indent created"}


@frappe.whitelist()
def get_indent_stats(project=None):
	"""Aggregate indent counts for procurement dashboards."""
	_require_procurement_read_access()
	filters = {"material_request_type": "Purchase"}
	if project:
		indent_names = _get_indent_names_for_project(project)
		if not indent_names:
			return {
				"success": True,
				"data": {
					"total": 0,
					"draft": 0,
					"submitted": 0,
					"pending_purchase": 0,
					"ordered": 0,
					"stopped": 0,
					"cancelled": 0,
				},
			}
		filters["name"] = ["in", indent_names]

	rows = frappe.get_all("Material Request", filters=filters, fields=["status", "docstatus"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"draft": sum(1 for row in rows if row.docstatus == 0),
			"submitted": sum(1 for row in rows if row.docstatus == 1),
			"pending_purchase": sum(
				1
				for row in rows
				if (row.status or "").lower() in {"pending", "pending purchase", "partially ordered", "partially received"}
			),
			"ordered": sum(1 for row in rows if (row.status or "").lower() in {"ordered", "received"}),
			"stopped": sum(1 for row in rows if row.status == "Stopped"),
			"cancelled": sum(1 for row in rows if row.docstatus == 2 or row.status == "Cancelled"),
		},
	}


@frappe.whitelist()
def get_purchase_orders(project=None, status=None, supplier=None, limit_page_length=50, limit_start=0):
	"""Return ERPNext purchase orders for procurement dashboards."""
	_require_procurement_read_access()
	filters = {}
	if project:
		filters["project"] = project
	if status:
		filters["status"] = status
	if supplier:
		filters["supplier"] = supplier

	data = frappe.get_all(
		"Purchase Order",
		filters=filters,
		fields=[
			"name",
			"supplier",
			"transaction_date",
			"status",
			"company",
			"project",
			"set_warehouse",
			"grand_total",
			"rounded_total",
			"per_received",
			"per_billed",
			"docstatus",
			"creation",
			"modified",
		],
		order_by="transaction_date desc, creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
	)
	total = frappe.db.count("Purchase Order", filters=filters)
	return {"success": True, "data": data, "total": total}


@frappe.whitelist()
def get_purchase_order(name):
	"""Return one ERPNext purchase order."""
	_require_procurement_read_access()
	doc = frappe.get_doc("Purchase Order", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def get_po_stats(project=None):
	"""Aggregate purchase order counts and value for procurement dashboards."""
	_require_procurement_read_access()
	filters = {}
	if project:
		filters["project"] = project
	rows = frappe.get_all("Purchase Order", filters=filters, fields=["status", "docstatus", "grand_total"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"draft": sum(1 for row in rows if row.docstatus == 0),
			"submitted": sum(1 for row in rows if row.docstatus == 1),
			"to_receive": sum(1 for row in rows if (row.status or "") in {"To Receive and Bill", "To Receive", "To Bill"}),
			"completed": sum(1 for row in rows if (row.status or "") in {"Completed", "Closed"}),
			"cancelled": sum(1 for row in rows if row.docstatus == 2 or row.status == "Cancelled"),
			"total_value": sum(row.grand_total or 0 for row in rows),
		},
	}


@frappe.whitelist()
def get_grns(project=None, status=None, supplier=None, purchase_order=None, limit_page_length=50, limit_start=0):
	"""Return ERPNext purchase receipts (GRNs) for stores dashboards."""
	_require_store_read_access()
	filters = {}
	if project:
		filters["project"] = project
	if status:
		filters["status"] = status
	if supplier:
		filters["supplier"] = supplier
	if purchase_order:
		filters["purchase_order"] = purchase_order

	data = frappe.get_all(
		"Purchase Receipt",
		filters=filters,
		fields=[
			"name",
			"supplier",
			"posting_date",
			"status",
			"company",
			"project",
			"purchase_order",
			"set_warehouse",
			"grand_total",
			"rounded_total",
			"docstatus",
			"creation",
			"modified",
		],
		order_by="posting_date desc, creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
	)
	total = frappe.db.count("Purchase Receipt", filters=filters)
	return {"success": True, "data": data, "total": total}


@frappe.whitelist()
def get_grn(name):
	"""Return one ERPNext purchase receipt."""
	_require_store_read_access()
	doc = frappe.get_doc("Purchase Receipt", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_grn(data):
	"""Create a GRN backed by Purchase Receipt, optionally deriving lines from a PO."""
	_require_store_write_access()
	values = _parse_payload(data)
	if values.get("purchase_order") and not values.get("items"):
		po = frappe.get_doc("Purchase Order", values["purchase_order"])
		company = values.get("company") or po.company or _get_default_company()
		default_warehouse = values.get("set_warehouse") or po.set_warehouse or _get_default_warehouse(company)
		items = []
		for item in po.items:
			pending_qty = (item.qty or 0) - (item.received_qty or 0)
			if pending_qty <= 0:
				continue
			items.append(
				{
					"item_code": item.item_code,
					"qty": pending_qty,
					"rate": item.rate,
					"description": item.description,
					"warehouse": values.get("set_warehouse") or item.warehouse or default_warehouse,
					"purchase_order": po.name,
					"purchase_order_item": item.name,
					"uom": item.uom,
					"stock_uom": item.stock_uom,
					"project": values.get("project") or po.project,
				}
			)
		if not items:
			return {"success": False, "message": f"Purchase Order {po.name} has no pending quantities to receive"}
		values = {
			**values,
			"supplier": values.get("supplier") or po.supplier,
			"company": company,
			"project": values.get("project") or po.project,
			"set_warehouse": values.get("set_warehouse") or default_warehouse,
			"items": items,
		}
	else:
		company = values.get("company") or _get_default_company()
		if company and not values.get("company"):
			values["company"] = company

	default_warehouse = values.get("set_warehouse") or _get_default_warehouse(values.get("company"))
	prepared_items = []
	for item in values.get("items") or []:
		row = dict(item)
		if values.get("project") and not row.get("project"):
			row["project"] = values["project"]
		if default_warehouse and not row.get("warehouse"):
			row["warehouse"] = default_warehouse
		prepared_items.append(row)
	values["items"] = prepared_items
	if default_warehouse and not values.get("set_warehouse"):
		values["set_warehouse"] = default_warehouse

	doc = frappe.get_doc({"doctype": "Purchase Receipt", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "GRN created"}


@frappe.whitelist()
def get_grn_stats(project=None):
	"""Aggregate GRN counts and value for stores dashboards."""
	_require_store_read_access()
	filters = {}
	if project:
		filters["project"] = project
	rows = frappe.get_all("Purchase Receipt", filters=filters, fields=["status", "docstatus", "grand_total"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"draft": sum(1 for row in rows if row.docstatus == 0),
			"submitted": sum(1 for row in rows if row.docstatus == 1),
			"completed": sum(1 for row in rows if (row.status or "") in {"Completed", "Closed"}),
			"return_count": sum(1 for row in rows if (row.status or "") == "Return Issued"),
			"cancelled": sum(1 for row in rows if row.docstatus == 2 or row.status == "Cancelled"),
			"total_value": sum(row.grand_total or 0 for row in rows),
		},
	}


@frappe.whitelist()
def get_stock_position(warehouse=None, item_code=None, limit_page_length=50):
	"""Return current stock position with item metadata and computed stock value."""
	_require_store_read_access()
	filters = {}
	if warehouse:
		filters["warehouse"] = warehouse
	if item_code:
		filters["item_code"] = item_code

	rows = frappe.get_all(
		"Bin",
		filters=filters,
		fields=["warehouse", "item_code", "actual_qty", "reserved_qty", "ordered_qty", "projected_qty", "valuation_rate"],
		order_by="modified desc",
		page_length=int(limit_page_length),
	)
	item_codes = sorted({row.item_code for row in rows if row.item_code})
	item_meta = {}
	if item_codes:
		item_meta = {
			row.name: row
			for row in frappe.get_all(
				"Item",
				filters={"name": ["in", item_codes]},
				fields=["name", "item_name", "stock_uom"],
				page_length=len(item_codes),
			)
		}

	data = []
	for row in rows:
		meta = item_meta.get(row.item_code)
		actual_qty = row.actual_qty or 0
		valuation_rate = row.valuation_rate or 0
		data.append(
			{
				**row,
				"item_name": meta.item_name if meta else row.item_code,
				"stock_uom": meta.stock_uom if meta else None,
				"stock_value": actual_qty * valuation_rate,
			}
		)

	return {"success": True, "data": data, "total": frappe.db.count("Bin", filters=filters)}


@frappe.whitelist()
def get_stock_aging(warehouse=None, item_code=None, limit_page_length=50):
	"""Return stock aging buckets using Bin and latest positive Stock Ledger Entry."""
	_require_store_read_access()
	filters = {}
	if warehouse:
		filters["warehouse"] = warehouse
	if item_code:
		filters["item_code"] = item_code

	rows = frappe.get_all(
		"Bin",
		filters=filters,
		fields=["warehouse", "item_code", "actual_qty"],
		order_by="modified desc",
		page_length=int(limit_page_length),
	)
	buckets = {
		"age_0_30": 0,
		"age_31_60": 0,
		"age_61_90": 0,
		"age_90_plus": 0,
		"unknown": 0,
	}
	data = []
	for row in rows:
		entry = frappe.get_all(
			"Stock Ledger Entry",
			filters={"warehouse": row.warehouse, "item_code": row.item_code, "actual_qty": [">", 0]},
			fields=["posting_date", "posting_time"],
			order_by="posting_date desc, posting_time desc, creation desc",
			page_length=1,
		)
		receipt_date = entry[0].posting_date if entry else None
		age_days = frappe.utils.date_diff(frappe.utils.nowdate(), receipt_date) if receipt_date else None
		bucket = _get_stock_age_bucket(age_days)
		buckets[bucket] += 1
		data.append(
			{
				"warehouse": row.warehouse,
				"item_code": row.item_code,
				"actual_qty": row.actual_qty,
				"last_receipt_date": receipt_date,
				"age_days": age_days,
				"age_bucket": bucket,
			}
		)

	return {
		"success": True,
		"data": {
			"items": data,
			"buckets": buckets,
			"total": frappe.db.count("Bin", filters=filters),
		},
	}


def _get_reference_status_for_rule(rule):
	try:
		doc = frappe.get_doc(rule.prerequisite_reference_doctype, rule.prerequisite_reference_name)
	except frappe.DoesNotExistError:
		return ""

	return resolve_reference_status(
		getattr(doc, "status", None),
		getattr(doc, "workflow_state", None),
		getattr(doc, "docstatus", None),
	)


# ── Execution APIs ──────────────────────────────────────────

@frappe.whitelist()
def get_sites(project=None, status=None):
	"""Return execution sites."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Site",
		filters=filters,
		fields=["name", "site_code", "site_name", "status", "linked_project", "linked_tender", "latitude", "longitude"],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_site(name):
	"""Return a single site."""
	_require_execution_read_access()
	doc = frappe.get_doc("GE Site", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_site(data):
	"""Create a site."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Site", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Site created"}


@frappe.whitelist()
def update_site(name, data):
	"""Update a site."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Site", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Site updated"}


@frappe.whitelist()
def delete_site(name):
	"""Delete a site."""
	_require_execution_write_access()
	frappe.delete_doc("GE Site", name)
	frappe.db.commit()
	return {"success": True, "message": "Site deleted"}


@frappe.whitelist()
def get_milestones(project=None, site=None, status=None):
	"""Return milestones."""
	_require_milestone_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Milestone",
		filters=filters,
		fields=["name", "milestone_name", "status", "linked_project", "linked_site", "planned_date", "actual_date", "owner_user"],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_milestone(name):
	"""Return a single milestone."""
	_require_milestone_read_access()
	doc = frappe.get_doc("GE Milestone", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_milestone(data):
	"""Create a milestone."""
	_require_milestone_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Milestone", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Milestone created"}


@frappe.whitelist()
def update_milestone(name, data):
	"""Update a milestone."""
	_require_milestone_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Milestone", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Milestone updated"}


@frappe.whitelist()
def delete_milestone(name):
	"""Delete a milestone."""
	_require_milestone_write_access()
	frappe.delete_doc("GE Milestone", name)
	frappe.db.commit()
	return {"success": True, "message": "Milestone deleted"}


@frappe.whitelist()
def get_dependency_rules(task=None, active=None):
	"""Return dependency rules for execution tasks."""
	_require_execution_read_access()
	filters = {}
	if task:
		filters["linked_task"] = task
	if active is not None:
		filters["active"] = int(active)
	data = frappe.get_all(
		"GE Dependency Rule",
		filters=filters,
		fields=[
			"name", "linked_task", "prerequisite_type", "linked_project", "linked_site",
			"prerequisite_reference_doctype", "prerequisite_reference_name",
			"required_status", "hard_block", "active", "block_message",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_dependency_rule(data):
	"""Create a dependency rule."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Dependency Rule", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dependency rule created"}


@frappe.whitelist()
def update_dependency_rule(name, data):
	"""Update a dependency rule."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Dependency Rule", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dependency rule updated"}


@frappe.whitelist()
def delete_dependency_rule(name):
	"""Delete a dependency rule."""
	_require_execution_write_access()
	frappe.delete_doc("GE Dependency Rule", name)
	frappe.db.commit()
	return {"success": True, "message": "Dependency rule deleted"}


@frappe.whitelist()
def get_dependency_overrides(task=None, status=None):
	"""Return dependency override requests."""
	_require_execution_read_access()
	filters = {}
	if task:
		filters["linked_task"] = task
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Dependency Override",
		filters=filters,
		fields=["name", "linked_task", "dependency_rule", "status", "requested_by", "approved_by", "actioned_at", "reason"],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_dependency_override(data):
	"""Create a dependency override request."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Dependency Override", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dependency override requested"}


@frappe.whitelist()
def approve_dependency_override(name, reason=None):
	"""Approve a dependency override."""
	_require_dependency_override_approval_access()
	doc = frappe.get_doc("GE Dependency Override", name)
	doc.status = "APPROVED"
	doc.approved_by = frappe.session.user
	if reason:
		doc.reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dependency override approved"}


@frappe.whitelist()
def reject_dependency_override(name, reason):
	"""Reject a dependency override."""
	_require_dependency_override_approval_access()
	doc = frappe.get_doc("GE Dependency Override", name)
	doc.status = "REJECTED"
	doc.reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dependency override rejected"}


@frappe.whitelist()
def evaluate_task_dependencies(task_name):
	"""Evaluate whether a task is blocked by active dependency rules."""
	_require_execution_read_access()
	rules = frappe.get_all(
		"GE Dependency Rule",
		filters={"linked_task": task_name, "active": 1},
		fields=[
			"name", "linked_task", "prerequisite_type", "prerequisite_reference_doctype",
			"prerequisite_reference_name", "required_status", "hard_block", "active", "block_message",
		],
		order_by="creation asc",
	)
	approved_override_rules = {
		row.dependency_rule
		for row in frappe.get_all(
			"GE Dependency Override",
			filters={"linked_task": task_name, "status": "APPROVED"},
			fields=["dependency_rule"],
		)
	}

	blockers = []
	for rule in rules:
		current_status = _get_reference_status_for_rule(rule)
		outcome = evaluate_dependency_state(
			current_status,
			rule.required_status,
			"APPROVED" if rule.name in approved_override_rules else None,
			active=rule.active,
			hard_block=rule.hard_block,
		)
		if not outcome["blocked"]:
			continue
		blockers.append(
			{
				"rule": rule.name,
				"prerequisite_type": rule.prerequisite_type,
				"reference_doctype": rule.prerequisite_reference_doctype,
				"reference_name": rule.prerequisite_reference_name,
				"required_status": rule.required_status,
				"current_status": current_status,
				"hard_block": bool(rule.hard_block),
				"message": rule.block_message or outcome["reason"],
			}
		)

	return {
		"success": True,
		"data": {
			"task": task_name,
			"can_start": not any(blocker["hard_block"] for blocker in blockers),
			"blockers": blockers,
		},
	}


# ── HR / Onboarding APIs ─────────────────────────────────────

@frappe.whitelist()
def get_onboardings(status=None, company=None):
	"""Return onboarding records, optionally filtered."""
	_require_hr_read_access()
	filters = {}
	if status:
		filters["onboarding_status"] = status
	if company:
		filters["company"] = company
	data = frappe.get_all(
		"GE Employee Onboarding",
		filters=filters,
		fields=[
			"name", "employee_name", "company", "designation", "onboarding_status",
			"date_of_joining", "employee_reference", "submitted_by",
			"approved_by", "approved_at", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_onboarding(name):
	"""Return a single onboarding record with all fields and child tables."""
	_require_hr_read_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_onboarding(data):
	"""Create a new onboarding record."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Employee Onboarding", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Onboarding record created"}


@frappe.whitelist()
def update_onboarding(name, data):
	"""Update an existing onboarding record."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Employee Onboarding", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Onboarding record updated"}


@frappe.whitelist()
def delete_onboarding(name):
	"""Delete an onboarding record unless it is mapped to an employee."""
	_require_hr_write_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status == "MAPPED_TO_EMPLOYEE":
		return {"success": False, "message": "Cannot delete an onboarding record already mapped to an Employee"}
	frappe.delete_doc("GE Employee Onboarding", name)
	frappe.db.commit()
	return {"success": True, "message": "Onboarding record deleted"}


@frappe.whitelist()
def submit_onboarding(name):
	"""Move onboarding from DRAFT to SUBMITTED."""
	_require_hr_write_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status != "DRAFT":
		return {"success": False, "message": f"Onboarding is in {doc.onboarding_status} status, must be DRAFT to submit"}
	doc.onboarding_status = "SUBMITTED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Onboarding submitted"}


@frappe.whitelist()
def review_onboarding(name):
	"""Move onboarding from SUBMITTED to UNDER_REVIEW."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status != "SUBMITTED":
		return {"success": False, "message": f"Onboarding is in {doc.onboarding_status} status, must be SUBMITTED to review"}
	doc.onboarding_status = "UNDER_REVIEW"
	doc.reviewed_by = frappe.session.user
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Onboarding is now under review"}


@frappe.whitelist()
def approve_onboarding(name):
	"""Approve an onboarding that is under review."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status != "UNDER_REVIEW":
		return {"success": False, "message": f"Onboarding is in {doc.onboarding_status} status, must be UNDER_REVIEW to approve"}

	# Check mandatory documents before approval
	from gov_erp.gov_erp.doctype.ge_employee_onboarding.ge_employee_onboarding import check_mandatory_documents
	missing = check_mandatory_documents(doc.documents)
	if missing:
		return {"success": False, "message": f"Missing mandatory documents: {', '.join(missing)}"}

	doc.onboarding_status = "APPROVED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Onboarding approved"}


@frappe.whitelist()
def reject_onboarding(name, reason=None):
	"""Reject an onboarding that is under review."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status != "UNDER_REVIEW":
		return {"success": False, "message": f"Onboarding is in {doc.onboarding_status} status, must be UNDER_REVIEW to reject"}
	doc.onboarding_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	if reason:
		doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Onboarding rejected"}


@frappe.whitelist()
def map_onboarding_to_employee(name):
	"""Create an ERPNext Employee from an approved onboarding record."""
	_require_hr_write_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status != "APPROVED":
		return {"success": False, "message": f"Onboarding must be APPROVED to map to Employee (current: {doc.onboarding_status})"}
	if doc.employee_reference:
		return {"success": False, "message": f"Already mapped to Employee {doc.employee_reference}"}

	from gov_erp.gov_erp.doctype.ge_employee_onboarding.ge_employee_onboarding import map_onboarding_to_employee_dict
	emp_data = map_onboarding_to_employee_dict(doc)
	emp_data["doctype"] = "Employee"
	emp_data["status"] = "Active"

	employee = frappe.get_doc(emp_data)
	employee.insert()

	# Sync education rows
	for edu_row in doc.education:
		employee.append("education", {
			"school_univ": edu_row.school_univ,
			"qualification": edu_row.qualification,
			"level": edu_row.level,
			"year_of_passing": edu_row.year_of_passing,
			"class_per": edu_row.get("class_per"),
		})

	# Sync experience rows
	for exp_row in doc.experience:
		employee.append("external_work_history", {
			"company_name": exp_row.company_name,
			"designation": exp_row.designation,
			"salary": exp_row.get("salary"),
			"total_experience": exp_row.get("total_experience"),
		})

	if doc.education or doc.experience:
		employee.save()

	# Link back
	doc.employee_reference = employee.name
	doc.onboarding_status = "MAPPED_TO_EMPLOYEE"
	doc.save()
	frappe.db.commit()

	return {
		"success": True,
		"data": {"onboarding": doc.as_dict(), "employee": employee.name},
		"message": f"Employee {employee.name} created from onboarding {doc.name}",
	}


@frappe.whitelist()
def get_onboarding_stats():
	"""Aggregate onboarding stats for dashboard."""
	_require_hr_read_access()
	records = frappe.get_all("GE Employee Onboarding", fields=["onboarding_status"])
	total = len(records)
	draft = sum(1 for r in records if r.onboarding_status == "DRAFT")
	submitted = sum(1 for r in records if r.onboarding_status == "SUBMITTED")
	under_review = sum(1 for r in records if r.onboarding_status == "UNDER_REVIEW")
	approved = sum(1 for r in records if r.onboarding_status == "APPROVED")
	rejected = sum(1 for r in records if r.onboarding_status == "REJECTED")
	mapped = sum(1 for r in records if r.onboarding_status == "MAPPED_TO_EMPLOYEE")
	return {
		"success": True,
		"data": {
			"total": total,
			"draft": draft,
			"submitted": submitted,
			"under_review": under_review,
			"approved": approved,
			"rejected": rejected,
			"mapped_to_employee": mapped,
		},
	}


# ── HR Operations APIs ───────────────────────────────────────

@frappe.whitelist()
def get_attendance_logs(employee=None, attendance_date=None, status=None):
	"""Return attendance logs, optionally filtered by employee/date/status."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if attendance_date:
		filters["attendance_date"] = attendance_date
	if status:
		filters["attendance_status"] = status
	data = frappe.get_all(
		"GE Attendance Log",
		filters=filters,
		fields=[
			"name", "employee", "attendance_date", "attendance_status",
			"linked_project", "linked_site", "check_in_time", "check_out_time",
			"creation", "modified",
		],
		order_by="attendance_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_attendance_log(name):
	"""Return one attendance log."""
	_require_hr_read_access()
	doc = frappe.get_doc("GE Attendance Log", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_attendance_log(data):
	"""Create an attendance log."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Attendance Log", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance log created"}


@frappe.whitelist()
def update_attendance_log(name, data):
	"""Update an attendance log."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Attendance Log", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance log updated"}


@frappe.whitelist()
def delete_attendance_log(name):
	"""Delete an attendance log."""
	_require_hr_write_access()
	frappe.delete_doc("GE Attendance Log", name)
	frappe.db.commit()
	return {"success": True, "message": "Attendance log deleted"}


@frappe.whitelist()
def get_attendance_stats():
	"""Aggregate attendance counts for dashboard use."""
	_require_hr_read_access()
	rows = frappe.get_all("GE Attendance Log", fields=["attendance_status"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"present": sum(1 for row in rows if row.attendance_status == "PRESENT"),
			"absent": sum(1 for row in rows if row.attendance_status == "ABSENT"),
			"half_day": sum(1 for row in rows if row.attendance_status == "HALF_DAY"),
			"on_duty": sum(1 for row in rows if row.attendance_status == "ON_DUTY"),
			"week_off": sum(1 for row in rows if row.attendance_status == "WEEK_OFF"),
		},
	}


@frappe.whitelist()
def get_travel_logs(employee=None, status=None):
	"""Return travel logs."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if status:
		filters["travel_status"] = status
	data = frappe.get_all(
		"GE Travel Log",
		filters=filters,
		fields=[
			"name", "employee", "travel_date", "travel_status", "from_location",
			"to_location", "expense_amount", "submitted_by", "approved_by",
			"approved_at", "creation", "modified",
		],
		order_by="travel_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_travel_log(name):
	"""Return one travel log."""
	_require_hr_read_access()
	doc = frappe.get_doc("GE Travel Log", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_travel_log(data):
	"""Create a travel log draft."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Travel Log", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Travel log created"}


@frappe.whitelist()
def update_travel_log(name, data):
	"""Update a travel log."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Travel Log", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Travel log updated"}


@frappe.whitelist()
def delete_travel_log(name):
	"""Delete a travel log unless approved."""
	_require_hr_write_access()
	doc = frappe.get_doc("GE Travel Log", name)
	if doc.travel_status == "APPROVED":
		return {"success": False, "message": "Cannot delete an approved travel log"}
	frappe.delete_doc("GE Travel Log", name)
	frappe.db.commit()
	return {"success": True, "message": "Travel log deleted"}


@frappe.whitelist()
def submit_travel_log(name):
	"""Move travel log to submitted state."""
	_require_hr_write_access()
	doc = frappe.get_doc("GE Travel Log", name)
	if doc.travel_status != "DRAFT":
		return {"success": False, "message": f"Travel log is in {doc.travel_status} status, must be DRAFT to submit"}
	doc.travel_status = "SUBMITTED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Travel log submitted"}


@frappe.whitelist()
def approve_travel_log(name):
	"""Approve a submitted travel log."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Travel Log", name)
	if doc.travel_status != "SUBMITTED":
		return {"success": False, "message": f"Travel log is in {doc.travel_status} status, must be SUBMITTED to approve"}
	doc.travel_status = "APPROVED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Travel log approved"}


@frappe.whitelist()
def reject_travel_log(name, reason=None):
	"""Reject a submitted travel log."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Travel Log", name)
	if doc.travel_status != "SUBMITTED":
		return {"success": False, "message": f"Travel log is in {doc.travel_status} status, must be SUBMITTED to reject"}
	doc.travel_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	if reason:
		doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Travel log rejected"}


@frappe.whitelist()
def get_travel_log_stats():
	"""Aggregate travel log status counts."""
	_require_hr_read_access()
	rows = frappe.get_all("GE Travel Log", fields=["travel_status", "expense_amount"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"draft": sum(1 for row in rows if row.travel_status == "DRAFT"),
			"submitted": sum(1 for row in rows if row.travel_status == "SUBMITTED"),
			"approved": sum(1 for row in rows if row.travel_status == "APPROVED"),
			"rejected": sum(1 for row in rows if row.travel_status == "REJECTED"),
			"total_expense_amount": sum(row.expense_amount or 0 for row in rows),
		},
	}


@frappe.whitelist()
def get_overtime_entries(employee=None, status=None):
	"""Return overtime entries."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if status:
		filters["overtime_status"] = status
	data = frappe.get_all(
		"GE Overtime Entry",
		filters=filters,
		fields=[
			"name", "employee", "overtime_date", "overtime_hours", "overtime_status",
			"linked_project", "linked_site", "submitted_by", "approved_by",
			"approved_at", "creation", "modified",
		],
		order_by="overtime_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_overtime_entry(name):
	"""Return one overtime entry."""
	_require_hr_read_access()
	doc = frappe.get_doc("GE Overtime Entry", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_overtime_entry(data):
	"""Create an overtime entry draft."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Overtime Entry", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Overtime entry created"}


@frappe.whitelist()
def update_overtime_entry(name, data):
	"""Update an overtime entry."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Overtime Entry", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Overtime entry updated"}


@frappe.whitelist()
def delete_overtime_entry(name):
	"""Delete an overtime entry unless approved."""
	_require_hr_write_access()
	doc = frappe.get_doc("GE Overtime Entry", name)
	if doc.overtime_status == "APPROVED":
		return {"success": False, "message": "Cannot delete an approved overtime entry"}
	frappe.delete_doc("GE Overtime Entry", name)
	frappe.db.commit()
	return {"success": True, "message": "Overtime entry deleted"}


@frappe.whitelist()
def submit_overtime_entry(name):
	"""Move overtime entry to submitted state."""
	_require_hr_write_access()
	doc = frappe.get_doc("GE Overtime Entry", name)
	if doc.overtime_status != "DRAFT":
		return {"success": False, "message": f"Overtime entry is in {doc.overtime_status} status, must be DRAFT to submit"}
	doc.overtime_status = "SUBMITTED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Overtime entry submitted"}


@frappe.whitelist()
def approve_overtime_entry(name):
	"""Approve a submitted overtime entry."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Overtime Entry", name)
	if doc.overtime_status != "SUBMITTED":
		return {"success": False, "message": f"Overtime entry is in {doc.overtime_status} status, must be SUBMITTED to approve"}
	doc.overtime_status = "APPROVED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Overtime entry approved"}


@frappe.whitelist()
def reject_overtime_entry(name, reason=None):
	"""Reject a submitted overtime entry."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Overtime Entry", name)
	if doc.overtime_status != "SUBMITTED":
		return {"success": False, "message": f"Overtime entry is in {doc.overtime_status} status, must be SUBMITTED to reject"}
	doc.overtime_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	if reason:
		doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Overtime entry rejected"}


@frappe.whitelist()
def get_overtime_stats():
	"""Aggregate overtime status counts and hours."""
	_require_hr_read_access()
	rows = frappe.get_all("GE Overtime Entry", fields=["overtime_status", "overtime_hours"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"draft": sum(1 for row in rows if row.overtime_status == "DRAFT"),
			"submitted": sum(1 for row in rows if row.overtime_status == "SUBMITTED"),
			"approved": sum(1 for row in rows if row.overtime_status == "APPROVED"),
			"rejected": sum(1 for row in rows if row.overtime_status == "REJECTED"),
			"total_hours": sum(row.overtime_hours or 0 for row in rows),
		},
	}


@frappe.whitelist()
def get_statutory_ledgers(employee=None, ledger_type=None, payment_status=None):
	"""Return statutory ledgers for EPF / ESIC tracking."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if ledger_type:
		filters["ledger_type"] = ledger_type
	if payment_status:
		filters["payment_status"] = payment_status
	data = frappe.get_all(
		"GE Statutory Ledger",
		filters=filters,
		fields=[
			"name", "employee", "ledger_type", "period_start", "period_end",
			"employee_contribution", "employer_contribution", "payment_status",
			"payment_date", "challan_reference", "creation", "modified",
		],
		order_by="period_end desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_statutory_ledger(name):
	"""Return one statutory ledger entry."""
	_require_hr_read_access()
	doc = frappe.get_doc("GE Statutory Ledger", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_statutory_ledger(data):
	"""Create a statutory ledger entry."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Statutory Ledger", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Statutory ledger created"}


@frappe.whitelist()
def update_statutory_ledger(name, data):
	"""Update a statutory ledger entry."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Statutory Ledger", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Statutory ledger updated"}


@frappe.whitelist()
def delete_statutory_ledger(name):
	"""Delete a statutory ledger entry."""
	_require_hr_write_access()
	frappe.delete_doc("GE Statutory Ledger", name)
	frappe.db.commit()
	return {"success": True, "message": "Statutory ledger deleted"}


@frappe.whitelist()
def get_statutory_ledger_stats():
	"""Aggregate statutory ledger counts and totals."""
	_require_hr_read_access()
	rows = frappe.get_all(
		"GE Statutory Ledger",
		fields=["ledger_type", "payment_status", "employee_contribution", "employer_contribution"],
	)
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"epf": sum(1 for row in rows if row.ledger_type == "EPF"),
			"esic": sum(1 for row in rows if row.ledger_type == "ESIC"),
			"paid": sum(1 for row in rows if row.payment_status == "PAID"),
			"pending": sum(1 for row in rows if row.payment_status == "PENDING"),
			"hold": sum(1 for row in rows if row.payment_status == "HOLD"),
			"total_employee_contribution": sum(row.employee_contribution or 0 for row in rows),
			"total_employer_contribution": sum(row.employer_contribution or 0 for row in rows),
		},
	}


@frappe.whitelist()
def get_technician_visit_logs(employee=None, status=None, site=None):
	"""Return technician visit logs."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if status:
		filters["visit_status"] = status
	if site:
		filters["linked_site"] = site
	data = frappe.get_all(
		"GE Technician Visit Log",
		filters=filters,
		fields=[
			"name", "employee", "visit_date", "visit_status", "linked_project",
			"linked_site", "customer_location", "check_in_time", "check_out_time",
			"creation", "modified",
		],
		order_by="visit_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_technician_visit_log(name):
	"""Return one technician visit log."""
	_require_hr_read_access()
	doc = frappe.get_doc("GE Technician Visit Log", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_technician_visit_log(data):
	"""Create a technician visit log."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Technician Visit Log", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Technician visit log created"}


@frappe.whitelist()
def update_technician_visit_log(name, data):
	"""Update a technician visit log."""
	_require_hr_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Technician Visit Log", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Technician visit log updated"}


@frappe.whitelist()
def delete_technician_visit_log(name):
	"""Delete a technician visit log."""
	_require_hr_write_access()
	frappe.delete_doc("GE Technician Visit Log", name)
	frappe.db.commit()
	return {"success": True, "message": "Technician visit log deleted"}


@frappe.whitelist()
def get_technician_visit_stats():
	"""Aggregate technician visit counts."""
	_require_hr_read_access()
	rows = frappe.get_all("GE Technician Visit Log", fields=["visit_status"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"planned": sum(1 for row in rows if row.visit_status == "PLANNED"),
			"in_progress": sum(1 for row in rows if row.visit_status == "IN_PROGRESS"),
			"completed": sum(1 for row in rows if row.visit_status == "COMPLETED"),
			"cancelled": sum(1 for row in rows if row.visit_status == "CANCELLED"),
		},
	}


# ── PO Hook from Vendor Comparison ───────────────────────────

@frappe.whitelist()
def create_po_from_comparison(name):
	"""Create Purchase Order(s) from an approved Vendor Comparison sheet."""
	_require_procurement_write_access()
	vc = frappe.get_doc("GE Vendor Comparison", name)
	if vc.status != "APPROVED":
		return {"success": False, "message": f"Vendor Comparison must be APPROVED (current: {vc.status})"}

	# Group selected quotes by supplier
	supplier_items = {}
	for q in vc.quotes:
		if not q.is_selected:
			continue
		supplier_items.setdefault(q.supplier, []).append(q)

	if not supplier_items:
		return {"success": False, "message": "No quotes are marked as selected"}

	company = _get_default_company()
	default_warehouse = _get_default_warehouse(company)
	created_pos = []
	for supplier, items in supplier_items.items():
		project = vc.linked_project
		po = frappe.get_doc({
			"doctype": "Purchase Order",
			"supplier": supplier,
			"company": company,
			"project": project,
			"items": [
				{
					"item_code": item.item_link,
					"qty": item.qty,
					"rate": item.rate,
					"description": item.description,
					"schedule_date": frappe.utils.add_days(frappe.utils.nowdate(), item.lead_time_days or 14),
					"uom": item.unit or "Nos",
					"project": project,
					"material_request": vc.linked_material_request,
					"warehouse": frappe.db.get_value(
						"Item Default",
						{"parent": item.item_link, "company": company},
						"default_warehouse",
					)
					or default_warehouse,
				}
				for item in items
				if item.item_link
			],
		})
		if not po.items:
			continue
		po.insert()
		created_pos.append(po.name)

	frappe.db.commit()
	return {
		"success": True,
		"data": {"vendor_comparison": name, "purchase_orders": created_pos},
		"message": f"Created {len(created_pos)} Purchase Order(s)",
	}


# ── DPR (Daily Progress Report) APIs ─────────────────────────

@frappe.whitelist()
def get_dprs(project=None, site=None, report_date=None):
	"""Return DPR records."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if report_date:
		filters["report_date"] = report_date
	data = frappe.get_all(
		"GE DPR",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site", "report_date",
			"summary", "manpower_on_site", "equipment_count",
			"submitted_by", "creation", "modified",
		],
		order_by="report_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_dpr(name):
	"""Return a single DPR with child tables."""
	_require_execution_read_access()
	doc = frappe.get_doc("GE DPR", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_dpr(data):
	"""Create a DPR. Enforces one DPR per site per day."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	# Enforce uniqueness: one DPR per site per day
	if values.get("linked_site") and values.get("report_date"):
		existing = frappe.db.exists("GE DPR", {
			"linked_site": values["linked_site"],
			"report_date": values["report_date"],
		})
		if existing:
			return {"success": False, "message": f"A DPR already exists for site {values['linked_site']} on {values['report_date']}"}
	doc = frappe.get_doc({"doctype": "GE DPR", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "DPR created"}


@frappe.whitelist()
def update_dpr(name, data):
	"""Update a DPR."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE DPR", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "DPR updated"}


@frappe.whitelist()
def delete_dpr(name):
	"""Delete a DPR."""
	_require_execution_write_access()
	frappe.delete_doc("GE DPR", name)
	frappe.db.commit()
	return {"success": True, "message": "DPR deleted"}


@frappe.whitelist()
def get_dpr_stats(project=None):
	"""Aggregate DPR stats."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	rows = frappe.get_all("GE DPR", filters=filters, fields=["manpower_on_site", "equipment_count"])
	return {
		"success": True,
		"data": {
			"total_reports": len(rows),
			"total_manpower_logged": sum(r.manpower_on_site or 0 for r in rows),
			"total_equipment_logged": sum(r.equipment_count or 0 for r in rows),
		},
	}


# ── Project Team Member APIs ─────────────────────────────────

@frappe.whitelist()
def get_project_team_members(project=None, role=None, active=None):
	"""Return project team members."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if role:
		filters["role_in_project"] = role
	if active is not None:
		filters["is_active"] = int(active)
	data = frappe.get_all(
		"GE Project Team Member",
		filters=filters,
		fields=[
			"name", "linked_project", "user", "role_in_project",
			"linked_site", "start_date", "end_date", "is_active",
			"creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_project_team_member(name):
	"""Return a single team member record."""
	_require_execution_read_access()
	doc = frappe.get_doc("GE Project Team Member", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_project_team_member(data):
	"""Add a team member to a project."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Project Team Member", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Team member added"}


@frappe.whitelist()
def update_project_team_member(name, data):
	"""Update a team member record."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Project Team Member", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Team member updated"}


@frappe.whitelist()
def delete_project_team_member(name):
	"""Remove a team member from a project."""
	_require_execution_write_access()
	frappe.delete_doc("GE Project Team Member", name)
	frappe.db.commit()
	return {"success": True, "message": "Team member removed"}


# ── Invoice APIs (Billing) ───────────────────────────────────

@frappe.whitelist()
def get_invoices(project=None, status=None, invoice_type=None):
	"""Return invoices."""
	_require_billing_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if status:
		filters["status"] = status
	if invoice_type:
		filters["invoice_type"] = invoice_type
	data = frappe.get_all(
		"GE Invoice",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site", "invoice_date",
			"invoice_type", "status", "amount", "gst_amount", "tds_amount",
			"net_receivable", "milestone_complete", "submitted_by",
			"approved_by", "approved_at", "creation", "modified",
		],
		order_by="invoice_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_invoice(name):
	"""Return a single invoice with line items."""
	_require_billing_read_access()
	doc = frappe.get_doc("GE Invoice", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_invoice(data):
	"""Create an invoice."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	# If raising before milestone is done, audit_note is mandatory
	if not values.get("milestone_complete") and values.get("invoice_type") == "MILESTONE" and not values.get("audit_note"):
		return {"success": False, "message": "Audit note is required when raising invoice before milestone completion"}
	doc = frappe.get_doc({"doctype": "GE Invoice", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Invoice created"}


@frappe.whitelist()
def update_invoice(name, data):
	"""Update an invoice."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Invoice", name)
	if doc.status in ("APPROVED", "PAYMENT_RECEIVED"):
		return {"success": False, "message": f"Cannot edit invoice in {doc.status} status"}
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Invoice updated"}


@frappe.whitelist()
def delete_invoice(name):
	"""Delete a draft invoice."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Invoice", name)
	if doc.status != "DRAFT":
		return {"success": False, "message": f"Cannot delete invoice in {doc.status} status"}
	frappe.delete_doc("GE Invoice", name)
	frappe.db.commit()
	return {"success": True, "message": "Invoice deleted"}


@frappe.whitelist()
def submit_invoice(name):
	"""Submit a draft invoice."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Invoice", name)
	if doc.status != "DRAFT":
		return {"success": False, "message": f"Invoice is in {doc.status} status, must be DRAFT to submit"}
	doc.status = "SUBMITTED"
	doc.submitted_by = frappe.session.user
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Invoice submitted"}


@frappe.whitelist()
def approve_invoice(name):
	"""Approve a submitted invoice."""
	_require_billing_approval_access()
	doc = frappe.get_doc("GE Invoice", name)
	if doc.status != "SUBMITTED":
		return {"success": False, "message": f"Invoice is in {doc.status} status, must be SUBMITTED to approve"}
	doc.status = "APPROVED"
	doc.approved_by = frappe.session.user
	doc.approved_at = frappe.utils.now_datetime()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Invoice approved"}


@frappe.whitelist()
def reject_invoice(name, reason):
	"""Reject a submitted invoice."""
	_require_billing_approval_access()
	doc = frappe.get_doc("GE Invoice", name)
	if doc.status != "SUBMITTED":
		return {"success": False, "message": f"Invoice is in {doc.status} status, must be SUBMITTED to reject"}
	doc.status = "DRAFT"
	doc.rejected_by = frappe.session.user
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Invoice rejected and returned to draft"}


@frappe.whitelist()
def mark_invoice_paid(name):
	"""Mark an approved invoice as payment received."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Invoice", name)
	if doc.status != "APPROVED":
		return {"success": False, "message": f"Invoice must be APPROVED to mark as paid (current: {doc.status})"}
	doc.status = "PAYMENT_RECEIVED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Invoice marked as payment received"}


@frappe.whitelist()
def cancel_invoice(name, reason):
	"""Cancel an invoice."""
	_require_billing_approval_access()
	doc = frappe.get_doc("GE Invoice", name)
	if doc.status == "PAYMENT_RECEIVED":
		return {"success": False, "message": "Cannot cancel an invoice that has received payment"}
	doc.status = "CANCELLED"
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Invoice cancelled"}


@frappe.whitelist()
def get_invoice_stats(project=None):
	"""Aggregate invoice stats."""
	_require_billing_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	rows = frappe.get_all("GE Invoice", filters=filters, fields=["status", "amount", "net_receivable"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"draft": sum(1 for r in rows if r.status == "DRAFT"),
			"submitted": sum(1 for r in rows if r.status == "SUBMITTED"),
			"approved": sum(1 for r in rows if r.status == "APPROVED"),
			"payment_received": sum(1 for r in rows if r.status == "PAYMENT_RECEIVED"),
			"cancelled": sum(1 for r in rows if r.status == "CANCELLED"),
			"total_amount": sum(r.amount or 0 for r in rows),
			"total_receivable": sum(r.net_receivable or 0 for r in rows),
		},
	}


# ── Payment Receipt APIs ─────────────────────────────────────

@frappe.whitelist()
def get_payment_receipts(invoice=None, project=None):
	"""Return payment receipts."""
	_require_billing_read_access()
	filters = {}
	if invoice:
		filters["linked_invoice"] = invoice
	if project:
		filters["linked_project"] = project
	data = frappe.get_all(
		"GE Payment Receipt",
		filters=filters,
		fields=[
			"name", "linked_invoice", "linked_project", "received_date",
			"amount_received", "tds_amount", "payment_mode",
			"payment_reference", "creation", "modified",
		],
		order_by="received_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_payment_receipt(name):
	"""Return a single payment receipt."""
	_require_billing_read_access()
	doc = frappe.get_doc("GE Payment Receipt", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_payment_receipt(data):
	"""Create a payment receipt."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Payment Receipt", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Payment receipt created"}


@frappe.whitelist()
def update_payment_receipt(name, data):
	"""Update a payment receipt."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Payment Receipt", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Payment receipt updated"}


@frappe.whitelist()
def delete_payment_receipt(name):
	"""Delete a payment receipt."""
	_require_billing_write_access()
	frappe.delete_doc("GE Payment Receipt", name)
	frappe.db.commit()
	return {"success": True, "message": "Payment receipt deleted"}


@frappe.whitelist()
def get_payment_receipt_stats(project=None):
	"""Aggregate payment receipt totals."""
	_require_billing_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	rows = frappe.get_all("GE Payment Receipt", filters=filters, fields=["amount_received", "tds_amount"])
	return {
		"success": True,
		"data": {
			"total_receipts": len(rows),
			"total_received": sum(r.amount_received or 0 for r in rows),
			"total_tds": sum(r.tds_amount or 0 for r in rows),
		},
	}


# ── Retention Ledger APIs ────────────────────────────────────

@frappe.whitelist()
def get_retention_ledgers(project=None, status=None):
	"""Return retention ledger entries."""
	_require_billing_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Retention Ledger",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_invoice", "retention_percent",
			"retention_amount", "release_due_date", "released_on",
			"release_amount", "status", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_retention_ledger(name):
	"""Return a single retention ledger entry."""
	_require_billing_read_access()
	doc = frappe.get_doc("GE Retention Ledger", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_retention_ledger(data):
	"""Create a retention entry."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Retention Ledger", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Retention entry created"}


@frappe.whitelist()
def update_retention_ledger(name, data):
	"""Update a retention entry."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Retention Ledger", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Retention entry updated"}


@frappe.whitelist()
def delete_retention_ledger(name):
	"""Delete a retention entry."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Retention Ledger", name)
	if doc.status == "RELEASED":
		return {"success": False, "message": "Cannot delete a released retention entry"}
	frappe.delete_doc("GE Retention Ledger", name)
	frappe.db.commit()
	return {"success": True, "message": "Retention entry deleted"}


@frappe.whitelist()
def release_retention(name, release_amount=None):
	"""Release (fully or partially) a retained amount."""
	_require_billing_approval_access()
	doc = frappe.get_doc("GE Retention Ledger", name)
	if doc.status == "RELEASED":
		return {"success": False, "message": "Already fully released"}
	amount = float(release_amount) if release_amount else doc.retention_amount
	already_released = doc.release_amount or 0
	total_after = already_released + amount
	if total_after > doc.retention_amount:
		return {"success": False, "message": f"Release amount ({total_after}) exceeds retention ({doc.retention_amount})"}
	doc.release_amount = total_after
	doc.released_on = frappe.utils.nowdate()
	doc.status = "RELEASED" if total_after >= doc.retention_amount else "PARTIALLY_RELEASED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Retention released"}


@frappe.whitelist()
def get_retention_stats(project=None):
	"""Aggregate retention stats."""
	_require_billing_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	rows = frappe.get_all("GE Retention Ledger", filters=filters, fields=["status", "retention_amount", "release_amount"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"retained": sum(1 for r in rows if r.status == "RETAINED"),
			"partially_released": sum(1 for r in rows if r.status == "PARTIALLY_RELEASED"),
			"released": sum(1 for r in rows if r.status == "RELEASED"),
			"total_retained": sum(r.retention_amount or 0 for r in rows),
			"total_released": sum(r.release_amount or 0 for r in rows),
		},
	}


# ── Penalty Deduction APIs ───────────────────────────────────

@frappe.whitelist()
def get_penalty_deductions(project=None, status=None, source=None):
	"""Return penalty deductions."""
	_require_billing_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if status:
		filters["status"] = status
	if source:
		filters["penalty_source"] = source
	data = frappe.get_all(
		"GE Penalty Deduction",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_invoice", "penalty_source",
			"penalty_date", "amount", "reason", "applied_at_stage",
			"status", "approved_by", "creation", "modified",
		],
		order_by="penalty_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_penalty_deduction(name):
	"""Return a single penalty deduction."""
	_require_billing_read_access()
	doc = frappe.get_doc("GE Penalty Deduction", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_penalty_deduction(data):
	"""Create a penalty deduction."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Penalty Deduction", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Penalty deduction created"}


@frappe.whitelist()
def update_penalty_deduction(name, data):
	"""Update a penalty deduction."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Penalty Deduction", name)
	if doc.status == "APPLIED":
		return {"success": False, "message": "Cannot edit an already applied penalty"}
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Penalty deduction updated"}


@frappe.whitelist()
def delete_penalty_deduction(name):
	"""Delete a penalty deduction."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Penalty Deduction", name)
	if doc.status in ("APPLIED", "REVERSED"):
		return {"success": False, "message": f"Cannot delete a penalty in {doc.status} status"}
	frappe.delete_doc("GE Penalty Deduction", name)
	frappe.db.commit()
	return {"success": True, "message": "Penalty deduction deleted"}


@frappe.whitelist()
def approve_penalty_deduction(name):
	"""Approve a pending penalty deduction."""
	_require_billing_approval_access()
	doc = frappe.get_doc("GE Penalty Deduction", name)
	if doc.status != "PENDING":
		return {"success": False, "message": f"Penalty is in {doc.status} status, must be PENDING to approve"}
	doc.status = "APPROVED"
	doc.approved_by = frappe.session.user
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Penalty approved"}


@frappe.whitelist()
def apply_penalty_deduction(name, invoice_name=None):
	"""Apply an approved penalty to an invoice."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Penalty Deduction", name)
	if doc.status != "APPROVED":
		return {"success": False, "message": f"Penalty must be APPROVED to apply (current: {doc.status})"}
	doc.status = "APPLIED"
	if invoice_name:
		doc.linked_invoice = invoice_name
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Penalty applied"}


@frappe.whitelist()
def reverse_penalty_deduction(name, reason):
	"""Reverse an applied penalty."""
	_require_billing_approval_access()
	doc = frappe.get_doc("GE Penalty Deduction", name)
	if doc.status != "APPLIED":
		return {"success": False, "message": f"Penalty must be APPLIED to reverse (current: {doc.status})"}
	doc.status = "REVERSED"
	doc.reversal_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Penalty reversed"}


@frappe.whitelist()
def get_penalty_stats(project=None):
	"""Aggregate penalty stats."""
	_require_billing_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	rows = frappe.get_all("GE Penalty Deduction", filters=filters, fields=["status", "amount"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"pending": sum(1 for r in rows if r.status == "PENDING"),
			"approved": sum(1 for r in rows if r.status == "APPROVED"),
			"applied": sum(1 for r in rows if r.status == "APPLIED"),
			"reversed": sum(1 for r in rows if r.status == "REVERSED"),
			"total_amount": sum(r.amount or 0 for r in rows),
			"applied_amount": sum(r.amount or 0 for r in rows if r.status == "APPLIED"),
		},
	}


# ── Ticket APIs (O&M) ────────────────────────────────────────

@frappe.whitelist()
def get_tickets(project=None, site=None, status=None, priority=None, category=None, assigned_to=None):
	"""Return tickets, optionally filtered."""
	_require_om_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	if priority:
		filters["priority"] = priority
	if category:
		filters["category"] = category
	if assigned_to:
		filters["assigned_to"] = assigned_to
	data = frappe.get_all(
		"GE Ticket",
		filters=filters,
		fields=[
			"name", "title", "linked_project", "linked_site", "category",
			"priority", "status", "raised_by", "raised_on", "assigned_to",
			"resolved_on", "closed_on", "is_rma", "sla_profile",
			"creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_ticket(name):
	"""Return a single ticket with all actions."""
	_require_om_read_access()
	doc = frappe.get_doc("GE Ticket", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_ticket(data):
	"""Create a ticket."""
	_require_om_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	if not values.get("raised_by"):
		values["raised_by"] = frappe.session.user
	if not values.get("raised_on"):
		values["raised_on"] = frappe.utils.now_datetime()
	doc = frappe.get_doc({"doctype": "GE Ticket", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Ticket created"}


@frappe.whitelist()
def update_ticket(name, data):
	"""Update a ticket."""
	_require_om_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Ticket", name)
	if doc.status == "CLOSED":
		return {"success": False, "message": "Cannot update a closed ticket"}
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Ticket updated"}


@frappe.whitelist()
def delete_ticket(name):
	"""Delete a ticket (only NEW tickets)."""
	_require_om_write_access()
	doc = frappe.get_doc("GE Ticket", name)
	if doc.status != "NEW":
		return {"success": False, "message": f"Cannot delete a ticket in {doc.status} status"}
	frappe.delete_doc("GE Ticket", name)
	frappe.db.commit()
	return {"success": True, "message": "Ticket deleted"}


@frappe.whitelist()
def assign_ticket(name, assigned_to):
	"""Assign a ticket to a user."""
	_require_om_write_access()
	doc = frappe.get_doc("GE Ticket", name)
	if doc.status == "CLOSED":
		return {"success": False, "message": "Cannot assign a closed ticket"}
	doc.assigned_to = assigned_to
	if doc.status == "NEW":
		doc.status = "ASSIGNED"
	doc.append("actions", {
		"action_type": "ASSIGN",
		"by_user": frappe.session.user,
		"at_time": frappe.utils.now_datetime(),
		"notes": f"Assigned to {assigned_to}",
	})
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": f"Ticket assigned to {assigned_to}"}


@frappe.whitelist()
def start_ticket(name):
	"""Move ticket to IN_PROGRESS."""
	_require_om_write_access()
	doc = frappe.get_doc("GE Ticket", name)
	if doc.status not in ("NEW", "ASSIGNED"):
		return {"success": False, "message": f"Ticket is in {doc.status} status, must be NEW or ASSIGNED to start"}
	doc.status = "IN_PROGRESS"
	doc.append("actions", {
		"action_type": "STATUS_CHANGE",
		"by_user": frappe.session.user,
		"at_time": frappe.utils.now_datetime(),
		"notes": "Ticket work started",
	})
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Ticket started"}


@frappe.whitelist()
def pause_ticket(name, reason):
	"""Pause a ticket (ON_HOLD)."""
	_require_om_write_access()
	doc = frappe.get_doc("GE Ticket", name)
	if doc.status != "IN_PROGRESS":
		return {"success": False, "message": f"Ticket must be IN_PROGRESS to pause (current: {doc.status})"}
	doc.status = "ON_HOLD"
	doc.append("actions", {
		"action_type": "PAUSE",
		"by_user": frappe.session.user,
		"at_time": frappe.utils.now_datetime(),
		"notes": reason,
	})
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Ticket paused"}


@frappe.whitelist()
def resume_ticket(name):
	"""Resume a paused ticket."""
	_require_om_write_access()
	doc = frappe.get_doc("GE Ticket", name)
	if doc.status != "ON_HOLD":
		return {"success": False, "message": f"Ticket must be ON_HOLD to resume (current: {doc.status})"}
	doc.status = "IN_PROGRESS"
	doc.append("actions", {
		"action_type": "STATUS_CHANGE",
		"by_user": frappe.session.user,
		"at_time": frappe.utils.now_datetime(),
		"notes": "Ticket resumed",
	})
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Ticket resumed"}


@frappe.whitelist()
def resolve_ticket(name, resolution_notes=None):
	"""Resolve a ticket."""
	_require_om_write_access()
	doc = frappe.get_doc("GE Ticket", name)
	if doc.status in ("RESOLVED", "CLOSED"):
		return {"success": False, "message": f"Ticket is already {doc.status}"}
	doc.status = "RESOLVED"
	doc.resolved_on = frappe.utils.now_datetime()
	if resolution_notes:
		doc.resolution_notes = resolution_notes
	doc.append("actions", {
		"action_type": "RESOLVE",
		"by_user": frappe.session.user,
		"at_time": frappe.utils.now_datetime(),
		"notes": resolution_notes or "Ticket resolved",
	})
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Ticket resolved"}


@frappe.whitelist()
def close_ticket(name):
	"""Close a resolved ticket."""
	_require_om_write_access()
	doc = frappe.get_doc("GE Ticket", name)
	if doc.status != "RESOLVED":
		return {"success": False, "message": f"Ticket must be RESOLVED to close (current: {doc.status})"}
	doc.status = "CLOSED"
	doc.closed_on = frappe.utils.now_datetime()
	doc.append("actions", {
		"action_type": "CLOSE",
		"by_user": frappe.session.user,
		"at_time": frappe.utils.now_datetime(),
		"notes": "Ticket closed",
	})
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Ticket closed"}


@frappe.whitelist()
def escalate_ticket(name, reason):
	"""Escalate a ticket."""
	_require_om_write_access()
	doc = frappe.get_doc("GE Ticket", name)
	if doc.status == "CLOSED":
		return {"success": False, "message": "Cannot escalate a closed ticket"}
	doc.append("actions", {
		"action_type": "ESCALATE",
		"by_user": frappe.session.user,
		"at_time": frappe.utils.now_datetime(),
		"notes": reason,
	})
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Ticket escalated"}


@frappe.whitelist()
def add_ticket_comment(name, notes, attachment=None):
	"""Add a comment action to a ticket."""
	_require_om_write_access()
	doc = frappe.get_doc("GE Ticket", name)
	action = {
		"action_type": "COMMENT",
		"by_user": frappe.session.user,
		"at_time": frappe.utils.now_datetime(),
		"notes": notes,
	}
	if attachment:
		action["attachment"] = attachment
	doc.append("actions", action)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Comment added"}


@frappe.whitelist()
def get_ticket_stats(project=None):
	"""Aggregate ticket stats."""
	_require_om_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	rows = frappe.get_all("GE Ticket", filters=filters, fields=["status", "priority", "is_rma"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"new": sum(1 for r in rows if r.status == "NEW"),
			"assigned": sum(1 for r in rows if r.status == "ASSIGNED"),
			"in_progress": sum(1 for r in rows if r.status == "IN_PROGRESS"),
			"on_hold": sum(1 for r in rows if r.status == "ON_HOLD"),
			"resolved": sum(1 for r in rows if r.status == "RESOLVED"),
			"closed": sum(1 for r in rows if r.status == "CLOSED"),
			"critical": sum(1 for r in rows if r.priority == "CRITICAL"),
			"high": sum(1 for r in rows if r.priority == "HIGH"),
			"rma_count": sum(1 for r in rows if r.is_rma),
		},
	}


# ── SLA Profile APIs ─────────────────────────────────────────

@frappe.whitelist()
def get_sla_profiles(project=None, active=None):
	"""Return SLA profiles."""
	_require_om_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if active is not None:
		filters["is_active"] = int(active)
	data = frappe.get_all(
		"GE SLA Profile",
		filters=filters,
		fields=[
			"name", "profile_name", "linked_project", "response_minutes",
			"resolution_minutes", "working_hours_type", "escalation_enabled",
			"is_active", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_sla_profile(name):
	"""Return a single SLA profile."""
	_require_om_read_access()
	doc = frappe.get_doc("GE SLA Profile", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_sla_profile(data):
	"""Create an SLA profile."""
	_require_om_approval_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE SLA Profile", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA profile created"}


@frappe.whitelist()
def update_sla_profile(name, data):
	"""Update an SLA profile."""
	_require_om_approval_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE SLA Profile", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA profile updated"}


@frappe.whitelist()
def delete_sla_profile(name):
	"""Delete an SLA profile."""
	_require_om_approval_access()
	frappe.delete_doc("GE SLA Profile", name)
	frappe.db.commit()
	return {"success": True, "message": "SLA profile deleted"}


# ── SLA Timer APIs ────────────────────────────────────────────

@frappe.whitelist()
def get_sla_timers(ticket=None):
	"""Return SLA timers."""
	_require_om_read_access()
	filters = {}
	if ticket:
		filters["linked_ticket"] = ticket
	data = frappe.get_all(
		"GE SLA Timer",
		filters=filters,
		fields=[
			"name", "linked_ticket", "sla_profile", "started_on", "closed_on",
			"response_deadline", "resolution_deadline",
			"response_sla_met", "resolution_sla_met",
			"total_pause_minutes", "current_elapsed_minutes",
			"creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_sla_timer(name):
	"""Return a single SLA timer."""
	_require_om_read_access()
	doc = frappe.get_doc("GE SLA Timer", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_sla_timer(data):
	"""Create an SLA timer for a ticket."""
	_require_om_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	# Auto-calculate deadlines from profile
	if values.get("sla_profile") and values.get("started_on"):
		profile = frappe.get_doc("GE SLA Profile", values["sla_profile"])
		started = frappe.utils.get_datetime(values["started_on"])
		values.setdefault("response_deadline", str(frappe.utils.add_to_date(started, minutes=profile.response_minutes)))
		values.setdefault("resolution_deadline", str(frappe.utils.add_to_date(started, minutes=profile.resolution_minutes)))
	doc = frappe.get_doc({"doctype": "GE SLA Timer", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA timer created"}


@frappe.whitelist()
def close_sla_timer(name, response_met=None, resolution_met=None):
	"""Close an SLA timer and record whether SLAs were met."""
	_require_om_write_access()
	doc = frappe.get_doc("GE SLA Timer", name)
	doc.closed_on = frappe.utils.now_datetime()
	if response_met is not None:
		doc.response_sla_met = int(response_met)
	if resolution_met is not None:
		doc.resolution_sla_met = int(resolution_met)
	# Calculate elapsed
	started = frappe.utils.get_datetime(doc.started_on)
	closed = frappe.utils.get_datetime(doc.closed_on)
	elapsed = (closed - started).total_seconds() / 60
	doc.current_elapsed_minutes = int(elapsed - (doc.total_pause_minutes or 0))
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA timer closed"}


@frappe.whitelist()
def pause_sla_timer(name):
	"""Record a pause interval on the SLA timer."""
	_require_om_write_access()
	doc = frappe.get_doc("GE SLA Timer", name)
	intervals = json.loads(doc.paused_intervals or "[]")
	intervals.append({"paused_at": str(frappe.utils.now_datetime()), "resumed_at": None})
	doc.paused_intervals = json.dumps(intervals)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA timer paused"}


@frappe.whitelist()
def resume_sla_timer(name):
	"""Resume a paused SLA timer."""
	_require_om_write_access()
	doc = frappe.get_doc("GE SLA Timer", name)
	intervals = json.loads(doc.paused_intervals or "[]")
	if not intervals or intervals[-1].get("resumed_at"):
		return {"success": False, "message": "Timer is not currently paused"}
	now = frappe.utils.now_datetime()
	intervals[-1]["resumed_at"] = str(now)
	paused_at = frappe.utils.get_datetime(intervals[-1]["paused_at"])
	pause_mins = (frappe.utils.get_datetime(now) - paused_at).total_seconds() / 60
	doc.total_pause_minutes = (doc.total_pause_minutes or 0) + int(pause_mins)
	doc.paused_intervals = json.dumps(intervals)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA timer resumed"}


# ── SLA Penalty Rule APIs ────────────────────────────────────

@frappe.whitelist()
def get_sla_penalty_rules(sla_profile=None, active=None):
	"""Return SLA penalty rules."""
	_require_om_read_access()
	filters = {}
	if sla_profile:
		filters["sla_profile"] = sla_profile
	if active is not None:
		filters["is_active"] = int(active)
	data = frappe.get_all(
		"GE SLA Penalty Rule",
		filters=filters,
		fields=[
			"name", "sla_profile", "breach_type", "time_slab_from_minutes",
			"time_slab_to_minutes", "penalty_type", "penalty_value",
			"penalty_currency", "is_active", "creation", "modified",
		],
		order_by="time_slab_from_minutes asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_sla_penalty_rule(data):
	"""Create an SLA penalty rule."""
	_require_om_approval_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE SLA Penalty Rule", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA penalty rule created"}


@frappe.whitelist()
def update_sla_penalty_rule(name, data):
	"""Update an SLA penalty rule."""
	_require_om_approval_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE SLA Penalty Rule", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA penalty rule updated"}


@frappe.whitelist()
def delete_sla_penalty_rule(name):
	"""Delete an SLA penalty rule."""
	_require_om_approval_access()
	frappe.delete_doc("GE SLA Penalty Rule", name)
	frappe.db.commit()
	return {"success": True, "message": "SLA penalty rule deleted"}


# ── SLA Penalty Record APIs ──────────────────────────────────

@frappe.whitelist()
def get_sla_penalty_records(ticket=None, status=None):
	"""Return SLA penalty records."""
	_require_om_read_access()
	filters = {}
	if ticket:
		filters["linked_ticket"] = ticket
	if status:
		filters["approval_status"] = status
	data = frappe.get_all(
		"GE SLA Penalty Record",
		filters=filters,
		fields=[
			"name", "linked_ticket", "sla_penalty_rule", "breach_type",
			"calculated_penalty", "calculated_on", "approval_status",
			"approved_by", "applied_to_invoice", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_sla_penalty_record(name):
	"""Return a single SLA penalty record."""
	_require_om_read_access()
	doc = frappe.get_doc("GE SLA Penalty Record", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_sla_penalty_record(data):
	"""Create a penalty record from an SLA breach."""
	_require_om_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE SLA Penalty Record", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA penalty record created"}


@frappe.whitelist()
def approve_sla_penalty(name):
	"""Approve an SLA penalty."""
	_require_om_approval_access()
	doc = frappe.get_doc("GE SLA Penalty Record", name)
	if doc.approval_status != "PENDING":
		return {"success": False, "message": f"Penalty is in {doc.approval_status} status, must be PENDING to approve"}
	doc.approval_status = "APPROVED"
	doc.approved_by = frappe.session.user
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA penalty approved"}


@frappe.whitelist()
def reject_sla_penalty(name, reason=None):
	"""Reject an SLA penalty."""
	_require_om_approval_access()
	doc = frappe.get_doc("GE SLA Penalty Record", name)
	if doc.approval_status != "PENDING":
		return {"success": False, "message": f"Penalty is in {doc.approval_status} status, must be PENDING to reject"}
	doc.approval_status = "REJECTED"
	if reason:
		doc.remarks = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA penalty rejected"}


@frappe.whitelist()
def waive_sla_penalty(name, reason):
	"""Waive an SLA penalty (requires Dept Head+)."""
	_require_om_approval_access()
	doc = frappe.get_doc("GE SLA Penalty Record", name)
	if doc.approval_status not in ("PENDING", "APPROVED"):
		return {"success": False, "message": f"Cannot waive a penalty in {doc.approval_status} status"}
	doc.approval_status = "WAIVED"
	doc.remarks = reason
	doc.approved_by = frappe.session.user
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "SLA penalty waived"}


@frappe.whitelist()
def get_sla_penalty_stats(project=None):
	"""Aggregate SLA penalty stats across tickets."""
	_require_om_read_access()
	filters = {}
	if project:
		# Join through ticket
		ticket_names = [t.name for t in frappe.get_all("GE Ticket", filters={"linked_project": project}, fields=["name"])]
		if ticket_names:
			filters["linked_ticket"] = ["in", ticket_names]
		else:
			return {"success": True, "data": {"total": 0, "pending": 0, "approved": 0, "rejected": 0, "waived": 0, "total_penalty": 0}}
	rows = frappe.get_all("GE SLA Penalty Record", filters=filters, fields=["approval_status", "calculated_penalty"])
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"pending": sum(1 for r in rows if r.approval_status == "PENDING"),
			"approved": sum(1 for r in rows if r.approval_status == "APPROVED"),
			"rejected": sum(1 for r in rows if r.approval_status == "REJECTED"),
			"waived": sum(1 for r in rows if r.approval_status == "WAIVED"),
			"total_penalty": sum(r.calculated_penalty or 0 for r in rows),
		},
	}


# ── RMA Tracker APIs ─────────────────────────────────────────

@frappe.whitelist()
def get_rma_trackers(project=None, status=None, ticket=None):
	"""Return RMA trackers."""
	_require_rma_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if status:
		filters["rma_status"] = status
	if ticket:
		filters["linked_ticket"] = ticket
	data = frappe.get_all(
		"GE RMA Tracker",
		filters=filters,
		fields=[
			"name", "linked_ticket", "linked_project", "item_link",
			"asset_serial_number", "qty", "faulty_date", "dispatch_destination",
			"service_partner_name", "warranty_status", "repairability_status",
			"rma_reference_no", "approval_status", "rma_purchase_order_no",
			"repairing_status", "aging_days", "rma_status", "rework_required",
			"replaced_serial_number", "refund_approved", "repair_cost",
			"estimated_resolution_date", "actual_resolution_date",
			"closed_on", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_rma_tracker(name):
	"""Return a single RMA tracker."""
	_require_rma_read_access()
	doc = frappe.get_doc("GE RMA Tracker", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_rma_tracker(data):
	"""Create an RMA tracker."""
	_require_rma_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	if values.get("linked_ticket"):
		ticket = frappe.get_doc("GE Ticket", values["linked_ticket"])
		if ticket.linked_rma:
			return {"success": False, "message": f"Ticket already linked to RMA {ticket.linked_rma}"}
		values.setdefault("linked_project", ticket.linked_project)
		values.setdefault("asset_serial_number", ticket.asset_serial_no)
		values.setdefault("failure_reason", ticket.description or ticket.title)
	doc = frappe.get_doc({"doctype": "GE RMA Tracker", **values})
	doc.insert()
	if values.get("linked_ticket"):
		ticket.is_rma = 1
		ticket.linked_rma = doc.name
		ticket.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "RMA tracker created"}


@frappe.whitelist()
def update_rma_tracker(name, data):
	"""Update an RMA tracker."""
	_require_rma_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE RMA Tracker", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "RMA tracker updated"}


@frappe.whitelist()
def convert_ticket_to_rma(ticket_name, data=None):
	"""Create an RMA tracker from a helpdesk ticket."""
	_require_rma_write_access()
	ticket = frappe.get_doc("GE Ticket", ticket_name)
	if ticket.linked_rma:
		return {"success": False, "message": f"Ticket already linked to RMA {ticket.linked_rma}"}

	values = json.loads(data) if isinstance(data, str) else (data or {})
	payload = {
		"doctype": "GE RMA Tracker",
		"linked_ticket": ticket.name,
		"linked_project": values.get("linked_project") or ticket.linked_project,
		"item_link": values.get("item_link"),
		"asset_serial_number": values.get("asset_serial_number") or ticket.asset_serial_no,
		"qty": values.get("qty") or 1,
		"faulty_date": values.get("faulty_date") or frappe.utils.nowdate(),
		"failure_reason": values.get("failure_reason") or ticket.description or ticket.title,
		"field_rca": values.get("field_rca"),
		"dispatch_destination": values.get("dispatch_destination"),
		"service_partner_name": values.get("service_partner_name"),
		"warranty_status": values.get("warranty_status"),
		"repairability_status": values.get("repairability_status"),
		"approval_status": values.get("approval_status") or "PENDING",
		"rma_status": values.get("rma_status") or "PENDING",
	}

	doc = frappe.get_doc(payload)
	doc.insert()

	ticket.is_rma = 1
	ticket.linked_rma = doc.name
	ticket.append("actions", {
		"action_type": "STATUS_CHANGE",
		"by_user": frappe.session.user,
		"at_time": frappe.utils.now_datetime(),
		"notes": f"Converted to RMA {doc.name}",
	})
	ticket.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": f"Ticket converted to RMA {doc.name}"}


@frappe.whitelist()
def delete_rma_tracker(name):
	"""Delete an RMA tracker."""
	_require_rma_write_access()
	doc = frappe.get_doc("GE RMA Tracker", name)
	if doc.rma_status not in ("PENDING", "REJECTED"):
		return {"success": False, "message": f"Cannot delete RMA in {doc.rma_status} status"}
	frappe.delete_doc("GE RMA Tracker", name)
	frappe.db.commit()
	return {"success": True, "message": "RMA tracker deleted"}


@frappe.whitelist()
def approve_rma(name):
	"""Approve an RMA request."""
	_require_rma_approval_access()
	doc = frappe.get_doc("GE RMA Tracker", name)
	if doc.rma_status != "PENDING":
		return {"success": False, "message": f"RMA must be PENDING to approve (current: {doc.rma_status})"}
	doc.rma_status = "APPROVED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "RMA approved"}


@frappe.whitelist()
def reject_rma(name, reason=None):
	"""Reject an RMA request."""
	_require_rma_approval_access()
	doc = frappe.get_doc("GE RMA Tracker", name)
	if doc.rma_status != "PENDING":
		return {"success": False, "message": f"RMA must be PENDING to reject (current: {doc.rma_status})"}
	doc.rma_status = "REJECTED"
	if reason:
		doc.remarks = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "RMA rejected"}


@frappe.whitelist()
def update_rma_status(name, new_status):
	"""Advance an RMA through its lifecycle."""
	_require_rma_write_access()
	valid_transitions = {
		"APPROVED": ["IN_TRANSIT"],
		"IN_TRANSIT": ["RECEIVED_AT_SERVICE_CENTER"],
		"RECEIVED_AT_SERVICE_CENTER": ["UNDER_REPAIR"],
		"UNDER_REPAIR": ["REPAIRED", "REPLACED"],
	}
	doc = frappe.get_doc("GE RMA Tracker", name)
	allowed = valid_transitions.get(doc.rma_status, [])
	if new_status not in allowed:
		return {"success": False, "message": f"Cannot transition from {doc.rma_status} to {new_status}. Allowed: {allowed}"}
	doc.rma_status = new_status
	if new_status in ("REPAIRED", "REPLACED"):
		doc.actual_resolution_date = frappe.utils.nowdate()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": f"RMA status updated to {new_status}"}


@frappe.whitelist()
def close_rma(name):
	"""Close a completed RMA."""
	_require_rma_write_access()
	doc = frappe.get_doc("GE RMA Tracker", name)
	if doc.rma_status not in ("REPAIRED", "REPLACED", "REJECTED"):
		return {"success": False, "message": f"RMA must be REPAIRED, REPLACED, or REJECTED to close (current: {doc.rma_status})"}
	doc.closed_on = frappe.utils.nowdate()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "RMA closed"}


@frappe.whitelist()
def get_rma_stats(project=None):
	"""Aggregate RMA stats."""
	_require_rma_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	rows = frappe.get_all(
		"GE RMA Tracker",
		filters=filters,
		fields=["rma_status", "rework_required", "refund_approved", "warranty_status", "repairability_status", "approval_status"],
	)
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"pending": sum(1 for r in rows if r.rma_status == "PENDING"),
			"approved": sum(1 for r in rows if r.rma_status == "APPROVED"),
			"in_transit": sum(1 for r in rows if r.rma_status == "IN_TRANSIT"),
			"under_repair": sum(1 for r in rows if r.rma_status == "UNDER_REPAIR"),
			"repaired": sum(1 for r in rows if r.rma_status == "REPAIRED"),
			"replaced": sum(1 for r in rows if r.rma_status == "REPLACED"),
			"rejected": sum(1 for r in rows if r.rma_status == "REJECTED"),
			"rework_count": sum(1 for r in rows if r.rework_required),
			"refund_count": sum(1 for r in rows if r.refund_approved),
			"under_warranty": sum(1 for r in rows if r.warranty_status == "UNDER_WARRANTY"),
			"non_warranty": sum(1 for r in rows if r.warranty_status == "NON_WARRANTY"),
			"repairable": sum(1 for r in rows if r.repairability_status == "REPAIRABLE"),
			"non_repairable": sum(1 for r in rows if r.repairability_status == "NON_REPAIRABLE"),
			"awaiting_approval": sum(1 for r in rows if r.approval_status == "PENDING"),
		},
	}


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
	_require_roles(ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
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
	_require_roles(ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	doc = frappe.get_doc("Role", name)
	doc.disabled = 0 if cint(doc.disabled) else 1
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Role updated"}


@frappe.whitelist()
def get_users():
	"""Return Frappe system users, enriched with role and employee context."""
	_require_roles(ROLE_PRESALES_HEAD, ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
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
	_require_roles(ROLE_PRESALES_HEAD, ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
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


@frappe.whitelist()
def get_documents(folder=None):
	"""Return uploaded files for the document briefcase UI."""
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_HR_MANAGER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)
	filters = {"is_folder": 0}
	if folder:
		filters["folder"] = folder
	data = frappe.get_all(
		"File",
		filters=filters,
		fields=[
			"name",
			"file_name",
			"file_url",
			"file_size",
			"folder",
			"is_private",
			"attached_to_doctype",
			"attached_to_name",
			"creation",
			"modified",
			"owner",
		],
		order_by="modified desc",
	)
	for row in data:
		row["uploaded_by"] = row.owner
	return {"success": True, "data": data}


@frappe.whitelist()
def get_project_documents(folder=None, project=None, category=None):
	"""Return custom GE Project Document records."""
	_require_document_read_access()
	filters = {}
	if folder:
		filters["folder"] = folder
	if project:
		filters["linked_project"] = project
	if category:
		filters["category"] = category
	data = frappe.get_all(
		"GE Project Document",
		filters=filters,
		fields=[
			"name",
			"document_name",
			"folder",
			"linked_project",
			"category",
			"file",
			"version",
			"uploaded_by",
			"uploaded_on",
			"remarks",
			"creation",
			"modified",
			"owner",
		],
		order_by="modified desc, creation desc",
	)
	for row in data:
		row["file_name"] = row.document_name
		row["file_url"] = row.file
		row["uploaded_by"] = row.uploaded_by or row.owner
	return {"success": True, "data": data}


@frappe.whitelist()
def get_document_folders(project=None, department=None, source=None):
	"""Return document folders from File or custom GE Document Folder records."""
	use_custom = bool(project or department or source == "custom")
	if use_custom:
		_require_document_read_access()
		filters = {}
		if project:
			filters["linked_project"] = project
		if department:
			filters["department"] = department
		folders = frappe.get_all(
			"GE Document Folder",
			filters=filters,
			fields=["name", "folder_name", "parent_folder", "linked_project", "department", "sort_order", "creation", "owner"],
			order_by="sort_order asc, creation asc",
		)
		count_rows = frappe.db.sql(
			"""
				select folder, count(*) as file_count
				from `tabGE Project Document`
				where ifnull(folder, '') != ''
				group by folder
			""",
			as_dict=True,
		)
		counts = {row.folder: row.file_count for row in count_rows}
		data = []
		for folder_row in folders:
			row = dict(folder_row)
			row["file_name"] = row["folder_name"]
			row["folder"] = row.get("parent_folder") or "Home"
			row["file_count"] = counts.get(folder_row.name, 0)
			data.append(row)
		return {"success": True, "data": data}

	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_HR_MANAGER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)
	folders = frappe.get_all(
		"File",
		filters={"is_folder": 1},
		fields=["name", "file_name", "folder", "creation", "owner"],
		order_by="file_name asc, creation asc",
	)
	count_rows = frappe.db.sql(
		"""
		select folder, count(*) as file_count
		from `tabFile`
		where ifnull(is_folder, 0) = 0 and ifnull(folder, '') != ''
		group by folder
		""",
		as_dict=True,
	)
	counts = {row.folder: row.file_count for row in count_rows}
	data = []
	for folder_row in folders:
		row = dict(folder_row)
		row["file_count"] = counts.get(folder_row.name, 0)
		data.append(row)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_document_folder(data):
	"""Create a custom document folder under GE Document Folder."""
	_require_document_write_access()
	values = _parse_payload(data)
	doc = frappe.get_doc({"doctype": "GE Document Folder", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Document folder created"}


@frappe.whitelist()
def upload_project_document(data):
	"""Create a custom GE Project Document record."""
	_require_document_write_access()
	values = _parse_payload(data)
	values.setdefault("uploaded_by", frappe.session.user)
	values.setdefault("uploaded_on", frappe.utils.now_datetime())
	if not values.get("version"):
		latest_version = frappe.db.get_value(
			"GE Project Document",
			{
				"document_name": values.get("document_name"),
				"linked_project": values.get("linked_project"),
			},
			"max(version)",
		) or 0
		values["version"] = int(latest_version) + 1
	doc = frappe.get_doc({"doctype": "GE Project Document", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Project document uploaded"}


@frappe.whitelist()
def get_document_versions(name):
	"""Return all versions of a project document grouped by logical document name and project."""
	_require_document_read_access()
	doc = frappe.get_doc("GE Project Document", name)
	data = frappe.get_all(
		"GE Project Document",
		filters={"document_name": doc.document_name, "linked_project": doc.linked_project},
		fields=[
			"name",
			"document_name",
			"folder",
			"linked_project",
			"category",
			"file",
			"version",
			"uploaded_by",
			"uploaded_on",
			"remarks",
			"creation",
		],
		order_by="version desc, creation desc",
	)
	return {"success": True, "data": data}


def _get_finance_request_rows(filters):
	return frappe.get_all(
		"GE EMD PBG Instrument",
		filters=filters,
		fields=[
			"name",
			"instrument_type",
			"linked_tender",
			"instrument_number",
			"amount",
			"status",
			"bank_name",
			"issue_date",
			"expiry_date",
			"remarks",
			"creation",
			"owner",
		],
		order_by="creation desc",
	)


@frappe.whitelist()
def get_finance_requests(status=None, instrument_type=None, tender=None):
	"""Return finance requests backed by GE EMD/PBG instruments."""
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_ACCOUNTS,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)
	filters = {}
	if status:
		filters["status"] = status
	if instrument_type:
		filters["instrument_type"] = instrument_type
	if tender:
		filters["linked_tender"] = tender
	return {"success": True, "data": _get_finance_request_rows(filters)}


@frappe.whitelist()
def approve_finance_request(name):
	"""Approve a finance request by activating the instrument."""
	_require_roles(ROLE_ACCOUNTS, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	doc = frappe.get_doc("GE EMD PBG Instrument", name)
	doc.status = "Active"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Finance request approved"}


@frappe.whitelist()
def deny_finance_request(name, reason=None):
	"""Reject a finance request."""
	_require_roles(ROLE_ACCOUNTS, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	doc = frappe.get_doc("GE EMD PBG Instrument", name)
	doc.status = "Rejected"
	if reason:
		doc.remarks = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Finance request rejected"}


@frappe.whitelist()
def get_finance_request_stats():
	"""Return aggregate counts and amounts for the finance request dashboard."""
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_ACCOUNTS,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)
	total = frappe.db.count("GE EMD PBG Instrument")
	pending = frappe.db.count("GE EMD PBG Instrument", {"status": "Pending"})
	active = frappe.db.count("GE EMD PBG Instrument", {"status": "Active"})
	released = frappe.db.count("GE EMD PBG Instrument", {"status": "Released"})
	refunded = frappe.db.count("GE EMD PBG Instrument", {"status": "Refunded"})
	rejected = frappe.db.count("GE EMD PBG Instrument", {"status": "Rejected"})
	emd_count = frappe.db.count("GE EMD PBG Instrument", {"instrument_type": "EMD"})
	pbg_count = frappe.db.count("GE EMD PBG Instrument", {"instrument_type": "PBG"})
	total_amount = (
		frappe.db.sql("SELECT COALESCE(SUM(amount),0) FROM `tabGE EMD PBG Instrument`")[0][0] or 0
	)
	pending_amount = (
		frappe.db.sql(
			"SELECT COALESCE(SUM(amount),0) FROM `tabGE EMD PBG Instrument` WHERE status='Pending'"
		)[0][0]
		or 0
	)
	return {
		"success": True,
		"data": {
			"total": total,
			"pending": pending,
			"active": active,
			"released": released,
			"refunded": refunded,
			"rejected": rejected,
			"total_amount": float(total_amount),
			"pending_amount": float(pending_amount),
			"emd_count": emd_count,
			"pbg_count": pbg_count,
		},
	}


@frappe.whitelist()
def get_finance_mis(tender=None, status=None, instrument_type=None, from_date=None, to_date=None):
	"""Return finance request MIS rows with optional date filtering."""
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_ACCOUNTS,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)
	filters = {}
	if tender:
		filters["linked_tender"] = tender
	if status:
		filters["status"] = status
	if instrument_type:
		filters["instrument_type"] = instrument_type
	_apply_creation_date_filters(filters, from_date, to_date, fieldname="creation")
	return {"success": True, "data": _get_finance_request_rows(filters)}


@frappe.whitelist()
def get_login_mis(from_date=None, to_date=None, user=None):
	"""Return login/logout activity from Activity Log."""
	_require_roles(ROLE_PRESALES_HEAD, ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	filters = {"operation": ["in", ["Login", "Logout"]]}
	if user:
		filters["user"] = ["like", f"%{user}%"]
	_apply_creation_date_filters(filters, from_date, to_date, fieldname="creation")
	data = frappe.get_all(
		"Activity Log",
		filters=filters,
		fields=["name", "user", "full_name", "creation", "ip_address", "operation"],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_sales_mis(from_date=None, to_date=None):
	"""Return tender ownership/status aggregation for the sales MIS page."""
	_require_roles(ROLE_PRESALES_HEAD, ROLE_PRESALES_EXECUTIVE, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	filters = {}
	_apply_creation_date_filters(filters, from_date, to_date, fieldname="creation")
	rows = frappe.get_all("GE Tender", filters=filters, fields=["owner", "status"], order_by="owner asc")
	by_user = {}
	for row in rows:
		user_key = row.owner or "Unassigned"
		bucket = by_user.setdefault(
			user_key,
			{
				"user": user_key,
				"assigned": 0,
				"in_process": 0,
				"submitted": 0,
				"cancelled": 0,
				"awarded": 0,
				"lost": 0,
				"rejected": 0,
				"dropped": 0,
				"reopened": 0,
				"total": 0,
			},
		)
		status = (row.status or "").upper()
		if status == "DRAFT":
			bucket["assigned"] += 1
		elif status == "UNDER_EVALUATION":
			bucket["in_process"] += 1
		elif status == "SUBMITTED":
			bucket["submitted"] += 1
		elif status == "CANCELLED":
			bucket["cancelled"] += 1
		elif status == "WON":
			bucket["awarded"] += 1
		elif status == "LOST":
			bucket["lost"] += 1
		elif status == "DROPPED":
			bucket["dropped"] += 1
		bucket["total"] += 1
	data = sorted(by_user.values(), key=lambda row: row["user"].lower())
	return {"success": True, "data": data}


@frappe.whitelist()
def get_pending_approvals():
	"""Return a lightweight cross-module pending approval inbox."""
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_ACCOUNTS,
		ROLE_HR_MANAGER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)
	records = []

	for row in frappe.get_all(
		"GE EMD PBG Instrument",
		filters={"status": "Pending"},
		fields=["name", "linked_tender", "instrument_type", "owner", "creation"],
		order_by="creation desc",
	):
		records.append(
			{
				"id": row.name,
				"tender_id": row.linked_tender or "-",
				"approval_for": f"{row.instrument_type} Finance Request",
				"approval_from": "Accounts / Department Head",
				"requester": row.owner,
				"request_date": row.creation,
				"status": "Pending",
				"type": "Finance",
			}
		)

	for row in frappe.get_all(
		"GE BOQ",
		filters={"status": "PENDING_APPROVAL"},
		fields=["name", "linked_tender", "owner", "creation"],
		order_by="creation desc",
	):
		records.append(
			{
				"id": row.name,
				"tender_id": row.linked_tender or "-",
				"approval_for": "BOQ Approval",
				"approval_from": "Department Head",
				"requester": row.owner,
				"request_date": row.creation,
				"status": "Pending",
				"type": "Engineering",
			}
		)

	for row in frappe.get_all(
		"GE Cost Sheet",
		filters={"status": "PENDING_APPROVAL"},
		fields=["name", "linked_tender", "owner", "creation"],
		order_by="creation desc",
	):
		records.append(
			{
				"id": row.name,
				"tender_id": row.linked_tender or "-",
				"approval_for": "Cost Sheet Approval",
				"approval_from": "Department Head",
				"requester": row.owner,
				"request_date": row.creation,
				"status": "Pending",
				"type": "Costing",
			}
		)

	for row in frappe.get_all(
		"GE Employee Onboarding",
		filters={"onboarding_status": "UNDER_REVIEW"},
		fields=["name", "employee_name", "owner", "creation"],
		order_by="creation desc",
	):
		records.append(
			{
				"id": row.name,
				"tender_id": "-",
				"approval_for": f"Onboarding Review - {row.employee_name}",
				"approval_from": "HR Manager",
				"requester": row.owner,
				"request_date": row.creation,
				"status": "Pending",
				"type": "HR",
			}
		)

	for row in frappe.get_all(
		"GE Invoice",
		filters={"status": "SUBMITTED"},
		fields=["name", "linked_project", "owner", "creation"],
		order_by="creation desc",
	):
		records.append(
			{
				"id": row.name,
				"tender_id": row.linked_project or "-",
				"approval_for": "Invoice Approval",
				"approval_from": "Accounts",
				"requester": row.owner,
				"request_date": row.creation,
				"status": "Pending",
				"type": "Billing",
			}
		)

	records.sort(key=lambda row: row["request_date"] or "", reverse=True)
	return {"success": True, "data": records}


def _get_sla_dashboard_summary(project=None):
	filters = {}
	if project:
		ticket_names = [row.name for row in frappe.get_all("GE Ticket", filters={"linked_project": project}, fields=["name"])]
		if not ticket_names:
			return {
				"total": 0,
				"at_risk": 0,
				"response_compliance_pct": 0,
				"resolution_compliance_pct": 0,
				"avg_resolution_minutes": 0,
			}
		filters["linked_ticket"] = ["in", ticket_names]

	rows = frappe.get_all(
		"GE SLA Timer",
		filters=filters,
		fields=["response_sla_met", "resolution_sla_met", "resolution_deadline", "closed_on", "current_elapsed_minutes"],
	)
	now_dt = frappe.utils.now_datetime()
	closed_rows = [row for row in rows if row.closed_on]
	return {
		"total": len(rows),
		"at_risk": sum(1 for row in rows if row.resolution_deadline and not row.closed_on and frappe.utils.get_datetime(row.resolution_deadline) < now_dt),
		"response_compliance_pct": round((sum(1 for row in rows if row.response_sla_met) * 100.0 / len(rows)), 2) if rows else 0,
		"resolution_compliance_pct": round((sum(1 for row in rows if row.resolution_sla_met) * 100.0 / len(rows)), 2) if rows else 0,
		"avg_resolution_minutes": round((sum(row.current_elapsed_minutes or 0 for row in closed_rows) / len(closed_rows)), 2) if closed_rows else 0,
	}


def _get_invoice_aging_summary(project=None):
	filters = {}
	if project:
		filters["linked_project"] = project
	rows = frappe.get_all(
		"GE Invoice",
		filters=filters,
		fields=["status", "net_receivable", "scheduled_milestone_date"],
	)
	buckets = {
		"current": 0,
		"age_1_30": 0,
		"age_31_60": 0,
		"age_61_90": 0,
		"age_90_plus": 0,
	}
	for row in rows:
		if row.status in {"PAYMENT_RECEIVED", "CANCELLED"}:
			continue
		amount = row.net_receivable or 0
		if not row.scheduled_milestone_date:
			buckets["current"] += amount
			continue
		age_days = frappe.utils.date_diff(frappe.utils.nowdate(), row.scheduled_milestone_date)
		if age_days <= 0:
			buckets["current"] += amount
		elif age_days <= 30:
			buckets["age_1_30"] += amount
		elif age_days <= 60:
			buckets["age_31_60"] += amount
		elif age_days <= 90:
			buckets["age_61_90"] += amount
		else:
			buckets["age_90_plus"] += amount
	return buckets


def _list_generic_docs(doctype, filters, fields, order_by="creation desc"):
	return frappe.get_all(doctype, filters=filters, fields=fields, order_by=order_by)


def _create_generic_doc(doctype, data):
	values = _parse_payload(data)
	doc = frappe.get_doc({"doctype": doctype, **values})
	doc.insert()
	frappe.db.commit()
	return doc


def _update_generic_doc(doctype, name, data):
	values = _parse_payload(data)
	doc = frappe.get_doc(doctype, name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return doc


def _delete_generic_doc(doctype, name):
	frappe.delete_doc(doctype, name)
	frappe.db.commit()


@frappe.whitelist()
def get_om_dashboard(project=None):
	"""Aggregate O&M dashboard metrics."""
	_require_om_read_access()
	return {
		"success": True,
		"data": {
			"tickets": get_ticket_stats(project).get("data", {}),
			"sla": _get_sla_dashboard_summary(project),
			"rma": get_rma_stats(project).get("data", {}),
		},
	}


@frappe.whitelist()
def get_accounts_dashboard(project=None):
	"""Aggregate accounts dashboard metrics."""
	_require_billing_read_access()
	invoice_stats = get_invoice_stats(project).get("data", {})
	retention_stats = get_retention_stats(project).get("data", {})
	penalty_stats = get_penalty_stats(project).get("data", {})
	tax_rows = frappe.get_all("GE Invoice", filters={"linked_project": project} if project else {}, fields=["gst_amount", "tds_amount"])
	return {
		"success": True,
		"data": {
			"invoices": invoice_stats,
			"retention": retention_stats,
			"penalties": penalty_stats,
			"taxes": {
				"gst_total": sum(row.gst_amount or 0 for row in tax_rows),
				"tds_total": sum(row.tds_amount or 0 for row in tax_rows),
			},
			"aging": _get_invoice_aging_summary(project),
		},
	}


@frappe.whitelist()
def get_presales_dashboard():
	"""Aggregate presales dashboard metrics."""
	_require_tender_read_access()
	checklist_rows = frappe.get_all("GE Tender Checklist Item", fields=["completion_pct"])
	avg_completion = round(
		(sum(row.completion_pct or 0 for row in checklist_rows) / len(checklist_rows)), 2
	) if checklist_rows else 0
	return {
		"success": True,
		"data": {
			"tenders": get_tender_stats().get("data", {}),
			"boqs": get_boq_stats().get("data", {}),
			"surveys": get_survey_stats().get("data", {}),
			"finance_requests": get_finance_request_stats().get("data", {}),
			"checklist_completion_pct": avg_completion,
		},
	}


@frappe.whitelist()
def get_execution_dashboard(project=None):
	"""Aggregate execution dashboard metrics."""
	_require_execution_read_access()
	site_rows = frappe.get_all("GE Site", filters={"linked_project": project} if project else {}, fields=["status", "location_progress_pct"])
	milestone_rows = frappe.get_all(
		"GE Milestone",
		filters={"linked_project": project} if project else {},
		fields=["status", "progress_pct", "planned_end_date", "actual_end_date"],
	)
	manpower_filters = {"linked_project": project} if project else {}
	manpower_today_filters = dict(manpower_filters)
	manpower_today_filters["log_date"] = frappe.utils.nowdate()
	manpower_rows = frappe.get_all("GE Manpower Log", filters=manpower_filters, fields=["log_date", "linked_site"])
	dependency_rows = frappe.get_all(
		"GE Dependency Rule",
		filters={"linked_project": project} if project else {},
		fields=["active", "hard_block"],
	)
	overdue_milestones = sum(
		1
		for row in milestone_rows
		if row.planned_end_date and not row.actual_end_date and frappe.utils.date_diff(frappe.utils.nowdate(), row.planned_end_date) > 0
	)
	return {
		"success": True,
		"data": {
			"sites": {
				"total": len(site_rows),
				"avg_progress_pct": round((sum(row.location_progress_pct or 0 for row in site_rows) / len(site_rows)), 2) if site_rows else 0,
				"active": sum(1 for row in site_rows if (row.status or "").upper() not in {"COMPLETED", "CLOSED"}),
			},
			"dprs": get_dpr_stats(project).get("data", {}),
			"milestones": {
				"total": len(milestone_rows),
				"completed": sum(1 for row in milestone_rows if (row.status or "").upper() == "COMPLETED"),
				"avg_progress_pct": round((sum(row.progress_pct or 0 for row in milestone_rows) / len(milestone_rows)), 2) if milestone_rows else 0,
				"overdue": overdue_milestones,
			},
			"manpower": {
				"total_logs": len(manpower_rows),
				"today_logs": frappe.db.count("GE Manpower Log", manpower_today_filters),
			},
			"dependencies": {
				"active_rules": sum(1 for row in dependency_rows if row.active),
				"hard_blocks": sum(1 for row in dependency_rows if row.active and row.hard_block),
			},
		},
	}


@frappe.whitelist()
def get_project_head_dashboard(project=None):
	"""Aggregate project-head dashboard metrics."""
	_require_roles(ROLE_PROJECT_HEAD, ROLE_PROJECT_MANAGER, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	invoice_rows = frappe.get_all(
		"GE Invoice",
		filters={"linked_project": project} if project else {},
		fields=["status", "net_receivable"],
	)
	sites = frappe.get_all("GE Site", filters={"linked_project": project} if project else {}, fields=["name"])
	logged_sites_today = {
		row.linked_site
		for row in frappe.get_all(
			"GE Manpower Log",
			filters={"linked_project": project, "log_date": frappe.utils.nowdate()} if project else {"log_date": frappe.utils.nowdate()},
			fields=["linked_site"],
		)
		if row.linked_site
	}
	return {
		"success": True,
		"data": {
			"indents": get_indent_stats(project).get("data", {}),
			"execution": get_execution_dashboard(project).get("data", {}),
			"billing": {
				"submitted": sum(1 for row in invoice_rows if row.status == "SUBMITTED"),
				"approved": sum(1 for row in invoice_rows if row.status == "APPROVED"),
				"payment_pending_amount": sum((row.net_receivable or 0) for row in invoice_rows if row.status in {"SUBMITTED", "APPROVED"}),
			},
			"sla": _get_sla_dashboard_summary(project),
			"manpower": {
				"sites_without_today_log": sum(1 for row in sites if row.name not in logged_sites_today),
				"sites_with_today_log": sum(1 for row in sites if row.name in logged_sites_today),
			},
		},
	}


@frappe.whitelist()
def get_procurement_dashboard(project=None):
	"""Aggregate procurement dashboard metrics."""
	_require_procurement_read_access()
	invoice_rows = frappe.get_all(
		"GE Invoice",
		filters={"linked_project": project} if project else {},
		fields=["status", "net_receivable"],
	)
	return {
		"success": True,
		"data": {
			"indents": get_indent_stats(project).get("data", {}),
			"purchase_orders": get_po_stats(project).get("data", {}),
			"vendor_comparisons": get_vendor_comparison_stats().get("data", {}),
			"dispatch": get_dispatch_challan_stats().get("data", {}),
			"payments": {
				"approved_unpaid_count": sum(1 for row in invoice_rows if row.status == "APPROVED"),
				"approved_unpaid_amount": sum((row.net_receivable or 0) for row in invoice_rows if row.status == "APPROVED"),
			},
		},
	}


@frappe.whitelist()
def get_stores_dashboard(warehouse=None):
	"""Aggregate stores dashboard metrics."""
	_require_store_read_access()
	stock_rows = frappe.get_all(
		"Bin",
		filters={"warehouse": warehouse} if warehouse else {},
		fields=["actual_qty", "valuation_rate"],
	)
	stock_aging = get_stock_aging(warehouse=warehouse, limit_page_length=max(len(stock_rows), 1)).get("data", {})
	return {
		"success": True,
		"data": {
			"grns": get_grn_stats().get("data", {}),
			"stock_position": {
				"item_count": len(stock_rows),
				"total_qty": sum(row.actual_qty or 0 for row in stock_rows),
				"total_value": sum((row.actual_qty or 0) * (row.valuation_rate or 0) for row in stock_rows),
				"negative_stock_count": sum(1 for row in stock_rows if (row.actual_qty or 0) < 0),
			},
			"stock_aging": stock_aging.get("buckets", {}),
			"dispatch": get_dispatch_challan_stats().get("data", {}),
		},
	}


@frappe.whitelist()
def get_executive_dashboard():
	"""Aggregate executive dashboard metrics across modules."""
	_require_roles(ROLE_DIRECTOR, ROLE_DEPARTMENT_HEAD)
	budget_rows = frappe.get_all("GE Budget Allocation", fields=["sanctioned_amount", "revised_amount", "spent_to_date", "utilization_pct", "status"])
	pending_approvals = get_pending_approvals().get("data", [])
	return {
		"success": True,
		"data": {
			"projects": {
				"total": frappe.db.count("Project"),
				"active_sites": frappe.db.count("GE Site", {"status": ["not in", ["COMPLETED", "CLOSED"]]}),
			},
			"budget": {
				"allocations": len(budget_rows),
				"sanctioned_total": sum(row.sanctioned_amount or 0 for row in budget_rows),
				"revised_total": sum((row.revised_amount or 0) or (row.sanctioned_amount or 0) for row in budget_rows),
				"spent_total": sum(row.spent_to_date or 0 for row in budget_rows),
				"avg_utilization_pct": round((sum(row.utilization_pct or 0 for row in budget_rows) / len(budget_rows)), 2) if budget_rows else 0,
			},
			"sla": _get_sla_dashboard_summary(),
			"tickets": get_ticket_stats().get("data", {}),
			"pending_approvals": {
				"count": len(pending_approvals),
				"items": pending_approvals[:10],
			},
		},
	}


@frappe.whitelist()
def get_project_document(name):
	"""Return a single custom project document."""
	_require_document_read_access()
	doc = frappe.get_doc("GE Project Document", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def update_document_folder(name, data):
	"""Update a custom document folder."""
	_require_document_write_access()
	doc = _update_generic_doc("GE Document Folder", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Document folder updated"}


@frappe.whitelist()
def delete_document_folder(name):
	"""Delete a custom document folder."""
	_require_document_write_access()
	_delete_generic_doc("GE Document Folder", name)
	return {"success": True, "message": "Document folder deleted"}


@frappe.whitelist()
def update_project_document(name, data):
	"""Update a custom project document."""
	_require_document_write_access()
	doc = _update_generic_doc("GE Project Document", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Project document updated"}


@frappe.whitelist()
def delete_project_document(name):
	"""Delete a custom project document."""
	_require_document_write_access()
	_delete_generic_doc("GE Project Document", name)
	return {"success": True, "message": "Project document deleted"}


@frappe.whitelist()
def get_drawings(project=None, site=None, status=None, client_approval_status=None):
	"""Return engineering drawings."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	if client_approval_status:
		filters["client_approval_status"] = client_approval_status
	data = _list_generic_docs(
		"GE Drawing",
		filters,
		["name", "drawing_number", "title", "revision", "status", "client_approval_status", "linked_project", "linked_site", "approved_by", "approval_date", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_drawing(name):
	_require_execution_read_access()
	return {"success": True, "data": frappe.get_doc("GE Drawing", name).as_dict()}


@frappe.whitelist()
def create_drawing(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Drawing", data)
	return {"success": True, "data": doc.as_dict(), "message": "Drawing created"}


@frappe.whitelist()
def update_drawing(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Drawing", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Drawing updated"}


@frappe.whitelist()
def delete_drawing(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Drawing", name)
	return {"success": True, "message": "Drawing deleted"}


@frappe.whitelist()
def get_technical_deviations(project=None, drawing=None, status=None):
	"""Return technical deviations."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if drawing:
		filters["linked_drawing"] = drawing
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE Technical Deviation",
		filters,
		["name", "deviation_id", "linked_project", "linked_drawing", "status", "impact", "raised_by", "approved_by", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_technical_deviation(name):
	_require_execution_read_access()
	return {"success": True, "data": frappe.get_doc("GE Technical Deviation", name).as_dict()}


@frappe.whitelist()
def create_technical_deviation(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Technical Deviation", data)
	return {"success": True, "data": doc.as_dict(), "message": "Technical deviation created"}


@frappe.whitelist()
def update_technical_deviation(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Technical Deviation", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Technical deviation updated"}


@frappe.whitelist()
def delete_technical_deviation(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Technical Deviation", name)
	return {"success": True, "message": "Technical deviation deleted"}


@frappe.whitelist()
def get_change_requests(project=None, status=None):
	"""Return change requests."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE Change Request",
		filters,
		["name", "cr_number", "linked_project", "status", "cost_impact", "schedule_impact_days", "raised_by", "approved_by", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_change_request(name):
	_require_execution_read_access()
	return {"success": True, "data": frappe.get_doc("GE Change Request", name).as_dict()}


@frappe.whitelist()
def create_change_request(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Change Request", data)
	return {"success": True, "data": doc.as_dict(), "message": "Change request created"}


@frappe.whitelist()
def update_change_request(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Change Request", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Change request updated"}


@frappe.whitelist()
def delete_change_request(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Change Request", name)
	return {"success": True, "message": "Change request deleted"}


@frappe.whitelist()
def get_device_registers(project=None, site=None, device_type=None):
	"""Return device register entries."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if device_type:
		filters["device_type"] = device_type
	data = _list_generic_docs(
		"GE Device Register",
		filters,
		["name", "device_name", "device_type", "linked_project", "linked_site", "serial_no", "ip_address", "warranty_end_date", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_device_register(name):
	_require_execution_read_access()
	return {"success": True, "data": frappe.get_doc("GE Device Register", name).as_dict()}


@frappe.whitelist()
def create_device_register(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Device Register", data)
	return {"success": True, "data": doc.as_dict(), "message": "Device register entry created"}


@frappe.whitelist()
def update_device_register(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Device Register", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Device register entry updated"}


@frappe.whitelist()
def delete_device_register(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Device Register", name)
	return {"success": True, "message": "Device register entry deleted"}


@frappe.whitelist()
def get_ip_pools(project=None, site=None, status=None):
	"""Return IP pools."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE IP Pool",
		filters,
		["name", "network_name", "linked_project", "linked_site", "subnet", "gateway", "vlan_id", "total_ips", "allocated_ips", "status", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_ip_pool(name):
	_require_execution_read_access()
	return {"success": True, "data": frappe.get_doc("GE IP Pool", name).as_dict()}


@frappe.whitelist()
def create_ip_pool(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE IP Pool", data)
	return {"success": True, "data": doc.as_dict(), "message": "IP pool created"}


@frappe.whitelist()
def update_ip_pool(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE IP Pool", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "IP pool updated"}


@frappe.whitelist()
def delete_ip_pool(name):
	_require_execution_write_access()
	_delete_generic_doc("GE IP Pool", name)
	return {"success": True, "message": "IP pool deleted"}


@frappe.whitelist()
def get_ip_allocations(pool=None, device=None, status=None):
	"""Return IP allocations."""
	_require_execution_read_access()
	filters = {}
	if pool:
		filters["linked_pool"] = pool
	if device:
		filters["linked_device"] = device
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE IP Allocation",
		filters,
		["name", "ip_address", "linked_pool", "linked_device", "allocated_on", "allocated_by", "released_on", "status", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_ip_allocation(name):
	_require_execution_read_access()
	return {"success": True, "data": frappe.get_doc("GE IP Allocation", name).as_dict()}


@frappe.whitelist()
def create_ip_allocation(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE IP Allocation", data)
	return {"success": True, "data": doc.as_dict(), "message": "IP allocation created"}


@frappe.whitelist()
def update_ip_allocation(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE IP Allocation", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "IP allocation updated"}


@frappe.whitelist()
def delete_ip_allocation(name):
	_require_execution_write_access()
	_delete_generic_doc("GE IP Allocation", name)
	return {"success": True, "message": "IP allocation deleted"}


@frappe.whitelist()
def get_commissioning_checklists(project=None, site=None, status=None):
	"""Return commissioning checklists."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE Commissioning Checklist",
		filters,
		["name", "checklist_name", "linked_project", "linked_site", "template_type", "status", "commissioned_by", "commissioned_date", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_commissioning_checklist(name):
	_require_execution_read_access()
	return {"success": True, "data": frappe.get_doc("GE Commissioning Checklist", name).as_dict()}


@frappe.whitelist()
def create_commissioning_checklist(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Commissioning Checklist", data)
	return {"success": True, "data": doc.as_dict(), "message": "Commissioning checklist created"}


@frappe.whitelist()
def update_commissioning_checklist(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Commissioning Checklist", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Commissioning checklist updated"}


@frappe.whitelist()
def delete_commissioning_checklist(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Commissioning Checklist", name)
	return {"success": True, "message": "Commissioning checklist deleted"}


@frappe.whitelist()
def get_test_reports(project=None, site=None, status=None):
	"""Return test reports."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE Test Report",
		filters,
		["name", "report_name", "test_type", "linked_project", "linked_site", "status", "tested_by", "test_date", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_test_report(name):
	_require_execution_read_access()
	return {"success": True, "data": frappe.get_doc("GE Test Report", name).as_dict()}


@frappe.whitelist()
def create_test_report(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Test Report", data)
	return {"success": True, "data": doc.as_dict(), "message": "Test report created"}


@frappe.whitelist()
def update_test_report(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Test Report", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Test report updated"}


@frappe.whitelist()
def delete_test_report(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Test Report", name)
	return {"success": True, "message": "Test report deleted"}


@frappe.whitelist()
def get_client_signoffs(project=None, site=None, status=None):
	"""Return client signoffs."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE Client Signoff",
		filters,
		["name", "signoff_type", "linked_project", "linked_site", "status", "signed_by_client", "signoff_date", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_client_signoff(name):
	_require_execution_read_access()
	return {"success": True, "data": frappe.get_doc("GE Client Signoff", name).as_dict()}


@frappe.whitelist()
def create_client_signoff(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Client Signoff", data)
	return {"success": True, "data": doc.as_dict(), "message": "Client signoff created"}


@frappe.whitelist()
def update_client_signoff(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Client Signoff", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Client signoff updated"}


@frappe.whitelist()
def delete_client_signoff(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Client Signoff", name)
	return {"success": True, "message": "Client signoff deleted"}


# ── Project Communication Log APIs ──────────────────────────

@frappe.whitelist()
def get_comm_logs(project=None, site=None, comm_type=None, direction=None):
	"""Return project communication log entries."""
	_require_comm_log_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if comm_type:
		filters["communication_type"] = comm_type
	if direction:
		filters["direction"] = direction
	data = frappe.get_all(
		"GE Project Communication Log",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site",
			"communication_date", "communication_type", "direction",
			"subject", "counterparty_name", "counterparty_role",
			"follow_up_required", "follow_up_date", "logged_by",
			"creation", "modified",
		],
		order_by="communication_date desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_comm_log(name):
	"""Return a single communication log entry."""
	_require_comm_log_read_access()
	doc = frappe.get_doc("GE Project Communication Log", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_comm_log(data):
	"""Create a communication log entry."""
	_require_comm_log_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Project Communication Log", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Communication log created"}


@frappe.whitelist()
def update_comm_log(name, data):
	"""Update a communication log entry."""
	_require_comm_log_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Project Communication Log", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Communication log updated"}


@frappe.whitelist()
def delete_comm_log(name):
	"""Delete a communication log entry."""
	_require_comm_log_write_access()
	frappe.delete_doc("GE Project Communication Log", name)
	frappe.db.commit()
	return {"success": True, "message": "Communication log deleted"}


# ── Project Asset APIs ───────────────────────────────────────

@frappe.whitelist()
def get_project_assets(project=None, site=None, asset_type=None, status=None):
	"""Return project asset records."""
	_require_project_asset_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if asset_type:
		filters["asset_type"] = asset_type
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Project Asset",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site",
			"asset_name", "asset_type", "status",
			"serial_no", "make_model", "quantity", "unit_cost",
			"vendor", "deployment_date", "warranty_end_date",
			"assigned_to", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_project_asset(name):
	"""Return a single project asset record."""
	_require_project_asset_access()
	doc = frappe.get_doc("GE Project Asset", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_project_asset(data):
	"""Create a project asset record."""
	_require_project_asset_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Project Asset", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Asset created"}


@frappe.whitelist()
def update_project_asset(name, data):
	"""Update a project asset record."""
	_require_project_asset_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Project Asset", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Asset updated"}


@frappe.whitelist()
def delete_project_asset(name):
	"""Delete a project asset record."""
	_require_project_asset_access()
	frappe.delete_doc("GE Project Asset", name)
	frappe.db.commit()
	return {"success": True, "message": "Asset deleted"}


# ── Petty Cash APIs ──────────────────────────────────────────

def _require_petty_cash_read_access():
	_require_roles(
		ROLE_PROJECT_HEAD, ROLE_PROJECT_MANAGER, ROLE_ACCOUNTS,
		ROLE_DIRECTOR,
	)


def _require_petty_cash_write_access():
	_require_roles(
		ROLE_PROJECT_HEAD, ROLE_PROJECT_MANAGER,
	)


def _require_petty_cash_approval_access():
	_require_roles(
		ROLE_ACCOUNTS, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR,
	)


@frappe.whitelist()
def get_petty_cash_entries(project=None, site=None, status=None, category=None):
	"""Return petty cash entries."""
	_require_petty_cash_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	if category:
		filters["category"] = category
	data = frappe.get_all(
		"GE Petty Cash",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site",
			"entry_date", "description", "category",
			"amount", "paid_to", "paid_by", "voucher_ref",
			"status", "approved_by", "approved_on",
			"creation", "modified",
		],
		order_by="entry_date desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_petty_cash_entry(name):
	"""Return a single petty cash entry."""
	_require_petty_cash_read_access()
	doc = frappe.get_doc("GE Petty Cash", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_petty_cash_entry(data):
	"""Create a petty cash entry."""
	_require_petty_cash_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Petty Cash", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Petty cash entry created"}


@frappe.whitelist()
def update_petty_cash_entry(name, data):
	"""Update a petty cash entry."""
	_require_petty_cash_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Petty Cash", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Petty cash entry updated"}


@frappe.whitelist()
def approve_petty_cash_entry(name):
	"""Approve a petty cash entry."""
	_require_petty_cash_approval_access()
	doc = frappe.get_doc("GE Petty Cash", name)
	doc.status = "APPROVED"
	doc.approved_by = frappe.session.user
	doc.approved_on = frappe.utils.today()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Petty cash entry approved"}


@frappe.whitelist()
def reject_petty_cash_entry(name, reason=None):
	"""Reject a petty cash entry."""
	_require_petty_cash_approval_access()
	doc = frappe.get_doc("GE Petty Cash", name)
	doc.status = "REJECTED"
	doc.rejection_reason = reason or ""
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Petty cash entry rejected"}


@frappe.whitelist()
def delete_petty_cash_entry(name):
	"""Delete a draft petty cash entry."""
	_require_petty_cash_write_access()
	frappe.delete_doc("GE Petty Cash", name)
	frappe.db.commit()
	return {"success": True, "message": "Petty cash entry deleted"}


# ── Manpower Log APIs ────────────────────────────────────────

@frappe.whitelist()
def get_manpower_logs(project=None, site=None, log_date=None):
	"""Return manpower log entries."""
	_require_manpower_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if log_date:
		filters["log_date"] = log_date
	data = frappe.get_all(
		"GE Manpower Log",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site",
			"log_date", "worker_name", "designation", "role_in_project",
			"is_contractor", "contractor_company",
			"man_days", "daily_rate", "total_cost",
			"overtime_hours", "overtime_rate", "overtime_cost",
			"creation", "modified",
		],
		order_by="log_date desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_manpower_log(name):
	"""Return a single manpower log entry."""
	_require_manpower_read_access()
	doc = frappe.get_doc("GE Manpower Log", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_manpower_log(data):
	"""Create a manpower log entry."""
	_require_manpower_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Manpower Log", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Manpower log created"}


@frappe.whitelist()
def update_manpower_log(name, data):
	"""Update a manpower log entry."""
	_require_manpower_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Manpower Log", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Manpower log updated"}


@frappe.whitelist()
def delete_manpower_log(name):
	"""Delete a manpower log entry."""
	_require_manpower_write_access()
	frappe.delete_doc("GE Manpower Log", name)
	frappe.db.commit()
	return {"success": True, "message": "Manpower log deleted"}


@frappe.whitelist()
def get_manpower_summary(project=None, site=None):
	"""Return aggregated manpower stats for a project/site."""
	_require_manpower_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	rows = frappe.get_all(
		"GE Manpower Log",
		filters=filters,
		fields=["man_days", "total_cost", "overtime_hours", "overtime_cost"],
	)
	total_man_days = sum(r.man_days or 0 for r in rows)
	total_cost = sum((r.total_cost or 0) + (r.overtime_cost or 0) for r in rows)
	total_overtime = sum(r.overtime_hours or 0 for r in rows)
	return {
		"success": True,
		"data": {
			"total_entries": len(rows),
			"total_man_days": round(total_man_days, 2),
			"total_overtime_hours": round(total_overtime, 2),
			"total_cost": round(total_cost, 2),
		},
	}


# ── Device Uptime Log APIs ───────────────────────────────────

@frappe.whitelist()
def get_device_uptime_logs(site=None, project=None, device_type=None, sla_status=None):
	"""Return device uptime log entries."""
	_require_device_uptime_read_access()
	filters = {}
	if site:
		filters["linked_site"] = site
	if project:
		filters["linked_project"] = project
	if device_type:
		filters["device_type"] = device_type
	if sla_status:
		filters["sla_status"] = sla_status
	data = frappe.get_all(
		"GE Device Uptime Log",
		filters=filters,
		fields=[
			"name", "linked_site", "linked_project",
			"device_name", "device_type", "serial_no",
			"log_date", "uptime_hours", "downtime_hours",
			"sla_target_uptime_pct", "actual_uptime_pct", "sla_status",
			"downtime_reason", "linked_ticket",
			"reported_by", "verified_by",
			"creation", "modified",
		],
		order_by="log_date desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_device_uptime_log(name):
	"""Return a single device uptime log entry."""
	_require_device_uptime_read_access()
	doc = frappe.get_doc("GE Device Uptime Log", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_device_uptime_log(data):
	"""Create a device uptime log entry."""
	_require_device_uptime_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Device Uptime Log", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Device uptime log created"}


@frappe.whitelist()
def update_device_uptime_log(name, data):
	"""Update a device uptime log entry."""
	_require_device_uptime_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Device Uptime Log", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Device uptime log updated"}


@frappe.whitelist()
def delete_device_uptime_log(name):
	"""Delete a device uptime log entry."""
	_require_device_uptime_write_access()
	frappe.delete_doc("GE Device Uptime Log", name)
	frappe.db.commit()
	return {"success": True, "message": "Device uptime log deleted"}


@frappe.whitelist()
def get_site_uptime_summary(site):
	"""Return per-device uptime summary for a site."""
	_require_device_uptime_read_access()
	rows = frappe.get_all(
		"GE Device Uptime Log",
		filters={"linked_site": site},
		fields=["device_name", "device_type", "uptime_hours", "downtime_hours",
			"sla_target_uptime_pct", "actual_uptime_pct", "sla_status"],
		order_by="device_name asc",
	)
	# Group by device_name
	devices = {}
	for r in rows:
		key = r.device_name
		if key not in devices:
			devices[key] = {
				"device_name": r.device_name,
				"device_type": r.device_type,
				"total_uptime_hours": 0.0,
				"total_downtime_hours": 0.0,
				"sla_target_uptime_pct": r.sla_target_uptime_pct,
				"log_count": 0,
				"non_compliant_days": 0,
			}
		devices[key]["total_uptime_hours"] += r.uptime_hours or 0.0
		devices[key]["total_downtime_hours"] += r.downtime_hours or 0.0
		devices[key]["log_count"] += 1
		if r.sla_status == "Non-Compliant":
			devices[key]["non_compliant_days"] += 1

	for d in devices.values():
		total = d["total_uptime_hours"] + d["total_downtime_hours"]
		d["avg_uptime_pct"] = round((d["total_uptime_hours"] / total) * 100, 2) if total else None

	return {"success": True, "data": list(devices.values())}
