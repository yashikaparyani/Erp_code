import json
from collections import defaultdict

import frappe
from frappe.sessions import delete_session
from frappe.utils import add_days, cint, cstr, date_diff, flt, get_datetime, getdate, now_datetime, today
from gov_erp.gov_erp.doctype.ge_dependency_rule.ge_dependency_rule import (
	evaluate_dependency_state,
	resolve_reference_status,
)
from gov_erp.permission_engine import PermissionEngine
from gov_erp.project_workflow import (
	WORKFLOW_STAGE_KEYS,
	WORKFLOW_SUPER_ROLES,
	get_next_workflow_stage,
	get_workflow_stage,
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


def _detect_primary_role(user: str = None) -> str:
	"""Return the highest-priority role held by the user (for accountability events)."""
	user = user or frappe.session.user
	held = set(frappe.get_roles(user))
	priority = [
		ROLE_DIRECTOR, ROLE_PROJECT_HEAD, ROLE_DEPARTMENT_HEAD, ROLE_ENGINEERING_HEAD,
		ROLE_PROCUREMENT_HEAD, ROLE_STORE_MANAGER, ROLE_STORES_LOGISTICS_HEAD,
		ROLE_HR_HEAD, ROLE_HR_MANAGER, ROLE_ACCOUNTS_HEAD, ROLE_ACCOUNTS,
		ROLE_PROJECT_MANAGER, ROLE_PROCUREMENT_MANAGER, ROLE_ENGINEER,
		ROLE_FIELD_TECHNICIAN, ROLE_RMA_HEAD, ROLE_RMA_MANAGER,
		ROLE_OM_OPERATOR, ROLE_PRESALES_HEAD, ROLE_PRESALES_EXECUTIVE,
		ROLE_SYSTEM_MANAGER,
	]
	for role in priority:
		if role in held:
			return role
	return next(iter(held), "Unknown")


def _require_roles(*roles):
	_require_authenticated_user()
	user_roles = set(frappe.get_roles(frappe.session.user))
	if ROLE_DIRECTOR in user_roles:
		return

	allowed_roles = set(roles) | {ROLE_SYSTEM_MANAGER}
	if user_roles.isdisjoint(allowed_roles):
		role_list = ", ".join(sorted(allowed_roles))
		frappe.throw(f"Insufficient role access. One of these roles is required: {role_list}", frappe.PermissionError)


def _require_param(value, param_name):
	if isinstance(value, str):
		value = value.strip()
	if value in (None, ""):
		frappe.throw(f"{param_name} is required")
	return value


def _parse_json_list(raw_value):
	if not raw_value:
		return []
	if isinstance(raw_value, list):
		return raw_value
	try:
		parsed = json.loads(raw_value)
	except Exception:
		return []
	return parsed if isinstance(parsed, list) else []


def _derive_tender_funnel_status(values):
	"""Compute tender funnel status from workflow/readiness signals."""
	status = cstr(values.get("status") or "")
	go_no_go_status = cstr(values.get("go_no_go_status") or "PENDING")
	technical_readiness = cstr(values.get("technical_readiness") or "NOT_STARTED")
	commercial_readiness = cstr(values.get("commercial_readiness") or "NOT_STARTED")
	bid_denied_by_presales = cint(values.get("bid_denied_by_presales"))

	if status in ("CANCELLED", "DROPPED", "LOST") or bid_denied_by_presales or go_no_go_status == "NO_GO":
		return "Tender not bided but under observation"

	if go_no_go_status != "GO":
		return "Tender under evaluation for GO-NOGO"

	if commercial_readiness == "REJECTED":
		return "Not Qualified Tender"

	if technical_readiness == "REJECTED":
		return "Locked Tender"

	if technical_readiness == "APPROVED" or status in ("WON", "CONVERTED_TO_PROJECT"):
		return "EMD done and technical confirmed"

	if commercial_readiness == "APPROVED":
		return "Working but not confirmed by technical"

	return "Tender under evaluation for GO-NOGO"


def _attach_computed_tender_funnel_status(tender_dict):
	if not tender_dict:
		return tender_dict
	tender_dict["computed_funnel_status"] = _derive_tender_funnel_status(tender_dict)
	return tender_dict


def _user_has_any_role(*roles):
	user_roles = set(frappe.get_roles(frappe.session.user))
	if ROLE_DIRECTOR in user_roles:
		return True
	return not user_roles.isdisjoint(set(roles) | {ROLE_SYSTEM_MANAGER})


# ── Pack-aware permission helpers ────────────────────────────────────────────
# These wrap the PermissionEngine for use as API-endpoint guards.
# They co-exist with _require_roles so existing guards keep working.

def _get_permission_engine(user=None):
	"""Get or create a request-scoped PermissionEngine instance."""
	user = user or frappe.session.user
	cache_key = f"_permission_engine_{user}"
	engine = getattr(frappe.local, cache_key, None)
	if engine is None:
		engine = PermissionEngine(user=user)
		setattr(frappe.local, cache_key, engine)
	return engine


def _require_capability(capability_key, project=None, site=None, required_mode=None):
	"""Guard: throw PermissionError if user lacks the capability."""
	_require_authenticated_user()
	_get_permission_engine().check_capability(
		capability_key, project=project, site=site, required_mode=required_mode,
	)


def _require_any_capability(*capability_keys, project=None, site=None):
	"""Guard: throw PermissionError if user lacks ALL of the listed capabilities."""
	_require_authenticated_user()
	_get_permission_engine().check_any_capability(
		*capability_keys, project=project, site=site,
	)


def _require_module_access(module_key):
	"""Guard: throw PermissionError if user cannot access the module."""
	_require_authenticated_user()
	_get_permission_engine().check_module_access(module_key)


def _user_has_capability(capability_key, project=None, site=None):
	"""Check (no throw) if user has a capability. Returns bool."""
	if frappe.session.user == "Guest":
		return False
	return _get_permission_engine().has_capability(
		capability_key, project=project, site=site,
	)


def _build_workflow_event(action, stage, remarks=None, next_stage=None, metadata=None):
	return {
		"timestamp": frappe.utils.now(),
		"actor": frappe.session.user,
		"action": action,
		"stage": stage,
		"next_stage": next_stage,
		"remarks": remarks or None,
		"metadata": metadata or {},
	}


def _append_project_workflow_event(doc, action, stage, remarks=None, next_stage=None, metadata=None):
	history = _parse_json_list(getattr(doc, "workflow_history_json", None))
	history.append(_build_workflow_event(action, stage, remarks=remarks, next_stage=next_stage, metadata=metadata))
	doc.workflow_history_json = json.dumps(history[-100:], default=str)
	doc.workflow_last_action = action
	doc.workflow_last_actor = frappe.session.user
	doc.workflow_last_action_at = frappe.utils.now()


def _sync_project_workflow_fields(doc, reset_submission=False):
	stage_key = getattr(doc, "current_project_stage", None) or WORKFLOW_STAGE_KEYS[0]
	stage_config = get_workflow_stage(stage_key)
	doc.current_project_stage = stage_config["key"]
	doc.current_stage_owner_department = stage_config["owner_department"]
	doc.current_stage_status = getattr(doc, "current_stage_status", None) or "IN_PROGRESS"

	if reset_submission:
		doc.current_stage_status = "IN_PROGRESS"
		doc.stage_submitted_by = None
		doc.stage_submitted_at = None


def _project_related_filters(project_doc, extra=None):
	filters = dict(extra or {})
	if project_doc.name:
		filters["linked_project"] = project_doc.name
	return filters


def _count_records(doctype, filters):
	try:
		return frappe.db.count(doctype, filters=filters)
	except Exception:
		return 0


def _ensure_customer_exists(customer_name):
	if not customer_name:
		return None

	if frappe.db.exists("Customer", customer_name):
		return customer_name

	customer_group = (
		frappe.db.get_single_value("Selling Settings", "customer_group")
		or frappe.db.exists("Customer Group", "All Customer Groups")
		or (frappe.get_all("Customer Group", pluck="name") or [None])[0]
	)
	territory = (
		frappe.db.get_single_value("Selling Settings", "territory")
		or frappe.db.exists("Territory", "All Territories")
		or (frappe.get_all("Territory", pluck="name") or [None])[0]
	)

	doc = frappe.get_doc(
		{
			"doctype": "Customer",
			"customer_name": customer_name,
			"customer_type": "Company",
			"customer_group": customer_group,
			"territory": territory,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name


def _get_project_workflow_readiness(project_doc):
	stage_key = getattr(project_doc, "current_project_stage", None) or WORKFLOW_STAGE_KEYS[0]
	stage_config = get_workflow_stage(stage_key)
	requirements = []
	linked_tender = getattr(project_doc, "linked_tender", None)

	def add_requirement(label, satisfied, detail):
		requirements.append({
			"label": label,
			"satisfied": bool(satisfied),
			"detail": detail,
		})

	def complete_result(mode, summary):
		return {
			"ready": all(item["satisfied"] for item in requirements) if requirements else True,
			"mode": mode,
			"summary": summary,
			"requirements": requirements,
		}

	if stage_key == "SURVEY":
		if linked_tender:
			survey_state = check_survey_complete(linked_tender)
			add_requirement(
				"All linked tender surveys completed",
				survey_state.get("complete"),
				f"{survey_state.get('completed', 0)} of {survey_state.get('total', 0)} survey records are completed.",
			)
			return complete_result("tender-linked", "Survey stage is driven by linked tender survey completion.")

		site_count = _count_records("GE Site", {"linked_project": project_doc.name})
		team_count = _count_records("GE Project Team Member", {"linked_project": project_doc.name, "is_active": 1})
		add_requirement(
			"Direct project setup exists",
			site_count > 0 or team_count > 0,
			f"Direct projects can continue once at least one site or active team assignment exists. Sites: {site_count}, active team members: {team_count}.",
		)
		return complete_result("manual-project", "Direct projects use manual survey readiness when no tender is linked.")

	if stage_key == "BOQ_DESIGN":
		boq_filters = _project_related_filters(project_doc, {})
		if linked_tender:
			boq_filters["linked_tender"] = linked_tender
		approved_boq = _count_records("GE BOQ", {**boq_filters, "status": "APPROVED"})
		add_requirement("Approved BOQ is available", approved_boq > 0, f"Approved BOQ records found: {approved_boq}.")
		return complete_result("document-driven", "BOQ/design stage closes only after approved BOQ output exists.")

	if stage_key == "COSTING":
		cost_filters = _project_related_filters(project_doc, {})
		if linked_tender:
			cost_filters["linked_tender"] = linked_tender
		approved_cost = _count_records("GE Cost Sheet", {**cost_filters, "status": "APPROVED"})
		add_requirement("Approved cost sheet is available", approved_cost > 0, f"Approved cost sheets found: {approved_cost}.")
		return complete_result("document-driven", "Costing stage closes only after approved cost sheet output exists.")

	if stage_key == "PROCUREMENT":
		proc_filters = _project_related_filters(project_doc, {})
		if linked_tender:
			proc_filters["linked_tender"] = linked_tender
		approved_proc = _count_records("GE Vendor Comparison", {**proc_filters, "status": "APPROVED"})
		add_requirement("Approved vendor comparison is available", approved_proc > 0, f"Approved vendor comparisons found: {approved_proc}.")
		return complete_result("document-driven", "Procurement stage closes after approved procurement evaluation exists.")

	if stage_key == "STORES_DISPATCH":
		dispatch_filters = _project_related_filters(project_doc, {})
		if linked_tender:
			dispatch_filters["linked_tender"] = linked_tender
		approved_dispatch = _count_records("GE Dispatch Challan", {**dispatch_filters, "status": "APPROVED"})
		add_requirement("Approved dispatch challan is available", approved_dispatch > 0, f"Approved dispatch challans found: {approved_dispatch}.")
		return complete_result("document-driven", "Dispatch stage closes after dispatch approval exists.")

	if stage_key == "EXECUTION":
		sites = frappe.get_all(
			"GE Site",
			filters={"linked_project": project_doc.name},
			fields=["current_site_stage", "site_blocked"],
		)
		if sites:
			execution_ready = all((row.current_site_stage or "SURVEY") in {"EXECUTION", "BILLING_PAYMENT", "OM_RMA", "CLOSED"} for row in sites)
			blocked_count = sum(1 for row in sites if row.site_blocked)
			add_requirement(
				"All linked sites have entered execution or later",
				execution_ready,
				f"Sites checked: {len(sites)}; blocked sites: {blocked_count}.",
			)
			add_requirement("No linked sites are blocked", blocked_count == 0, f"Blocked sites found: {blocked_count}.")
		else:
			add_requirement(
				"Manual execution completion",
				(project_doc.percent_complete or 0) >= 100 or project_doc.status == "Completed",
				f"No sites linked. Use project completion metrics for manual execution closure. Current percent complete: {project_doc.percent_complete or 0}.",
			)
		return complete_result("site-driven", "Execution stage uses linked site progression where available.")

	if stage_key == "BILLING_PAYMENT":
		invoice_filters = _project_related_filters(project_doc, {})
		paid_invoices = _count_records("GE Invoice", {**invoice_filters, "status": ["in", ["APPROVED", "PAID"]]})
		add_requirement("Billing record exists in approved or paid state", paid_invoices > 0, f"Approved/paid invoices found: {paid_invoices}.")
		return complete_result("billing-driven", "Billing stage closes after invoice approval or payment closure.")

	if stage_key == "OM_RMA":
		open_rma = _count_records("GE RMA Tracker", {**_project_related_filters(project_doc, {}), "rma_status": ["not in", ["CLOSED", "COMPLETED"]]})
		add_requirement("No open RMA remains", open_rma == 0, f"Open RMA records found: {open_rma}.")
		return complete_result("support-driven", "Support stage closes after open RMA items are cleared.")

	if stage_key == "CLOSED":
		add_requirement("Project is marked completed or closed", project_doc.status in {"Completed", "Cancelled"} or stage_key == "CLOSED", f"Project status is {project_doc.status or 'Open'}.")
		return complete_result("closure", "Closed is the final project state.")

	return complete_result("manual", "No additional workflow rule is defined for this stage.")


def _serialize_workflow_state(project_doc):
	stage_key = getattr(project_doc, "current_project_stage", None) or WORKFLOW_STAGE_KEYS[0]
	stage_config = get_workflow_stage(stage_key)
	stage_status = getattr(project_doc, "current_stage_status", None) or "IN_PROGRESS"
	readiness = _get_project_workflow_readiness(project_doc)
	user_roles = set(frappe.get_roles(frappe.session.user))
	history = list(reversed(_parse_json_list(getattr(project_doc, "workflow_history_json", None))))
	is_terminal_project = stage_key == "CLOSED" or project_doc.status == "Completed"
	can_submit = (
		not is_terminal_project
		and stage_status in {"IN_PROGRESS", "REJECTED"}
		and readiness["ready"]
		and _user_has_any_role(*stage_config["submit_roles"], *WORKFLOW_SUPER_ROLES)
	)
	can_approve = stage_status == "PENDING_APPROVAL" and _user_has_any_role(*stage_config["approve_roles"], *WORKFLOW_SUPER_ROLES)
	can_reject = stage_status == "PENDING_APPROVAL" and _user_has_any_role(*stage_config["approve_roles"], *WORKFLOW_SUPER_ROLES)
	can_restart = stage_status == "REJECTED" and _user_has_any_role(*stage_config["submit_roles"], *WORKFLOW_SUPER_ROLES)
	can_override = not user_roles.isdisjoint(set(WORKFLOW_SUPER_ROLES) | {ROLE_PROJECT_HEAD, ROLE_SYSTEM_MANAGER})

	return {
		"stage": stage_key,
		"stage_label": stage_config["label"],
		"stage_status": stage_status,
		"owner_department": getattr(project_doc, "current_stage_owner_department", None) or stage_config["owner_department"],
		"owner_roles": stage_config["owner_roles"],
		"description": stage_config["description"],
		"next_stage": stage_config.get("next_stage"),
		"next_stage_label": get_workflow_stage(stage_config.get("next_stage")).get("label") if stage_config.get("next_stage") else None,
		"readiness": readiness,
		"submitted_by": getattr(project_doc, "stage_submitted_by", None),
		"submitted_at": str(getattr(project_doc, "stage_submitted_at", None)) if getattr(project_doc, "stage_submitted_at", None) else None,
		"last_action": getattr(project_doc, "workflow_last_action", None),
		"last_actor": getattr(project_doc, "workflow_last_actor", None),
		"last_action_at": str(getattr(project_doc, "workflow_last_action_at", None)) if getattr(project_doc, "workflow_last_action_at", None) else None,
		"actions": {
			"can_submit": can_submit,
			"can_approve": can_approve,
			"can_reject": can_reject,
			"can_restart": can_restart,
			"can_override": can_override,
		},
		"history": history,
	}


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
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
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
	_require_module_access("procurement")


def _require_procurement_write_access():
	_require_any_capability(
		"procurement.indent.create", "procurement.indent.update",
		"procurement.comparison.create", "procurement.readiness.update",
	)


def _require_procurement_approval_access():
	_require_capability("approval.action.approve")


def _require_store_read_access():
	_require_module_access("inventory")


def _require_store_write_access():
	_require_any_capability(
		"inventory.grn.create", "inventory.movement.create",
		"inventory.project_link.manage", "inventory.traceability.manage",
	)


def _require_store_approval_access():
	_require_capability("approval.action.approve")


def _require_milestone_read_access():
	_require_capability("project.milestone.view")


def _require_milestone_write_access():
	# No dedicated milestone-write capability yet; use project stage submit as proxy
	_require_capability("project.stage.submit")


def _require_document_read_access():
	_require_capability("dms.file.view")


def _require_document_write_access():
	_require_capability("dms.file.upload")


def _require_execution_read_access():
	_require_module_access("execution")


def _require_execution_write_access():
	_require_any_capability(
		"execution.installation.update", "execution.commissioning.update",
		"execution.evidence.upload", "execution.device.manage",
	)


def _require_comm_log_read_access():
	_require_capability("project.activity.view")


def _require_comm_log_write_access():
	# Activity view with action mode serves as write guard
	_require_capability("project.activity.view", required_mode="action")


def _require_project_asset_access():
	_require_capability("project.workspace.access")


def _require_hr_read_access():
	_require_module_access("hr")


def _require_hr_write_access():
	_require_any_capability("hr.onboarding.manage", "hr.manpower.assign")


def _require_hr_approval_access():
	_require_capability("approval.action.approve")


def _require_leave_manage_access():
	_require_any_capability("hr.leave.manage", "hr.employee.manage")


def _require_attendance_manage_access():
	_require_any_capability("hr.attendance.manage", "hr.manpower.assign")


def _require_regularization_manage_access():
	_require_any_capability("hr.regularization.manage", "hr.attendance.manage")


def _require_manpower_read_access():
	_require_any_capability("hr.staffing.view", "hr.manpower.assign")


def _require_manpower_write_access():
	_require_capability("hr.manpower.assign")


def _require_rma_read_access():
	_require_any_capability("om.rma.access", "om.rma.manage")


def _require_rma_write_access():
	_require_capability("om.rma.manage")


def _require_rma_approval_access():
	_require_capability("approval.action.approve")


def _require_device_uptime_read_access():
	_require_capability("om.uptime.view")


def _require_device_uptime_write_access():
	# Uptime write uses the same capability with action mode
	_require_capability("om.uptime.view", required_mode="action")


def _require_dependency_override_approval_access():
	_require_capability("project.dependency.override", required_mode="override")


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
	_require_capability("finance.billing.view")


def _require_billing_write_access():
	_require_capability("finance.invoice.create")


def _require_billing_approval_access():
	_require_capability("finance.action.approve")


def _require_om_read_access():
	_require_module_access("om")


def _require_om_write_access():
	_require_any_capability("om.ticket.manage", "om.sla.manage", "om.issue.close")


def _require_om_approval_access():
	_require_capability("approval.action.approve")


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


def _get_project_manager_assigned_projects():
	roles = set(frappe.get_roles(frappe.session.user))
	if ROLE_PROJECT_MANAGER not in roles:
		return None
	engine = PermissionEngine(user=frappe.session.user)
	assigned = sorted(engine.assigned_projects)
	if not assigned:
		frappe.throw("Project Manager has no assigned projects configured", frappe.PermissionError)
	return assigned


def _apply_project_manager_project_filter(filters, project=None, project_field="linked_project"):
	assigned = _get_project_manager_assigned_projects()
	if not assigned:
		if project:
			filters[project_field] = project
		return
	if project:
		if project not in assigned:
			frappe.throw(f"Project Manager cannot access project {project}", frappe.PermissionError)
		filters[project_field] = project
		return
	filters[project_field] = ["in", assigned]


def _ensure_project_manager_project_scope(project):
	assigned = _get_project_manager_assigned_projects()
	if not assigned:
		return _require_param(project, "project")
	project = _require_param(project, "project")
	if project not in assigned:
		frappe.throw(f"Project Manager cannot access project {project}", frappe.PermissionError)
	return project


def _enforce_accountability_project_scope(project=None, require_project_for_pm=False):
	"""Enforce PM assigned-project scope for accountability APIs."""
	assigned = _get_project_manager_assigned_projects()
	if not assigned:
		return project
	if project:
		return _ensure_project_manager_project_scope(project)
	if require_project_for_pm:
		frappe.throw(
			"Project Managers must supply a project for accountability queries.",
			frappe.PermissionError,
		)
	return project


def _enforce_accountability_subject_scope(subject_doctype, subject_name):
	"""Ensure PMs can only inspect accountability records for assigned projects."""
	assigned = _get_project_manager_assigned_projects()
	if not assigned:
		return None

	record = frappe.db.get_value(
		"GE Accountability Record",
		{"subject_doctype": subject_doctype, "subject_name": subject_name},
		["name", "linked_project"],
		as_dict=True,
	)
	if not record:
		return None

	linked_project = record.get("linked_project")
	if not linked_project:
		frappe.throw(
			"Project Managers can only inspect project-linked accountability records.",
			frappe.PermissionError,
		)
	if linked_project not in assigned:
		frappe.throw(
			f"Project Manager cannot access accountability for project {linked_project}",
			frappe.PermissionError,
		)
	return record


def _get_indent_names_for_project(project):
	"""Get Material Request names that have items with specified project."""
	rows = frappe.get_all(
		"Material Request Item",
		filters={"project": project},
		fields=["parent"],
		distinct=True,
	)
	return [row.parent for row in rows]


def _attach_indent_project_summary(rows):
	"""Attach project summary to Material Request rows."""
	if not rows:
		return rows

	indent_names = [row.name for row in rows]
	
	# Get Material Request Items with project info
	project_rows = frappe.get_all(
		"Material Request Item",
		filters=[
			["parent", "in", indent_names],
			["project", "!=", ""]
		],
		fields=["parent", "project"],
	)
	
	# Build project map
	project_map = {}
	for row in project_rows:
		if row.parent not in project_map:
			project_map[row.parent] = []
		if row.project not in project_map[row.parent]:
			project_map[row.parent].append(row.project)

	# Attach projects to Material Request rows
	for row in rows:
		projects = project_map.get(row.name, [])
		row["projects"] = projects
		row["project"] = projects[0] if len(projects) == 1 else None

	return rows


def _prepare_indent_doc_values(values, project=None):
	"""Normalize payload for Material Request creation."""
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
	return doc_values


def _create_indent_document(values, project=None):
	"""Create and persist a Material Request indent document."""
	doc_values = _prepare_indent_doc_values(values, project=project)
	doc = frappe.get_doc(doc_values)
	doc.insert()
	frappe.db.commit()
	return doc


def _attach_indent_accountability_summary(rows):
	"""Attach accountability snapshot fields to indent rows."""
	if not rows:
		return rows

	indent_names = [row.name for row in rows]
	accountability_rows = frappe.get_all(
		"GE Accountability Record",
		filters={
			"subject_doctype": "Material Request",
			"subject_name": ["in", indent_names],
		},
		fields=[
			"subject_name",
			"current_status",
			"current_owner_role",
			"current_owner_user",
			"latest_event_type",
			"assigned_to_role",
			"assigned_to_user",
			"is_blocked",
			"blocking_reason",
			"escalated_to_role",
			"escalated_to_user",
			"submitted_by",
		],
	)
	accountability_map = {row.subject_name: row for row in accountability_rows}

	for row in rows:
		snapshot = accountability_map.get(row.name)
		if not snapshot:
			continue
		row["accountability_status"] = snapshot.current_status
		row["accountability_owner_role"] = snapshot.current_owner_role
		row["accountability_owner_user"] = snapshot.current_owner_user
		row["accountability_latest_event"] = snapshot.latest_event_type
		row["accountability_assigned_to_role"] = snapshot.assigned_to_role
		row["accountability_assigned_to_user"] = snapshot.assigned_to_user
		row["accountability_is_blocked"] = snapshot.is_blocked
		row["accountability_blocking_reason"] = snapshot.blocking_reason
		row["accountability_escalated_to_role"] = snapshot.escalated_to_role
		row["accountability_escalated_to_user"] = snapshot.escalated_to_user
		row["accountability_submitted_by"] = snapshot.submitted_by

	return rows


def _get_indent_requester_user(doc):
	"""Return the best-effort requester user for an indent."""
	record = frappe.db.get_value(
		"GE Accountability Record",
		{"subject_doctype": "Material Request", "subject_name": doc.name},
		["submitted_by", "current_owner_user"],
		as_dict=True,
	)
	if record:
		return record.get("submitted_by") or record.get("current_owner_user")
	return doc.owner


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
			"submission_date", "status", "emd_amount", "tender_owner",
			"pbg_amount", "estimated_value", "creation", "modified",
			"go_no_go_status", "technical_readiness", "commercial_readiness",
			"finance_readiness", "submission_status", "emd_required", "pbg_required",
		],
		order_by="submission_date asc, creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
	)
	total = frappe.db.count("GE Tender", filters=parsed_filters)
	data = [_attach_computed_tender_funnel_status(row) for row in data]
	return {"success": True, "data": data, "total": total}


@frappe.whitelist()
def get_tender(name=None):
	"""Return a single tender with all fields."""
	_require_tender_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Tender", name)
	return {"success": True, "data": _attach_computed_tender_funnel_status(doc.as_dict())}


@frappe.whitelist()
def create_tender(data):
	"""Create a new tender."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Tender", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": _attach_computed_tender_funnel_status(doc.as_dict()), "message": "Tender created"}


@frappe.whitelist()
def update_tender(name, data):
	"""Update an existing tender."""
	_require_tender_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Tender", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": _attach_computed_tender_funnel_status(doc.as_dict()), "message": "Tender updated"}


def _get_tender_transition_readiness(doc, target_status):
	"""Return readiness checks before moving a tender into a controlled lifecycle status."""
	checks = []

	def add_check(ok, label):
		checks.append({"ok": bool(ok), "label": label})

	if target_status == "SUBMITTED":
		boq_count = frappe.db.count("GE BOQ", {"linked_tender": doc.name})
		cost_sheet_count = frappe.db.count("GE Cost Sheet", {"linked_tender": doc.name})
		finance_count = frappe.db.count("GE EMD PBG Instrument", {"linked_tender": doc.name})
		add_check(getattr(doc, "go_no_go_status", None) == "GO", "Go / No-Go should be approved before submission.")
		add_check(getattr(doc, "technical_readiness", None) == "APPROVED", "Technical readiness should be approved before submission.")
		add_check(getattr(doc, "commercial_readiness", None) == "APPROVED", "Commercial readiness should be approved before submission.")
		add_check(getattr(doc, "submission_status", None) == "APPROVED", "Submission approval should be completed before submission.")
		add_check(boq_count > 0, "At least one BOQ should exist before submission.")
		add_check(cost_sheet_count > 0, "At least one cost sheet should exist before submission.")
		if doc.emd_required or doc.pbg_required:
			add_check(finance_count > 0, "Finance readiness is required when EMD or PBG is applicable.")
			add_check(getattr(doc, "finance_readiness", None) == "APPROVED", "Finance readiness should be approved before submission.")

	if target_status == "UNDER_EVALUATION":
		add_check(doc.status == "SUBMITTED", "Only submitted tenders can move to under evaluation.")

	if target_status == "WON":
		add_check(doc.status in ("SUBMITTED", "UNDER_EVALUATION"), "Only submitted or under-evaluation tenders can be marked won.")

	if target_status == "LOST":
		add_check(doc.status in ("SUBMITTED", "UNDER_EVALUATION"), "Only submitted or under-evaluation tenders can be marked lost.")

	if target_status == "DROPPED":
		add_check(doc.status not in ("WON", "LOST", "CANCELLED"), "Closed tenders cannot be dropped.")

	return checks


def _get_tender_result_stage_for_status(status):
	stage_map = {
		"UNDER_EVALUATION": "Financial Evaluation",
		"WON": "AOC",
		"LOST": "Financial Evaluation",
	}
	return stage_map.get((status or "").upper())


def _sync_tender_result_tracker(doc):
	"""Ensure tender result tracker has at least one row for tracked post-submission statuses."""
	result_stage = _get_tender_result_stage_for_status(getattr(doc, "status", None))
	if not result_stage:
		return

	existing_rows = frappe.get_all(
		"GE Tender Result",
		filters={"tender": doc.name},
		fields=["name", "publication_date", "winning_amount", "winner_company"],
		order_by="modified desc",
		limit=1,
	)

	default_publication_date = (
		cstr(getattr(doc, "submission_date", ""))[:10] if getattr(doc, "submission_date", None) else frappe.utils.today()
	)
	default_organization = cstr(getattr(doc, "organization", None) or getattr(doc, "client", None) or "")
	default_winning_amount = getattr(doc, "estimated_value", None) or 0

	if existing_rows:
		result_doc = frappe.get_doc("GE Tender Result", existing_rows[0].name)
		result_doc.reference_no = result_doc.reference_no or doc.tender_number
		result_doc.tender_brief = result_doc.tender_brief or doc.title
		result_doc.organization_name = result_doc.organization_name or default_organization
		result_doc.result_stage = result_stage
		result_doc.publication_date = result_doc.publication_date or default_publication_date
		if doc.status == "WON" and not result_doc.winning_amount:
			result_doc.winning_amount = default_winning_amount
		result_doc.save()
		return

	payload = {
		"doctype": "GE Tender Result",
		"tender": doc.name,
		"result_id": doc.tender_number,
		"reference_no": doc.tender_number,
		"tender_brief": doc.title,
		"organization_name": default_organization,
		"result_stage": result_stage,
		"publication_date": default_publication_date,
		"is_fresh": 1,
	}
	if doc.status == "WON":
		payload["winning_amount"] = default_winning_amount

	frappe.get_doc(payload).insert()


def _normalize_sortable_datetime(value):
	"""Normalize date/datetime values to comparable strings for mixed source payloads."""
	if not value:
		return ""
	return cstr(value)


TENDER_APPROVAL_TYPE_CONFIG = {
	"GO_NO_GO": {
		"fieldname": "go_no_go_status",
		"pending_value": "PENDING",
		"approved_value": "GO",
		"rejected_value": "NO_GO",
		"status_on_submit": "GO_NO_GO_PENDING",
		"status_on_approve": "QUALIFIED",
		"status_on_reject": "NO_GO",
	},
	"TECHNICAL": {
		"fieldname": "technical_readiness",
		"pending_value": "PENDING_APPROVAL",
		"approved_value": "APPROVED",
		"rejected_value": "REJECTED",
		"status_on_submit": "TECHNICAL_IN_PROGRESS",
		"status_on_approve": "BID_READY",
		"status_on_reject": "TECHNICAL_IN_PROGRESS",
	},
	"COMMERCIAL": {
		"fieldname": "commercial_readiness",
		"pending_value": "PENDING_APPROVAL",
		"approved_value": "APPROVED",
		"rejected_value": "REJECTED",
		"status_on_submit": "COSTING_IN_PROGRESS",
		"status_on_approve": None,
		"status_on_reject": "COSTING_IN_PROGRESS",
	},
	"FINANCE": {
		"fieldname": "finance_readiness",
		"pending_value": "PENDING_APPROVAL",
		"approved_value": "APPROVED",
		"rejected_value": "REJECTED",
		"status_on_submit": "FINANCE_PENDING",
		"status_on_approve": None,
		"status_on_reject": "FINANCE_PENDING",
	},
	"SUBMISSION": {
		"fieldname": "submission_status",
		"pending_value": "PENDING_APPROVAL",
		"approved_value": "APPROVED",
		"rejected_value": "REJECTED",
		"status_on_submit": "APPROVAL_PENDING",
		"status_on_approve": "BID_READY",
		"status_on_reject": "APPROVAL_PENDING",
	},
}


def _sync_tender_approval_overall_status(tender_doc):
	pending = frappe.db.count("GE Tender Approval", {"linked_tender": tender_doc.name, "status": "Pending"})
	rejected = frappe.db.count("GE Tender Approval", {"linked_tender": tender_doc.name, "status": "Rejected"})
	approved = frappe.db.count("GE Tender Approval", {"linked_tender": tender_doc.name, "status": "Approved"})
	if pending:
		tender_doc.approval_status = "PENDING"
	elif rejected:
		tender_doc.approval_status = "REJECTED"
	elif approved:
		tender_doc.approval_status = "APPROVED"
	else:
		tender_doc.approval_status = "NOT_REQUIRED"


def _apply_tender_approval_state(tender_doc, approval_type, approved, remarks=None):
	config = TENDER_APPROVAL_TYPE_CONFIG[approval_type]
	fieldname = config["fieldname"]
	tender_doc.set(fieldname, config["approved_value"] if approved else config["rejected_value"])
	if approval_type == "GO_NO_GO":
		tender_doc.go_no_go_by = frappe.session.user
		tender_doc.go_no_go_on = frappe.utils.now()
		tender_doc.go_no_go_remarks = remarks or ""
		if not approved:
			tender_doc.bid_denied_by_presales = 0
	if approval_type == "TECHNICAL":
		tender_doc.technical_rejection_reason = "" if approved else (remarks or "")
	next_status = config["status_on_approve"] if approved else config["status_on_reject"]
	if next_status:
		tender_doc.status = next_status
	if approval_type == "SUBMISSION" and approved:
		tender_doc.approval_status = "APPROVED"
	_sync_tender_approval_overall_status(tender_doc)


@frappe.whitelist()
def get_tender_approvals(tender=None, status=None):
	"""Return tender-specific approval trail rows."""
	_require_tender_read_access()
	filters = {}
	if tender:
		filters["linked_tender"] = tender
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Tender Approval",
		filters=filters,
		fields=[
			"name", "linked_tender", "approval_type", "status", "requested_by",
			"approver_role", "approver_user", "request_remarks", "action_remarks",
			"acted_on", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def submit_tender_approval(name, approval_type, remarks=None):
	"""Raise a tender-specific approval request for presales workflow."""
	_require_tender_write_access()
	name = _require_param(name, "name")
	approval_type = _require_param(approval_type, "approval_type")
	approval_type = str(approval_type).strip().upper()
	if approval_type not in TENDER_APPROVAL_TYPE_CONFIG:
		return {"success": False, "message": f"Unsupported approval type: {approval_type}"}
	if frappe.db.exists("GE Tender Approval", {"linked_tender": name, "approval_type": approval_type, "status": "Pending"}):
		return {"success": False, "message": f"{approval_type} approval is already pending for this tender"}

	tender_doc = frappe.get_doc("GE Tender", name)
	config = TENDER_APPROVAL_TYPE_CONFIG[approval_type]
	tender_doc.set(config["fieldname"], config["pending_value"])
	if config["status_on_submit"]:
		tender_doc.status = config["status_on_submit"]
	tender_doc.approval_status = "PENDING"
	tender_doc.save()

	approver_role = ROLE_DIRECTOR if approval_type in {"GO_NO_GO", "TECHNICAL"} else ROLE_PRESALES_HEAD
	approval_doc = frappe.get_doc(
		{
			"doctype": "GE Tender Approval",
			"linked_tender": name,
			"approval_type": approval_type,
			"status": "Pending",
			"requested_by": frappe.session.user,
			"approver_role": approver_role,
			"request_remarks": remarks or "",
		}
	)
	approval_doc.insert()
	frappe.db.commit()
	return {"success": True, "data": approval_doc.as_dict(), "message": "Tender approval submitted"}


@frappe.whitelist()
def approve_tender_approval(name, remarks=None):
	"""Approve a tender-specific approval request."""
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Tender Approval", name)
	if doc.approver_role == ROLE_DIRECTOR:
		_require_roles(ROLE_DIRECTOR)
	else:
		_require_roles(ROLE_PRESALES_HEAD, ROLE_DIRECTOR)
	if doc.status != "Pending":
		return {"success": False, "message": f"Approval is in {doc.status} status, must be Pending to approve"}
	doc.status = "Approved"
	doc.approver_user = frappe.session.user
	doc.action_remarks = remarks or ""
	doc.acted_on = frappe.utils.now()
	doc.save()

	tender_doc = frappe.get_doc("GE Tender", doc.linked_tender)
	_apply_tender_approval_state(tender_doc, doc.approval_type, True, remarks=remarks)
	tender_doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender approval approved"}


@frappe.whitelist()
def reject_tender_approval(name, remarks=None):
	"""Reject a tender-specific approval request."""
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Tender Approval", name)
	if doc.approver_role == ROLE_DIRECTOR:
		_require_roles(ROLE_DIRECTOR)
	else:
		_require_roles(ROLE_PRESALES_HEAD, ROLE_DIRECTOR)
	if doc.status != "Pending":
		return {"success": False, "message": f"Approval is in {doc.status} status, must be Pending to reject"}
	doc.status = "Rejected"
	doc.approver_user = frappe.session.user
	doc.action_remarks = remarks or ""
	doc.acted_on = frappe.utils.now()
	doc.save()

	tender_doc = frappe.get_doc("GE Tender", doc.linked_tender)
	_apply_tender_approval_state(tender_doc, doc.approval_type, False, remarks=remarks)
	tender_doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Tender approval rejected"}


@frappe.whitelist()
def transition_tender_status(name, target_status):
	"""Controlled tender lifecycle transition using existing linked records for readiness checks."""
	_require_tender_write_access()
	name = _require_param(name, "name")
	target_status = _require_param(target_status, "target_status")
	target_status = str(target_status).strip().upper()

	allowed_statuses = {"SUBMITTED", "UNDER_EVALUATION", "WON", "LOST", "DROPPED"}
	if target_status not in allowed_statuses:
		return {"success": False, "message": f"Unsupported target status: {target_status}"}

	doc = frappe.get_doc("GE Tender", name)
	checks = _get_tender_transition_readiness(doc, target_status)
	blockers = [check["label"] for check in checks if not check["ok"]]
	if blockers:
		return {
			"success": False,
			"message": blockers[0],
			"data": {"checks": checks, "current_status": doc.status, "target_status": target_status},
		}

	doc.status = target_status
	doc.save()
	_sync_tender_result_tracker(doc)
	frappe.db.commit()
	return {
		"success": True,
		"data": {"tender": doc.as_dict(), "checks": checks},
		"message": f"Tender moved to {target_status}",
	}


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
	project_doc = frappe.get_doc("Project", doc.linked_project)
	if not getattr(project_doc, "linked_tender", None):
		project_doc.linked_tender = doc.name
	_sync_project_workflow_fields(project_doc, reset_submission=True)
	_append_project_workflow_event(
		project_doc,
		"TENDER_CONVERTED_TO_PROJECT",
		project_doc.current_project_stage,
		remarks=f"Converted from tender {doc.name}",
		metadata={"tender": doc.name},
	)
	project_doc.save()
	frappe.db.set_value("GE Tender", doc.name, "status", "CONVERTED_TO_PROJECT", update_modified=False)
	doc.status = "CONVERTED_TO_PROJECT"
	latest_cost_sheet = frappe.get_all(
		"GE Cost Sheet",
		filters={"linked_tender": doc.name},
		fields=["name", "status", "sell_value", "margin_percent", "approved_by"],
		order_by="creation desc",
		limit=1,
	)
	latest_approval = frappe.get_all(
		"GE Tender Approval",
		filters={"linked_tender": doc.name},
		fields=["name", "approval_type", "status", "requested_by", "approver_role", "acted_on"],
		order_by="creation desc",
		limit=1,
	)
	frappe.db.commit()
	return {
		"success": True,
		"data": {
			"project": doc.linked_project,
			"conversion_payload": {
				"tender": doc.name,
				"tender_number": doc.tender_number,
				"title": doc.title,
				"client": doc.client,
				"organization": doc.organization,
				"estimated_value": doc.estimated_value,
				"linked_project": doc.linked_project,
				"status": doc.status,
				"costing_snapshot": latest_cost_sheet[0] if latest_cost_sheet else None,
				"latest_approval": latest_approval[0] if latest_approval else None,
			},
		},
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
			"amount", "status", "bank_name", "issue_date", "expiry_date", "instrument_document", "remarks",
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

	tracked_statuses = ["UNDER_EVALUATION", "WON", "LOST"]
	tracked_filters = {"status": ["in", tracked_statuses]}
	if tender:
		tracked_filters["name"] = tender

	stage_status_map = {
		"Technical Evaluation": {"UNDER_EVALUATION"},
		"Financial Evaluation": {"UNDER_EVALUATION", "LOST"},
		"AOC": {"WON"},
		"LoI Issued": {"WON"},
		"Work Order": {"WON"},
	}
	if result_stage and result_stage in stage_status_map:
		tracked_filters["status"] = ["in", list(stage_status_map[result_stage])]

	tracked_tenders = frappe.get_all(
		"GE Tender",
		filters=tracked_filters,
		fields=["name", "tender_number", "title", "client", "organization", "status", "submission_date", "estimated_value", "modified"],
		order_by="modified desc",
	)
	existing_tenders = {row.get("tender") for row in data if row.get("tender")}
	for tracked in tracked_tenders:
		if tracked.name in existing_tenders:
			continue
		synthetic_stage = _get_tender_result_stage_for_status(tracked.status)
		if result_stage and synthetic_stage != result_stage:
			continue
		data.append(
			{
				"name": f"tracked::{tracked.name}",
				"result_id": tracked.tender_number,
				"tender": tracked.name,
				"reference_no": tracked.tender_number,
				"organization_name": tracked.organization or tracked.client,
				"result_stage": synthetic_stage,
				"publication_date": tracked.submission_date or cstr(tracked.modified)[:10],
				"winning_amount": tracked.estimated_value if tracked.status == "WON" else 0,
				"winner_company": "",
				"is_fresh": 1,
				"site_location": "",
				"creation": tracked.modified,
				"modified": tracked.modified,
			}
		)

	data.sort(
		key=lambda row: (
			_normalize_sortable_datetime(row.get("publication_date")),
			_normalize_sortable_datetime(row.get("creation")),
		),
		reverse=True,
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_tender_result(name=None):
	"""Return one tender result row with bidders."""
	_require_tender_read_access()
	name = _require_param(name, "name")
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
def get_tender_checklist(name=None):
	"""Return one tender checklist template."""
	_require_tender_read_access()
	name = _require_param(name, "name")
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
	today = frappe.utils.getdate(frappe.utils.nowdate())
	tender_meta = {}
	tender_names = [row.tender for row in data if row.tender]
	if tender_names:
		for row in frappe.get_all(
			"GE Tender",
			filters={"name": ["in", list(set(tender_names))]},
			fields=["name", "status", "submission_date", "estimated_value", "organization", "client"],
		):
			tender_meta[row.name] = row
	for row in data:
		meta = tender_meta.get(row.tender)
		reminder_date = frappe.utils.getdate(row.reminder_date) if row.reminder_date else None
		due_in_days = (reminder_date - today).days if reminder_date else None
		submission_date = frappe.utils.getdate(meta.submission_date) if meta and meta.submission_date else None
		if submission_date and reminder_date and reminder_date <= submission_date:
			row["reminder_kind"] = "Bid Deadline"
		elif meta and meta.status in ("SUBMITTED", "UNDER_EVALUATION"):
			row["reminder_kind"] = "Commercial Follow-up"
		else:
			row["reminder_kind"] = "Internal Checkpoint"
		row["due_in_days"] = due_in_days
		row["priority"] = "High" if due_in_days is not None and due_in_days <= 1 else "Medium" if due_in_days is not None and due_in_days <= 3 else "Normal"
		row["action_hint"] = (
			"Close submission readiness and final bid pack"
			if row["reminder_kind"] == "Bid Deadline"
			else "Follow up on clarification, commercial response, or finance dependency"
			if row["reminder_kind"] == "Commercial Follow-up"
			else "Keep ownership aligned and prepare next action"
		)
		if meta:
			row["tender_status"] = meta.status
		else:
			row["tender_status"] = None
	return {"success": True, "data": data}


@frappe.whitelist()
def get_tender_reminder(name=None):
	"""Return one tender reminder."""
	_require_tender_read_access()
	name = _require_param(name, "name")
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
def get_competitor(name=None):
	"""Return one competitor master row."""
	_require_tender_read_access()
	name = _require_param(name, "name")
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
def get_survey(name=None):
	"""Return a single survey with all fields."""
	_require_survey_read_access()
	name = _require_param(name, "name")
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
def get_boq(name=None):
	"""Return a single BOQ with all fields and line items."""
	_require_boq_read_access()
	name = _require_param(name, "name")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE BOQ",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=doc.get("linked_project"),
			from_status="DRAFT",
			to_status="PENDING_APPROVAL",
			current_status="PENDING_APPROVAL",
			submitted_by=frappe.session.user,
			submitted_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/boq" if doc.get("linked_project") else "/boq",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_boq_for_approval")

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE BOQ",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="PENDING_APPROVAL",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/boq" if doc.get("linked_project") else "/boq",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_boq")

	return {"success": True, "data": doc.as_dict(), "message": "BOQ approved"}


@frappe.whitelist()
def reject_boq(name, reason=None):
	"""Reject a BOQ that is PENDING_APPROVAL."""
	_require_boq_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE BOQ", name)
	if doc.status != "PENDING_APPROVAL":
		return {"success": False, "message": f"BOQ is in {doc.status} status, must be PENDING_APPROVAL to reject"}
	doc.status = "REJECTED"
	doc.rejected_by = frappe.session.user
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE BOQ",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status="PENDING_APPROVAL",
			to_status="REJECTED",
			current_status="REJECTED",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route=f"/projects/{doc.get('linked_project')}/boq" if doc.get("linked_project") else "/boq",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_boq")

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
def get_cost_sheet(name=None):
	"""Return a single cost sheet with all fields and line items."""
	_require_cost_sheet_read_access()
	name = _require_param(name, "name")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Cost Sheet",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=doc.get("linked_project"),
			from_status="DRAFT",
			to_status="PENDING_APPROVAL",
			current_status="PENDING_APPROVAL",
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/cost-sheet" if doc.get("linked_project") else "/cost-sheets",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_cost_sheet_for_approval")

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Cost Sheet",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="PENDING_APPROVAL",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/cost-sheet" if doc.get("linked_project") else "/cost-sheets",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_cost_sheet")

	return {"success": True, "data": doc.as_dict(), "message": "Cost Sheet approved"}


@frappe.whitelist()
def reject_cost_sheet(name, reason=None):
	"""Reject a cost sheet that is pending approval."""
	_require_cost_sheet_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Cost Sheet", name)
	if doc.status != "PENDING_APPROVAL":
		return {"success": False, "message": f"Cost Sheet is in {doc.status} status, must be PENDING_APPROVAL to reject"}
	doc.status = "REJECTED"
	doc.rejected_by = frappe.session.user
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Cost Sheet",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status="PENDING_APPROVAL",
			to_status="REJECTED",
			current_status="REJECTED",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route=f"/projects/{doc.get('linked_project')}/cost-sheet" if doc.get("linked_project") else "/cost-sheets",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_cost_sheet")

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
def get_vendor_comparison(name=None):
	"""Return a single vendor comparison with quote rows."""
	_require_procurement_read_access()
	name = _require_param(name, "name")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Vendor Comparison",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=doc.get("linked_project"),
			from_status="DRAFT",
			to_status="PENDING_APPROVAL",
			current_status="PENDING_APPROVAL",
			submitted_by=frappe.session.user,
			submitted_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route="/procurement/vendor-comparisons",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_vendor_comparison_for_approval")

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Vendor Comparison",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="PENDING_APPROVAL",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			remarks=exception_reason or "",
			source_route="/procurement/vendor-comparisons",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_vendor_comparison")

	return {"success": True, "data": doc.as_dict(), "message": "Vendor comparison approved"}


@frappe.whitelist()
def reject_vendor_comparison(name, reason=None):
	"""Reject a vendor comparison sheet."""
	_require_procurement_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Vendor Comparison", name)
	if doc.status != "PENDING_APPROVAL":
		return {
			"success": False,
			"message": f"Vendor comparison is in {doc.status} status, must be PENDING_APPROVAL to reject",
		}
	doc.status = "REJECTED"
	doc.exception_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Vendor Comparison",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status="PENDING_APPROVAL",
			to_status="REJECTED",
			current_status="REJECTED",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route="/procurement/vendor-comparisons",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_vendor_comparison")

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
def get_dispatch_challan(name=None):
	"""Return a single dispatch challan with line items."""
	_require_store_read_access()
	name = _require_param(name, "name")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Dispatch Challan",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="PENDING_APPROVAL",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route="/stores/dispatch-challans",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_dispatch_challan")

	return {"success": True, "data": doc.as_dict(), "message": "Dispatch challan approved"}


@frappe.whitelist()
def reject_dispatch_challan(name, reason=None):
	"""Reject a dispatch challan."""
	_require_store_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Dispatch Challan", name)
	if doc.status != "PENDING_APPROVAL":
		return {
			"success": False,
			"message": f"Dispatch challan is in {doc.status} status, must be PENDING_APPROVAL to reject",
		}
	doc.status = "REJECTED"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Dispatch Challan",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status="PENDING_APPROVAL",
			to_status="REJECTED",
			current_status="REJECTED",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route="/stores/dispatch-challans",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_dispatch_challan")

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
	data = _attach_indent_project_summary(data)
	data = _attach_indent_accountability_summary(data)
	return {"success": True, "data": data, "total": total}


@frappe.whitelist()
def get_indent(name=None):
	"""Return one indent backed by Material Request."""
	_require_procurement_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("Material Request", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_indent(data):
	"""Create an indent backed by Material Request."""
	_require_procurement_write_access()
	values = _parse_payload(data)
	project = values.pop("project", None)
	doc = _create_indent_document(values, project=project)

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="Material Request",
			subject_name=doc.name,
			event_type=EventType.CREATED,
			linked_project=project,
			current_status="Draft",
			current_owner_user=frappe.session.user,
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{project}/procurement/indents" if project else "/procurement/indents",
			reference_doctype="Material Request",
			reference_name=doc.name,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: create_indent")

	return {"success": True, "data": doc.as_dict(), "message": "Indent created"}


@frappe.whitelist()
def get_project_indents(project=None, limit_page_length=25, limit_start=0):
	"""Return project-scoped indents for PM/PH inventory-facing surfaces."""
	_require_project_inventory_read_access()
	project = _ensure_project_manager_project_scope(project) if _get_project_manager_assigned_projects() else _require_param(project, "project")
	result = get_indents(
		project=project,
		limit_page_length=limit_page_length,
		limit_start=limit_start,
	)
	return result


@frappe.whitelist()
def create_project_indent(data):
	"""Create a project-scoped indent from the PM inventory lane."""
	_require_project_inventory_write_access()
	values = _parse_payload(data)
	project = _ensure_project_manager_project_scope(values.get("project") or values.get("linked_project"))
	item_code = _require_param(values.get("item_code"), "item_code")
	required_qty = flt(values.get("qty") or values.get("required_qty"))
	if required_qty <= 0:
		frappe.throw("Required quantity must be greater than zero")

	item_row = {
		"item_code": item_code,
		"qty": required_qty,
		"project": project,
		"schedule_date": values.get("schedule_date") or frappe.utils.add_days(frappe.utils.nowdate(), 7),
	}
	if values.get("uom"):
		item_row["uom"] = values.get("uom")
	if values.get("warehouse"):
		item_row["warehouse"] = values.get("warehouse")

	doc = _create_indent_document(
		{
			"material_request_type": "Purchase",
			"schedule_date": values.get("schedule_date"),
			"set_warehouse": values.get("warehouse"),
			"company": values.get("company"),
			"transaction_date": values.get("transaction_date") or today(),
			"items": [item_row],
		},
		project=project,
	)

	remarks = values.get("remarks")
	if remarks and hasattr(doc, "title"):
		doc.title = remarks[:140]
		doc.save(ignore_permissions=True)
		frappe.db.commit()

	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="Material Request",
			subject_name=doc.name,
			event_type=EventType.CREATED,
			linked_project=project,
			current_status="Draft",
			current_owner_user=frappe.session.user,
			current_owner_role=ROLE_PROJECT_MANAGER,
			source_route=f"/project-manager/inventory?project={project}",
			reference_doctype="Material Request",
			reference_name=doc.name,
			remarks=remarks,
			metadata={
				"created_from": "project_manager_inventory",
				"item_code": item_code,
				"qty": required_qty,
				"linked_site": values.get("linked_site"),
			},
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: create_project_indent")

	return {"success": True, "data": doc.as_dict(), "message": "Project indent created"}


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


# ── Indent Workflow Action Layer (Phase 2 Accountability) ────

def _get_indent_project(doc):
	"""Extract the linked project from a Material Request via its items."""
	if getattr(doc, "items", None):
		return doc.items[0].get("project")
	row = frappe.db.get_value("Material Request Item", {"parent": doc.name}, "project")
	return row


@frappe.whitelist()
def submit_indent(name):
	"""Submit a draft indent (Material Request) for PH review."""
	_require_procurement_write_access()
	doc = frappe.get_doc("Material Request", name)
	if doc.docstatus != 0:
		frappe.throw("Only draft indents can be submitted.")
	doc.submit()
	frappe.db.commit()
	project = _get_indent_project(doc)
	submitter_role = _detect_primary_role()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="Material Request",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=project,
			from_status="Draft",
			to_status="Submitted",
			current_status="Submitted",
			submitted_by=frappe.session.user,
			submitted_on=now_datetime(),
			current_owner_role=ROLE_PROJECT_HEAD,
			current_owner_user="",
			assigned_to_role=ROLE_PROJECT_HEAD,
			from_owner_user=frappe.session.user,
			from_owner_role=submitter_role,
			to_owner_role=ROLE_PROJECT_HEAD,
			source_route=f"/projects/{project}/procurement/indents" if project else "/procurement/indents",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_indent")

	try:
		from gov_erp.alert_dispatcher import on_indent_event
		on_indent_event(
			project,
			name,
			"submitted",
			detail="Indent submitted and waiting for Project Head review.",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Alert: submit_indent")

	return {"success": True, "data": doc.as_dict(), "message": "Indent submitted for review"}


@frappe.whitelist()
def acknowledge_indent(name):
	"""PH acknowledges receipt of a submitted indent."""
	_require_procurement_approval_access()
	doc = frappe.get_doc("Material Request", name)
	if doc.docstatus != 1:
		frappe.throw("Only submitted indents can be acknowledged.")
	project = _get_indent_project(doc)

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="Material Request",
			subject_name=name,
			event_type=EventType.ACKNOWLEDGED,
			linked_project=project,
			from_status="Submitted",
			to_status="Acknowledged",
			current_status="Acknowledged",
			current_owner_user=frappe.session.user,
			current_owner_role=ROLE_PROJECT_HEAD,
			assigned_to_role=ROLE_PROJECT_HEAD,
			to_owner_user=frappe.session.user,
			to_owner_role=ROLE_PROJECT_HEAD,
			source_route=f"/projects/{project}/procurement/indents" if project else "/procurement/indents",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: acknowledge_indent")

	try:
		from gov_erp.alert_dispatcher import on_indent_event
		on_indent_event(
			project,
			name,
			"acknowledged",
			detail=f"Indent acknowledged by {frappe.session.user}.",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Alert: acknowledge_indent")

	return {"success": True, "message": "Indent acknowledged"}


@frappe.whitelist()
def accept_indent(name):
	"""PH accepts the indent and passes it to the procurement team."""
	_require_procurement_approval_access()
	doc = frappe.get_doc("Material Request", name)
	if doc.docstatus != 1:
		frappe.throw("Only submitted indents can be accepted.")
	project = _get_indent_project(doc)

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="Material Request",
			subject_name=name,
			event_type=EventType.ACCEPTED,
			linked_project=project,
			from_status="Acknowledged" if frappe.db.exists("GE Accountability Record", {"subject_doctype": "Material Request", "subject_name": name, "current_status": "Acknowledged"}) else "Submitted",
			to_status="Accepted",
			current_status="Accepted",
			accepted_by=frappe.session.user,
			accepted_on=now_datetime(),
			current_owner_role=ROLE_PROCUREMENT_MANAGER,
			current_owner_user="",
			assigned_to_role=ROLE_PROCUREMENT_MANAGER,
			from_owner_user=frappe.session.user,
			from_owner_role=ROLE_PROJECT_HEAD,
			to_owner_role=ROLE_PROCUREMENT_MANAGER,
			source_route=f"/projects/{project}/procurement/indents" if project else "/procurement/indents",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: accept_indent")

	try:
		from gov_erp.alert_dispatcher import on_indent_event
		on_indent_event(
			project,
			name,
			"accepted",
			detail=f"Indent accepted by {frappe.session.user} and handed to procurement.",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Alert: accept_indent")

	return {"success": True, "message": "Indent accepted — procurement can proceed"}


@frappe.whitelist()
def reject_indent(name, reason=None):
	"""PH rejects a submitted indent and stops the Material Request."""
	_require_procurement_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("Material Request", name)
	if doc.docstatus != 1:
		frappe.throw("Only submitted indents can be rejected.")
	doc.status = "Stopped"
	doc.save()
	frappe.db.commit()
	project = _get_indent_project(doc)
	requester_user = _get_indent_requester_user(doc)
	requester_role = _detect_primary_role(requester_user) if requester_user else ROLE_PROJECT_MANAGER

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="Material Request",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=project,
			from_status="Submitted",
			to_status="Rejected",
			current_status="Rejected",
			current_owner_role=requester_role,
			current_owner_user=requester_user or "",
			assigned_to_role=requester_role,
			assigned_to_user=requester_user or "",
			from_owner_user=frappe.session.user,
			from_owner_role=ROLE_PROJECT_HEAD,
			to_owner_user=requester_user or "",
			to_owner_role=requester_role,
			remarks=reason,
			source_route=f"/projects/{project}/procurement/indents" if project else "/procurement/indents",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_indent")

	try:
		from gov_erp.alert_dispatcher import on_indent_event
		on_indent_event(
			project,
			name,
			"rejected",
			detail=reason,
			extra_recipients=[requester_user] if requester_user else None,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Alert: reject_indent")

	return {"success": True, "data": doc.as_dict(), "message": "Indent rejected"}


@frappe.whitelist()
def return_indent(name, reason=None):
	"""PH returns an indent for revision — cancels the Material Request."""
	_require_procurement_approval_access()
	if not (reason or "").strip():
		frappe.throw("A return reason is required. Please provide remarks.")
	doc = frappe.get_doc("Material Request", name)
	if doc.docstatus != 1:
		frappe.throw("Only submitted indents can be returned for revision.")
	doc.cancel()
	frappe.db.commit()
	project = _get_indent_project(doc)
	requester_user = _get_indent_requester_user(doc)
	requester_role = _detect_primary_role(requester_user) if requester_user else ROLE_PROJECT_MANAGER

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="Material Request",
			subject_name=name,
			event_type=EventType.RETURNED,
			linked_project=project,
			from_status="Submitted",
			to_status="Returned for Revision",
			current_status="Returned for Revision",
			current_owner_role=requester_role,
			current_owner_user=requester_user or "",
			assigned_to_role=requester_role,
			assigned_to_user=requester_user or "",
			from_owner_user=frappe.session.user,
			from_owner_role=ROLE_PROJECT_HEAD,
			to_owner_user=requester_user or "",
			to_owner_role=requester_role,
			remarks=reason,
			source_route=f"/projects/{project}/procurement/indents" if project else "/procurement/indents",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: return_indent")

	try:
		from gov_erp.alert_dispatcher import on_indent_event
		on_indent_event(
			project,
			name,
			"returned",
			detail=reason,
			extra_recipients=[requester_user] if requester_user else None,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Alert: return_indent")

	return {"success": True, "data": doc.as_dict(), "message": "Indent returned for revision"}


@frappe.whitelist()
def escalate_indent(name, escalate_to_user=None, reason=None):
	"""Escalate a stalled indent to a higher authority."""
	_require_roles(ROLE_PROJECT_HEAD, ROLE_DIRECTOR)
	if not (reason or "").strip():
		frappe.throw("An escalation reason is required. Please provide remarks.")
	doc = frappe.get_doc("Material Request", name)
	project = _get_indent_project(doc)

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="Material Request",
			subject_name=name,
			event_type=EventType.ESCALATED,
			linked_project=project,
			current_status="Escalated",
			current_owner_role=ROLE_DIRECTOR,
			current_owner_user=escalate_to_user or "",
			assigned_to_role=ROLE_DIRECTOR,
			assigned_to_user=escalate_to_user or "",
			escalated_to_user=escalate_to_user,
			escalated_to_role=ROLE_DIRECTOR,
			from_owner_user=frappe.session.user,
			from_owner_role=_detect_primary_role(),
			to_owner_user=escalate_to_user or "",
			to_owner_role=ROLE_DIRECTOR,
			remarks=reason,
			source_route=f"/projects/{project}/procurement/indents" if project else "/procurement/indents",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: escalate_indent")

	try:
		from gov_erp.alert_dispatcher import on_indent_event
		extra = [escalate_to_user] if escalate_to_user else None
		on_indent_event(project, name, "escalated", detail=reason, extra_recipients=extra)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Alert: escalate_indent")

	return {"success": True, "message": "Indent escalated"}


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
def get_purchase_order(name=None):
	"""Return one ERPNext purchase order."""
	_require_procurement_read_access()
	name = _require_param(name, "name")
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


# ── Purchase Order CRUD ──────────────────────────────────────


@frappe.whitelist()
def create_purchase_order(data):
	"""Create a new ERPNext Purchase Order with items and optional payment terms."""
	_require_procurement_write_access()
	values = _parse_payload(data)

	company = values.get("company") or _get_default_company()
	default_warehouse = _get_default_warehouse(company)

	items = values.get("items") or []
	if not items:
		frappe.throw("At least one item is required")

	po_items = []
	for item in items:
		po_items.append({
			"item_code": item.get("item_code"),
			"qty": flt(item.get("qty", 1)),
			"rate": flt(item.get("rate", 0)),
			"description": item.get("description", ""),
			"schedule_date": item.get("schedule_date")
				or frappe.utils.add_days(frappe.utils.nowdate(), 14),
			"uom": item.get("uom") or "Nos",
			"project": values.get("project"),
			"warehouse": item.get("warehouse") or default_warehouse,
		})

	po = frappe.get_doc({
		"doctype": "Purchase Order",
		"supplier": values.get("supplier"),
		"company": company,
		"project": values.get("project"),
		"set_warehouse": values.get("warehouse") or default_warehouse,
		"transaction_date": values.get("transaction_date") or frappe.utils.nowdate(),
		"schedule_date": values.get("schedule_date")
			or frappe.utils.add_days(frappe.utils.nowdate(), 14),
		"items": po_items,
	})
	po.insert()

	# Create GE PO Extension with payment terms if provided
	payment_terms = values.get("payment_terms") or []
	if payment_terms:
		_save_po_payment_terms(po.name, payment_terms, values.get("payment_terms_note"))

	frappe.db.commit()
	return {
		"success": True,
		"data": {"name": po.name},
		"message": f"Purchase Order {po.name} created",
	}


@frappe.whitelist()
def update_purchase_order(data):
	"""Update an existing draft Purchase Order."""
	_require_procurement_write_access()
	values = _parse_payload(data)
	name = _require_param(values.get("name"), "name")

	po = frappe.get_doc("Purchase Order", name)
	if po.docstatus != 0:
		frappe.throw("Only draft Purchase Orders can be edited")

	updatable_fields = [
		"supplier", "project", "set_warehouse",
		"transaction_date", "schedule_date",
	]
	for field in updatable_fields:
		if field in values:
			setattr(po, field, values[field])

	# Replace items if provided
	if "items" in values:
		po.items = []
		default_warehouse = _get_default_warehouse(po.company)
		for item in values["items"]:
			po.append("items", {
				"item_code": item.get("item_code"),
				"qty": flt(item.get("qty", 1)),
				"rate": flt(item.get("rate", 0)),
				"description": item.get("description", ""),
				"schedule_date": item.get("schedule_date")
					or po.schedule_date
					or frappe.utils.add_days(frappe.utils.nowdate(), 14),
				"uom": item.get("uom") or "Nos",
				"project": po.project,
				"warehouse": item.get("warehouse") or default_warehouse,
			})

	po.save()

	# Update payment terms if provided
	if "payment_terms" in values:
		_save_po_payment_terms(po.name, values["payment_terms"], values.get("payment_terms_note"))

	frappe.db.commit()
	return {"success": True, "data": {"name": po.name}, "message": "Purchase Order updated"}


@frappe.whitelist()
def delete_purchase_order(name=None):
	"""Delete a draft Purchase Order."""
	_require_procurement_write_access()
	name = _require_param(name, "name")
	po = frappe.get_doc("Purchase Order", name)
	if po.docstatus != 0:
		frappe.throw("Only draft Purchase Orders can be deleted")

	# Delete linked extension if exists
	if frappe.db.exists("GE PO Extension", name):
		frappe.delete_doc("GE PO Extension", name)

	frappe.delete_doc("Purchase Order", name)
	frappe.db.commit()
	return {"success": True, "message": f"Purchase Order {name} deleted"}


@frappe.whitelist()
def submit_purchase_order(name=None):
	"""Submit a draft Purchase Order."""
	_require_procurement_write_access()
	name = _require_param(name, "name")
	po = frappe.get_doc("Purchase Order", name)
	if po.docstatus != 0:
		frappe.throw("Purchase Order is not in draft state")
	po.submit()
	frappe.db.commit()
	return {"success": True, "data": {"name": po.name, "status": po.status}, "message": "Purchase Order submitted"}


@frappe.whitelist()
def cancel_purchase_order(name=None):
	"""Cancel a submitted Purchase Order."""
	_require_procurement_write_access()
	name = _require_param(name, "name")
	po = frappe.get_doc("Purchase Order", name)
	if po.docstatus != 1:
		frappe.throw("Only submitted Purchase Orders can be cancelled")
	po.cancel()
	frappe.db.commit()
	return {"success": True, "data": {"name": po.name, "status": po.status}, "message": "Purchase Order cancelled"}


# ── PO Payment Terms ─────────────────────────────────────────


def _save_po_payment_terms(po_name, terms_list, note=None):
	"""Create or update the GE PO Extension with payment terms for a PO."""
	from frappe.utils import flt as _flt

	if frappe.db.exists("GE PO Extension", po_name):
		ext = frappe.get_doc("GE PO Extension", po_name)
		ext.payment_terms = []
	else:
		ext = frappe.get_doc({
			"doctype": "GE PO Extension",
			"purchase_order": po_name,
		})

	if note is not None:
		ext.payment_terms_note = note

	for t in terms_list:
		ext.append("payment_terms", {
			"term_type": t.get("term_type"),
			"percentage": _flt(t.get("percentage", 0)),
			"days": int(t.get("days") or 0),
			"remarks": t.get("remarks"),
			"approval_document": t.get("approval_document"),
			"approval_document_name": t.get("approval_document_name"),
		})

	ext.save()
	return ext.name


@frappe.whitelist()
def get_po_payment_terms(purchase_order=None):
	"""Return payment terms for a purchase order from GE PO Extension."""
	_require_procurement_read_access()
	purchase_order = _require_param(purchase_order, "purchase_order")

	if not frappe.db.exists("GE PO Extension", purchase_order):
		return {"success": True, "data": {"payment_terms": [], "note": None, "approval_status": "Pending", "total_pct": 0}}

	ext = frappe.get_doc("GE PO Extension", purchase_order)
	terms = []
	for t in ext.payment_terms or []:
		terms.append({
			"name": t.name,
			"term_type": t.term_type,
			"percentage": t.percentage,
			"amount": t.amount,
			"days": t.days,
			"due_date": str(t.due_date) if t.due_date else None,
			"status": t.status,
			"approval_document": t.approval_document,
			"approval_document_name": t.approval_document_name,
			"remarks": t.remarks,
		})

	return {
		"success": True,
		"data": {
			"payment_terms": terms,
			"note": ext.payment_terms_note,
			"approval_status": ext.accounts_approval_status,
			"total_pct": ext.total_payment_terms_pct,
		},
	}


@frappe.whitelist()
def save_po_payment_terms(data):
	"""Save/replace payment terms for a purchase order."""
	_require_procurement_write_access()
	values = _parse_payload(data)
	po_name = _require_param(values.get("purchase_order"), "purchase_order")

	if not frappe.db.exists("Purchase Order", po_name):
		frappe.throw(f"Purchase Order {po_name} not found")

	terms = values.get("payment_terms") or []
	_save_po_payment_terms(po_name, terms, values.get("payment_terms_note"))
	frappe.db.commit()
	return {"success": True, "message": "Payment terms saved"}


@frappe.whitelist()
def approve_po_payment_terms(purchase_order=None):
	"""Mark payment terms as approved by accounts department."""
	_require_procurement_write_access()
	purchase_order = _require_param(purchase_order, "purchase_order")

	if not frappe.db.exists("GE PO Extension", purchase_order):
		frappe.throw("No payment terms found for this PO")

	ext = frappe.get_doc("GE PO Extension", purchase_order)
	ext.accounts_approval_status = "Approved"
	ext.save()
	frappe.db.commit()
	return {"success": True, "message": "Payment terms approved"}


@frappe.whitelist()
def reject_po_payment_terms(purchase_order=None, reason=None):
	"""Reject payment terms by accounts department."""
	_require_procurement_write_access()
	purchase_order = _require_param(purchase_order, "purchase_order")

	if not frappe.db.exists("GE PO Extension", purchase_order):
		frappe.throw("No payment terms found for this PO")

	ext = frappe.get_doc("GE PO Extension", purchase_order)
	ext.accounts_approval_status = "Rejected"
	if reason:
		ext.payment_terms_note = (ext.payment_terms_note or "") + f"\n[REJECTED] {reason}"
	ext.save()
	frappe.db.commit()
	return {"success": True, "message": "Payment terms rejected"}


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
		# purchase_order lives on child Purchase Receipt Item, not the parent
		pr_names = frappe.get_all(
			"Purchase Receipt Item",
			filters={"purchase_order": purchase_order},
			pluck="parent",
		)
		if pr_names:
			filters["name"] = ["in", list(set(pr_names))]
		else:
			return {"success": True, "data": [], "total": 0}

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
def get_grn(name=None):
	"""Return one ERPNext purchase receipt."""
	_require_store_read_access()
	name = _require_param(name, "name")
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
def get_site(name=None):
	"""Return a single site."""
	_require_execution_read_access()
	name = _require_param(name, "name")
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
def get_milestone(name=None):
	"""Return a single milestone."""
	_require_milestone_read_access()
	name = _require_param(name, "name")
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
def sync_site_milestone_progress(site_name):
	"""Recompute site progress from its linked milestones.

	Returns the updated site_progress_pct and location_progress_pct.
	"""
	_require_execution_write_access()
	site_name = _require_param(site_name, "site_name")

	milestones = frappe.get_all(
		"GE Milestone",
		filters={"linked_site": site_name},
		fields=["progress_pct", "status"],
	)
	if not milestones:
		return {"success": True, "data": {"milestones": 0, "site_progress_pct": 0, "location_progress_pct": 0}, "message": "No milestones linked"}

	total = len(milestones)
	completed = sum(1 for m in milestones if m.status == "COMPLETED")
	avg_progress = sum(m.progress_pct or 0 for m in milestones) / total
	completion_pct = (completed / total) * 100

	frappe.db.set_value(
		"GE Site", site_name,
		{"site_progress_pct": avg_progress, "location_progress_pct": completion_pct},
		update_modified=False,
	)
	frappe.db.commit()

	return {
		"success": True,
		"data": {
			"milestones": total,
			"completed": completed,
			"site_progress_pct": avg_progress,
			"location_progress_pct": completion_pct,
		},
		"message": "Site progress synced from milestones",
	}


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
def get_onboardings(status=None, company=None, search=None):
	"""Return onboarding records, optionally filtered."""
	_require_hr_read_access()
	filters = {}
	or_filters = []
	if status:
		filters["onboarding_status"] = status
	if company:
		filters["company"] = company
	if search:
		search_text = f"%{search.strip()}%"
		or_filters = [
			["name", "like", search_text],
			["employee_name", "like", search_text],
			["designation", "like", search_text],
			["company", "like", search_text],
			["project_location", "like", search_text],
			["project_city", "like", search_text],
			["contact_number", "like", search_text],
			["personal_email", "like", search_text],
		]
	data = frappe.get_all(
		"GE Employee Onboarding",
		filters=filters,
		or_filters=or_filters,
		fields=[
			"name", "employee_name", "company", "designation", "onboarding_status",
			"date_of_joining", "employee_reference", "submitted_by",
			"reviewed_by", "approved_by", "approved_at", "rejected_by",
			"rejection_reason", "form_source", "project_location", "project_city",
			"creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_onboarding(name=None):
	"""Return a single onboarding record with all fields and child tables."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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
	if not doc.submitted_by:
		doc.submitted_by = frappe.session.user
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Employee Onboarding",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=doc.get("linked_project"),
			from_status="DRAFT",
			to_status="SUBMITTED",
			current_status="SUBMITTED",
			current_owner_role=_detect_primary_role(),
			source_route="/hr/onboarding",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_onboarding")

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Employee Onboarding",
			subject_name=name,
			event_type=EventType.ACKNOWLEDGED,
			linked_project=doc.get("linked_project"),
			from_status="SUBMITTED",
			to_status="UNDER_REVIEW",
			current_status="UNDER_REVIEW",
			current_owner_role=_detect_primary_role(),
			source_route="/hr/onboarding",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: review_onboarding")

	return {"success": True, "data": doc.as_dict(), "message": "Onboarding is now under review"}


@frappe.whitelist()
def return_onboarding_to_submitted(name):
	"""Move onboarding from UNDER_REVIEW back to SUBMITTED."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status != "UNDER_REVIEW":
		return {"success": False, "message": f"Onboarding is in {doc.onboarding_status} status, must be UNDER_REVIEW to send back"}
	doc.onboarding_status = "SUBMITTED"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Employee Onboarding",
			subject_name=name,
			event_type=EventType.RETURNED,
			linked_project=doc.get("linked_project"),
			from_status="UNDER_REVIEW",
			to_status="SUBMITTED",
			current_status="SUBMITTED",
			current_owner_role=_detect_primary_role(),
			source_route="/hr/onboarding",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: return_onboarding_to_submitted")

	return {"success": True, "data": doc.as_dict(), "message": "Onboarding returned to submitted state"}


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
	doc.approved_by = frappe.session.user
	doc.approved_at = frappe.utils.now()
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Employee Onboarding",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="UNDER_REVIEW",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route="/hr/onboarding",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_onboarding")

	return {"success": True, "data": doc.as_dict(), "message": "Onboarding approved"}


@frappe.whitelist()
def reject_onboarding(name, reason=None):
	"""Reject an onboarding that is under review."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status != "UNDER_REVIEW":
		return {"success": False, "message": f"Onboarding is in {doc.onboarding_status} status, must be UNDER_REVIEW to reject"}
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc.onboarding_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Employee Onboarding",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status="UNDER_REVIEW",
			to_status="REJECTED",
			current_status="REJECTED",
			remarks=reason,
			current_owner_role=_detect_primary_role(),
			source_route="/hr/onboarding",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_onboarding")

	return {"success": True, "data": doc.as_dict(), "message": "Onboarding rejected"}


@frappe.whitelist()
def reopen_onboarding_draft(name):
	"""Move onboarding back to DRAFT from a rejected or submitted state."""
	_require_hr_write_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status not in {"REJECTED", "SUBMITTED"}:
		return {"success": False, "message": f"Onboarding is in {doc.onboarding_status} status, cannot move it to DRAFT"}
	doc.onboarding_status = "DRAFT"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Onboarding moved back to draft"}


@frappe.whitelist()
def preview_onboarding_employee_mapping(name):
	"""Return the employee payload that would be created from an approved onboarding record."""
	_require_hr_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Employee Onboarding", name)

	from gov_erp.gov_erp.doctype.ge_employee_onboarding.ge_employee_onboarding import (
		get_onboarding_mapping_readiness,
		map_onboarding_to_employee_dict,
	)

	preview = map_onboarding_to_employee_dict(doc)
	readiness = get_onboarding_mapping_readiness(doc)

	return {
		"success": True,
		"data": {
			"employee_preview": preview,
			"readiness": readiness,
		},
	}


@frappe.whitelist()
def map_onboarding_to_employee(name):
	"""Create an ERPNext Employee from an approved onboarding record."""
	_require_hr_write_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)

	from gov_erp.gov_erp.doctype.ge_employee_onboarding.ge_employee_onboarding import (
		get_onboarding_mapping_readiness,
		map_onboarding_to_employee_dict,
	)
	readiness = get_onboarding_mapping_readiness(doc)
	if not readiness["can_map"]:
		return {
			"success": False,
			"message": "Onboarding is not ready to map: " + "; ".join(readiness["blocking_reasons"]),
			"data": {"readiness": readiness},
		}

	emp_data = map_onboarding_to_employee_dict(doc)
	emp_data["doctype"] = "Employee"
	emp_data["status"] = "Active"

	employee = frappe.get_doc(emp_data)
	try:
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

		# Link back only after employee sync completes
		doc.employee_reference = employee.name
		doc.onboarding_status = "MAPPED_TO_EMPLOYEE"
		doc.save()
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		if getattr(employee, "name", None) and frappe.db.exists("Employee", employee.name):
			frappe.delete_doc("Employee", employee.name, ignore_permissions=True, force=True)
			frappe.db.commit()
		raise

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
def get_attendance_log(name=None):
	"""Return one attendance log."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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


def _get_cycle_bounds(from_date=None, to_date=None):
	if from_date and to_date:
		return getdate(from_date), getdate(to_date)
	reference = getdate(from_date or to_date or today())
	return getdate(f"{reference.year}-01-01"), getdate(f"{reference.year}-12-31")


def _date_ranges_overlap(range_start, range_end, cycle_start, cycle_end):
	return getdate(range_start) <= cycle_end and getdate(range_end) >= cycle_start


def _overlap_days(range_start, range_end, cycle_start, cycle_end):
	if not _date_ranges_overlap(range_start, range_end, cycle_start, cycle_end):
		return 0
	start = max(getdate(range_start), cycle_start)
	end = min(getdate(range_end), cycle_end)
	return date_diff(end, start) + 1


def _calculate_leave_balances(employee=None, from_date=None, to_date=None, exclude_application=None):
	cycle_start, cycle_end = _get_cycle_bounds(from_date, to_date)
	allocation_filters = {}
	application_filters = {"leave_status": "APPROVED"}
	if employee:
		allocation_filters["employee"] = employee
		application_filters["employee"] = employee

	allocations = frappe.get_all(
		"GE Leave Allocation",
		filters=allocation_filters,
		fields=["name", "employee", "leave_type", "allocation_days", "from_date", "to_date"],
	)
	applications = frappe.get_all(
		"GE Leave Application",
		filters=application_filters,
		fields=["name", "employee", "leave_type", "from_date", "to_date", "total_leave_days"],
	)
	leave_types = {
		row.name: row
		for row in frappe.get_all(
			"GE Leave Type",
			fields=["name", "leave_type_name", "color", "annual_allocation", "is_paid_leave", "is_active"],
		)
	}

	balance_map = defaultdict(lambda: {
		"employee": "",
		"leave_type": "",
		"leave_type_label": "",
		"allocated": 0.0,
		"consumed": 0.0,
		"remaining": 0.0,
		"color": "#1e6b87",
		"is_paid_leave": 1,
	})

	for allocation in allocations:
		if not allocation.from_date or not allocation.to_date:
			continue
		if not _date_ranges_overlap(allocation.from_date, allocation.to_date, cycle_start, cycle_end):
			continue
		key = (allocation.employee, allocation.leave_type)
		leave_type_meta = leave_types.get(allocation.leave_type)
		entry = balance_map[key]
		entry["employee"] = allocation.employee
		entry["leave_type"] = allocation.leave_type
		entry["leave_type_label"] = leave_type_meta.leave_type_name if leave_type_meta else allocation.leave_type
		entry["allocated"] += flt(allocation.allocation_days)
		entry["color"] = leave_type_meta.color if leave_type_meta and leave_type_meta.color else entry["color"]
		entry["is_paid_leave"] = leave_type_meta.is_paid_leave if leave_type_meta else entry["is_paid_leave"]

	for application in applications:
		if exclude_application and application.name == exclude_application:
			continue
		if not application.from_date or not application.to_date:
			continue
		overlap = _overlap_days(application.from_date, application.to_date, cycle_start, cycle_end)
		if overlap <= 0:
			continue
		key = (application.employee, application.leave_type)
		leave_type_meta = leave_types.get(application.leave_type)
		entry = balance_map[key]
		entry["employee"] = application.employee
		entry["leave_type"] = application.leave_type
		entry["leave_type_label"] = leave_type_meta.leave_type_name if leave_type_meta else application.leave_type
		entry["consumed"] += flt(overlap)
		entry["color"] = leave_type_meta.color if leave_type_meta and leave_type_meta.color else entry["color"]
		entry["is_paid_leave"] = leave_type_meta.is_paid_leave if leave_type_meta else entry["is_paid_leave"]

	for entry in balance_map.values():
		entry["remaining"] = flt(entry["allocated"] - entry["consumed"])

	return {
		"cycle_start": str(cycle_start),
		"cycle_end": str(cycle_end),
		"rows": sorted(balance_map.values(), key=lambda row: (row["employee"], row["leave_type_label"])),
	}


@frappe.whitelist()
def get_leave_types(active_only=None):
	"""Return leave type setup rows."""
	_require_hr_read_access()
	filters = {}
	if cint(active_only):
		filters["is_active"] = 1
	data = frappe.get_all(
		"GE Leave Type",
		filters=filters,
		fields=["name", "leave_type_name", "annual_allocation", "is_paid_leave", "is_active", "color", "description"],
		order_by="leave_type_name asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_leave_type(data):
	"""Create a leave type."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Leave Type", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave type created"}


@frappe.whitelist()
def update_leave_type(name, data):
	"""Update a leave type."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Leave Type", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave type updated"}


@frappe.whitelist()
def delete_leave_type(name):
	"""Delete a leave type."""
	_require_leave_manage_access()
	frappe.delete_doc("GE Leave Type", name)
	frappe.db.commit()
	return {"success": True, "message": "Leave type deleted"}


@frappe.whitelist()
def get_leave_allocations(employee=None, leave_type=None):
	"""Return leave allocations."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if leave_type:
		filters["leave_type"] = leave_type
	data = frappe.get_all(
		"GE Leave Allocation",
		filters=filters,
		fields=["name", "employee", "leave_type", "allocation_days", "from_date", "to_date", "notes", "creation", "modified"],
		order_by="from_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_leave_allocation(data):
	"""Create a leave allocation."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Leave Allocation", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave allocation created"}


@frappe.whitelist()
def update_leave_allocation(name, data):
	"""Update a leave allocation."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Leave Allocation", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave allocation updated"}


@frappe.whitelist()
def delete_leave_allocation(name):
	"""Delete a leave allocation."""
	_require_leave_manage_access()
	frappe.delete_doc("GE Leave Allocation", name)
	frappe.db.commit()
	return {"success": True, "message": "Leave allocation deleted"}


@frappe.whitelist()
def get_leave_applications(employee=None, status=None, leave_type=None, from_date=None, to_date=None):
	"""Return leave applications."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if status:
		filters["leave_status"] = status
	if leave_type:
		filters["leave_type"] = leave_type
	data = frappe.get_all(
		"GE Leave Application",
		filters=filters,
		fields=[
			"name", "employee", "leave_type", "leave_status", "from_date", "to_date",
			"total_leave_days", "linked_project", "linked_site", "reason",
			"submitted_by", "approved_by", "approved_at", "rejected_by", "rejection_reason",
			"creation", "modified",
		],
		order_by="from_date desc, creation desc",
	)
	if from_date or to_date:
		cycle_start, cycle_end = _get_cycle_bounds(from_date, to_date)
		data = [
			row for row in data
			if row.from_date and row.to_date and _date_ranges_overlap(row.from_date, row.to_date, cycle_start, cycle_end)
		]
	return {"success": True, "data": data}


@frappe.whitelist()
def get_leave_application(name=None):
	"""Return one leave application."""
	_require_hr_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Leave Application", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_leave_application(data):
	"""Create a leave application."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Leave Application", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application created"}


@frappe.whitelist()
def update_leave_application(name, data):
	"""Update a leave application."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Leave Application", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application updated"}


@frappe.whitelist()
def delete_leave_application(name):
	"""Delete a leave application."""
	_require_leave_manage_access()
	frappe.delete_doc("GE Leave Application", name)
	frappe.db.commit()
	return {"success": True, "message": "Leave application deleted"}


@frappe.whitelist()
def submit_leave_application(name):
	"""Move leave application from DRAFT to SUBMITTED."""
	_require_leave_manage_access()
	doc = frappe.get_doc("GE Leave Application", name)
	if doc.leave_status != "DRAFT":
		return {"success": False, "message": f"Leave application is in {doc.leave_status} status, must be DRAFT to submit"}
	doc.leave_status = "SUBMITTED"
	if not doc.submitted_by:
		doc.submitted_by = frappe.session.user
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application submitted"}


@frappe.whitelist()
def approve_leave_application(name):
	"""Approve a submitted leave application if balance is available."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Leave Application", name)
	if doc.leave_status != "SUBMITTED":
		return {"success": False, "message": f"Leave application is in {doc.leave_status} status, must be SUBMITTED to approve"}
	balance = _calculate_leave_balances(doc.employee, doc.from_date, doc.to_date, exclude_application=doc.name)
	balance_row = next((row for row in balance["rows"] if row["employee"] == doc.employee and row["leave_type"] == doc.leave_type), None)
	remaining = flt(balance_row["remaining"]) if balance_row else 0
	if remaining < flt(doc.total_leave_days):
		return {"success": False, "message": f"Insufficient leave balance. Remaining: {remaining}"}
	doc.leave_status = "APPROVED"
	doc.approved_by = frappe.session.user
	doc.approved_at = frappe.utils.now()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application approved"}


@frappe.whitelist()
def reject_leave_application(name, reason=None):
	"""Reject a submitted leave application."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Leave Application", name)
	if doc.leave_status != "SUBMITTED":
		return {"success": False, "message": f"Leave application is in {doc.leave_status} status, must be SUBMITTED to reject"}
	doc.leave_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	if reason:
		doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application rejected"}


@frappe.whitelist()
def reopen_leave_application(name):
	"""Move a rejected or submitted leave application back to draft."""
	_require_leave_manage_access()
	doc = frappe.get_doc("GE Leave Application", name)
	if doc.leave_status not in {"REJECTED", "SUBMITTED"}:
		return {"success": False, "message": f"Leave application is in {doc.leave_status} status, cannot move it to DRAFT"}
	doc.leave_status = "DRAFT"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application moved back to draft"}


@frappe.whitelist()
def get_leave_balances(employee=None, from_date=None, to_date=None):
	"""Return leave balances for the selected cycle."""
	_require_hr_read_access()
	balance = _calculate_leave_balances(employee, from_date, to_date)
	return {"success": True, "data": balance}


@frappe.whitelist()
def get_holiday_lists(company=None):
	"""Return available holiday lists."""
	_require_hr_read_access()
	if not frappe.db.exists("DocType", "Holiday List"):
		return {"success": True, "data": []}
	filters = {}
	if company:
		filters["company"] = company
	data = frappe.get_all(
		"Holiday List",
		filters=filters,
		fields=["name", "holiday_list_name", "from_date", "to_date", "weekly_off", "color", "modified"],
		order_by="from_date desc, modified desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_holiday_list(name=None):
	"""Return one holiday list with its child rows."""
	_require_hr_read_access()
	if not frappe.db.exists("DocType", "Holiday List"):
		return {"success": True, "data": {"name": name, "holidays": []}}
	name = _require_param(name, "name")
	doc = frappe.get_doc("Holiday List", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def get_leave_calendar(from_date=None, to_date=None, employee=None):
	"""Return leave and holiday events for calendar views."""
	_require_hr_read_access()
	cycle_start, cycle_end = _get_cycle_bounds(from_date or today(), to_date or add_days(today(), 30))
	leave_filters = {"leave_status": "APPROVED"}
	if employee:
		leave_filters["employee"] = employee
	leave_rows = frappe.get_all(
		"GE Leave Application",
		filters=leave_filters,
		fields=["name", "employee", "leave_type", "from_date", "to_date", "total_leave_days"],
	)
	leaves = [
		{
			"name": row.name,
			"title": f"{row.employee} - {row.leave_type}",
			"start": str(max(getdate(row.from_date), cycle_start)),
			"end": str(min(getdate(row.to_date), cycle_end)),
			"employee": row.employee,
			"leave_type": row.leave_type,
			"kind": "leave",
		}
		for row in leave_rows
		if row.from_date and row.to_date and _date_ranges_overlap(row.from_date, row.to_date, cycle_start, cycle_end)
	]

	holiday_events = []
	if frappe.db.exists("DocType", "Holiday List"):
		for holiday_list in frappe.get_all("Holiday List", fields=["name", "holiday_list_name"]):
			doc = frappe.get_doc("Holiday List", holiday_list.name)
			for holiday in doc.holidays:
				if cycle_start <= getdate(holiday.holiday_date) <= cycle_end:
					holiday_events.append({
						"name": f"{holiday_list.name}:{holiday.holiday_date}",
						"title": holiday.description or holiday.weekly_off or holiday_list.holiday_list_name,
						"start": str(holiday.holiday_date),
						"end": str(holiday.holiday_date),
						"holiday_list": holiday_list.name,
						"kind": "holiday",
					})

	return {
		"success": True,
		"data": {
			"from_date": str(cycle_start),
			"to_date": str(cycle_end),
			"leaves": leaves,
			"holidays": holiday_events,
		},
	}


@frappe.whitelist()
def get_who_is_in(attendance_date=None, department=None):
	"""Return who is in, on leave, absent, or unmarked for a selected date."""
	_require_hr_read_access()
	target_date = getdate(attendance_date or today())
	emp_filters = {"status": "Active"}
	if department:
		emp_filters["department"] = department
	employees = frappe.get_all(
		"Employee",
		filters=emp_filters,
		fields=["name", "employee_name", "designation", "department", "branch"],
		order_by="employee_name asc",
	)
	attendance_rows = {
		row.employee: row
		for row in frappe.get_all(
			"GE Attendance Log",
			filters={"attendance_date": str(target_date)},
			fields=["employee", "attendance_status", "linked_site", "linked_project", "check_in_time", "check_out_time"],
		)
	}
	leave_rows = frappe.get_all(
		"GE Leave Application",
		filters={"leave_status": "APPROVED"},
		fields=["employee", "leave_type", "from_date", "to_date"],
	)
	leaves_by_employee = {}
	for row in leave_rows:
		if row.from_date and row.to_date and _date_ranges_overlap(row.from_date, row.to_date, target_date, target_date):
			leaves_by_employee[row.employee] = row

	rows = []
	for employee_row in employees:
		attendance_row = attendance_rows.get(employee_row.name)
		leave_row = leaves_by_employee.get(employee_row.name)
		state = "Unmarked"
		if attendance_row:
			if attendance_row.attendance_status in {"PRESENT", "HALF_DAY", "ON_DUTY"}:
				state = "In"
			elif attendance_row.attendance_status == "ABSENT":
				state = "Absent"
			elif attendance_row.attendance_status == "WEEK_OFF":
				state = "Week Off"
		elif leave_row:
			state = "On Leave"
		rows.append({
			"employee": employee_row.name,
			"employee_name": employee_row.employee_name,
			"designation": employee_row.designation,
			"department": employee_row.department,
			"branch": employee_row.branch,
			"state": state,
			"attendance_status": attendance_row.attendance_status if attendance_row else None,
			"leave_type": leave_row.leave_type if leave_row else None,
			"linked_site": attendance_row.linked_site if attendance_row else None,
			"linked_project": attendance_row.linked_project if attendance_row else None,
		})

	return {
		"success": True,
		"data": {
			"attendance_date": str(target_date),
			"summary": {
				"total": len(rows),
				"in": sum(1 for row in rows if row["state"] == "In"),
				"on_leave": sum(1 for row in rows if row["state"] == "On Leave"),
				"absent": sum(1 for row in rows if row["state"] == "Absent"),
				"unmarked": sum(1 for row in rows if row["state"] == "Unmarked"),
			},
			"rows": rows,
		},
	}


@frappe.whitelist()
def get_attendance_muster(attendance_date=None, department=None):
	"""Return a muster-style employee status list for a given date."""
	_require_hr_read_access()
	target_date = getdate(attendance_date or today())
	who_is_in = get_who_is_in(str(target_date), department)
	rows = []
	for row in who_is_in["data"]["rows"]:
		rows.append({
			"employee": row["employee"],
			"employee_name": row["employee_name"],
			"designation": row["designation"],
			"department": row["department"],
			"status": row["attendance_status"] or ("ON_LEAVE" if row["state"] == "On Leave" else row["state"].upper().replace(" ", "_")),
			"state": row["state"],
			"linked_site": row["linked_site"],
			"linked_project": row["linked_project"],
		})
	return {"success": True, "data": {"attendance_date": str(target_date), "rows": rows}}


@frappe.whitelist()
def get_swipe_ingestion_placeholder():
	"""Return placeholder information for future swipe ingestion integration."""
	_require_hr_read_access()
	return {
		"success": True,
		"data": {
			"status": "PENDING_INTEGRATION",
			"supported_sources": ["Biometric device export", "CSV upload", "API bridge"],
			"required_fields": ["employee", "swipe_time", "device_id", "direction"],
			"notes": "Device integration is pending. Use attendance logs and regularization until the bridge is connected.",
		},
	}


@frappe.whitelist()
def get_attendance_regularizations(employee=None, status=None, regularization_date=None):
	"""Return attendance regularization requests."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if status:
		filters["regularization_status"] = status
	if regularization_date:
		filters["regularization_date"] = regularization_date
	data = frappe.get_all(
		"GE Attendance Regularization",
		filters=filters,
		fields=[
			"name", "employee", "regularization_date", "regularization_status",
			"requested_check_in", "requested_check_out", "requested_status",
			"linked_attendance_log", "reason", "submitted_by", "approved_by",
			"approved_at", "rejected_by", "rejection_reason", "creation", "modified",
		],
		order_by="regularization_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_attendance_regularization(name=None):
	"""Return one attendance regularization request."""
	_require_hr_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Attendance Regularization", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_attendance_regularization(data):
	"""Create an attendance regularization request."""
	_require_regularization_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Attendance Regularization", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization created"}


@frappe.whitelist()
def update_attendance_regularization(name, data):
	"""Update an attendance regularization request."""
	_require_regularization_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Attendance Regularization", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization updated"}


@frappe.whitelist()
def delete_attendance_regularization(name):
	"""Delete an attendance regularization request."""
	_require_regularization_manage_access()
	frappe.delete_doc("GE Attendance Regularization", name)
	frappe.db.commit()
	return {"success": True, "message": "Attendance regularization deleted"}


@frappe.whitelist()
def submit_attendance_regularization(name):
	"""Move regularization request from DRAFT to SUBMITTED."""
	_require_regularization_manage_access()
	doc = frappe.get_doc("GE Attendance Regularization", name)
	if doc.regularization_status != "DRAFT":
		return {"success": False, "message": f"Regularization is in {doc.regularization_status} status, must be DRAFT to submit"}
	doc.regularization_status = "SUBMITTED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization submitted"}


@frappe.whitelist()
def approve_attendance_regularization(name):
	"""Approve a regularization request and apply it to the attendance log."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Attendance Regularization", name)
	if doc.regularization_status != "SUBMITTED":
		return {"success": False, "message": f"Regularization is in {doc.regularization_status} status, must be SUBMITTED to approve"}

	attendance_name = doc.linked_attendance_log or frappe.db.get_value(
		"GE Attendance Log",
		{"employee": doc.employee, "attendance_date": doc.regularization_date},
		"name",
	)
	if attendance_name:
		attendance_doc = frappe.get_doc("GE Attendance Log", attendance_name)
	else:
		attendance_doc = frappe.get_doc({
			"doctype": "GE Attendance Log",
			"employee": doc.employee,
			"attendance_date": doc.regularization_date,
		})
		attendance_doc.insert()

	if doc.requested_status:
		attendance_doc.attendance_status = doc.requested_status
	if doc.requested_check_in:
		attendance_doc.check_in_time = doc.requested_check_in
	if doc.requested_check_out:
		attendance_doc.check_out_time = doc.requested_check_out
	attendance_doc.save()

	doc.linked_attendance_log = attendance_doc.name
	doc.regularization_status = "APPROVED"
	doc.approved_by = frappe.session.user
	doc.approved_at = frappe.utils.now()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization approved"}


@frappe.whitelist()
def reject_attendance_regularization(name, reason=None):
	"""Reject a submitted attendance regularization request."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Attendance Regularization", name)
	if doc.regularization_status != "SUBMITTED":
		return {"success": False, "message": f"Regularization is in {doc.regularization_status} status, must be SUBMITTED to reject"}
	doc.regularization_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	if reason:
		doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization rejected"}


@frappe.whitelist()
def reopen_attendance_regularization(name):
	"""Move a rejected or submitted regularization request back to draft."""
	_require_regularization_manage_access()
	doc = frappe.get_doc("GE Attendance Regularization", name)
	if doc.regularization_status not in {"REJECTED", "SUBMITTED"}:
		return {"success": False, "message": f"Regularization is in {doc.regularization_status} status, cannot move it to DRAFT"}
	doc.regularization_status = "DRAFT"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization moved back to draft"}


def _format_hr_inbox_age(timestamp):
	if not timestamp:
		return "-"
	delta = now_datetime() - get_datetime(timestamp)
	total_seconds = max(int(delta.total_seconds()), 0)
	total_hours = total_seconds // 3600
	days = total_hours // 24
	hours = total_hours % 24
	minutes = (total_seconds % 3600) // 60
	if days > 0:
		return f"{days}d {hours}h"
	if total_hours > 0:
		return f"{total_hours}h {minutes}m"
	return f"{minutes}m"


def _build_hr_inbox_item(
	workflow_type,
	workflow_label,
	row,
	status,
	title,
	subtitle,
	requested_by,
	action_owner,
	created_at,
	acted_at,
	view,
	actions,
	path,
	request_date=None,
	remarks=None,
	amount=None,
):
	timestamp = created_at if view == "pending" else (acted_at or created_at)
	return {
		"workflow_type": workflow_type,
		"workflow_label": workflow_label,
		"name": row.name,
		"status": status,
		"title": title,
		"subtitle": subtitle,
		"requested_by": requested_by or "-",
		"action_owner": action_owner or "HR Approver",
		"created_at": created_at,
		"acted_at": acted_at,
		"age": _format_hr_inbox_age(timestamp),
		"actions": actions,
		"path": path,
		"request_date": request_date,
		"remarks": remarks,
		"amount": amount,
		"sort_timestamp": str(timestamp or ""),
	}


@frappe.whitelist()
def get_hr_approval_inbox(view=None, request_type=None):
	"""Return a unified HR approval inbox across onboarding, leave, travel, overtime, and regularization."""
	_require_hr_approval_access()
	view = cstr(view or "pending").strip().lower()
	request_type = cstr(request_type or "all").strip().lower()
	if view not in {"pending", "completed"}:
		return {"success": False, "message": f"Unsupported inbox view: {view}"}

	include_all = request_type in {"", "all"}
	items = []
	counts = {
		"onboarding": 0,
		"leave": 0,
		"travel": 0,
		"overtime": 0,
		"regularization": 0,
	}

	def include(type_key):
		return include_all or request_type == type_key

	def register(type_key, row):
		counts[type_key] += 1
		items.append(row)

	if include("onboarding"):
		onboarding_statuses = ["SUBMITTED", "UNDER_REVIEW"] if view == "pending" else ["APPROVED", "REJECTED", "MAPPED_TO_EMPLOYEE"]
		onboardings = frappe.get_all(
			"GE Employee Onboarding",
			filters={"onboarding_status": ["in", onboarding_statuses]},
			fields=[
				"name", "employee_name", "designation", "company", "onboarding_status",
				"submitted_by", "reviewed_by", "approved_by", "approved_at",
				"rejected_by", "rejection_reason", "date_of_joining", "creation", "modified",
			],
			order_by="creation asc" if view == "pending" else "modified desc",
		)
		for row in onboardings:
			actions = []
			if view == "pending":
				if row.onboarding_status == "SUBMITTED":
					actions = ["review"]
				elif row.onboarding_status == "UNDER_REVIEW":
					actions = ["approve", "reject"]
			register(
				"onboarding",
				_build_hr_inbox_item(
					"onboarding",
					"Onboarding",
					row,
					row.onboarding_status,
					row.employee_name or row.name,
					" | ".join([value for value in [row.designation, row.company] if value]) or "Employee onboarding review",
					row.submitted_by,
					row.reviewed_by if row.onboarding_status == "UNDER_REVIEW" else (row.approved_by or row.rejected_by or "HR Approver"),
					row.creation,
					row.approved_at or row.modified,
					view,
					actions,
					"/hr/onboarding",
					request_date=row.date_of_joining,
					remarks=row.rejection_reason,
				),
			)

	if include("leave"):
		leave_statuses = ["SUBMITTED"] if view == "pending" else ["APPROVED", "REJECTED"]
		leave_rows = frappe.get_all(
			"GE Leave Application",
			filters={"leave_status": ["in", leave_statuses]},
			fields=[
				"name", "employee", "leave_type", "leave_status", "from_date", "to_date",
				"reason", "submitted_by", "approved_by", "approved_at", "rejected_by",
				"rejection_reason", "creation", "modified",
			],
			order_by="creation asc" if view == "pending" else "modified desc",
		)
		for row in leave_rows:
			register(
				"leave",
				_build_hr_inbox_item(
					"leave",
					"Leave",
					row,
					row.leave_status,
					row.employee or row.name,
					f"{row.leave_type} | {row.from_date} to {row.to_date}",
					row.submitted_by,
					row.approved_by or row.rejected_by or "HR Approver",
					row.creation,
					row.approved_at or row.modified,
					view,
					["approve", "reject"] if view == "pending" else [],
					"/hr/attendance",
					request_date=row.from_date,
					remarks=row.reason if view == "pending" else row.rejection_reason,
				),
			)

	if include("travel"):
		travel_statuses = ["SUBMITTED"] if view == "pending" else ["APPROVED", "REJECTED"]
		travel_rows = frappe.get_all(
			"GE Travel Log",
			filters={"travel_status": ["in", travel_statuses]},
			fields=[
				"name", "employee", "travel_date", "travel_status", "from_location", "to_location",
				"expense_amount", "submitted_by", "approved_by", "approved_at", "rejected_by",
				"rejection_reason", "creation", "modified",
			],
			order_by="creation asc" if view == "pending" else "modified desc",
		)
		for row in travel_rows:
			register(
				"travel",
				_build_hr_inbox_item(
					"travel",
					"Travel",
					row,
					row.travel_status,
					row.employee or row.name,
					" | ".join([value for value in [row.from_location, row.to_location] if value]) or "Travel request",
					row.submitted_by,
					row.approved_by or row.rejected_by or "HR Approver",
					row.creation,
					row.approved_at or row.modified,
					view,
					["approve", "reject"] if view == "pending" else [],
					"/hr/travel-logs",
					request_date=row.travel_date,
					remarks=row.rejection_reason,
					amount=row.expense_amount,
				),
			)

	if include("overtime"):
		overtime_statuses = ["SUBMITTED"] if view == "pending" else ["APPROVED", "REJECTED"]
		overtime_rows = frappe.get_all(
			"GE Overtime Entry",
			filters={"overtime_status": ["in", overtime_statuses]},
			fields=[
				"name", "employee", "overtime_date", "overtime_hours", "overtime_status",
				"submitted_by", "approved_by", "approved_at", "rejected_by",
				"rejection_reason", "creation", "modified",
			],
			order_by="creation asc" if view == "pending" else "modified desc",
		)
		for row in overtime_rows:
			register(
				"overtime",
				_build_hr_inbox_item(
					"overtime",
					"Overtime",
					row,
					row.overtime_status,
					row.employee or row.name,
					f"{flt(row.overtime_hours)} hours overtime",
					row.submitted_by,
					row.approved_by or row.rejected_by or "HR Approver",
					row.creation,
					row.approved_at or row.modified,
					view,
					["approve", "reject"] if view == "pending" else [],
					"/hr/overtime",
					request_date=row.overtime_date,
					remarks=row.rejection_reason,
				),
			)

	if include("regularization"):
		regularization_statuses = ["SUBMITTED"] if view == "pending" else ["APPROVED", "REJECTED"]
		regularization_rows = frappe.get_all(
			"GE Attendance Regularization",
			filters={"regularization_status": ["in", regularization_statuses]},
			fields=[
				"name", "employee", "regularization_date", "regularization_status", "requested_status",
				"reason", "submitted_by", "approved_by", "approved_at", "rejected_by",
				"rejection_reason", "creation", "modified",
			],
			order_by="creation asc" if view == "pending" else "modified desc",
		)
		for row in regularization_rows:
			register(
				"regularization",
				_build_hr_inbox_item(
					"regularization",
					"Regularization",
					row,
					row.regularization_status,
					row.employee or row.name,
					f"{row.requested_status or 'Attendance correction'} | {row.regularization_date}",
					row.submitted_by,
					row.approved_by or row.rejected_by or "HR Approver",
					row.creation,
					row.approved_at or row.modified,
					view,
					["approve", "reject"] if view == "pending" else [],
					"/hr/attendance",
					request_date=row.regularization_date,
					remarks=row.reason if view == "pending" else row.rejection_reason,
				),
			)

	items.sort(key=lambda row: row["sort_timestamp"], reverse=view == "completed")
	for item in items:
		item.pop("sort_timestamp", None)

	return {
		"success": True,
		"data": {
			"view": view,
			"request_type": request_type or "all",
			"summary": {
				**counts,
				"total": len(items),
			},
			"items": items,
		},
	}


@frappe.whitelist()
def act_on_hr_approval(request_type, name, action, remarks=None):
	"""Dispatch an approval inbox action to the correct HR workflow method."""
	_require_hr_approval_access()
	request_type = cstr(request_type).strip().lower()
	action = cstr(action).strip().lower()
	name = _require_param(name, "name")

	dispatch_map = {
		"onboarding": {
			"review": review_onboarding,
			"approve": approve_onboarding,
			"reject": lambda doc_name: reject_onboarding(doc_name, reason=remarks),
		},
		"leave": {
			"approve": approve_leave_application,
			"reject": lambda doc_name: reject_leave_application(doc_name, reason=remarks),
		},
		"travel": {
			"approve": approve_travel_log,
			"reject": lambda doc_name: reject_travel_log(doc_name, reason=remarks),
		},
		"overtime": {
			"approve": approve_overtime_entry,
			"reject": lambda doc_name: reject_overtime_entry(doc_name, reason=remarks),
		},
		"regularization": {
			"approve": approve_attendance_regularization,
			"reject": lambda doc_name: reject_attendance_regularization(doc_name, reason=remarks),
		},
	}

	workflow_actions = dispatch_map.get(request_type)
	if not workflow_actions or action not in workflow_actions:
		return {"success": False, "message": f"Unsupported inbox action {action} for request type {request_type}"}

	return workflow_actions[action](name)


@frappe.whitelist()
def get_travel_logs(employee=None, status=None, project=None, site=None):
	"""Return travel logs."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if status:
		filters["travel_status"] = status
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	data = frappe.get_all(
		"GE Travel Log",
		filters=filters,
		fields=[
			"name", "employee", "travel_date", "travel_status", "from_location",
			"to_location", "linked_project", "linked_site", "expense_amount", "submitted_by", "approved_by",
			"approved_at", "creation", "modified",
		],
		order_by="travel_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_travel_log(name=None):
	"""Return one travel log."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Travel Log",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="SUBMITTED",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route="/hr/travel-logs",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_travel_log")

	return {"success": True, "data": doc.as_dict(), "message": "Travel log approved"}


@frappe.whitelist()
def reject_travel_log(name, reason=None):
	"""Reject a submitted travel log."""
	_require_hr_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Travel Log", name)
	if doc.travel_status != "SUBMITTED":
		return {"success": False, "message": f"Travel log is in {doc.travel_status} status, must be SUBMITTED to reject"}
	doc.travel_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Travel Log",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status="SUBMITTED",
			to_status="REJECTED",
			current_status="REJECTED",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route="/hr/travel-logs",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_travel_log")

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
def get_overtime_entry(name=None):
	"""Return one overtime entry."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Overtime Entry",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="SUBMITTED",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route="/hr/overtime",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_overtime_entry")

	return {"success": True, "data": doc.as_dict(), "message": "Overtime entry approved"}


@frappe.whitelist()
def reject_overtime_entry(name, reason=None):
	"""Reject a submitted overtime entry."""
	_require_hr_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Overtime Entry", name)
	if doc.overtime_status != "SUBMITTED":
		return {"success": False, "message": f"Overtime entry is in {doc.overtime_status} status, must be SUBMITTED to reject"}
	doc.overtime_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Overtime Entry",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="SUBMITTED",
			to_status="REJECTED",
			current_status="REJECTED",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route="/hr/overtime",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_overtime_entry")

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
def get_statutory_ledger(name=None):
	"""Return one statutory ledger entry."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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
def get_technician_visit_log(name=None):
	"""Return one technician visit log."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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


# ── Employee Directory ───────────────────────────────────────


def _require_employee_read_access():
	_require_module_access("hr")


def _require_employee_write_access():
	_require_any_capability("hr.employee.manage", "hr.onboarding.manage")


_EMPLOYEE_LIST_FIELDS = [
	"name",
	"employee_name",
	"first_name",
	"last_name",
	"designation",
	"department",
	"branch",
	"status",
	"gender",
	"date_of_joining",
	"cell_number",
	"company_email",
	"personal_email",
	"image",
	"reports_to",
	"company",
	"user_id",
]

_EMPLOYEE_DETAIL_FIELDS = _EMPLOYEE_LIST_FIELDS + [
	"middle_name",
	"employee_number",
	"date_of_birth",
	"salutation",
	"marital_status",
	"blood_group",
	"current_address",
	"current_accommodation_type",
	"permanent_address",
	"permanent_accommodation_type",
	"person_to_be_contacted",
	"emergency_phone_number",
	"relation",
	"bank_name",
	"bank_ac_no",
	"iban",
	"salary_mode",
	"ctc",
	"salary_currency",
	"passport_number",
	"valid_upto",
	"date_of_issue",
	"place_of_issue",
	"holiday_list",
	"attendance_device_id",
	"date_of_retirement",
	"contract_end_date",
	"notice_number_of_days",
	"scheduled_confirmation_date",
	"final_confirmation_date",
	"resignation_letter_date",
	"relieving_date",
	"reason_for_leaving",
	"bio",
	"creation",
	"modified",
]


@frappe.whitelist()
def get_employees(status=None, department=None, designation=None, branch=None, search=None):
	"""Return the employee directory list."""
	_require_employee_read_access()
	filters = {}
	if status:
		filters["status"] = status
	if department:
		filters["department"] = department
	if designation:
		filters["designation"] = designation
	if branch:
		filters["branch"] = branch

	or_filters = None
	if search:
		search_term = f"%{search}%"
		or_filters = [
			["employee_name", "like", search_term],
			["name", "like", search_term],
			["cell_number", "like", search_term],
			["designation", "like", search_term],
			["department", "like", search_term],
			["company_email", "like", search_term],
		]

	data = frappe.get_all(
		"Employee",
		filters=filters,
		or_filters=or_filters,
		fields=_EMPLOYEE_LIST_FIELDS,
		order_by="employee_name asc",
		limit_page_length=0,
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_employee(name=None):
	"""Return a single employee with profile details, education, and experience."""
	_require_employee_read_access()
	name = _require_param(name, "name")
	emp = frappe.get_doc("Employee", name)
	result = {f: emp.get(f) for f in _EMPLOYEE_DETAIL_FIELDS if emp.get(f) is not None}
	result["name"] = emp.name

	# Education child table
	result["education"] = [
		{
			"school_univ": row.school_univ,
			"qualification": row.qualification,
			"level": row.level,
			"year_of_passing": row.year_of_passing,
			"class_per": row.get("class_per"),
		}
		for row in (emp.education or [])
	]

	# Experience child table
	result["experience"] = [
		{
			"company_name": row.company_name,
			"designation": row.designation,
			"salary": row.get("salary"),
			"total_experience": row.get("total_experience"),
		}
		for row in (emp.external_work_history or [])
	]

	return {"success": True, "data": result}


@frappe.whitelist()
def get_employee_stats():
	"""Return employee directory summary counts."""
	_require_employee_read_access()
	rows = frappe.get_all("Employee", fields=["status", "department", "gender"])
	departments = set()
	active = inactive = male = female = 0
	for r in rows:
		if r.status == "Active":
			active += 1
		else:
			inactive += 1
		if r.gender == "Male":
			male += 1
		elif r.gender == "Female":
			female += 1
		if r.department:
			departments.add(r.department)
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"active": active,
			"inactive": inactive,
			"male": male,
			"female": female,
			"departments": len(departments),
		},
	}


@frappe.whitelist()
def update_employee(name, data):
	"""Update writable fields on an Employee record."""
	_require_employee_write_access()
	name = _require_param(name, "name")
	values = _parse_payload(data)

	# Fields that may be updated via the profile UI
	WRITABLE_FIELDS = {
		"first_name", "middle_name", "last_name", "salutation", "gender",
		"date_of_birth", "date_of_joining", "designation", "department", "branch",
		"reports_to", "status", "cell_number", "personal_email", "company_email",
		"current_address", "current_accommodation_type",
		"permanent_address", "permanent_accommodation_type",
		"person_to_be_contacted", "emergency_phone_number", "relation",
		"bank_name", "bank_ac_no", "iban", "salary_mode",
		"marital_status", "blood_group",
		"passport_number", "valid_upto", "date_of_issue", "place_of_issue",
		"holiday_list", "attendance_device_id",
		"scheduled_confirmation_date", "final_confirmation_date",
		"contract_end_date", "notice_number_of_days", "date_of_retirement",
		"bio",
	}

	doc = frappe.get_doc("Employee", name)
	for key, val in values.items():
		if key in WRITABLE_FIELDS:
			doc.set(key, val)

	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Employee updated"}


@frappe.whitelist()
def get_employee_family(name=None):
	"""Return family/dependent info stored as Employee custom fields or child table."""
	_require_employee_read_access()
	name = _require_param(name, "name")
	emp = frappe.get_doc("Employee", name)
	return {
		"success": True,
		"data": {
			"name": emp.name,
			"marital_status": emp.marital_status,
			"blood_group": emp.blood_group,
			"family_background": emp.family_background,
			"health_details": emp.health_details,
			"person_to_be_contacted": emp.person_to_be_contacted,
			"emergency_phone_number": emp.emergency_phone_number,
			"relation": emp.relation,
		},
	}


@frappe.whitelist()
def get_employee_education(name=None):
	"""Return education rows for an employee."""
	_require_employee_read_access()
	name = _require_param(name, "name")
	emp = frappe.get_doc("Employee", name)
	rows = [
		{
			"school_univ": row.school_univ,
			"qualification": row.qualification,
			"level": row.level,
			"year_of_passing": row.year_of_passing,
			"class_per": row.get("class_per"),
		}
		for row in (emp.education or [])
	]
	return {"success": True, "data": rows}


@frappe.whitelist()
def get_employee_experience(name=None):
	"""Return work experience rows for an employee."""
	_require_employee_read_access()
	name = _require_param(name, "name")
	emp = frappe.get_doc("Employee", name)
	rows = [
		{
			"company_name": row.company_name,
			"designation": row.designation,
			"salary": row.get("salary"),
			"total_experience": row.get("total_experience"),
		}
		for row in (emp.external_work_history or [])
	]
	return {"success": True, "data": rows}


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
	_apply_project_manager_project_filter(filters, project=project, project_field="linked_project")
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
def get_dpr(name=None):
	"""Return a single DPR with child tables."""
	_require_execution_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE DPR", name)
	assigned = _get_project_manager_assigned_projects()
	if assigned and doc.linked_project not in assigned:
		frappe.throw("Project Manager cannot access DPR outside assigned projects", frappe.PermissionError)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_dpr(data):
	"""Create a DPR. Enforces one DPR per site per day."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	if values.get("linked_project"):
		values["linked_project"] = _ensure_project_manager_project_scope(values.get("linked_project"))
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
	assigned = _get_project_manager_assigned_projects()
	if assigned and doc.linked_project not in assigned:
		frappe.throw("Project Manager cannot update DPR outside assigned projects", frappe.PermissionError)
	if "linked_project" in values:
		values["linked_project"] = _ensure_project_manager_project_scope(values.get("linked_project"))
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "DPR updated"}


@frappe.whitelist()
def delete_dpr(name):
	"""Delete a DPR."""
	_require_execution_write_access()
	doc = frappe.get_doc("GE DPR", name)
	assigned = _get_project_manager_assigned_projects()
	if assigned and doc.linked_project not in assigned:
		frappe.throw("Project Manager cannot delete DPR outside assigned projects", frappe.PermissionError)
	frappe.delete_doc("GE DPR", name)
	frappe.db.commit()
	return {"success": True, "message": "DPR deleted"}


@frappe.whitelist()
def get_dpr_stats(project=None):
	"""Aggregate DPR stats."""
	_require_execution_read_access()
	filters = {}
	_apply_project_manager_project_filter(filters, project=project, project_field="linked_project")
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
def get_project_team_member(name=None):
	"""Return a single team member record."""
	_require_execution_read_access()
	name = _require_param(name, "name")
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
			"name", "customer", "linked_project", "linked_site", "invoice_date",
			"invoice_type", "status", "amount", "gst_amount", "tds_amount",
			"net_receivable", "milestone_complete", "submitted_by",
			"approved_by", "approved_at", "creation", "modified",
		],
		order_by="invoice_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_invoice(name=None):
	"""Return a single invoice with line items."""
	_require_billing_read_access()
	name = _require_param(name, "name")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Invoice",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="SUBMITTED",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/invoices" if doc.get("linked_project") else "/invoices",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_invoice")

	return {"success": True, "data": doc.as_dict(), "message": "Invoice approved"}


@frappe.whitelist()
def reject_invoice(name, reason):
	"""Reject a submitted invoice."""
	_require_billing_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Invoice", name)
	if doc.status != "SUBMITTED":
		return {"success": False, "message": f"Invoice is in {doc.status} status, must be SUBMITTED to reject"}
	doc.status = "DRAFT"
	doc.rejected_by = frappe.session.user
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Invoice",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status="SUBMITTED",
			to_status="DRAFT",
			current_status="DRAFT",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route=f"/projects/{doc.get('linked_project')}/invoices" if doc.get("linked_project") else "/invoices",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_invoice")

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Invoice",
			subject_name=name,
			event_type=EventType.COMPLETED,
			linked_project=doc.get("linked_project"),
			from_status="APPROVED",
			to_status="PAYMENT_RECEIVED",
			current_status="PAYMENT_RECEIVED",
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/billing" if doc.get("linked_project") else "/finance/billing",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: mark_invoice_paid")

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Invoice",
			subject_name=name,
			event_type=EventType.CANCELLED,
			linked_project=doc.get("linked_project"),
			to_status="CANCELLED",
			current_status="CANCELLED",
			remarks=reason,
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/billing" if doc.get("linked_project") else "/finance/billing",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: cancel_invoice")

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
			"name", "receipt_type", "customer", "linked_invoice", "linked_project", "advance_reference",
			"received_date", "amount_received", "adjusted_amount", "tds_amount", "payment_mode",
			"payment_reference", "creation", "modified",
		],
		order_by="received_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_payment_receipt(name=None):
	"""Return a single payment receipt."""
	_require_billing_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Payment Receipt", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_payment_receipt(data):
	"""Create a payment receipt."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	if not values.get("customer") and values.get("linked_invoice"):
		values["customer"] = frappe.db.get_value("GE Invoice", values.get("linked_invoice"), "customer")
	values.setdefault("receipt_type", "AGAINST_INVOICE")
	if values.get("receipt_type") == "AGAINST_INVOICE" and not values.get("linked_invoice"):
		return {"success": False, "message": "Linked invoice is required for invoice receipts"}
	if values.get("receipt_type") in ("ADVANCE", "ADJUSTMENT") and not values.get("customer"):
		return {"success": False, "message": "Customer is required for advance or adjustment receipts"}
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
	rows = frappe.get_all("GE Payment Receipt", filters=filters, fields=["receipt_type", "amount_received", "adjusted_amount", "tds_amount"])
	return {
		"success": True,
		"data": {
			"total_receipts": len(rows),
			"total_received": sum(r.amount_received or 0 for r in rows),
			"advance_received": sum((r.amount_received or 0) for r in rows if r.receipt_type == "ADVANCE"),
			"adjusted_amount": sum(r.adjusted_amount or 0 for r in rows),
			"total_tds": sum(r.tds_amount or 0 for r in rows),
		},
	}



@frappe.whitelist()
def reconcile_invoice_payments(project=None, invoice_name=None):
	"""Reconcile invoices against payment receipts.

	Returns per-invoice summary: total billed, paid, outstanding, and flags.
	"""
	_require_billing_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if invoice_name:
		filters["name"] = invoice_name

	invoices = frappe.get_all(
		"GE Invoice",
		filters=filters,
		fields=[
			"name", "linked_project", "invoice_type", "status",
			"invoice_date", "net_receivable", "total_paid", "outstanding_amount",
			"payment_milestone_description", "scheduled_milestone_date",
			"payment_received", "milestone_complete",
		],
		order_by="invoice_date asc",
	)

	summary = []
	total_billed = 0
	total_paid = 0
	total_outstanding = 0

	for inv in invoices:
		receipts = frappe.get_all(
			"GE Payment Receipt",
			filters={"linked_invoice": inv.name},
			fields=["name", "received_date", "amount_received", "receipt_type", "payment_mode"],
			order_by="received_date asc",
		)
		paid = sum(r.amount_received or 0 for r in receipts)
		outstanding = max((inv.net_receivable or 0) - paid, 0)
		is_fully_paid = outstanding == 0 and (inv.net_receivable or 0) > 0

		total_billed += inv.net_receivable or 0
		total_paid += paid
		total_outstanding += outstanding

		summary.append({
			"invoice": inv.name,
			"project": inv.linked_project,
			"type": inv.invoice_type,
			"status": inv.status,
			"date": str(inv.invoice_date) if inv.invoice_date else None,
			"net_receivable": inv.net_receivable or 0,
			"total_paid": paid,
			"outstanding": outstanding,
			"is_fully_paid": is_fully_paid,
			"milestone_description": inv.payment_milestone_description,
			"scheduled_date": str(inv.scheduled_milestone_date) if inv.scheduled_milestone_date else None,
			"milestone_complete": inv.milestone_complete,
			"payment_received_flag": inv.payment_received,
			"receipts": [r.as_dict() for r in receipts] if invoice_name else len(receipts),
		})

	return {
		"success": True,
		"data": {
			"invoices": summary,
			"totals": {
				"total_billed": total_billed,
				"total_paid": total_paid,
				"total_outstanding": total_outstanding,
				"invoice_count": len(invoices),
				"fully_paid_count": sum(1 for s in summary if s["is_fully_paid"]),
				"uninvoiced_milestones": sum(1 for s in summary if not s["milestone_complete"] and s["status"] == "DRAFT"),
				"invoiced_unpaid": sum(1 for s in summary if s["status"] in ("SUBMITTED", "APPROVED") and not s["is_fully_paid"]),
			},
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
def get_retention_ledger(name=None):
	"""Return a single retention ledger entry."""
	_require_billing_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Retention Ledger", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_retention_ledger(data):
	"""Create a retention entry."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	if not values.get("customer") and values.get("linked_invoice"):
		values["customer"] = frappe.db.get_value("GE Invoice", values.get("linked_invoice"), "customer")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Retention Ledger",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			to_status=doc.status,
			current_status=doc.status,
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			remarks=f"Released {amount} of {doc.retention_amount}",
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/retention" if doc.get("linked_project") else "/finance/retention",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: release_retention")

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
def get_penalty_deduction(name=None):
	"""Return a single penalty deduction."""
	_require_billing_read_access()
	name = _require_param(name, "name")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Penalty Deduction",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="PENDING",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/penalties" if doc.get("linked_project") else "/penalties",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_penalty_deduction")

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
	if not (reason or "").strip():
		frappe.throw("A reversal reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Penalty Deduction", name)
	if doc.status != "APPLIED":
		return {"success": False, "message": f"Penalty must be APPLIED to reverse (current: {doc.status})"}
	doc.status = "REVERSED"
	doc.reversal_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Penalty Deduction",
			subject_name=name,
			event_type=EventType.OVERRIDDEN,
			linked_project=doc.get("linked_project"),
			from_status="APPLIED",
			to_status="REVERSED",
			current_status="REVERSED",
			remarks=reason,
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/penalties" if doc.get("linked_project") else "/finance/penalties",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reverse_penalty_deduction")

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
			"impact_level", "priority", "status", "due_date", "source_issue_id",
			"raised_by", "raised_on", "assigned_to",
			"resolved_on", "closed_on", "is_rma", "sla_profile",
			"creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_ticket(name=None):
	"""Return a single ticket with all actions."""
	_require_om_read_access()
	name = _require_param(name, "name")
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
def close_ticket(name, closure_type=None):
	"""Close a resolved ticket."""
	_require_om_write_access()
	doc = frappe.get_doc("GE Ticket", name)
	if doc.status not in ("RESOLVED", "NEW", "ASSIGNED"):
		return {"success": False, "message": f"Ticket must be RESOLVED, NEW, or ASSIGNED to close (current: {doc.status})"}
	previous_status = doc.status
	if closure_type:
		doc.closure_type = closure_type
	elif previous_status == "RESOLVED":
		doc.closure_type = "RESOLVED"
	doc.status = "CLOSED"
	doc.closed_on = frappe.utils.now_datetime()
	doc.append("actions", {
		"action_type": "CLOSE",
		"by_user": frappe.session.user,
		"at_time": frappe.utils.now_datetime(),
		"notes": f"Ticket closed ({doc.closure_type or 'RESOLVED'})",
	})
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Ticket closed"}


@frappe.whitelist()
def escalate_ticket(name, reason):
	"""Escalate a ticket (increments escalation_level)."""
	_require_om_write_access()
	doc = frappe.get_doc("GE Ticket", name)
	if doc.status == "CLOSED":
		return {"success": False, "message": "Cannot escalate a closed ticket"}
	current_level = doc.escalation_level or 0
	if current_level >= 5:
		return {"success": False, "message": "Ticket is already at maximum escalation level (5)"}
	doc.escalation_level = current_level + 1
	doc.escalation_reason = reason
	doc.append("actions", {
		"action_type": "ESCALATE",
		"by_user": frappe.session.user,
		"at_time": frappe.utils.now_datetime(),
		"notes": f"Escalated to level {doc.escalation_level}: {reason}",
	})
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": f"Ticket escalated to level {doc.escalation_level}"}


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
def get_sla_profile(name=None):
	"""Return a single SLA profile."""
	_require_om_read_access()
	name = _require_param(name, "name")
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
def get_sla_timer(name=None):
	"""Return a single SLA timer."""
	_require_om_read_access()
	name = _require_param(name, "name")
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
def get_sla_penalty_record(name=None):
	"""Return a single SLA penalty record."""
	_require_om_read_access()
	name = _require_param(name, "name")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE SLA Penalty Record",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="PENDING",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route="/sla",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_sla_penalty")

	return {"success": True, "data": doc.as_dict(), "message": "SLA penalty approved"}


@frappe.whitelist()
def reject_sla_penalty(name, reason=None):
	"""Reject an SLA penalty."""
	_require_om_approval_access()
	doc = frappe.get_doc("GE SLA Penalty Record", name)
	if doc.approval_status != "PENDING":
		return {"success": False, "message": f"Penalty is in {doc.approval_status} status, must be PENDING to reject"}
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc.approval_status = "REJECTED"
	doc.remarks = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE SLA Penalty Record",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status="PENDING",
			to_status="REJECTED",
			current_status="REJECTED",
			remarks=reason,
			current_owner_role=_detect_primary_role(),
			source_route="/sla",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_sla_penalty")

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE SLA Penalty Record",
			subject_name=name,
			event_type=EventType.OVERRIDDEN,
			linked_project=doc.get("linked_project"),
			to_status="WAIVED",
			current_status="WAIVED",
			remarks=reason,
			current_owner_role=_detect_primary_role(),
			source_route="/sla",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: waive_sla_penalty")

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
def get_rma_tracker(name=None):
	"""Return a single RMA tracker."""
	_require_rma_read_access()
	name = _require_param(name, "name")
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
		"REPAIRED": ["CLOSED"],
		"REPLACED": ["CLOSED"],
		"REJECTED": ["CLOSED", "PENDING"],
	}
	doc = frappe.get_doc("GE RMA Tracker", name)
	allowed = valid_transitions.get(doc.rma_status, [])
	if new_status not in allowed:
		return {"success": False, "message": f"Cannot transition from {doc.rma_status} to {new_status}. Allowed: {allowed}"}
	doc.rma_status = new_status
	if new_status in ("REPAIRED", "REPLACED"):
		doc.actual_resolution_date = frappe.utils.nowdate()
	if new_status == "CLOSED":
		doc.closed_on = frappe.utils.nowdate()
		if not doc.actual_resolution_date:
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
	doc.rma_status = "CLOSED"
	doc.closed_on = frappe.utils.nowdate()
	if not doc.actual_resolution_date:
		doc.actual_resolution_date = frappe.utils.nowdate()
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


def _project_document_group_key(row):
	return (
		row.get("document_name") or row.get("name"),
		row.get("linked_project") or "",
		row.get("linked_site") or "",
	)


def _project_document_sort_key(row):
	return (
		frappe.utils.cint(row.get("version") or 0),
		row.get("modified") or "",
		row.get("creation") or "",
		row.get("name") or "",
	)


def _annotate_project_documents(rows, latest_only=False):
	today = frappe.utils.nowdate()
	group_latest = {}
	group_counts = {}

	for raw_row in rows:
		row = dict(raw_row)
		key = _project_document_group_key(row)
		group_counts[key] = group_counts.get(key, 0) + 1
		current_latest = group_latest.get(key)
		if not current_latest or _project_document_sort_key(row) > _project_document_sort_key(current_latest):
			group_latest[key] = row

	annotated = []
	for raw_row in rows:
		row = dict(raw_row)
		key = _project_document_group_key(row)
		latest_row = group_latest.get(key) or {}
		row["file_name"] = row.get("document_name")
		row["file_url"] = row.get("file")
		row["uploaded_by"] = row.get("uploaded_by") or row.get("owner")
		row["version_count"] = group_counts.get(key, 1)
		row["is_latest_version"] = row.get("name") == latest_row.get("name")
		row["days_until_expiry"] = (
			frappe.utils.date_diff(row.get("expiry_date"), today) if row.get("expiry_date") else None
		)
		if latest_only and not row["is_latest_version"]:
			continue
		annotated.append(row)

	return annotated


@frappe.whitelist()
def get_project_documents(folder=None, project=None, category=None, site=None, latest_only=0, stage=None, reference_doctype=None, subcategory=None):
	"""Return custom GE Project Document records."""
	_require_document_read_access()
	filters = {}
	if folder:
		filters["folder"] = folder
	if project:
		filters["linked_project"] = project
	if category:
		filters["category"] = category
	if site:
		filters["linked_site"] = site
	if stage:
		filters["linked_stage"] = stage
	if reference_doctype:
		filters["reference_doctype"] = reference_doctype
	if subcategory:
		filters["document_subcategory"] = subcategory
	data = frappe.get_all(
		"GE Project Document",
		filters=filters,
		fields=[
			"name",
			"document_name",
			"folder",
			"linked_project",
			"linked_site",
			"linked_stage",
			"source_document",
			"category",
			"document_subcategory",
			"reference_doctype",
			"reference_name",
			"supersedes_document",
			"is_mandatory",
			"file",
			"version",
			"uploaded_by",
			"uploaded_on",
			"submitted_by",
			"submitted_on",
			"valid_from",
			"valid_till",
			"expiry_date",
			"status",
			"assigned_to",
			"accepted_by",
			"due_date",
			"blocker_reason",
			"escalated_to",
			"reviewed_by",
			"approved_by",
			"approved_rejected_by",
			"closure_note",
			"remarks",
			"creation",
			"modified",
			"owner",
		],
		order_by="modified desc, creation desc, version desc",
	)
	return {
		"success": True,
		"data": _annotate_project_documents(data, latest_only=frappe.utils.cint(latest_only)),
	}


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
	values.setdefault("submitted_by", frappe.session.user)
	values.setdefault("submitted_on", frappe.utils.now_datetime())
	values.setdefault("status", "Submitted")
	values["file"] = _require_param(values.get("file"), "file")
	if not values.get("version"):
		latest_version = (
			frappe.db.sql(
				"""
				select coalesce(max(version), 0)
				from `tabGE Project Document`
				where document_name = %s
				  and linked_project = %s
				  and coalesce(linked_site, '') = %s
				""",
				(
					values.get("document_name"),
					values.get("linked_project"),
					values.get("linked_site") or "",
				),
			)[0][0]
			or 0
		)
		values["version"] = int(latest_version) + 1
	doc = frappe.get_doc({"doctype": "GE Project Document", **values})
	doc.insert()
	frappe.db.commit()
	# Accountability: log document upload
	try:
		from gov_erp.accountability import record_and_log, EventType
		evt = EventType.DOC_SUPERSEDED if values.get("supersedes_document") else EventType.DOC_UPLOADED
		record_and_log(
			subject_doctype="GE Project Document",
			subject_name=doc.name,
			event_type=evt,
			linked_project=doc.linked_project,
			from_status="",
			to_status=doc.status or "Submitted",
			current_status=doc.status or "Submitted",
			current_owner_role=_detect_primary_role(),
			source_route="/documents",
			remarks=f"Stage: {doc.linked_stage or 'N/A'}, Category: {doc.category}, Subcategory: {doc.document_subcategory or 'N/A'}",
		)
	except Exception:
		frappe.log_error(f"Accountability log failed for doc upload {doc.name}", "Accountability Error")
	return {"success": True, "data": doc.as_dict(), "message": "Project document uploaded"}


@frappe.whitelist()
def update_document_status(data):
	"""Update the workflow status of a GE Project Document with accountability logging.
	Supports: In Review, Approved, Rejected, Closed transitions.
	"""
	_require_document_write_access()
	values = _parse_payload(data)
	name = _require_param(values.get("name"), "name")
	new_status = _require_param(values.get("status"), "status")
	reason = values.get("reason") or values.get("remarks") or ""

	doc = frappe.get_doc("GE Project Document", name)
	old_status = doc.status

	if new_status == "Rejected" and not (reason or "").strip():
		frappe.throw("Reason is required when rejecting a document")

	doc.status = new_status
	if new_status == "In Review" and not doc.reviewed_by:
		doc.reviewed_by = frappe.session.user
	if new_status == "Approved":
		if not doc.approved_by:
			doc.approved_by = frappe.session.user
		if not doc.approved_rejected_by:
			doc.approved_rejected_by = frappe.session.user
	if new_status == "Rejected":
		if not doc.approved_rejected_by:
			doc.approved_rejected_by = frappe.session.user
	if reason:
		doc.remarks = reason
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	# Map status to accountability event type
	status_event_map = {
		"In Review": "DOC_REVIEWED",
		"Approved": "DOC_APPROVED",
		"Rejected": "DOC_REJECTED",
		"Closed": "COMPLETED",
	}
	evt_name = status_event_map.get(new_status)
	if evt_name:
		try:
			from gov_erp.accountability import record_and_log, EventType
			record_and_log(
				subject_doctype="GE Project Document",
				subject_name=doc.name,
				event_type=getattr(EventType, evt_name),
				linked_project=doc.linked_project,
				from_status=old_status,
				to_status=new_status,
				current_status=new_status,
				current_owner_role=_detect_primary_role(),
				source_route="/documents",
				remarks=reason or f"Document {new_status.lower()}",
			)
		except Exception:
			frappe.log_error(f"Accountability log failed for doc status change {doc.name}", "Accountability Error")

	return {"success": True, "data": doc.as_dict(), "message": f"Document status updated to {new_status}"}


@frappe.whitelist()
def delete_uploaded_project_file(file_url=None):
	"""Delete an uploaded File record by file_url when document creation fails."""
	_require_document_write_access()
	file_url = _require_param(file_url, "file_url")
	file_name = frappe.db.get_value("File", {"file_url": file_url}, "name")
	if not file_name:
		return {"success": True, "message": "No uploaded file record found for cleanup"}
	frappe.delete_doc("File", file_name, ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "message": "Uploaded file cleaned up"}


@frappe.whitelist()
def get_document_versions(name=None):
	"""Return all versions of a project document grouped by logical document name and project."""
	_require_document_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Project Document", name)
	data = frappe.get_all(
		"GE Project Document",
		filters={
			"document_name": doc.document_name,
			"linked_project": doc.linked_project,
			"linked_site": doc.linked_site,
		},
		fields=[
			"name",
			"document_name",
			"folder",
			"linked_project",
			"linked_site",
			"linked_stage",
			"category",
			"document_subcategory",
			"reference_doctype",
			"reference_name",
			"supersedes_document",
			"file",
			"version",
			"uploaded_by",
			"uploaded_on",
			"valid_from",
			"valid_till",
			"expiry_date",
			"reviewed_by",
			"approved_by",
			"remarks",
			"creation",
		],
		order_by="version desc, creation desc",
	)
	return {"success": True, "data": _annotate_project_documents(data)}


@frappe.whitelist()
def get_expiring_documents(project=None, days=30):
	"""Return project documents that are expiring within the given number of days."""
	_require_document_read_access()
	from frappe.utils import add_days, nowdate
	today = nowdate()
	cutoff = add_days(today, int(days))
	filters = [
		["expiry_date", "is", "set"],
		["expiry_date", "<=", cutoff],
		["expiry_date", ">=", today],
	]
	if project:
		filters.append(["linked_project", "=", project])
	data = frappe.get_all(
		"GE Project Document",
		filters=filters,
		fields=[
			"name", "document_name", "linked_project", "linked_site",
			"category", "file", "version", "expiry_date", "uploaded_by",
			"uploaded_on", "creation",
		],
		order_by="expiry_date asc",
	)
	for row in data:
		row["file_url"] = row.file
		row["days_until_expiry"] = (
			frappe.utils.date_diff(row.expiry_date, today)
		)
	return {"success": True, "data": data}


def _process_expiring_documents():
	"""Scheduler job: emit document_expiring alerts for docs expiring within 7 days."""
	from frappe.utils import add_days, nowdate
	from gov_erp.alert_dispatcher import on_document_event

	today = nowdate()
	cutoff = add_days(today, 7)
	expiring = frappe.get_all(
		"GE Project Document",
		filters=[
			["expiry_date", "is", "set"],
			["expiry_date", "<=", cutoff],
			["expiry_date", ">=", today],
		],
		fields=["name", "document_name", "linked_project", "linked_site", "expiry_date"],
	)
	for doc_row in expiring:
		days_left = frappe.utils.date_diff(doc_row.expiry_date, today)
		try:
			on_document_event(
				project=doc_row.linked_project,
				event="expiring",
				doc_title=f"{doc_row.document_name} (expires in {days_left} day{'s' if days_left != 1 else ''})",
			)
		except Exception:
			frappe.log_error(f"Expiry alert failed for {doc_row.name}", "Alert Error")


# ────────────────────────────────────────────────────────────────
# Document Traceability: Requirement rules, dossier, gates
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_document_requirements(stage=None):
	"""Return all GE Document Requirement rules, optionally filtered by stage."""
	_require_document_read_access()
	filters = {}
	if stage:
		filters["stage"] = stage
	data = frappe.get_all(
		"GE Document Requirement",
		filters=filters,
		fields=[
			"name", "stage", "document_category", "document_subcategory",
			"is_mandatory", "scope_level", "uploader_role", "reviewer_role",
			"description",
		],
		order_by="stage asc, document_category asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def check_stage_document_completeness(project=None, stage=None, site=None):
	"""Check which required documents exist and which are missing for a given stage."""
	_require_document_read_access()
	stage = _require_param(stage, "stage")
	if not project and site:
		project = frappe.db.get_value("GE Site", site, "linked_project")
	project = _require_param(project, "project")

	requirements = frappe.get_all(
		"GE Document Requirement",
		filters={"stage": stage},
		fields=[
			"name", "stage", "document_category", "document_subcategory",
			"is_mandatory", "scope_level",
		],
	)

	doc_filters = {"linked_project": project, "linked_stage": stage}
	if site:
		doc_filters["linked_site"] = site
	existing_docs = frappe.get_all(
		"GE Project Document",
		filters=doc_filters,
		fields=["name", "document_name", "category", "document_subcategory", "status", "linked_site"],
	)

	existing_set = set()
	for d in existing_docs:
		if (d.status or "").strip().lower() == "rejected":
			continue
		existing_set.add((d.category, d.document_subcategory or ""))

	results = []
	all_satisfied = True
	for req in requirements:
		key = (req.document_category, req.document_subcategory or "")
		found = key in existing_set
		if req.is_mandatory and not found:
			all_satisfied = False
		results.append({
			"requirement": req.name,
			"stage": req.stage,
			"category": req.document_category,
			"subcategory": req.document_subcategory,
			"mandatory": req.is_mandatory,
			"scope_level": req.scope_level,
			"satisfied": found,
		})

	return {
		"success": True,
		"data": {
			"requirements": results,
			"all_mandatory_satisfied": all_satisfied,
			"total": len(results),
			"satisfied_count": sum(1 for r in results if r["satisfied"]),
			"missing_mandatory_count": sum(1 for r in results if r["mandatory"] and not r["satisfied"]),
		},
	}


@frappe.whitelist()
def get_project_dossier(project=None):
	"""Return all documents for a project grouped by stage for dossier view."""
	_require_document_read_access()
	project = _require_param(project, "project")

	docs = frappe.get_all(
		"GE Project Document",
		filters={"linked_project": project},
		fields=[
			"name", "document_name", "linked_stage", "linked_site",
			"category", "document_subcategory", "reference_doctype",
			"reference_name", "file", "version", "status",
			"is_mandatory", "uploaded_by", "uploaded_on",
			"reviewed_by", "approved_by", "valid_from", "valid_till",
			"expiry_date", "supersedes_document", "creation",
		],
		order_by="linked_stage asc, category asc, creation desc",
	)

	stages = {}
	for doc in docs:
		stage_key = doc.linked_stage or "Unclassified"
		if stage_key not in stages:
			stages[stage_key] = []
		stages[stage_key].append(doc)

	return {"success": True, "data": {"project": project, "stages": stages, "total_documents": len(docs)}}


@frappe.whitelist()
def get_site_dossier(site=None):
	"""Return all documents for a site, grouped by stage."""
	_require_document_read_access()
	site = _require_param(site, "site")

	if not frappe.db.exists("GE Site", site):
		frappe.throw(f"Site {site} does not exist")
	project = frappe.db.get_value("GE Site", site, "linked_project")

	docs = frappe.get_all(
		"GE Project Document",
		filters={"linked_site": site},
		fields=[
			"name", "document_name", "linked_project", "linked_stage",
			"category", "document_subcategory", "reference_doctype",
			"reference_name", "file", "version", "status",
			"is_mandatory", "uploaded_by", "uploaded_on",
			"reviewed_by", "approved_by", "valid_from", "valid_till",
			"expiry_date", "supersedes_document", "creation",
		],
		order_by="linked_stage asc, category asc, creation desc",
	)

	stages = {}
	for doc in docs:
		stage_key = doc.linked_stage or "Unclassified"
		if stage_key not in stages:
			stages[stage_key] = []
		stages[stage_key].append(doc)

	return {"success": True, "data": {"site": site, "project": project, "stages": stages, "total_documents": len(docs)}}


@frappe.whitelist()
def get_record_documents(reference_doctype=None, reference_name=None):
	"""Return all documents linked to a specific record (e.g., a BOQ, a PO, etc.)."""
	_require_document_read_access()
	reference_doctype = cstr(reference_doctype or "").strip()
	reference_name = cstr(reference_name or "").strip()

	if not reference_doctype or not reference_name:
		return {"success": True, "data": []}

	docs = frappe.get_all(
		"GE Project Document",
		filters={
			"reference_doctype": reference_doctype,
			"reference_name": reference_name,
		},
		fields=[
			"name", "document_name", "linked_project", "linked_site",
			"linked_stage", "category", "document_subcategory",
			"file", "version", "status", "is_mandatory",
			"uploaded_by", "uploaded_on", "reviewed_by", "approved_by",
			"valid_from", "valid_till", "expiry_date",
			"supersedes_document", "creation",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": docs}


@frappe.whitelist()
def check_progression_gate(project=None, target_stage=None, site=None):
	"""Check if all mandatory documents from prior stages are present before advancing.
	Returns warn/block status.
	"""
	_require_document_read_access()
	target_stage = _require_param(target_stage, "target_stage")
	if not project and site:
		project = frappe.db.get_value("GE Site", site, "linked_project")
	project = _require_param(project, "project")

	STAGE_ORDER = [
		"Survey", "BOM_BOQ", "Drawing", "Indent", "Quotation_Vendor_Comparison",
		"PO", "Dispatch", "GRN_Inventory", "Execution", "Commissioning",
		"O_M", "SLA", "RMA", "Commercial", "Closure",
	]
	if target_stage not in STAGE_ORDER:
		return {"success": False, "message": f"Unknown stage: {target_stage}"}

	target_idx = STAGE_ORDER.index(target_stage)
	prior_stages = STAGE_ORDER[:target_idx]

	missing_mandatory = []
	warnings = []

	for prior_stage in prior_stages:
		requirements = frappe.get_all(
			"GE Document Requirement",
			filters={"stage": prior_stage, "is_mandatory": 1},
			fields=["name", "stage", "document_category", "document_subcategory", "scope_level"],
		)
		if not requirements:
			continue

		doc_filters = {"linked_project": project, "linked_stage": prior_stage}
		if site:
			doc_filters["linked_site"] = site
		existing_docs = frappe.get_all(
			"GE Project Document",
			filters=doc_filters,
			fields=["category", "document_subcategory", "status"],
		)
		existing_set = set()
		for d in existing_docs:
			if (d.get("status") or "").strip().lower() == "rejected":
				continue
			existing_set.add((d.category, d.document_subcategory or ""))

		for req in requirements:
			key = (req.document_category, req.document_subcategory or "")
			if key not in existing_set:
				missing_mandatory.append({
					"stage": req.stage,
					"category": req.document_category,
					"subcategory": req.document_subcategory,
				})

	can_proceed = len(missing_mandatory) == 0
	return {
		"success": True,
		"data": {
			"target_stage": target_stage,
			"can_proceed": can_proceed,
			"missing_mandatory": missing_mandatory,
			"missing_count": len(missing_mandatory),
			"message": "All mandatory documents present" if can_proceed
				else f"{len(missing_mandatory)} mandatory document(s) missing from prior stages",
		},
	}


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
	"""Approve a finance request by submitting the instrument for use."""
	_require_roles(ROLE_ACCOUNTS, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	doc = frappe.get_doc("GE EMD PBG Instrument", name)
	doc.status = "Submitted"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Finance request approved"}


@frappe.whitelist()
def deny_finance_request(name, reason=None):
	"""Mark a finance request as forfeited when it is not approved."""
	_require_roles(ROLE_ACCOUNTS, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	doc = frappe.get_doc("GE EMD PBG Instrument", name)
	doc.status = "Forfeited"
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
	submitted = frappe.db.count("GE EMD PBG Instrument", {"status": "Submitted"})
	released = frappe.db.count("GE EMD PBG Instrument", {"status": "Released"})
	forfeited = frappe.db.count("GE EMD PBG Instrument", {"status": "Forfeited"})
	expired = frappe.db.count("GE EMD PBG Instrument", {"status": "Expired"})
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
			"submitted": submitted,
			"released": released,
			"forfeited": forfeited,
			"expired": expired,
			"active": submitted,
			"refunded": expired,
			"rejected": forfeited,
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
		ROLE_PROJECT_HEAD,
		ROLE_PROCUREMENT_HEAD,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)
	records = []

	for row in frappe.get_all(
		"GE Tender Approval",
		filters={"status": "Pending"},
		fields=["name", "linked_tender", "approval_type", "requested_by", "approver_role", "creation"],
		order_by="creation desc",
	):
		created_on = frappe.utils.get_datetime(row.creation)
		approval_label = "GO / NO-GO" if row.approval_type == "GO_NO_GO" else row.approval_type.replace("_", " ")
		action_hint = f"Review {approval_label.lower()} readiness and take approval action"
		if row.approval_type == "TECHNICAL":
			action_hint = "Review technical package and decide approve or reject"
		records.append(
			{
				"id": row.name,
				"tender_id": row.linked_tender or "-",
				"approval_for": f"{approval_label} Tender Approval",
				"approval_from": row.approver_role or ROLE_PRESALES_HEAD,
				"action_owner": row.approver_role or ROLE_PRESALES_HEAD,
				"action_hint": action_hint,
				"requester": row.requested_by,
				"request_date": row.creation,
				"age_days": max((frappe.utils.now_datetime() - created_on).days, 0),
				"status": "Pending",
				"type": "Tender Approval",
			}
		)

	for row in frappe.get_all(
		"GE EMD PBG Instrument",
		filters={"status": "Pending"},
		fields=["name", "linked_tender", "instrument_type", "owner", "creation"],
		order_by="creation desc",
	):
		created_on = frappe.utils.get_datetime(row.creation)
		records.append(
			{
				"id": row.name,
				"tender_id": row.linked_tender or "-",
				"approval_for": f"{row.instrument_type} Finance Request",
				"approval_from": "Accounts / Department Head",
				"action_owner": "Accounts / Department Head",
				"action_hint": "Check instrument amount, bank readiness, and release timeline",
				"requester": row.owner,
				"request_date": row.creation,
				"age_days": max((frappe.utils.now_datetime() - created_on).days, 0),
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
		created_on = frappe.utils.get_datetime(row.creation)
		records.append(
			{
				"id": row.name,
				"tender_id": row.linked_tender or "-",
				"approval_for": "BOQ Approval",
				"approval_from": "Department Head",
				"action_owner": "Department Head",
				"action_hint": "Verify BOQ scope, totals, and tender linkage",
				"requester": row.owner,
				"request_date": row.creation,
				"age_days": max((frappe.utils.now_datetime() - created_on).days, 0),
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
		created_on = frappe.utils.get_datetime(row.creation)
		records.append(
			{
				"id": row.name,
				"tender_id": row.linked_tender or "-",
				"approval_for": "Cost Sheet Approval",
				"approval_from": "Department Head",
				"action_owner": "Department Head",
				"action_hint": "Check ownership, margin, and pricing readiness before submission",
				"requester": row.owner,
				"request_date": row.creation,
				"age_days": max((frappe.utils.now_datetime() - created_on).days, 0),
				"status": "Pending",
				"type": "Costing",
			}
		)

	for row in frappe.get_all(
		"GE Estimate",
		filters={"status": "SENT"},
		fields=["name", "customer", "owner", "creation"],
		order_by="creation desc",
	):
		created_on = frappe.utils.get_datetime(row.creation)
		records.append(
			{
				"id": row.name,
				"tender_id": row.customer or "-",
				"approval_for": "Estimate Approval",
				"approval_from": "Accounts",
				"action_owner": "Accounts",
				"action_hint": "Confirm commercial quote before customer-facing circulation",
				"requester": row.owner,
				"request_date": row.creation,
				"age_days": max((frappe.utils.now_datetime() - created_on).days, 0),
				"status": "Pending",
				"type": "Estimate",
			}
		)

	for row in frappe.get_all(
		"GE Proforma Invoice",
		filters={"status": "SENT"},
		fields=["name", "customer", "owner", "creation"],
		order_by="creation desc",
	):
		created_on = frappe.utils.get_datetime(row.creation)
		records.append(
			{
				"id": row.name,
				"tender_id": row.customer or "-",
				"approval_for": "Proforma Approval",
				"approval_from": "Accounts",
				"action_owner": "Accounts",
				"action_hint": "Validate billing intent, customer mapping, and amount exposure",
				"requester": row.owner,
				"request_date": row.creation,
				"age_days": max((frappe.utils.now_datetime() - created_on).days, 0),
				"status": "Pending",
				"type": "Proforma",
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
		created_on = frappe.utils.get_datetime(row.creation)
		records.append(
			{
				"id": row.name,
				"tender_id": row.linked_project or "-",
				"approval_for": "Invoice Approval",
				"approval_from": "Accounts",
				"action_owner": "Accounts",
				"action_hint": "Approve billing release and receivable exposure",
				"requester": row.owner,
				"request_date": row.creation,
				"age_days": max((frappe.utils.now_datetime() - created_on).days, 0),
				"status": "Pending",
				"type": "Billing",
			}
		)

	for row in frappe.get_all(
		"GE Accountability Record",
		filters={
			"subject_doctype": "Material Request",
			"current_status": ["in", ["Submitted", "Acknowledged", "Escalated"]],
			"latest_event_type": ["not in", ["ACCEPTED", "REJECTED", "RETURNED", "CANCELLED", "COMPLETED"]],
		},
		fields=[
			"subject_name",
			"linked_project",
			"current_status",
			"current_owner_role",
			"current_owner_user",
			"assigned_to_role",
			"assigned_to_user",
			"submitted_by",
			"creation",
			"modified",
			"escalated_to_role",
			"escalated_to_user",
			"blocking_reason",
		],
		order_by="modified desc",
	):
		created_on = frappe.utils.get_datetime(row.modified or row.creation)
		action_owner = row.current_owner_user or row.assigned_to_user or row.current_owner_role or row.assigned_to_role or ROLE_PROJECT_HEAD
		action_hint = "Review indent details and either acknowledge, accept, reject, or return it with written justification."
		if row.current_status == "Escalated":
			action_hint = "Escalated indent requires higher-authority review with a written decision trail."
		elif row.current_status == "Acknowledged":
			action_hint = "Indent has been acknowledged. Approve or reject the next handoff."
		records.append(
			{
				"id": row.subject_name,
				"tender_id": row.linked_project or "-",
				"approval_for": "Indent Approval",
				"approval_from": row.current_owner_role or ROLE_PROJECT_HEAD,
				"action_owner": action_owner,
				"action_hint": action_hint,
				"requester": row.submitted_by or "-",
				"request_date": row.modified or row.creation,
				"age_days": max((frappe.utils.now_datetime() - created_on).days, 0),
				"status": "Pending",
				"type": "Indent",
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
def get_engineering_head_dashboard(project=None):
	"""Aggregate engineering-head dashboard metrics across design, surveys, and execution readiness."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_ENGINEER, ROLE_PROJECT_HEAD, ROLE_PROJECT_MANAGER, ROLE_DIRECTOR)
	survey_data = get_survey_stats().get("data", {})
	boq_data = get_boq_stats().get("data", {})
	execution_data = get_execution_dashboard(project).get("data", {})
	project_filters = {"name": project} if project else {}
	project_rows = frappe.get_all(
		"Project",
		filters=project_filters,
		fields=["name", "current_project_stage", "current_stage_status", "spine_blocked"],
	)
	drawing_rows = frappe.get_all("GE Drawing", fields=["status"])
	change_request_rows = frappe.get_all("GE Change Request", fields=["status"])
	deviation_rows = frappe.get_all("GE Technical Deviation", fields=["status"])

	def normalize_status(value):
		return cstr(value or "").strip().upper().replace(" ", "_")

	def count_status(rows, states):
		expected = {normalize_status(state) for state in states}
		return sum(1 for row in rows if normalize_status(row.status) in expected)

	return {
		"success": True,
		"data": {
			"surveys": survey_data,
			"boqs": boq_data,
			"execution": execution_data,
			"projects": {
				"total": len(project_rows),
				"blocked": sum(1 for row in project_rows if cint(row.spine_blocked)),
				"survey_stage": sum(1 for row in project_rows if normalize_status(row.current_project_stage) == "SURVEY"),
				"design_stage": sum(1 for row in project_rows if normalize_status(row.current_project_stage) == "BOQ_DESIGN"),
				"awaiting_approval": sum(1 for row in project_rows if normalize_status(row.current_stage_status) == "PENDING_APPROVAL"),
			},
			"drawings": {
				"total": len(drawing_rows),
				"approved": count_status(drawing_rows, {"APPROVED", "COMPLETED"}),
				"pending": count_status(drawing_rows, {"DRAFT", "PENDING", "PENDING_APPROVAL", "SUBMITTED", "IN_PROGRESS"}),
				"rejected": count_status(drawing_rows, {"REJECTED", "CANCELLED"}),
			},
			"change_requests": {
				"total": len(change_request_rows),
				"open": count_status(change_request_rows, {"OPEN", "DRAFT", "PENDING", "IN_PROGRESS"}),
				"resolved": count_status(change_request_rows, {"RESOLVED", "APPROVED", "COMPLETED", "CLOSED"}),
				"rejected": count_status(change_request_rows, {"REJECTED", "CANCELLED"}),
			},
			"technical_deviations": {
				"total": len(deviation_rows),
				"pending": count_status(deviation_rows, {"DRAFT", "PENDING", "PENDING_APPROVAL", "SUBMITTED", "IN_PROGRESS"}),
				"approved": count_status(deviation_rows, {"APPROVED", "COMPLETED"}),
				"rejected": count_status(deviation_rows, {"REJECTED", "CANCELLED"}),
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
def get_project_document(name=None):
	"""Return a single custom project document."""
	_require_document_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Project Document", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def update_document_folder(name, data):
	"""Update a custom document folder."""
	_require_document_write_access()
	if frappe.db.count("GE Project Document", {"folder": name}):
		values = _parse_payload(data)
		if "linked_project" in values:
			current_project = frappe.db.get_value("GE Document Folder", name, "linked_project")
			if values.get("linked_project") != current_project:
				frappe.throw("Folder project cannot be changed while documents are linked to this folder")
	doc = _update_generic_doc("GE Document Folder", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Document folder updated"}


@frappe.whitelist()
def delete_document_folder(name):
	"""Delete a custom document folder."""
	_require_document_write_access()
	if frappe.db.count("GE Project Document", {"folder": name}):
		frappe.throw("Cannot delete a folder that still contains project documents")
	_delete_generic_doc("GE Document Folder", name)
	return {"success": True, "message": "Document folder deleted"}


@frappe.whitelist()
def update_project_document(name, data):
	"""Update a custom project document."""
	_require_document_write_access()
	values = _parse_payload(data)
	for forbidden in ["file", "version", "uploaded_by", "uploaded_on", "submitted_by", "submitted_on", "linked_project"]:
		if forbidden in values:
			frappe.throw(f"{forbidden} cannot be edited directly on an existing document")
	doc = _update_generic_doc("GE Project Document", name, values)
	return {"success": True, "data": doc.as_dict(), "message": "Project document updated"}


@frappe.whitelist()
def delete_project_document(name):
	"""Delete a custom project document."""
	_require_document_write_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Project Document", name)
	file_url = doc.file
	_delete_generic_doc("GE Project Document", name)
	if file_url and not frappe.db.exists("GE Project Document", {"file": file_url}):
		file_name = frappe.db.get_value("File", {"file_url": file_url}, "name")
		if file_name:
			frappe.delete_doc("File", file_name, ignore_permissions=True)
			frappe.db.commit()
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
		["name", "drawing_number", "title", "revision", "status", "client_approval_status", "linked_project", "linked_site", "approved_by", "approval_date", "file_url", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_drawing(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
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
def get_technical_deviation(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
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
def get_change_request(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
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
def get_device_register(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
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
def get_ip_pool(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
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
def get_ip_allocation(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
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
	item_counts = _get_commissioning_checklist_item_counts([row["name"] for row in data])
	for row in data:
		counts = item_counts.get(row["name"], {"total_items": 0, "done_items": 0})
		row["total_items"] = counts["total_items"]
		row["done_items"] = counts["done_items"]
	return {"success": True, "data": data}


@frappe.whitelist()
def get_commissioning_checklist(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
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
		[
			"name", "report_name", "test_type", "linked_project", "linked_site",
			"status", "tested_by", "test_date", "file", "remarks",
			"creation", "modified",
		],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_test_report(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
	return {"success": True, "data": frappe.get_doc("GE Test Report", name).as_dict()}


@frappe.whitelist()
def create_test_report(data):
	_require_execution_write_access()
	values = _parse_payload(data)
	values.setdefault("status", "Submitted")
	values.setdefault("tested_by", frappe.session.user)
	values.setdefault("test_date", frappe.utils.today())
	doc = frappe.get_doc({"doctype": "GE Test Report", **values})
	doc.insert()
	frappe.db.commit()
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
		[
			"name", "signoff_type", "linked_project", "linked_site", "status",
			"signed_by_client", "signoff_date", "attachment", "remarks",
			"creation", "modified",
		],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_client_signoff(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
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
def get_comm_log(name=None):
	"""Return a single communication log entry."""
	_require_comm_log_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Project Communication Log", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_comm_log(data):
	"""Create a communication log entry."""
	_require_comm_log_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	comm_type = cstr(values.get("communication_type") or values.get("type") or "").strip().lower()
	type_map = {
		"email": "Email",
		"meeting": "Meeting",
		"call": "Call",
		"client call": "Call",
		"phone call": "Call",
		"whatsapp": "WhatsApp",
		"whats app": "WhatsApp",
		"letter": "Letter",
		"site visit": "Site Visit",
		"site_visit": "Site Visit",
		"other": "Other",
	}
	if comm_type in type_map:
		values["communication_type"] = type_map[comm_type]
	direction = cstr(values.get("direction") or "").strip().lower()
	if direction == "incoming":
		values["direction"] = "Inbound"
	elif direction == "outgoing":
		values["direction"] = "Outbound"
	elif direction == "internal":
		values["direction"] = "Internal"
	values.setdefault("summary", values.get("subject"))
	values.setdefault("communication_date", frappe.utils.today())
	values.setdefault("logged_by", frappe.session.user)
	doc = frappe.get_doc({"doctype": "GE Project Communication Log", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Communication log created"}


@frappe.whitelist()
def update_comm_log(name, data):
	"""Update a communication log entry."""
	_require_comm_log_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	comm_type = cstr(values.get("communication_type") or values.get("type") or "").strip().lower()
	type_map = {
		"email": "Email",
		"meeting": "Meeting",
		"call": "Call",
		"client call": "Call",
		"phone call": "Call",
		"whatsapp": "WhatsApp",
		"whats app": "WhatsApp",
		"letter": "Letter",
		"site visit": "Site Visit",
		"site_visit": "Site Visit",
		"other": "Other",
	}
	if comm_type in type_map:
		values["communication_type"] = type_map[comm_type]
	direction = cstr(values.get("direction") or "").strip().lower()
	if direction == "incoming":
		values["direction"] = "Inbound"
	elif direction == "outgoing":
		values["direction"] = "Outbound"
	elif direction == "internal":
		values["direction"] = "Internal"
	if values.get("subject") and not values.get("summary"):
		values["summary"] = values.get("subject")
	if "communication_date" in values and not values.get("communication_date"):
		values["communication_date"] = frappe.utils.today()
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
def get_project_asset(name=None):
	"""Return a single project asset record."""
	_require_project_asset_access()
	name = _require_param(name, "name")
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
	_apply_project_manager_project_filter(filters, project=project, project_field="linked_project")
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
def get_petty_cash_entry(name=None):
	"""Return a single petty cash entry."""
	_require_petty_cash_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Petty Cash", name)
	assigned = _get_project_manager_assigned_projects()
	if assigned and doc.linked_project not in assigned:
		frappe.throw("Project Manager cannot access petty cash outside assigned projects", frappe.PermissionError)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_petty_cash_entry(data):
	"""Create a petty cash entry."""
	_require_petty_cash_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	if not values.get("linked_project"):
		frappe.throw("Project is required for petty cash entry")
	values["linked_project"] = _ensure_project_manager_project_scope(values.get("linked_project"))
	values.setdefault("status", "Draft")
	doc = frappe.get_doc({"doctype": "GE Petty Cash", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Petty cash entry created"}


@frappe.whitelist()
def update_petty_cash_entry(name, data):
	"""Update a petty cash entry."""
	_require_petty_cash_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	if "linked_project" in values and not values.get("linked_project"):
		frappe.throw("Project is required for petty cash entry")
	doc = frappe.get_doc("GE Petty Cash", name)
	assigned = _get_project_manager_assigned_projects()
	if assigned and doc.linked_project not in assigned:
		frappe.throw("Project Manager cannot update petty cash outside assigned projects", frappe.PermissionError)
	if "linked_project" in values:
		values["linked_project"] = _ensure_project_manager_project_scope(values.get("linked_project"))
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Petty cash entry updated"}


@frappe.whitelist()
def approve_petty_cash_entry(name):
	"""Approve a petty cash entry."""
	_require_petty_cash_approval_access()
	doc = frappe.get_doc("GE Petty Cash", name)
	old_status = doc.status
	doc.status = "Approved"
	doc.approved_by = frappe.session.user
	doc.approved_on = frappe.utils.today()
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Petty Cash",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status=old_status,
			to_status="Approved",
			current_status="Approved",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/petty-cash" if doc.get("linked_project") else "/petty-cash",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_petty_cash_entry")

	return {"success": True, "data": doc.as_dict(), "message": "Petty cash entry approved"}


@frappe.whitelist()
def reject_petty_cash_entry(name, reason=None):
	"""Reject a petty cash entry."""
	_require_petty_cash_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Petty Cash", name)
	old_status = doc.status
	doc.status = "Rejected"
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Petty Cash",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status=old_status,
			to_status="Rejected",
			current_status="Rejected",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route=f"/projects/{doc.get('linked_project')}/petty-cash" if doc.get("linked_project") else "/petty-cash",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_petty_cash_entry")

	return {"success": True, "data": doc.as_dict(), "message": "Petty cash entry rejected"}


@frappe.whitelist()
def delete_petty_cash_entry(name):
	"""Delete a draft petty cash entry."""
	_require_petty_cash_write_access()
	doc = frappe.get_doc("GE Petty Cash", name)
	assigned = _get_project_manager_assigned_projects()
	if assigned and doc.linked_project not in assigned:
		frappe.throw("Project Manager cannot delete petty cash outside assigned projects", frappe.PermissionError)
	frappe.delete_doc("GE Petty Cash", name)
	frappe.db.commit()
	return {"success": True, "message": "Petty cash entry deleted"}


def _require_project_inventory_read_access():
	_require_roles(ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD, ROLE_DIRECTOR)


def _require_project_inventory_write_access():
	_require_roles(ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)


@frappe.whitelist()
def get_project_inventory_records(project=None, site=None):
	"""Return project-scoped inventory truth for PM/PH surfaces."""
	_require_project_inventory_read_access()
	filters = {}
	_apply_project_manager_project_filter(filters, project=project, project_field="linked_project")
	if site:
		filters["linked_site"] = site
	data = frappe.get_all(
		"GE Project Inventory",
		filters=filters,
		fields=[
			"name",
			"linked_project",
			"linked_site",
			"item_code",
			"item_name",
			"unit",
			"received_qty",
			"consumed_qty",
			"balance_qty",
			"last_grn_ref",
			"last_receipt_note",
			"modified",
		],
		order_by="item_code asc, modified desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def record_project_inventory_receipt(data):
	"""Apply a project-side receipt update to project inventory totals."""
	_require_project_inventory_write_access()
	values = _parse_payload(data)
	project = _ensure_project_manager_project_scope(values.get("linked_project"))
	item_code = _require_param(values.get("item_code"), "item_code")
	received_qty = flt(values.get("received_qty"))
	if received_qty <= 0:
		frappe.throw("Received quantity must be greater than zero")
	filters = {
		"linked_project": project,
		"item_code": item_code,
	}
	if values.get("linked_site"):
		filters["linked_site"] = values.get("linked_site")
	existing_name = frappe.db.get_value("GE Project Inventory", filters, "name")
	if existing_name:
		doc = frappe.get_doc("GE Project Inventory", existing_name)
		doc.received_qty = flt(doc.received_qty) + received_qty
	else:
		doc = frappe.get_doc(
			{
				"doctype": "GE Project Inventory",
				"linked_project": project,
				"linked_site": values.get("linked_site"),
				"item_code": item_code,
				"item_name": values.get("item_name") or item_code,
				"unit": values.get("unit"),
				"received_qty": received_qty,
				"consumed_qty": 0,
			}
		)
	doc.item_name = values.get("item_name") or doc.item_name or item_code
	doc.unit = values.get("unit") or doc.unit
	doc.last_grn_ref = values.get("last_grn_ref") or doc.last_grn_ref
	doc.last_receipt_note = values.get("last_receipt_note") or doc.last_receipt_note
	if existing_name:
		doc.save()
	else:
		doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Project inventory updated"}


@frappe.whitelist()
def get_material_consumption_reports(project=None, site=None):
	"""Return material consumption reports scoped to a project."""
	_require_project_inventory_read_access()
	filters = {}
	_apply_project_manager_project_filter(filters, project=project, project_field="linked_project")
	if site:
		filters["linked_site"] = site
	data = frappe.get_all(
		"GE Material Consumption Report",
		filters=filters,
		fields=[
			"name",
			"linked_project",
			"linked_site",
			"report_date",
			"item_code",
			"item_name",
			"unit",
			"consumed_qty",
			"remarks",
			"status",
			"submitted_by",
			"submitted_to",
			"creation",
		],
		order_by="report_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_material_consumption_report(data):
	"""Create a PM-side material consumption report and update project inventory."""
	_require_project_inventory_write_access()
	values = _parse_payload(data)
	project = _ensure_project_manager_project_scope(values.get("linked_project"))
	item_code = _require_param(values.get("item_code"), "item_code")
	consumed_qty = flt(values.get("consumed_qty"))
	if consumed_qty <= 0:
		frappe.throw("Consumed quantity must be greater than zero")
	filters = {
		"linked_project": project,
		"item_code": item_code,
	}
	if values.get("linked_site"):
		filters["linked_site"] = values.get("linked_site")
	inventory_name = frappe.db.get_value("GE Project Inventory", filters, "name")
	if not inventory_name:
		frappe.throw("Create a project inventory record before submitting material consumption")
	inventory_doc = frappe.get_doc("GE Project Inventory", inventory_name)
	if flt(inventory_doc.balance_qty) < consumed_qty:
		frappe.throw("Consumed quantity exceeds available project inventory balance")
	report = frappe.get_doc(
		{
			"doctype": "GE Material Consumption Report",
			"linked_project": project,
			"linked_site": values.get("linked_site"),
			"report_date": values.get("report_date") or today(),
			"item_code": item_code,
			"item_name": values.get("item_name") or inventory_doc.item_name or item_code,
			"unit": values.get("unit") or inventory_doc.unit,
			"consumed_qty": consumed_qty,
			"remarks": values.get("remarks"),
			"status": "Submitted",
			"submitted_by": frappe.session.user,
			"submitted_to": values.get("submitted_to"),
		}
	)
	report.insert()
	inventory_doc.consumed_qty = flt(inventory_doc.consumed_qty) + consumed_qty
	inventory_doc.save()
	frappe.db.commit()
	return {"success": True, "data": report.as_dict(), "message": "Material consumption report submitted"}


@frappe.whitelist()
def get_project_receiving_summary(project=None):
	"""Return project-linked dispatch and GRN visibility for PM follow-through."""
	_require_project_inventory_read_access()
	project = _ensure_project_manager_project_scope(project) if _get_project_manager_assigned_projects() else _require_param(project, "project")
	grns = frappe.get_all(
		"Purchase Receipt",
		filters={"project": project},
		fields=["name", "supplier", "posting_date", "status", "set_warehouse", "grand_total"],
		order_by="posting_date desc, creation desc",
		page_length=25,
	)
	dispatches = frappe.get_all(
		"GE Dispatch Challan",
		filters={"linked_project": project},
		fields=["name", "dispatch_date", "dispatch_type", "status", "target_site_name", "total_items", "total_qty"],
		order_by="dispatch_date desc, creation desc",
		page_length=25,
	)
	return {"success": True, "data": {"project": project, "grns": grns, "dispatches": dispatches}}


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
def get_manpower_log(name=None):
	"""Return a single manpower log entry."""
	_require_manpower_read_access()
	name = _require_param(name, "name")
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


# ── Project Staffing Assignment APIs ─────────────────────────

@frappe.whitelist()
def get_staffing_assignments(project=None, site=None, is_active=None, position=None):
	"""Return staffing assignment records, optionally filtered."""
	_require_manpower_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if is_active is not None and is_active != "":
		filters["is_active"] = cint(is_active)
	if position:
		filters["position"] = position
	rows = frappe.get_all(
		"GE Project Staffing Assignment",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site", "employee_name",
			"employee_code", "position", "qualifications", "contact_number",
			"email", "join_date", "leave_date", "total_days_on_project",
			"is_active", "remarks",
		],
		order_by="creation desc",
		limit_page_length=500,
	)
	return {"success": True, "data": rows}


@frappe.whitelist()
def get_staffing_assignment(name):
	"""Return a single staffing assignment."""
	_require_manpower_read_access()
	doc = frappe.get_doc("GE Project Staffing Assignment", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_staffing_assignment(data):
	"""Create a new project staffing assignment."""
	_require_manpower_write_access()
	if isinstance(data, str):
		data = frappe.parse_json(data)
	doc = frappe.new_doc("GE Project Staffing Assignment")
	for field in [
		"linked_project", "linked_site", "employee_name", "employee_code",
		"position", "qualifications", "contact_number", "email",
		"join_date", "leave_date", "is_active", "remarks",
	]:
		if field in data:
			doc.set(field, data[field])
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Staffing assignment created"}


@frappe.whitelist()
def update_staffing_assignment(name, data):
	"""Update an existing staffing assignment."""
	_require_manpower_write_access()
	if isinstance(data, str):
		data = frappe.parse_json(data)
	doc = frappe.get_doc("GE Project Staffing Assignment", name)
	for field in [
		"linked_project", "linked_site", "employee_name", "employee_code",
		"position", "qualifications", "contact_number", "email",
		"join_date", "leave_date", "is_active", "remarks",
	]:
		if field in data:
			doc.set(field, data[field])
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Staffing assignment updated"}


@frappe.whitelist()
def delete_staffing_assignment(name):
	"""Delete a staffing assignment."""
	_require_manpower_write_access()
	frappe.delete_doc("GE Project Staffing Assignment", name)
	frappe.db.commit()
	return {"success": True, "message": "Staffing assignment deleted"}


@frappe.whitelist()
def end_staffing_assignment(name, leave_date=None, remarks=None):
	"""End a staffing assignment by setting leave_date and letting the controller auto-deactivate it."""
	_require_manpower_write_access()
	doc = frappe.get_doc("GE Project Staffing Assignment", name)
	doc.leave_date = leave_date or frappe.utils.today()
	if remarks:
		doc.remarks = f"{doc.remarks}\n{remarks}".strip() if doc.remarks else remarks
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Staffing assignment ended"}


@frappe.whitelist()
def get_staffing_summary(project=None, site=None):
	"""Return aggregated staffing stats for a project/site."""
	_require_manpower_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	rows = frappe.get_all(
		"GE Project Staffing Assignment",
		filters=filters,
		fields=["is_active", "total_days_on_project", "position"],
	)
	active = [r for r in rows if r.is_active]
	positions = {}
	for r in rows:
		positions[r.position] = positions.get(r.position, 0) + 1
	return {
		"success": True,
		"data": {
			"total_assignments": len(rows),
			"active_assignments": len(active),
			"position_breakdown": positions,
			"total_person_days": sum(r.total_days_on_project or 0 for r in rows),
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
def get_device_uptime_log(name=None):
	"""Return a single device uptime log entry."""
	_require_device_uptime_read_access()
	name = _require_param(name, "name")
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
def get_site_uptime_summary(site=None):
	"""Return per-device uptime summary for a site."""
	_require_device_uptime_read_access()
	site = _require_param(site, "site")
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


# ── Technical Deviation Workflow Helpers ──────────────────────

@frappe.whitelist()
def approve_technical_deviation(name):
	"""Approve a technical deviation (Engineering Head/Project Manager only)."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Technical Deviation", name)
	if doc.status not in ("Open",):
		frappe.throw(f"Cannot approve deviation in '{doc.status}' state. Must be 'Open'.")
	doc.status = "Approved"
	doc.approved_by = frappe.session.user
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Technical Deviation",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Open",
			to_status="Approved",
			current_status="Approved",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/technical-deviations" if doc.get("linked_project") else "/technical-deviations",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_technical_deviation")

	return {"success": True, "data": doc.as_dict(), "message": "Technical deviation approved"}


@frappe.whitelist()
def reject_technical_deviation(name, reason=None):
	"""Reject a technical deviation."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Technical Deviation", name)
	if doc.status not in ("Open",):
		frappe.throw(f"Cannot reject deviation in '{doc.status}' state. Must be 'Open'.")
	doc.status = "Rejected"
	doc.approved_by = frappe.session.user
	doc.remarks = (doc.remarks or "") + f"\nRejection reason: {reason}"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Technical Deviation",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Open",
			to_status="Rejected",
			current_status="Rejected",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route=f"/projects/{doc.get('linked_project')}/technical-deviations" if doc.get("linked_project") else "/technical-deviations",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_technical_deviation")

	return {"success": True, "data": doc.as_dict(), "message": "Technical deviation rejected"}


@frappe.whitelist()
def close_technical_deviation(name):
	"""Close an approved or rejected deviation."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Technical Deviation", name)
	if doc.status not in ("Approved", "Rejected"):
		frappe.throw(f"Cannot close deviation in '{doc.status}' state. Must be 'Approved' or 'Rejected'.")
	doc.status = "Closed"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Technical deviation closed"}


# ── Change Request Workflow Helpers ──────────────────────────

@frappe.whitelist()
def submit_change_request(name):
	"""Submit a draft change request for review."""
	_require_execution_write_access()
	doc = frappe.get_doc("GE Change Request", name)
	if doc.status != "Draft":
		frappe.throw(f"Cannot submit change request in '{doc.status}' state. Must be 'Draft'.")
	doc.status = "Submitted"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Change Request",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Draft",
			to_status="Submitted",
			current_status="Submitted",
			submitted_by=frappe.session.user,
			submitted_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/change-requests" if doc.get("linked_project") else "/change-requests",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_change_request")

	return {"success": True, "data": doc.as_dict(), "message": "Change request submitted for review"}


@frappe.whitelist()
def approve_change_request(name):
	"""Approve a submitted change request."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Change Request", name)
	if doc.status != "Submitted":
		frappe.throw(f"Cannot approve change request in '{doc.status}' state. Must be 'Submitted'.")
	doc.status = "Approved"
	doc.approved_by = frappe.session.user
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Change Request",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Submitted",
			to_status="Approved",
			current_status="Approved",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/change-requests" if doc.get("linked_project") else "/change-requests",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_change_request")

	return {"success": True, "data": doc.as_dict(), "message": "Change request approved"}


@frappe.whitelist()
def reject_change_request(name, reason=None):
	"""Reject a submitted change request."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_HEAD)
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Change Request", name)
	if doc.status != "Submitted":
		frappe.throw(f"Cannot reject change request in '{doc.status}' state. Must be 'Submitted'.")
	doc.status = "Rejected"
	doc.approved_by = frappe.session.user
	doc.remarks = (doc.remarks or "") + f"\nRejection reason: {reason}"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Change Request",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Submitted",
			to_status="Rejected",
			current_status="Rejected",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route=f"/projects/{doc.get('linked_project')}/change-requests" if doc.get("linked_project") else "/change-requests",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_change_request")

	return {"success": True, "data": doc.as_dict(), "message": "Change request rejected"}


# ── Test Report Workflow Helpers ─────────────────────────────

@frappe.whitelist()
def approve_test_report(name):
	"""Approve a submitted test report."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Test Report", name)
	if doc.status != "Submitted":
		frappe.throw(f"Cannot approve test report in '{doc.status}' state. Must be 'Submitted'.")
	doc.status = "Approved"
	doc.approved_by = frappe.session.user
	doc.approval_date = frappe.utils.today()
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Test Report",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Submitted",
			to_status="Approved",
			current_status="Approved",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route="/execution/commissioning/test-reports",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_test_report")

	return {"success": True, "data": doc.as_dict(), "message": "Test report approved"}


@frappe.whitelist()
def reject_test_report(name, reason=None):
	"""Reject a submitted test report."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Test Report", name)
	if doc.status != "Submitted":
		frappe.throw(f"Cannot reject test report in '{doc.status}' state. Must be 'Submitted'.")
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc.status = "Rejected"
	doc.approved_by = frappe.session.user
	doc.approval_date = frappe.utils.today()
	doc.remarks = (doc.remarks or "") + f"\nRejection reason: {reason}"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Test Report",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Submitted",
			to_status="Rejected",
			current_status="Rejected",
			remarks=reason,
			current_owner_role=_detect_primary_role(),
			source_route="/execution/commissioning/test-reports",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_test_report")

	return {"success": True, "data": doc.as_dict(), "message": "Test report rejected"}


# ── Device Register Lifecycle Helpers ────────────────────────

@frappe.whitelist()
def commission_device(name):
	"""Mark a deployed/active device as commissioned."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER)
	doc = frappe.get_doc("GE Device Register", name)
	if doc.status not in ("Deployed", "Active"):
		frappe.throw(f"Cannot commission device in '{doc.status}' state. Must be 'Deployed' or 'Active'.")
	doc.status = "Commissioned"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Device commissioned"}


@frappe.whitelist()
def mark_device_faulty(name, remarks=None):
	"""Flag a device as faulty."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_FIELD_TECHNICIAN)
	doc = frappe.get_doc("GE Device Register", name)
	if doc.status == "Decommissioned":
		frappe.throw("Cannot mark a decommissioned device as faulty.")
	doc.status = "Faulty"
	if remarks:
		doc.remarks = (doc.remarks or "") + f"\nFaulty: {remarks}"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Device marked faulty"}


@frappe.whitelist()
def decommission_device(name, remarks=None):
	"""Decommission a device and release its IP allocation if any."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER)
	doc = frappe.get_doc("GE Device Register", name)
	doc.status = "Decommissioned"
	if remarks:
		doc.remarks = (doc.remarks or "") + f"\nDecommissioned: {remarks}"
	doc.save()
	# Release linked IP allocation if present
	if doc.ip_address:
		try:
			alloc = frappe.get_doc("GE IP Allocation", doc.ip_address)
			if alloc.status == "Active":
				alloc.status = "Released"
				alloc.released_on = frappe.utils.today()
				alloc.save()
		except frappe.DoesNotExistError:
			pass
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Device decommissioned"}


# ── IP Allocation Lifecycle Helpers ──────────────────────────

@frappe.whitelist()
def release_ip_allocation(name):
	"""Release an active IP allocation back to its pool."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER)
	doc = frappe.get_doc("GE IP Allocation", name)
	if doc.status != "Active":
		frappe.throw(f"Cannot release IP allocation in '{doc.status}' state. Must be 'Active'.")
	doc.status = "Released"
	doc.released_on = frappe.utils.today()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "IP allocation released"}


# ── Commissioning Checklist Workflow Helpers ─────────────────

@frappe.whitelist()
def start_commissioning_checklist(name):
	"""Move a draft commissioning checklist to In Progress."""
	_require_execution_write_access()
	doc = frappe.get_doc("GE Commissioning Checklist", name)
	if doc.status != "Draft":
		frappe.throw(f"Cannot start checklist in '{doc.status}' state. Must be 'Draft'.")
	doc.status = "In Progress"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Commissioning checklist started"}


@frappe.whitelist()
def complete_commissioning_checklist(name):
	"""Complete a commissioning checklist after verifying all items."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER)
	doc = frappe.get_doc("GE Commissioning Checklist", name)
	if doc.status != "In Progress":
		frappe.throw(f"Cannot complete checklist in '{doc.status}' state. Must be 'In Progress'.")
	# Verify all items are completed
	items = doc.get("items") or []
	incomplete = [item for item in items if not item.is_completed]
	if incomplete:
		frappe.throw(f"{len(incomplete)} checklist item(s) are still incomplete. Complete all items first.")
	doc.status = "Completed"
	doc.commissioned_by = frappe.session.user
	doc.commissioned_date = frappe.utils.today()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Commissioning checklist completed"}


# ── Client Signoff Workflow Helpers ──────────────────────────

@frappe.whitelist()
def sign_client_signoff(name, signed_by_client=None):
	"""Record client signature on a pending signoff."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Client Signoff", name)
	if doc.status != "Pending":
		frappe.throw(f"Cannot sign in '{doc.status}' state. Must be 'Pending'.")
	if not (signed_by_client or doc.signed_by_client):
		frappe.throw("Signed By Client is required before recording signoff.")
	doc.status = "Signed"
	if signed_by_client:
		doc.signed_by_client = signed_by_client
	doc.signoff_date = frappe.utils.today()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Client signoff recorded"}


@frappe.whitelist()
def approve_client_signoff(name):
	"""Final internal approval after client signature."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Client Signoff", name)
	if doc.status != "Signed":
		frappe.throw(f"Cannot approve signoff in '{doc.status}' state. Must be 'Signed'.")
	doc.status = "Approved"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Client signoff approved"}


# ── Drawing Workflow Helpers ─────────────────────────────────

@frappe.whitelist()
def submit_drawing(name):
	"""Submit a draft drawing for approval."""
	_require_execution_write_access()
	doc = frappe.get_doc("GE Drawing", name)
	if doc.status != "Draft":
		frappe.throw(f"Cannot submit drawing in '{doc.status}' state. Must be 'Draft'.")
	doc.status = "Submitted"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Drawing",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Draft",
			to_status="Submitted",
			current_status="Submitted",
			submitted_by=frappe.session.user,
			submitted_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/drawings" if doc.get("linked_project") else "/drawings",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_drawing")

	return {"success": True, "data": doc.as_dict(), "message": "Drawing submitted for approval"}


@frappe.whitelist()
def approve_drawing(name):
	"""Approve a submitted drawing."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Drawing", name)
	if doc.status != "Submitted":
		frappe.throw(f"Cannot approve drawing in '{doc.status}' state. Must be 'Submitted'.")
	doc.status = "Approved"
	doc.approved_by = frappe.session.user
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Drawing",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Submitted",
			to_status="Approved",
			current_status="Approved",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/drawings" if doc.get("linked_project") else "/drawings",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_drawing")

	return {"success": True, "data": doc.as_dict(), "message": "Drawing approved"}


@frappe.whitelist()
def supersede_drawing(name, superseded_by=None):
	"""Mark an approved drawing as superseded by a newer revision."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Drawing", name)
	if doc.status != "Approved":
		frappe.throw(f"Cannot supersede drawing in '{doc.status}' state. Must be 'Approved'.")
	doc.status = "Superseded"
	if superseded_by:
		doc.supersedes_drawing = superseded_by
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Drawing",
			subject_name=name,
			event_type=EventType.OVERRIDDEN,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Approved",
			to_status="Superseded",
			current_status="Superseded",
			current_owner_role=_detect_primary_role(),
			remarks=f"Superseded by {superseded_by}" if superseded_by else "Superseded",
			source_route=f"/projects/{doc.get('linked_project')}/drawings" if doc.get("linked_project") else "/drawings",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: supersede_drawing")

	return {"success": True, "data": doc.as_dict(), "message": "Drawing superseded"}

# ── Project Spine Model APIs ────────────────────────────────

SPINE_STAGES = [
        "SURVEY",
        "BOQ_DESIGN",
        "COSTING",
        "PROCUREMENT",
        "STORES_DISPATCH",
        "EXECUTION",
        "BILLING_PAYMENT",
        "OM_RMA",
        "CLOSED",
]

# Map each department to the stages it can see in its operational lane.
# The frontend matrix can further distinguish read-only vs full access.
DEPARTMENT_STAGE_MAP = {
        "engineering": ["SURVEY", "BOQ_DESIGN", "COSTING", "PROCUREMENT", "EXECUTION"],
        "procurement": ["COSTING", "PROCUREMENT", "STORES_DISPATCH", "BILLING_PAYMENT"],
        "stores": ["PROCUREMENT", "STORES_DISPATCH", "EXECUTION"],
        "accounts": ["COSTING", "PROCUREMENT", "BILLING_PAYMENT", "CLOSED"],
        "i_and_c": ["STORES_DISPATCH", "EXECUTION", "BILLING_PAYMENT"],
        "hr": SPINE_STAGES,              # cross-cutting visibility
        "om_rma": ["OM_RMA", "CLOSED"],
}


def _require_project_workspace_access():
        _require_roles(
                ROLE_DIRECTOR,
                ROLE_PRESALES_HEAD,
                ROLE_PROJECT_HEAD,
                ROLE_PROJECT_MANAGER,
        )


def _require_project_workspace_write_access():
        _require_roles(
                ROLE_DIRECTOR,
                ROLE_PRESALES_HEAD,
                ROLE_PROJECT_HEAD,
                ROLE_PROJECT_MANAGER,
        )


def _require_project_workspace_delete_access():
        _require_roles(
                ROLE_DIRECTOR,
                ROLE_PRESALES_HEAD,
                ROLE_PROJECT_HEAD,
        )


def _require_spine_read_access():
        _require_roles(
                ROLE_DIRECTOR,
                ROLE_PRESALES_HEAD,
                ROLE_DEPARTMENT_HEAD,
                ROLE_PROJECT_HEAD,
                ROLE_PROJECT_MANAGER,
                ROLE_ENGINEERING_HEAD,
                ROLE_ENGINEER,
                ROLE_PROCUREMENT_HEAD,
                ROLE_PROCUREMENT_MANAGER,
                ROLE_STORES_LOGISTICS_HEAD,
                ROLE_STORE_MANAGER,
                ROLE_ACCOUNTS,
                ROLE_ACCOUNTS_HEAD,
                ROLE_HR_HEAD,
                ROLE_HR_MANAGER,
                ROLE_RMA_HEAD,
                ROLE_RMA_MANAGER,
                ROLE_FIELD_TECHNICIAN,
                ROLE_OM_OPERATOR,
        )


def _require_spine_write_access():
        _require_roles(
                ROLE_DIRECTOR,
                ROLE_PRESALES_HEAD,
                ROLE_PROJECT_HEAD,
                ROLE_PROJECT_MANAGER,
                ROLE_ENGINEERING_HEAD,
                ROLE_PROCUREMENT_HEAD,
                ROLE_STORES_LOGISTICS_HEAD,
                ROLE_ACCOUNTS_HEAD,
                ROLE_HR_HEAD,
                ROLE_RMA_HEAD,
        )


def _compute_project_spine_progress(sites):
        """Compute project spine progress % from site stages."""
        if not sites:
                return 0
        stage_weight = {s: i for i, s in enumerate(SPINE_STAGES)}
        max_idx = len(SPINE_STAGES) - 1
        if max_idx == 0:
                return 100
        total = sum(stage_weight.get(s.current_site_stage or "SURVEY", 0) for s in sites)
        return round((total / (len(sites) * max_idx)) * 100, 2)


def _site_stage_coverage(sites):
        """Group sites by their current spine stage."""
        coverage = {s: 0 for s in SPINE_STAGES}
        for site in sites:
                stage = site.current_site_stage or "SURVEY"
                if stage in coverage:
                        coverage[stage] += 1
        return coverage


def _build_action_queue(sites, project=None):
        """Find sites that need attention: blocked, pending, overdue milestones."""
        blocked = []
        pending = []
        for site in sites:
                if site.site_blocked:
                        blocked.append({
                                "site": site.name,
                                "site_code": site.site_code,
                                "site_name": site.site_name,
                                "stage": site.current_site_stage,
                                "reason": site.blocker_reason,
                        })
                elif (site.current_site_stage or "SURVEY") != "CLOSED":
                        pending.append({
                                "site": site.name,
                                "site_code": site.site_code,
                                "site_name": site.site_name,
                                "stage": site.current_site_stage,
                                "owner_role": site.current_owner_role,
                                "owner_user": site.current_owner_user,
                        })

        # Overdue milestones for the project
        ms_filters = {}
        if project:
                ms_filters["linked_project"] = project
        overdue_milestones = []
        for ms in frappe.get_all(
                "GE Milestone",
                filters=ms_filters,
                fields=["name", "milestone_name", "linked_site", "planned_end_date", "status"],
        ):
                if (
                        ms.planned_end_date
                        and not ms.status == "COMPLETED"
                        and frappe.utils.date_diff(frappe.utils.nowdate(), ms.planned_end_date) > 0
                ):
                        overdue_milestones.append({
                                "milestone": ms.name,
                                "title": ms.milestone_name,
                                "site": ms.linked_site,
                                "planned_end_date": str(ms.planned_end_date),
                        })

        return {
                "blocked_sites": blocked,
                "blocked_count": len(blocked),
                "pending_sites": pending[:20],
                "pending_count": len(pending),
                "overdue_milestones": overdue_milestones[:20],
                "overdue_count": len(overdue_milestones),
        }


def _department_lane_for_stage(stage):
        stage = stage or "SURVEY"
        for department, stages in DEPARTMENT_STAGE_MAP.items():
                if department == "hr":
                        continue
                if stage in stages:
                        return department
        return "hr"


def _format_department_label(department):
        return cstr(department or "").replace("_", " ").title()


def _serialize_site_row(site, milestone_meta=None, dpr_meta=None):
        milestone_meta = milestone_meta or {}
        dpr_meta = dpr_meta or {}
        stage = site.current_site_stage or "SURVEY"
        return {
                "name": site.name,
                "site_code": site.site_code,
                "site_name": site.site_name,
                "status": site.status,
                "linked_project": site.linked_project,
                "installation_stage": getattr(site, "installation_stage", None),
                "current_site_stage": stage,
                "department_lane": _department_lane_for_stage(stage),
                "site_blocked": cint(site.site_blocked),
                "blocker_reason": getattr(site, "blocker_reason", None),
                "current_owner_role": getattr(site, "current_owner_role", None),
                "current_owner_user": getattr(site, "current_owner_user", None),
                "site_progress_pct": flt(getattr(site, "site_progress_pct", None) or getattr(site, "location_progress_pct", None) or 0),
                "milestone_count": milestone_meta.get(site.name, {}).get("count", 0),
                "open_milestone_count": milestone_meta.get(site.name, {}).get("open_count", 0),
                "latest_planned_end_date": milestone_meta.get(site.name, {}).get("latest_planned_end_date"),
                "latest_dpr_date": dpr_meta.get(site.name),
                "modified": str(site.modified) if getattr(site, "modified", None) else None,
        }


def _build_department_lane_breakdown(serialized_sites):
        lane_map = {}
        for department, stages in DEPARTMENT_STAGE_MAP.items():
                visible_sites = [site for site in serialized_sites if (site.get("current_site_stage") or "SURVEY") in stages]
                lane_map[department] = {
                        "department": department,
                        "label": _format_department_label(department),
                        "allowed_stages": list(stages),
                        "site_count": len(visible_sites),
                        "blocked_count": sum(1 for site in visible_sites if cint(site.get("site_blocked"))),
                        "avg_progress_pct": round(
                                (sum(flt(site.get("site_progress_pct") or 0) for site in visible_sites) / len(visible_sites)),
                                2,
                        ) if visible_sites else 0,
                        "stage_coverage": {
                                stage: sum(1 for site in visible_sites if (site.get("current_site_stage") or "SURVEY") == stage)
                                for stage in stages
                        },
                        "sites": visible_sites,
                }
        return lane_map


def _get_project_site_rollup(project):
        site_rows = frappe.get_all(
                "GE Site",
                filters={"linked_project": project},
                fields=[
                        "name", "site_code", "site_name", "status", "linked_project",
                        "installation_stage", "current_site_stage", "site_blocked", "blocker_reason",
                        "current_owner_role", "current_owner_user", "site_progress_pct", "location_progress_pct",
                        "modified",
                ],
                order_by="site_code asc, site_name asc",
        )

        milestone_rows = frappe.get_all(
                "GE Milestone",
                filters={"linked_project": project},
                fields=["linked_site", "status", "planned_end_date"],
        )
        milestone_meta = {}
        for row in milestone_rows:
                linked_site = row.linked_site
                if not linked_site:
                        continue
                bucket = milestone_meta.setdefault(linked_site, {"count": 0, "open_count": 0, "latest_planned_end_date": None})
                bucket["count"] += 1
                if cstr(row.status or "").strip().upper() not in {"COMPLETED", "APPROVED", "CLOSED"}:
                        bucket["open_count"] += 1
                planned_end_date = str(row.planned_end_date) if row.planned_end_date else None
                if planned_end_date and (not bucket["latest_planned_end_date"] or planned_end_date > bucket["latest_planned_end_date"]):
                        bucket["latest_planned_end_date"] = planned_end_date

        dpr_rows = frappe.get_all(
                "GE DPR",
                filters={"linked_project": project},
                fields=["linked_site", "report_date"],
                order_by="report_date desc",
        )
        dpr_meta = {}
        for row in dpr_rows:
                if row.linked_site and row.linked_site not in dpr_meta:
                        dpr_meta[row.linked_site] = str(row.report_date) if row.report_date else None

        serialized_sites = [_serialize_site_row(site, milestone_meta, dpr_meta) for site in site_rows]
        return {
                "sites": serialized_sites,
                "stage_coverage": _site_stage_coverage(site_rows),
                "department_lanes": _build_department_lane_breakdown(serialized_sites),
                "action_queue": _build_action_queue(site_rows, project),
        }


def _department_lane_for_stage(stage):
        stage = stage or "SURVEY"
        for department, stages in DEPARTMENT_STAGE_MAP.items():
                if department == "hr":
                        continue
                if stage in stages:
                        return department
        return "hr"


def _format_department_label(department):
        return cstr(department or "").replace("_", " ").title()


def _serialize_site_row(site, milestone_meta=None, dpr_meta=None):
        milestone_meta = milestone_meta or {}
        dpr_meta = dpr_meta or {}
        stage = site.current_site_stage or "SURVEY"
        return {
                "name": site.name,
                "site_code": site.site_code,
                "site_name": site.site_name,
                "status": site.status,
                "linked_project": site.linked_project,
                "installation_stage": getattr(site, "installation_stage", None),
                "current_site_stage": stage,
                "department_lane": _department_lane_for_stage(stage),
                "site_blocked": cint(site.site_blocked),
                "blocker_reason": getattr(site, "blocker_reason", None),
                "current_owner_role": getattr(site, "current_owner_role", None),
                "current_owner_user": getattr(site, "current_owner_user", None),
                "site_progress_pct": flt(getattr(site, "site_progress_pct", None) or getattr(site, "location_progress_pct", None) or 0),
                "milestone_count": milestone_meta.get(site.name, {}).get("count", 0),
                "open_milestone_count": milestone_meta.get(site.name, {}).get("open_count", 0),
                "latest_planned_end_date": milestone_meta.get(site.name, {}).get("latest_planned_end_date"),
                "latest_dpr_date": dpr_meta.get(site.name),
                "modified": str(site.modified) if getattr(site, "modified", None) else None,
        }


def _build_department_lane_breakdown(serialized_sites):
        lane_map = {}
        for department, stages in DEPARTMENT_STAGE_MAP.items():
                visible_sites = [site for site in serialized_sites if (site.get("current_site_stage") or "SURVEY") in stages]
                lane_map[department] = {
                        "department": department,
                        "label": _format_department_label(department),
                        "allowed_stages": list(stages),
                        "site_count": len(visible_sites),
                        "blocked_count": sum(1 for site in visible_sites if cint(site.get("site_blocked"))),
                        "avg_progress_pct": round(
                                (sum(flt(site.get("site_progress_pct") or 0) for site in visible_sites) / len(visible_sites)),
                                2,
                        ) if visible_sites else 0,
                        "stage_coverage": {
                                stage: sum(1 for site in visible_sites if (site.get("current_site_stage") or "SURVEY") == stage)
                                for stage in stages
                        },
                        "sites": visible_sites,
                }
        return lane_map


def _get_project_site_rollup(project):
        site_rows = frappe.get_all(
                "GE Site",
                filters={"linked_project": project},
                fields=[
                        "name", "site_code", "site_name", "status", "linked_project",
                        "installation_stage", "current_site_stage", "site_blocked", "blocker_reason",
                        "current_owner_role", "current_owner_user", "site_progress_pct", "location_progress_pct",
                        "modified",
                ],
                order_by="site_code asc, site_name asc",
        )

        milestone_rows = frappe.get_all(
                "GE Milestone",
                filters={"linked_project": project},
                fields=["linked_site", "status", "planned_end_date"],
        )
        milestone_meta = {}
        for row in milestone_rows:
                linked_site = row.linked_site
                if not linked_site:
                        continue
                bucket = milestone_meta.setdefault(linked_site, {"count": 0, "open_count": 0, "latest_planned_end_date": None})
                bucket["count"] += 1
                if cstr(row.status or "").strip().upper() not in {"COMPLETED", "APPROVED", "CLOSED"}:
                        bucket["open_count"] += 1
                planned_end_date = str(row.planned_end_date) if row.planned_end_date else None
                if planned_end_date and (not bucket["latest_planned_end_date"] or planned_end_date > bucket["latest_planned_end_date"]):
                        bucket["latest_planned_end_date"] = planned_end_date

        dpr_rows = frappe.get_all(
                "GE DPR",
                filters={"linked_project": project},
                fields=["linked_site", "report_date"],
                order_by="report_date desc",
        )
        dpr_meta = {}
        for row in dpr_rows:
                if row.linked_site and row.linked_site not in dpr_meta:
                        dpr_meta[row.linked_site] = str(row.report_date) if row.report_date else None

        serialized_sites = [_serialize_site_row(site, milestone_meta, dpr_meta) for site in site_rows]
        return {
                "sites": serialized_sites,
                "stage_coverage": _site_stage_coverage(site_rows),
                "department_lanes": _build_department_lane_breakdown(serialized_sites),
                "action_queue": _build_action_queue(site_rows, project),
        }


PROJECT_EDITABLE_FIELDS = {
        "project_name",
        "status",
        "customer",
        "company",
        "expected_start_date",
        "expected_end_date",
        "percent_complete",
        "estimated_costing",
        "notes",
        "linked_tender",
        "project_head",
        "project_manager_user",
        "current_project_stage",
        "spine_blocked",
        "blocker_summary",
}


def _serialize_project_record(doc):
        return {
                "name": doc.name,
                "project_name": doc.project_name,
                "status": doc.status,
                "customer": doc.customer,
                "company": doc.company,
                "expected_start_date": str(doc.expected_start_date) if doc.expected_start_date else None,
                "expected_end_date": str(doc.expected_end_date) if doc.expected_end_date else None,
                "percent_complete": doc.percent_complete,
                "estimated_costing": getattr(doc, "estimated_costing", None),
                "notes": doc.notes,
                "linked_tender": getattr(doc, "linked_tender", None),
                "project_head": getattr(doc, "project_head", None),
                "project_manager_user": getattr(doc, "project_manager_user", None),
                "total_sites": getattr(doc, "total_sites", 0),
                "current_project_stage": getattr(doc, "current_project_stage", None),
                "current_stage_status": getattr(doc, "current_stage_status", None),
                "current_stage_owner_department": getattr(doc, "current_stage_owner_department", None),
                "stage_submitted_by": getattr(doc, "stage_submitted_by", None),
                "stage_submitted_at": str(getattr(doc, "stage_submitted_at", None)) if getattr(doc, "stage_submitted_at", None) else None,
                "workflow_last_action": getattr(doc, "workflow_last_action", None),
                "workflow_last_actor": getattr(doc, "workflow_last_actor", None),
                "workflow_last_action_at": str(getattr(doc, "workflow_last_action_at", None)) if getattr(doc, "workflow_last_action_at", None) else None,
                "spine_progress_pct": getattr(doc, "spine_progress_pct", 0),
                "spine_blocked": getattr(doc, "spine_blocked", 0),
                "blocker_summary": getattr(doc, "blocker_summary", None),
                "creation": str(doc.creation) if doc.creation else None,
                "modified": str(doc.modified) if doc.modified else None,
        }


def _normalize_project_payload(data, existing_doc=None):
        values = {key: value for key, value in (data or {}).items() if key in PROJECT_EDITABLE_FIELDS}
        string_fields = [
                "project_name",
                "status",
                "customer",
                "company",
                "notes",
                "linked_tender",
                "project_head",
                "project_manager_user",
                "current_project_stage",
                "blocker_summary",
        ]
        for fieldname in string_fields:
                if fieldname not in values or not isinstance(values[fieldname], str):
                        continue
                cleaned = values[fieldname].strip()
                values[fieldname] = cleaned or None

        if values.get("customer"):
                values["customer"] = _ensure_customer_exists(values["customer"])

        if existing_doc:
                if "project_name" in values:
                        values["project_name"] = _require_param(values.get("project_name"), "project_name")
                if "company" in values and not values.get("company"):
                        values["company"] = existing_doc.company or _get_default_company()
        else:
                values["project_name"] = _require_param(values.get("project_name"), "project_name")
                values["company"] = values.get("company") or _get_default_company()
                if not values.get("company"):
                        frappe.throw("company is required to create a Project")
                values["status"] = values.get("status") or "Open"
                values["expected_start_date"] = values.get("expected_start_date") or frappe.utils.today()
                values["current_project_stage"] = values.get("current_project_stage") or "SURVEY"
                values["current_stage_status"] = "IN_PROGRESS"
                values["spine_blocked"] = cint(values.get("spine_blocked") or 0)
                values["spine_progress_pct"] = 0
                values["total_sites"] = 0

        if "percent_complete" in values and values["percent_complete"] not in (None, ""):
                values["percent_complete"] = float(values["percent_complete"])
        if "estimated_costing" in values and values["estimated_costing"] not in (None, ""):
                values["estimated_costing"] = float(values["estimated_costing"])
        if "spine_blocked" in values:
                values["spine_blocked"] = cint(values["spine_blocked"])
                if not values["spine_blocked"] and "blocker_summary" not in values:
                        values["blocker_summary"] = None
        return values


def _get_project_delete_dependencies(project_name):
        dependencies = []
        link_fields = frappe.get_all(
                "DocField",
                filters={"fieldtype": "Link", "options": "Project"},
                fields=["parent", "fieldname"],
        )
        for field in link_fields:
                if field.parent in {"Project", "DocField", "Custom Field"}:
                        continue
                try:
                        count = frappe.db.count(field.parent, filters={field.fieldname: project_name})
                except Exception:
                        continue
                if count:
                        dependencies.append(
                                {
                                        "doctype": field.parent,
                                        "fieldname": field.fieldname,
                                        "count": count,
                                }
                        )
        return dependencies


@frappe.whitelist()
def get_project(name=None):
        """Return a single editable project record."""
        _require_project_workspace_access()
        name = _require_param(name, "name")
        doc = frappe.get_doc("Project", name)
        return {"success": True, "data": _serialize_project_record(doc)}


@frappe.whitelist()
def create_project(data):
        """Create a Project record with project-spine custom fields."""
        _require_project_workspace_write_access()
        values = _normalize_project_payload(_parse_payload(data))
        doc = frappe.get_doc({"doctype": "Project", **values})
        _sync_project_workflow_fields(doc, reset_submission=True)
        _append_project_workflow_event(doc, "PROJECT_CREATED", doc.current_project_stage, remarks="Project created from workspace")
        doc.insert()
        frappe.db.commit()
        return {"success": True, "data": _serialize_project_record(doc), "message": "Project created"}


@frappe.whitelist()
def update_project(name, data):
        """Update a Project record."""
        _require_project_workspace_write_access()
        name = _require_param(name, "name")
        doc = frappe.get_doc("Project", name)
        previous_stage = getattr(doc, "current_project_stage", None)
        values = _normalize_project_payload(_parse_payload(data), existing_doc=doc)
        doc.update(values)
        if values.get("current_project_stage") and values.get("current_project_stage") != previous_stage:
                _sync_project_workflow_fields(doc, reset_submission=True)
                _append_project_workflow_event(
                        doc,
                        "PROJECT_STAGE_MANUALLY_SET",
                        doc.current_project_stage,
                        remarks=f"Stage manually changed from {previous_stage or 'unset'} to {doc.current_project_stage}",
                        metadata={"previous_stage": previous_stage, "new_stage": doc.current_project_stage},
                )
        else:
                _sync_project_workflow_fields(doc)
        doc.save()
        frappe.db.commit()
        return {"success": True, "data": _serialize_project_record(doc), "message": "Project updated"}


@frappe.whitelist()
def delete_project(name):
        """Delete a Project record after dependency check."""
        _require_project_workspace_delete_access()
        name = _require_param(name, "name")
        dependencies = _get_project_delete_dependencies(name)
        if dependencies:
                summary = ", ".join(f"{row['doctype']} ({row['count']})" for row in dependencies[:5])
                frappe.throw(f"Cannot delete project while linked records still exist: {summary}")
        frappe.delete_doc("Project", name)
        frappe.db.commit()
        return {"success": True, "message": "Project deleted"}


@frappe.whitelist()
def get_project_spine_list(department=None):
        """List projects with optional department-aware filtering."""
        _require_project_workspace_access()
        projects = frappe.get_all(
                "Project",
                fields=[
                        "name", "project_name", "status", "customer",
                        "percent_complete", "expected_start_date", "expected_end_date",
                        "linked_tender", "project_head", "project_manager_user",
                        "total_sites", "current_project_stage", "current_stage_status", "current_stage_owner_department", "spine_progress_pct",
                        "spine_blocked", "blocker_summary",
                ],
                order_by="creation desc",
        )

        if department:
                dept_key = cstr(department).strip().lower().replace(" ", "_")
                allowed_stages = set(DEPARTMENT_STAGE_MAP.get(dept_key, []))
                if allowed_stages:
                        relevant_projects = []
                        for project in projects:
                                project_stage = project.get("current_project_stage") or "SURVEY"
                                if project_stage in allowed_stages:
                                        relevant_projects.append(project)
                                        continue

                                matching_sites = frappe.db.count(
                                        "GE Site",
                                        filters={
                                                "linked_project": project.get("name"),
                                                "current_site_stage": ["in", list(allowed_stages)],
                                        },
                                )
                                if matching_sites:
                                        relevant_projects.append(project)

                        projects = relevant_projects

        return {"success": True, "data": projects}


@frappe.whitelist()
def get_project_spine_summary(project=None):
        """
        Full spine summary for a single project (or all projects).

        Returns 3 layers:
          1. Project summary
          2. Site coverage by stage
          3. Action queue
        """
        _require_project_workspace_access()

        # Layer 1 – Project summary
        if project:
                project = _require_param(project, "project")
                proj = frappe.get_doc("Project", project)
                project_summary = {
                        "name": proj.name,
                        "project_name": proj.project_name,
                        "status": proj.status,
                        "customer": proj.customer,
                        "linked_tender": getattr(proj, "linked_tender", None),
                        "project_head": getattr(proj, "project_head", None),
                        "project_manager": getattr(proj, "project_manager_user", None),
                        "current_project_stage": getattr(proj, "current_project_stage", None),
                        "current_stage_status": getattr(proj, "current_stage_status", None),
                        "current_stage_owner_department": getattr(proj, "current_stage_owner_department", None),
                        "spine_progress_pct": getattr(proj, "spine_progress_pct", 0),
                        "spine_blocked": getattr(proj, "spine_blocked", 0),
                        "blocker_summary": getattr(proj, "blocker_summary", None),
                        "total_sites": getattr(proj, "total_sites", 0),
                        "percent_complete": proj.percent_complete,
                }
        else:
                project_summary = None

        # Fetch sites
        site_filters = {"linked_project": project} if project else {}
        sites = frappe.get_all(
                "GE Site",
                filters=site_filters,
                fields=[
                        "name", "site_code", "site_name", "status",
                        "linked_project", "current_site_stage",
                        "site_blocked", "blocker_reason",
                        "current_owner_role", "current_owner_user",
                        "site_progress_pct", "location_progress_pct",
                ],
        )

        # If no specific project, compute total_sites for project_summary
        if project and project_summary:
                project_summary["total_sites"] = len(sites)

        # Layer 2 – Site coverage by stage
        stage_coverage = _site_stage_coverage(sites)

        # Layer 3 – Action queue
        action_queue = _build_action_queue(sites, project)

        return {
                "success": True,
                "data": {
                        "project_summary": project_summary,
                        "site_count": len(sites),
                        "stage_coverage": stage_coverage,
                        "action_queue": action_queue,
                },
        }


@frappe.whitelist()
def get_project_spine_detail(project=None, department=None):
        """
        Detailed project view centered on site-level execution.

        A project is treated as an aggregation of its sites so each department can
        break the project down only through site/stage reality.
        """
        _require_spine_read_access()
        project = _require_param(project, "project")
        proj = frappe.get_doc("Project", project)
        rollup = _get_project_site_rollup(project)
        team_members = frappe.get_all(
                "GE Project Team Member",
                filters={"linked_project": project},
                fields=["name", "user", "role_in_project", "linked_site", "is_active"],
                order_by="creation asc",
        )
        project_assets = frappe.get_all(
                "GE Project Asset",
                filters={"linked_project": project},
                fields=["name", "asset_name", "asset_type", "status", "linked_site", "assigned_to"],
                order_by="creation desc",
                limit_page_length=50,
        )

        selected_lane = None
        if department:
                department_key = cstr(department).strip().lower().replace(" ", "_")
                selected_lane = rollup["department_lanes"].get(department_key)

        return {
                "success": True,
                "data": {
                        "project_summary": {
                                "name": proj.name,
                                "project_name": proj.project_name,
                                "status": proj.status,
                                "customer": proj.customer,
                                "company": proj.company,
                                "linked_tender": getattr(proj, "linked_tender", None),
                                "project_head": getattr(proj, "project_head", None),
                                "project_manager_user": getattr(proj, "project_manager_user", None),
                                "current_project_stage": getattr(proj, "current_project_stage", None),
                                "current_stage_status": getattr(proj, "current_stage_status", None),
                                "current_stage_owner_department": getattr(proj, "current_stage_owner_department", None),
                                "spine_progress_pct": getattr(proj, "spine_progress_pct", 0),
                                "spine_blocked": cint(getattr(proj, "spine_blocked", 0)),
                                "blocker_summary": getattr(proj, "blocker_summary", None),
                                "total_sites": len(rollup["sites"]),
                                "expected_start_date": str(proj.expected_start_date) if proj.expected_start_date else None,
                                "expected_end_date": str(proj.expected_end_date) if proj.expected_end_date else None,
                        },
                        "site_count": len(rollup["sites"]),
                        "sites": rollup["sites"],
                        "stage_coverage": rollup["stage_coverage"],
                        "department_lanes": rollup["department_lanes"],
                        "selected_department_lane": selected_lane,
                        "action_queue": rollup["action_queue"],
                        "team_members": team_members,
                        "project_assets": project_assets,
                },
        }


@frappe.whitelist()
def get_project_workflow_state(project=None):
        """Return the current workflow state, readiness, and history for a project."""
        _require_project_workspace_access()
        project = _require_param(project, "project")
        doc = frappe.get_doc("Project", project)
        _sync_project_workflow_fields(doc)
        return {"success": True, "data": _serialize_workflow_state(doc)}


@frappe.whitelist()
def submit_project_stage_for_approval(project=None, remarks=None):
        """Submit the current project stage for approval once readiness checks pass."""
        _require_project_workspace_write_access()
        project = _require_param(project, "project")
        doc = frappe.get_doc("Project", project)
        _sync_project_workflow_fields(doc)
        workflow_state = _serialize_workflow_state(doc)

        if not workflow_state["actions"]["can_submit"]:
                frappe.throw("Current stage cannot be submitted by this user right now.")

        doc.current_stage_status = "PENDING_APPROVAL"
        doc.stage_submitted_by = frappe.session.user
        doc.stage_submitted_at = frappe.utils.now()
        _append_project_workflow_event(doc, "STAGE_SUBMITTED", doc.current_project_stage, remarks=remarks)
        doc.save()
        frappe.db.commit()
        return {"success": True, "data": _serialize_workflow_state(doc), "message": "Stage submitted for approval"}


@frappe.whitelist()
def approve_project_stage(project=None, remarks=None):
        """Approve the current stage and advance the project to the next stage."""
        _require_project_workspace_access()
        project = _require_param(project, "project")
        doc = frappe.get_doc("Project", project)
        _sync_project_workflow_fields(doc)
        workflow_state = _serialize_workflow_state(doc)

        if not workflow_state["actions"]["can_approve"]:
                frappe.throw("Current stage cannot be approved by this user right now.")

        current_stage = doc.current_project_stage
        next_stage = get_next_workflow_stage(current_stage)
        if not next_stage:
                _sync_project_workflow_fields(doc, reset_submission=True)
                doc.current_stage_status = "COMPLETED"
                doc.status = "Completed"
                _append_project_workflow_event(doc, "PROJECT_CLOSED", current_stage, remarks=remarks)
        else:
                _append_project_workflow_event(doc, "STAGE_APPROVED", current_stage, remarks=remarks, next_stage=next_stage)
                doc.current_project_stage = next_stage
                _sync_project_workflow_fields(doc, reset_submission=True)
                if next_stage == "CLOSED":
                        doc.current_stage_status = "COMPLETED"
                        doc.status = "Completed"

        doc.save()
        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                _to_stage = next_stage if next_stage else "COMPLETED"
                record_and_log(
                        subject_doctype="Project",
                        subject_name=project,
                        event_type=EventType.APPROVED,
                        linked_project=project,
                        from_status=current_stage,
                        to_status=_to_stage,
                        current_status=_to_stage,
                        approved_by=frappe.session.user,
                        approved_on=now_datetime(),
                        remarks=remarks,
                        current_owner_role=_detect_primary_role(),
                        source_route=f"/projects/{project}",
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: approve_project_stage")

        return {"success": True, "data": _serialize_workflow_state(doc), "message": "Stage approved"}


@frappe.whitelist()
def reject_project_stage(project=None, remarks=None):
        """Reject the current project stage and return it to the owning department."""
        _require_project_workspace_access()
        project = _require_param(project, "project")
        if not (remarks or "").strip():
                frappe.throw("A rejection reason is required. Please provide remarks.")
        doc = frappe.get_doc("Project", project)
        _sync_project_workflow_fields(doc)
        workflow_state = _serialize_workflow_state(doc)

        if not workflow_state["actions"]["can_reject"]:
                frappe.throw("Current stage cannot be rejected by this user right now.")

        current_stage = doc.current_project_stage
        doc.current_stage_status = "REJECTED"
        _append_project_workflow_event(doc, "STAGE_REJECTED", current_stage, remarks=remarks)
        doc.save()
        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                record_and_log(
                        subject_doctype="Project",
                        subject_name=project,
                        event_type=EventType.REJECTED,
                        linked_project=project,
                        from_status=current_stage,
                        to_status="REJECTED",
                        current_status="REJECTED",
                        remarks=remarks,
                        current_owner_role=_detect_primary_role(),
                        source_route=f"/projects/{project}",
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: reject_project_stage")

        return {"success": True, "data": _serialize_workflow_state(doc), "message": "Stage rejected"}


@frappe.whitelist()
def restart_project_stage(project=None, remarks=None):
        """Move a rejected project stage back into active working state."""
        _require_project_workspace_write_access()
        project = _require_param(project, "project")
        doc = frappe.get_doc("Project", project)
        _sync_project_workflow_fields(doc)
        workflow_state = _serialize_workflow_state(doc)

        if not workflow_state["actions"]["can_restart"]:
                frappe.throw("Current stage cannot be restarted by this user right now.")

        doc.current_stage_status = "IN_PROGRESS"
        doc.stage_submitted_by = None
        doc.stage_submitted_at = None
        _append_project_workflow_event(doc, "STAGE_RESTARTED", doc.current_project_stage, remarks=remarks)
        doc.save()
        frappe.db.commit()
        return {"success": True, "data": _serialize_workflow_state(doc), "message": "Stage moved back to in-progress"}


@frappe.whitelist()
def override_project_stage(project=None, new_stage=None, remarks=None):
        """Manual workflow override for users with stage-override capability."""
        _require_project_workspace_access()
        project = _require_param(project, "project")
        new_stage = _require_param(new_stage, "new_stage")
        _require_capability("project.stage.override", project=project, required_mode="override")
        if new_stage not in WORKFLOW_STAGE_KEYS:
                frappe.throw(f"Invalid stage override: {new_stage}")
        if not (remarks or "").strip():
                frappe.throw("A reason is required for stage override. Please provide remarks.")

        doc = frappe.get_doc("Project", project)
        previous_stage = doc.current_project_stage or WORKFLOW_STAGE_KEYS[0]
        doc.current_project_stage = new_stage
        _sync_project_workflow_fields(doc, reset_submission=True)
        _append_project_workflow_event(
                doc,
                "STAGE_OVERRIDDEN",
                previous_stage,
                remarks=remarks,
                next_stage=new_stage,
                metadata={"previous_stage": previous_stage, "new_stage": new_stage},
        )
        if new_stage == "CLOSED":
                doc.current_stage_status = "COMPLETED"
                doc.status = "Completed"
        doc.save()
        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                record_and_log(
                        subject_doctype="Project",
                        subject_name=project,
                        event_type=EventType.OVERRIDDEN,
                        linked_project=project,
                        from_status=previous_stage,
                        to_status=new_stage,
                        current_status=new_stage,
                        remarks=remarks,
                        current_owner_role=_detect_primary_role(),
                        source_route=f"/projects/{project}",
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: override_project_stage")

        return {"success": True, "data": _serialize_workflow_state(doc), "message": "Project stage overridden"}


@frappe.whitelist()
def get_department_spine_view(department=None, project=None):
        """
        Department-filtered spine view.

        Shows only the stages that belong to the given department
        and the sites currently in those stages.
        """
        _require_project_workspace_access()
        department = _require_param(department, "department")
        dept_key = department.lower().replace(" ", "_")
        allowed_stages = DEPARTMENT_STAGE_MAP.get(dept_key, SPINE_STAGES)

        site_filters = {}
        if project:
                site_filters["linked_project"] = project

        all_sites = frappe.get_all(
                "GE Site",
                filters=site_filters,
                fields=[
                        "name", "site_code", "site_name", "status",
                        "linked_project", "current_site_stage",
                        "site_blocked", "blocker_reason",
                        "current_owner_role", "current_owner_user",
                        "site_progress_pct",
                ],
        )

        # Filter to sites in department's stages
        dept_sites = [s for s in all_sites if (s.current_site_stage or "SURVEY") in allowed_stages]

        # Coverage only for department stages
        coverage = {s: 0 for s in allowed_stages}
        for site in dept_sites:
                stage = site.current_site_stage or "SURVEY"
                if stage in coverage:
                        coverage[stage] += 1

        return {
                "success": True,
                "data": {
                        "department": department,
                        "allowed_stages": allowed_stages,
                        "total_sites": len(all_sites),
                        "department_sites": len(dept_sites),
                        "stage_coverage": coverage,
                        "blocked_sites": [
                                {
                                        "site": s.name,
                                        "site_code": s.site_code,
                                        "stage": s.current_site_stage,
                                        "reason": s.blocker_reason,
                                }
                                for s in dept_sites
                                if s.site_blocked
                        ],
                        "sites": [
                                {
                                        "site": s.name,
                                        "site_code": s.site_code,
                                        "site_name": s.site_name,
                                        "stage": s.current_site_stage,
                                        "progress_pct": s.site_progress_pct,
                                        "owner_role": s.current_owner_role,
                                        "owner_user": s.current_owner_user,
                                        "blocked": s.site_blocked,
                                }
                                for s in dept_sites
                        ],
                },
        }


# ╔═══════════════════════════════════════════════════════════════╗
# ║  PROJECT FAVORITES                                           ║
# ╚═══════════════════════════════════════════════════════════════╝

@frappe.whitelist()
def toggle_project_favorite(project=None):
	"""Toggle the current user's favorite status for a project. Returns is_favorite."""
	_require_spine_read_access()
	project = _require_param(project, "project")
	user = frappe.session.user
	existing = frappe.db.exists("GE Project Favorite", {"linked_project": project, "user": user})
	if existing:
		frappe.delete_doc("GE Project Favorite", existing, force=True)
		frappe.db.commit()
		return {"success": True, "data": {"is_favorite": False}, "message": "Removed from favorites"}
	doc = frappe.get_doc({"doctype": "GE Project Favorite", "linked_project": project, "user": user}).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": {"is_favorite": True}, "message": "Added to favorites"}


@frappe.whitelist()
def get_project_favorites():
	"""Return list of project names the current user has favorited."""
	_require_spine_read_access()
	rows = frappe.get_all("GE Project Favorite", filters={"user": frappe.session.user}, fields=["linked_project"], limit_page_length=500)
	return {"success": True, "data": [r.linked_project for r in rows]}


# ╔═══════════════════════════════════════════════════════════════╗
# ║  PROJECT NOTES                                               ║
# ╚═══════════════════════════════════════════════════════════════╝

PROJECT_NOTE_FIELDS = [
	"name", "linked_project", "title", "content", "is_private",
	"owner", "creation", "modified",
]


@frappe.whitelist()
def get_project_notes(project=None):
	"""Return notes for a project. Private notes only visible to their owner."""
	_require_spine_read_access()
	project = _require_param(project, "project")
	user = frappe.session.user
	notes = frappe.get_all(
		"GE Project Note",
		filters={"linked_project": project},
		fields=PROJECT_NOTE_FIELDS,
		order_by="modified desc",
		limit_page_length=200,
	)
	# Filter private notes to only the owner
	visible = [n for n in notes if not n.get("is_private") or n.get("owner") == user]
	return {"success": True, "data": visible}


@frappe.whitelist()
def create_project_note(data):
	"""Create a project note."""
	_require_spine_read_access()
	values = json.loads(data) if isinstance(data, str) else data
	values["doctype"] = "GE Project Note"
	_require_param(values.get("linked_project"), "linked_project")
	_require_param(values.get("title"), "title")
	doc = frappe.get_doc(values).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Note created"}


@frappe.whitelist()
def update_project_note(name, data):
	"""Update a project note. Only the owner can update."""
	_require_spine_read_access()
	doc = frappe.get_doc("GE Project Note", name)
	if doc.owner != frappe.session.user:
		frappe.throw("Only the note creator can edit this note", frappe.PermissionError)
	values = json.loads(data) if isinstance(data, str) else data
	for field in ("title", "content", "is_private"):
		if field in values:
			setattr(doc, field, values[field])
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Note updated"}


@frappe.whitelist()
def delete_project_note(name):
	"""Delete a project note. Only the owner can delete."""
	_require_spine_read_access()
	doc = frappe.get_doc("GE Project Note", name)
	if doc.owner != frappe.session.user:
		frappe.throw("Only the note creator can delete this note", frappe.PermissionError)
	frappe.delete_doc("GE Project Note", name, force=True)
	frappe.db.commit()
	return {"success": True, "message": "Note deleted"}


# ╔═══════════════════════════════════════════════════════════════╗
#   RISE-Ported: Project Tasks (list/kanban, CRUD, subtasks)
# ╚═══════════════════════════════════════════════════════════════╝

@frappe.whitelist()
def get_project_tasks(project=None, status=None, parent_task=None):
	"""List tasks for a project. Supports status/parent filter."""
	_require_spine_read_access()
	if not project:
		frappe.throw("project is required")
	filters = {"linked_project": project}
	if status:
		filters["status"] = status
	if parent_task is not None:
		filters["parent_task"] = parent_task if parent_task else ["in", ["", None]]
	tasks = frappe.get_all(
		"GE Project Task",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site", "title", "status",
			"priority", "assigned_to", "collaborators", "start_date",
			"deadline", "description", "parent_task", "milestone_id",
			"points", "labels", "sort_order", "owner", "creation", "modified"
		],
		order_by="sort_order asc, creation desc",
		ignore_permissions=True,
		limit_page_length=500,
	)
	return tasks


@frappe.whitelist()
def create_project_task(data):
	"""Create a new project task."""
	_require_spine_read_access()
	if isinstance(data, str):
		data = frappe.parse_json(data)
	if not data.get("linked_project") or not data.get("title"):
		frappe.throw("linked_project and title are required")
	doc = frappe.new_doc("GE Project Task")
	for field in ["linked_project", "linked_site", "title", "status", "priority",
	              "assigned_to", "collaborators", "start_date", "deadline",
	              "description", "parent_task", "milestone_id", "points", "labels", "sort_order"]:
		if field in data:
			doc.set(field, data[field])
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return doc.as_dict()


@frappe.whitelist()
def update_project_task(name, data):
	"""Update an existing project task."""
	_require_spine_read_access()
	if isinstance(data, str):
		data = frappe.parse_json(data)
	doc = frappe.get_doc("GE Project Task", name)
	for field in ["title", "status", "priority", "assigned_to", "collaborators",
	              "start_date", "deadline", "description", "parent_task",
	              "milestone_id", "points", "labels", "sort_order", "linked_site"]:
		if field in data:
			doc.set(field, data[field])
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return doc.as_dict()


@frappe.whitelist()
def delete_project_task(name):
	"""Delete a project task and its subtasks."""
	_require_spine_read_access()
	# delete subtasks first
	subtasks = frappe.get_all("GE Project Task", filters={"parent_task": name}, pluck="name", ignore_permissions=True)
	for st in subtasks:
		frappe.delete_doc("GE Project Task", st, force=True, ignore_permissions=True)
	frappe.delete_doc("GE Project Task", name, force=True, ignore_permissions=True)
	frappe.db.commit()
	return {"success": True}


@frappe.whitelist()
def reorder_project_tasks(task_orders):
	"""Bulk-update sort_order for drag-drop reorder."""
	_require_spine_read_access()
	if isinstance(task_orders, str):
		task_orders = frappe.parse_json(task_orders)
	for item in task_orders:
		frappe.db.set_value("GE Project Task", item["name"], "sort_order", item["sort_order"], update_modified=False)
	frappe.db.commit()
	return {"success": True}


@frappe.whitelist()
def update_task_status(name, status):
	"""Quick status update for kanban drag-drop."""
	_require_spine_read_access()
	if status not in ("To Do", "In Progress", "Review", "Done"):
		frappe.throw("Invalid status")
	frappe.db.set_value("GE Project Task", name, "status", status)
	frappe.db.commit()
	return {"success": True, "status": status}


@frappe.whitelist()
def get_task_summary(project=None):
	"""Return task counts by status for a project."""
	_require_spine_read_access()
	if not project:
		frappe.throw("project is required")
	rows = frappe.db.sql("""
		SELECT status, COUNT(*) as cnt, COALESCE(SUM(points),0) as pts
		FROM `tabGE Project Task`
		WHERE linked_project=%s
		GROUP BY status
	""", (project,), as_dict=True)
	summary = {"To Do": {"count": 0, "points": 0}, "In Progress": {"count": 0, "points": 0},
	           "Review": {"count": 0, "points": 0}, "Done": {"count": 0, "points": 0}, "total": 0, "total_points": 0}
	for r in rows:
		summary[r.status] = {"count": r.cnt, "points": int(r.pts)}
		summary["total"] += r.cnt
		summary["total_points"] += int(r.pts)
	return summary


# ╔═══════════════════════════════════════════════════════════════╗
#   RISE-Ported: Project Cloning
# ╚═══════════════════════════════════════════════════════════════╝

@frappe.whitelist()
def clone_project(source_project, new_project_name, copy_tasks=1, copy_milestones=1, copy_notes=1):
	"""Clone a project: optionally copy tasks, milestones, notes."""
	_require_spine_read_access()
	if not source_project or not new_project_name:
		frappe.throw("source_project and new_project_name are required")

	copy_tasks = int(copy_tasks or 0)
	copy_milestones = int(copy_milestones or 0)
	copy_notes = int(copy_notes or 0)

	# Verify source exists
	if not frappe.db.exists("Project", source_project):
		frappe.throw("Source project not found")
	if frappe.db.exists("Project", new_project_name):
		frappe.throw("A project with this name already exists")

	result = {"project": new_project_name, "tasks_copied": 0, "milestones_copied": 0, "notes_copied": 0}

	# Clone tasks with parent-child ID mapping (RISE pattern)
	if copy_tasks:
		old_tasks = frappe.get_all("GE Project Task",
			filters={"linked_project": source_project},
			fields=["*"], ignore_permissions=True, order_by="sort_order asc")
		task_id_map = {}
		for t in old_tasks:
			old_name = t.name
			new_task = frappe.new_doc("GE Project Task")
			for f in ["title", "status", "priority", "assigned_to", "collaborators",
			          "start_date", "deadline", "description", "milestone_id",
			          "points", "labels", "sort_order", "linked_site"]:
				new_task.set(f, t.get(f))
			new_task.linked_project = new_project_name
			new_task.parent_task = ""
			new_task.insert(ignore_permissions=True)
			task_id_map[old_name] = new_task.name
		# Fix parent_task references using ID map
		for t in old_tasks:
			if t.parent_task and t.parent_task in task_id_map:
				frappe.db.set_value("GE Project Task", task_id_map[t.name],
				                    "parent_task", task_id_map[t.parent_task], update_modified=False)
		result["tasks_copied"] = len(task_id_map)

	# Clone notes
	if copy_notes:
		old_notes = frappe.get_all("GE Project Note",
			filters={"linked_project": source_project},
			fields=["title", "content", "is_private"], ignore_permissions=True)
		for n in old_notes:
			new_note = frappe.new_doc("GE Project Note")
			new_note.linked_project = new_project_name
			new_note.title = n.title
			new_note.content = n.content
			new_note.is_private = n.is_private
			new_note.insert(ignore_permissions=True)
		result["notes_copied"] = len(old_notes)

	frappe.db.commit()
	return result


# ╔═══════════════════════════════════════════════════════════════╗
#   RISE-Ported: Timesheet Aggregation
# ╚═══════════════════════════════════════════════════════════════╝

@frappe.whitelist()
def get_project_timesheet_summary(project=None):
	"""Aggregate time data from DPR, manpower, and overtime entries for a project."""
	_require_spine_read_access()
	if not project:
		frappe.throw("project is required")

	summary = {
		"dpr_count": 0,
		"dpr_rows": [],
		"manpower_total_persons": 0,
		"manpower_rows": [],
		"overtime_total_hours": 0,
		"overtime_rows": [],
	}

	# DPR entries
	if frappe.db.exists("DocType", "GE DPR"):
		dprs = frappe.get_all("GE DPR",
			filters={"linked_project": project},
			fields=["name", "linked_site", "report_date", "summary", "manpower_on_site", "equipment_count", "owner", "creation"],
			order_by="report_date desc", limit_page_length=50, ignore_permissions=True)
		summary["dpr_count"] = len(dprs)
		summary["dpr_rows"] = dprs

	# Manpower logs
	if frappe.db.exists("DocType", "GE Manpower Log"):
		manpower = frappe.get_all("GE Manpower Log",
			filters={"linked_project": project},
			fields=["name", "linked_site", "log_date", "num_persons", "trade", "remarks", "owner", "creation"],
			order_by="log_date desc", limit_page_length=50, ignore_permissions=True)
		summary["manpower_rows"] = manpower
		summary["manpower_total_persons"] = sum(int(m.get("num_persons") or 0) for m in manpower)

	# Overtime entries
	if frappe.db.exists("DocType", "GE Overtime Entry"):
		overtime = frappe.get_all("GE Overtime Entry",
			filters={"linked_project": project},
			fields=["name", "linked_site", "entry_date", "hours", "employee_name", "reason", "status", "owner", "creation"],
			order_by="entry_date desc", limit_page_length=50, ignore_permissions=True)
		summary["overtime_rows"] = overtime
		summary["overtime_total_hours"] = sum(float(o.get("hours") or 0) for o in overtime)

	return summary


@frappe.whitelist()
def get_project_activity(project=None, limit=50):
        """
        Aggregate activity feed for a project from Version (audit trail),
        Comment, and linked site changes.
        """
        _require_spine_read_access()
        project = _require_param(project, "project")
        limit = min(int(limit or 50), 200)

        activities = []

        # 1. Version log entries for the Project document itself
        versions = frappe.get_all(
                "Version",
                filters={"ref_doctype": "Project", "docname": project},
                fields=["name", "creation", "owner", "data"],
                order_by="creation desc",
                limit_page_length=limit,
        )
        import json as _json
        for v in versions:
                try:
                        vdata = _json.loads(v.data) if isinstance(v.data, str) else (v.data or {})
                except Exception:
                        vdata = {}
                changed_fields = [c.get("field", "?") for c in (vdata.get("changed", []) or [])]
                activities.append({
                        "type": "version",
                        "ref_doctype": "Project",
                        "ref_name": project,
                        "actor": v.owner,
                        "timestamp": str(v.creation),
                        "summary": f"Updated {', '.join(changed_fields[:5]) or 'record'}" + (" ..." if len(changed_fields) > 5 else ""),
                        "detail": changed_fields,
                })

        # 2. Comments on the Project itself
        comments = frappe.get_all(
                "Comment",
                filters={"reference_doctype": "Project", "reference_name": project,
                          "comment_type": ["in", ["Comment", "Info", "Edit"]]},
                fields=["name", "creation", "comment_by", "comment_type", "content"],
                order_by="creation desc",
                limit_page_length=limit,
        )
        for c in comments:
                activities.append({
                        "type": "comment",
                        "ref_doctype": "Project",
                        "ref_name": project,
                        "actor": c.comment_by,
                        "timestamp": str(c.creation),
                        "summary": (c.content or "")[:200],
                        "comment_type": c.comment_type,
                })

        # 3. Site-level comments (stage changes, etc.)
        sites = frappe.get_all("GE Site", filters={"linked_project": project}, pluck="name")
        if sites:
                site_comments = frappe.get_all(
                        "Comment",
                        filters={"reference_doctype": "GE Site", "reference_name": ["in", sites],
                                  "comment_type": ["in", ["Comment", "Info", "Edit"]]},
                        fields=["name", "creation", "comment_by", "comment_type", "content",
                                "reference_name"],
                        order_by="creation desc",
                        limit_page_length=limit,
                )
                for c in site_comments:
                        activities.append({
                                "type": "site_comment",
                                "ref_doctype": "GE Site",
                                "ref_name": c.reference_name,
                                "actor": c.comment_by,
                                "timestamp": str(c.creation),
                                "summary": (c.content or "")[:200],
                                "comment_type": c.comment_type,
                        })

        # 4. Workflow history from project doc
        try:
                proj_doc = frappe.get_doc("Project", project)
                wf_history = _json.loads(proj_doc.get("workflow_history") or "[]") if hasattr(proj_doc, "workflow_history") else []
                for entry in (wf_history or []):
                        activities.append({
                                "type": "workflow",
                                "ref_doctype": "Project",
                                "ref_name": project,
                                "actor": entry.get("actor", "System"),
                                "timestamp": entry.get("timestamp", ""),
                                "summary": f"{entry.get('action', '?')} stage {entry.get('stage', '?')}" + (f" → {entry.get('next_stage', '')}" if entry.get("next_stage") else ""),
                                "stage": entry.get("stage"),
                                "action": entry.get("action"),
                        })
        except Exception:
                pass

        # Sort all activities by timestamp descending, then limit
        activities.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
        activities = activities[:limit]

        return {"success": True, "data": activities}


@frappe.whitelist()
def get_site_spine_detail(site=None):
        """Full spine detail for a single site."""
        _require_spine_read_access()
        site = _require_param(site, "site")
        doc = frappe.get_doc("GE Site", site)
        data = doc.as_dict()

        # Enrich with milestone progress
        milestones = frappe.get_all(
                "GE Milestone",
                filters={"linked_site": site},
                fields=["name", "milestone_name", "status", "progress_pct", "planned_end_date", "actual_end_date"],
                order_by="creation asc",
        )

        # Enrich with recent DPRs
        dprs = frappe.get_all(
                "GE DPR",
                filters={"linked_site": site},
                fields=["name", "report_date", "manpower_on_site"],
                order_by="report_date desc",
                limit_page_length=10,
        )

        return {
                "success": True,
                "data": {
                        "site": data,
                        "milestones": milestones,
                        "recent_dprs": dprs,
                },
        }


@frappe.whitelist()
def advance_site_stage(site=None, new_stage=None, notes=None):
        """Advance a site to the next spine stage."""
        _require_spine_write_access()
        site = _require_param(site, "site")
        new_stage = _require_param(new_stage, "new_stage")

        if new_stage not in SPINE_STAGES:
                frappe.throw(f"Invalid stage: {new_stage}. Must be one of: {', '.join(SPINE_STAGES)}")

        doc = frappe.get_doc("GE Site", site)
        old_stage = doc.current_site_stage or "SURVEY"

        old_idx = SPINE_STAGES.index(old_stage) if old_stage in SPINE_STAGES else 0
        new_idx = SPINE_STAGES.index(new_stage)
        if new_idx < old_idx:
                frappe.throw(f"Cannot move site backward from {old_stage} to {new_stage}")

        doc.current_site_stage = new_stage

        # Auto-compute site_progress_pct based on stage position
        max_idx = len(SPINE_STAGES) - 1
        doc.site_progress_pct = round((new_idx / max_idx) * 100, 2) if max_idx else 100

        doc.save(ignore_permissions=True)

        # Log the transition as a comment
        frappe.get_doc({
                "doctype": "Comment",
                "comment_type": "Info",
                "reference_doctype": "GE Site",
                "reference_name": site,
                "content": f"Stage advanced: {old_stage} → {new_stage}" + (f" | {notes}" if notes else ""),
        }).insert(ignore_permissions=True)

        # Recompute project-level progress
        _refresh_project_spine(doc.linked_project)

        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                record_and_log(
                        subject_doctype="GE Site",
                        subject_name=site,
                        event_type=EventType.SUBMITTED,
                        linked_project=doc.linked_project,
                        linked_site=site,
                        linked_stage=new_stage,
                        from_status=old_stage,
                        to_status=new_stage,
                        current_status=new_stage,
                        current_owner_user=frappe.session.user,
                        current_owner_role=_detect_primary_role(),
                        remarks=notes or "",
                        source_route=f"/projects/{doc.linked_project}/sites/{site}",
                        reference_doctype="GE Site",
                        reference_name=site,
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: advance_site_stage")

        return {
                "success": True,
                "data": doc.as_dict(),
                "message": f"Site stage advanced to {new_stage}",
        }


@frappe.whitelist()
def toggle_site_blocked(site=None, blocked=None, reason=None):
        """Block or unblock a site."""
        _require_spine_write_access()
        site = _require_param(site, "site")
        blocked = cint(blocked)

        # Reason is mandatory when blocking (BLOCKED event requires it by ledger rules)
        if blocked and not (reason or "").strip():
                frappe.throw("A blocking reason is required when blocking a site.")

        doc = frappe.get_doc("GE Site", site)
        doc.site_blocked = blocked
        doc.blocker_reason = reason if blocked else ""
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        # ── Accountability ledger ─────────────────────────────────────────
        try:
                from gov_erp.accountability import record_and_log, EventType
                event_type = EventType.BLOCKED if blocked else EventType.UNBLOCKED
                record_and_log(
                        subject_doctype="GE Site",
                        subject_name=site,
                        event_type=event_type,
                        linked_project=doc.linked_project,
                        linked_site=site,
                        linked_stage=doc.current_site_stage,
                        is_blocked=bool(blocked),
                        blocking_reason=reason if blocked else None,
                        current_owner_user=frappe.session.user,
                        current_owner_role=_detect_primary_role(),
                        remarks=reason or "",
                        source_route=f"/projects/{doc.linked_project}/sites/{site}",
                        reference_doctype="GE Site",
                        reference_name=site,
                )
        except Exception:
                frappe.log_error(frappe.get_traceback(), "Accountability: toggle_site_blocked")

        return {
                "success": True,
                "data": doc.as_dict(),
                "message": f"Site {'blocked' if blocked else 'unblocked'}",
        }


@frappe.whitelist()
def refresh_project_spine(project=None):
        """Recompute project spine stats (total_sites, spine_progress_pct, current_project_stage)."""
        _require_spine_write_access()
        project = _require_param(project, "project")
        _refresh_project_spine(project)
        frappe.db.commit()
        proj = frappe.get_doc("Project", project)
        return {
                "success": True,
                "data": {
                        "total_sites": getattr(proj, "total_sites", 0),
                        "current_project_stage": getattr(proj, "current_project_stage", None),
                        "spine_progress_pct": getattr(proj, "spine_progress_pct", 0),
                        "spine_blocked": getattr(proj, "spine_blocked", 0),
                },
                "message": "Project spine refreshed",
        }


def _refresh_project_spine(project_name):
        """Internal: recompute spine aggregates on the Project record."""
        if not project_name:
                return
        sites = frappe.get_all(
                "GE Site",
                filters={"linked_project": project_name},
                fields=["current_site_stage", "site_blocked"],
        )
        total = len(sites)
        progress = _compute_project_spine_progress(sites)
        any_blocked = any(s.site_blocked for s in sites)

        # Determine overall project stage = the minimum stage across all sites
        if sites:
                stage_idx = {s: i for i, s in enumerate(SPINE_STAGES)}
                min_idx = min(stage_idx.get(s.current_site_stage or "SURVEY", 0) for s in sites)
                proj_stage = SPINE_STAGES[min_idx]
        else:
                proj_stage = "SURVEY"

        frappe.db.set_value("Project", project_name, {
                "total_sites": total,
                "spine_progress_pct": progress,
                "current_project_stage": proj_stage,
                "spine_blocked": 1 if any_blocked else 0,
        }, update_modified=False)


@frappe.whitelist()
def get_estimates(customer=None, project=None, status=None):
	"""Return estimate records."""
	_require_billing_read_access()
	filters = {}
	if customer:
		filters["customer"] = customer
	if project:
		filters["linked_project"] = project
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Estimate",
		filters=filters,
		fields=[
			"name", "customer", "linked_tender", "linked_project", "estimate_date",
			"valid_until", "status", "version", "subtotal", "gst_amount",
			"tds_amount", "retention_amount", "net_amount", "linked_proforma",
			"creation", "modified",
		],
		order_by="estimate_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_estimate(name=None):
	"""Return a single estimate with lines."""
	_require_billing_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Estimate", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_estimate(data):
	"""Create an estimate."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Estimate", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Estimate created"}


@frappe.whitelist()
def update_estimate(name, data):
	"""Update an estimate."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Estimate", name)
	if doc.status in ("CONVERTED", "CANCELLED"):
		return {"success": False, "message": f"Cannot edit estimate in {doc.status} status"}
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Estimate updated"}


@frappe.whitelist()
def delete_estimate(name):
	"""Delete an estimate."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Estimate", name)
	if doc.status == "CONVERTED":
		return {"success": False, "message": "Cannot delete a converted estimate"}
	frappe.delete_doc("GE Estimate", name)
	frappe.db.commit()
	return {"success": True, "message": "Estimate deleted"}


@frappe.whitelist()
def submit_estimate(name):
	"""Mark estimate as sent."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Estimate", name)
	if doc.status != "DRAFT":
		return {"success": False, "message": f"Estimate must be DRAFT to submit (current: {doc.status})"}
	doc.status = "SENT"
	doc.submitted_by = frappe.session.user
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Estimate sent"}


@frappe.whitelist()
def approve_estimate(name):
	"""Approve an estimate."""
	_require_billing_approval_access()
	doc = frappe.get_doc("GE Estimate", name)
	if doc.status not in ("SENT", "DRAFT"):
		return {"success": False, "message": f"Estimate cannot be approved from {doc.status} state"}
	old_status = doc.status
	doc.status = "APPROVED"
	doc.approved_by = frappe.session.user
	doc.approved_at = frappe.utils.now_datetime()
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Estimate",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status=old_status,
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/estimates" if doc.get("linked_project") else "/estimates",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_estimate")

	return {"success": True, "data": doc.as_dict(), "message": "Estimate approved"}


@frappe.whitelist()
def reject_estimate(name, reason=None):
	"""Reject an estimate."""
	_require_billing_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Estimate", name)
	old_status = doc.status
	doc.status = "REJECTED"
	doc.remarks = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Estimate",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status=old_status,
			to_status="REJECTED",
			current_status="REJECTED",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route=f"/projects/{doc.get('linked_project')}/estimates" if doc.get("linked_project") else "/estimates",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_estimate")

	return {"success": True, "data": doc.as_dict(), "message": "Estimate rejected"}


@frappe.whitelist()
def convert_estimate_to_proforma(name):
	"""Create a proforma invoice from an estimate."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Estimate", name)
	if doc.linked_proforma:
		return {"success": False, "message": f"Estimate already linked to proforma {doc.linked_proforma}"}
	if doc.status not in ("APPROVED", "SENT", "ACCEPTED"):
		return {"success": False, "message": f"Estimate must be approved or sent before conversion (current: {doc.status})"}
	proforma = frappe.get_doc(
		{
			"doctype": "GE Proforma Invoice",
			"customer": doc.customer,
			"linked_estimate": doc.name,
			"linked_project": doc.linked_project,
			"proforma_date": frappe.utils.nowdate(),
			"status": "DRAFT",
			"gst_percent": doc.gst_percent,
			"tds_percent": doc.tds_percent,
			"retention_percent": doc.retention_percent,
			"remarks": doc.remarks,
			"items": [
				{
					"description": item.description,
					"qty": item.qty,
					"rate": item.rate,
					"gst_rate": item.gst_rate,
					"remarks": item.remarks,
					"linked_entity_type": item.linked_entity_type,
					"linked_entity_name": item.linked_entity_name,
				}
				for item in doc.items
			],
		}
	)
	proforma.insert()
	doc.linked_proforma = proforma.name
	doc.status = "CONVERTED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": proforma.as_dict(), "message": "Proforma created from estimate"}


@frappe.whitelist()
def get_estimate_stats(customer=None):
	"""Aggregate estimate stats."""
	_require_billing_read_access()
	filters = {"customer": customer} if customer else {}
	rows = frappe.get_all("GE Estimate", filters=filters, fields=["status", "net_amount"])
	return {"success": True, "data": {"total": len(rows), "draft": sum(1 for row in rows if row.status == "DRAFT"), "sent": sum(1 for row in rows if row.status == "SENT"), "approved": sum(1 for row in rows if row.status == "APPROVED"), "converted": sum(1 for row in rows if row.status == "CONVERTED"), "total_value": sum(row.net_amount or 0 for row in rows)}}


@frappe.whitelist()
def get_proforma_invoices(customer=None, project=None, status=None):
	"""Return proforma invoices."""
	_require_billing_read_access()
	filters = {}
	if customer:
		filters["customer"] = customer
	if project:
		filters["linked_project"] = project
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Proforma Invoice",
		filters=filters,
		fields=[
			"name", "customer", "linked_estimate", "linked_project", "linked_invoice",
			"proforma_date", "due_date", "status", "subtotal", "gst_amount",
			"tds_amount", "retention_amount", "net_amount", "converted_on",
			"creation", "modified",
		],
		order_by="proforma_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_proforma_invoice(name=None):
	"""Return one proforma invoice."""
	_require_billing_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Proforma Invoice", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_proforma_invoice(data):
	"""Create a proforma invoice."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Proforma Invoice", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Proforma invoice created"}


@frappe.whitelist()
def update_proforma_invoice(name, data):
	"""Update a proforma invoice."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Proforma Invoice", name)
	if doc.status == "CONVERTED":
		return {"success": False, "message": "Cannot edit a converted proforma invoice"}
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Proforma invoice updated"}


@frappe.whitelist()
def delete_proforma_invoice(name):
	"""Delete a proforma invoice."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Proforma Invoice", name)
	if doc.status == "CONVERTED":
		return {"success": False, "message": "Cannot delete a converted proforma invoice"}
	frappe.delete_doc("GE Proforma Invoice", name)
	frappe.db.commit()
	return {"success": True, "message": "Proforma invoice deleted"}


@frappe.whitelist()
def submit_proforma_invoice(name):
	"""Mark proforma as sent."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Proforma Invoice", name)
	if doc.status != "DRAFT":
		return {"success": False, "message": f"Proforma must be DRAFT to submit (current: {doc.status})"}
	doc.status = "SENT"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Proforma invoice sent"}


@frappe.whitelist()
def approve_proforma_invoice(name):
	"""Approve a proforma invoice."""
	_require_billing_approval_access()
	doc = frappe.get_doc("GE Proforma Invoice", name)
	if doc.status not in ("DRAFT", "SENT"):
		return {"success": False, "message": f"Proforma cannot be approved from {doc.status} state"}
	doc.status = "APPROVED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Proforma invoice approved"}


@frappe.whitelist()
def cancel_proforma_invoice(name, reason=None):
	"""Cancel a proforma invoice."""
	_require_billing_approval_access()
	doc = frappe.get_doc("GE Proforma Invoice", name)
	if doc.status == "CONVERTED":
		return {"success": False, "message": "Cannot cancel a converted proforma invoice"}
	doc.status = "CANCELLED"
	doc.remarks = reason or doc.remarks
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Proforma invoice cancelled"}


@frappe.whitelist()
def convert_proforma_to_invoice(name):
	"""Create an invoice from a proforma invoice."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Proforma Invoice", name)
	if doc.linked_invoice:
		return {"success": False, "message": f"Proforma already linked to invoice {doc.linked_invoice}"}
	if doc.status not in ("APPROVED", "SENT"):
		return {"success": False, "message": f"Proforma must be approved or sent before conversion (current: {doc.status})"}
	invoice = frappe.get_doc(
		{
			"doctype": "GE Invoice",
			"customer": doc.customer,
			"linked_project": doc.linked_project,
			"invoice_date": frappe.utils.nowdate(),
			"invoice_type": "RA",
			"status": "DRAFT",
			"gst_percent": doc.gst_percent,
			"tds_percent": doc.tds_percent,
			"items": [
				{
					"description": item.description,
					"qty": item.qty,
					"rate": item.rate,
					"gst_rate": item.gst_rate,
					"remarks": item.remarks,
					"linked_entity_type": item.linked_entity_type,
					"linked_entity_name": item.linked_entity_name,
				}
				for item in doc.items
			],
			"remarks": f"Created from proforma {doc.name}",
		}
	)
	invoice.insert()
	doc.linked_invoice = invoice.name
	doc.converted_on = frappe.utils.now_datetime()
	doc.status = "CONVERTED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": invoice.as_dict(), "message": "Invoice created from proforma"}


@frappe.whitelist()
def get_proforma_invoice_stats(customer=None):
	"""Aggregate proforma stats."""
	_require_billing_read_access()
	filters = {"customer": customer} if customer else {}
	rows = frappe.get_all("GE Proforma Invoice", filters=filters, fields=["status", "net_amount"])
	return {"success": True, "data": {"total": len(rows), "draft": sum(1 for row in rows if row.status == "DRAFT"), "sent": sum(1 for row in rows if row.status == "SENT"), "approved": sum(1 for row in rows if row.status == "APPROVED"), "converted": sum(1 for row in rows if row.status == "CONVERTED"), "total_value": sum(row.net_amount or 0 for row in rows)}}


@frappe.whitelist()
def get_payment_follow_ups(customer=None, status=None):
	"""Return payment follow-up records."""
	_require_billing_read_access()
	filters = {}
	if customer:
		filters["customer"] = customer
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Payment Follow Up",
		filters=filters,
		fields=[
			"name", "customer", "linked_invoice", "linked_project", "follow_up_date",
			"follow_up_mode", "status", "contact_person", "summary",
			"promised_payment_date", "promised_payment_amount", "next_follow_up_on",
			"assigned_to", "escalation_level", "creation", "modified",
		],
		order_by="follow_up_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_payment_follow_up(data):
	"""Create a payment follow-up."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	if not values.get("customer") and values.get("linked_invoice"):
		values["customer"] = frappe.db.get_value("GE Invoice", values.get("linked_invoice"), "customer")
	doc = frappe.get_doc({"doctype": "GE Payment Follow Up", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Payment follow-up created"}


@frappe.whitelist()
def update_payment_follow_up(name, data):
	"""Update a payment follow-up."""
	_require_billing_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Payment Follow Up", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Payment follow-up updated"}


@frappe.whitelist()
def delete_payment_follow_up(name):
	"""Delete a payment follow-up."""
	_require_billing_write_access()
	frappe.delete_doc("GE Payment Follow Up", name)
	frappe.db.commit()
	return {"success": True, "message": "Payment follow-up deleted"}


@frappe.whitelist()
def close_payment_follow_up(name, remarks=None):
	"""Close a payment follow-up item."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Payment Follow Up", name)
	doc.status = "CLOSED"
	doc.remarks = remarks or doc.remarks
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Payment follow-up closed"}


@frappe.whitelist()
def escalate_payment_follow_up(name, remarks=None):
	"""Escalate a payment follow-up item."""
	_require_billing_write_access()
	doc = frappe.get_doc("GE Payment Follow Up", name)
	doc.status = "ESCALATED"
	doc.escalation_level = (doc.escalation_level or 0) + 1
	doc.remarks = remarks or doc.remarks
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Payment follow-up escalated"}


@frappe.whitelist()
def get_payment_follow_up_stats(customer=None):
	"""Aggregate follow-up stats."""
	_require_billing_read_access()
	filters = {"customer": customer} if customer else {}
	rows = frappe.get_all("GE Payment Follow Up", filters=filters, fields=["status", "promised_payment_amount"])
	return {"success": True, "data": {"total": len(rows), "open": sum(1 for row in rows if row.status == "OPEN"), "promised": sum(1 for row in rows if row.status == "PROMISED"), "escalated": sum(1 for row in rows if row.status == "ESCALATED"), "closed": sum(1 for row in rows if row.status == "CLOSED"), "promised_amount": sum(row.promised_payment_amount or 0 for row in rows)}}


@frappe.whitelist()
def get_customer_statement(customer=None):
	"""Return a customer statement with running balance."""
	_require_billing_read_access()
	customer = _require_param(customer, "customer")
	invoices = frappe.get_all("GE Invoice", filters={"customer": customer}, fields=["name", "invoice_date", "net_receivable"], order_by="invoice_date asc, creation asc")
	receipts = frappe.get_all("GE Payment Receipt", filters={"customer": customer}, fields=["name", "received_date", "amount_received", "tds_amount"], order_by="received_date asc, creation asc")
	entries = []
	for row in invoices:
		entries.append({"date": row.invoice_date, "type": "INVOICE", "reference": row.name, "debit": row.net_receivable or 0, "credit": 0})
	for row in receipts:
		entries.append({"date": row.received_date, "type": "RECEIPT", "reference": row.name, "debit": 0, "credit": (row.amount_received or 0) + (row.tds_amount or 0)})
	entries.sort(key=lambda row: (row.get("date") or "", row.get("reference") or ""))
	balance = 0
	for row in entries:
		balance += (row.get("debit") or 0) - (row.get("credit") or 0)
		row["balance"] = balance
	return {"success": True, "data": {"customer": customer, "entries": entries, "summary": {"invoice_value": sum(row.net_receivable or 0 for row in invoices), "receipts_total": sum((row.amount_received or 0) + (row.tds_amount or 0) for row in receipts), "closing_balance": balance}}}


@frappe.whitelist()
def get_commercial_comments(customer=None, reference_doctype=None, reference_name=None):
	"""Return commercial record comments with optional customer or record filtering."""
	_require_billing_read_access()
	comment_filters = {"comment_type": ["in", ["Comment", "Info"]]}
	reference_filters = {}
	if reference_doctype:
		comment_filters["reference_doctype"] = reference_doctype
	if reference_name:
		comment_filters["reference_name"] = reference_name
	if customer:
		for doctype, fieldname in (
			("GE Estimate", "customer"),
			("GE Proforma Invoice", "customer"),
			("GE Invoice", "customer"),
			("GE Payment Follow Up", "customer"),
		):
			names = frappe.get_all(doctype, filters={fieldname: customer}, pluck="name")
			if names:
				reference_filters[doctype] = set(names)
	rows = frappe.get_all(
		"Comment",
		filters=comment_filters,
		fields=["name", "reference_doctype", "reference_name", "comment_by", "content", "creation"],
		order_by="creation desc",
		limit=100,
	)
	if customer and reference_filters:
		filtered = []
		for row in rows:
			allowed = reference_filters.get(row.reference_doctype)
			if allowed and row.reference_name in allowed:
				filtered.append(row)
		rows = filtered
	return {"success": True, "data": rows}


@frappe.whitelist()
def add_commercial_comment(reference_doctype, reference_name, content):
	"""Add a transaction-level comment to a commercial record."""
	_require_billing_write_access()
	reference_doctype = _require_param(reference_doctype, "reference_doctype")
	reference_name = _require_param(reference_name, "reference_name")
	content = _require_param(content, "content")
	comment = frappe.get_doc(
		{
			"doctype": "Comment",
			"comment_type": "Comment",
			"reference_doctype": reference_doctype,
			"reference_name": reference_name,
			"content": content,
		}
	)
	comment.insert(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": comment.as_dict(), "message": "Commercial comment added"}


@frappe.whitelist()
def get_commercial_documents(customer=None, reference_doctype=None, reference_name=None):
	"""Return customer-context commercial document exchange records."""
	_require_document_read_access()
	filters = {}
	if customer:
		filters["customer"] = customer
	if reference_doctype:
		filters["reference_doctype"] = reference_doctype
	if reference_name:
		filters["reference_name"] = reference_name
	rows = frappe.get_all(
		"GE Commercial Document",
		filters=filters,
		fields=["name", "customer", "reference_doctype", "reference_name", "document_name", "category", "file_url", "shared_by", "shared_on", "remarks"],
		order_by="creation desc",
	)
	return {"success": True, "data": rows}


@frappe.whitelist()
def create_commercial_document(data):
	"""Create a customer-context commercial document exchange record."""
	_require_document_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	values["shared_by"] = frappe.session.user
	values["shared_on"] = frappe.utils.now_datetime()
	doc = frappe.get_doc({"doctype": "GE Commercial Document", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Commercial document shared"}


@frappe.whitelist()
def get_receivable_aging():
	"""Return customer-wise receivable aging buckets."""
	_require_billing_read_access()
	today = frappe.utils.getdate(frappe.utils.nowdate())
	rows = frappe.get_all("GE Invoice", filters={"status": ["in", ["SUBMITTED", "APPROVED"]]}, fields=["customer", "net_receivable", "invoice_date"])
	grouped = {}
	for row in rows:
		customer = row.customer or "Unassigned"
		grouped.setdefault(customer, {"customer": customer, "bucket_0_30": 0, "bucket_31_60": 0, "bucket_61_90": 0, "bucket_90_plus": 0, "total": 0})
		age_days = (today - frappe.utils.getdate(row.invoice_date or frappe.utils.nowdate())).days
		amount = row.net_receivable or 0
		grouped[customer]["total"] += amount
		if age_days <= 30:
			grouped[customer]["bucket_0_30"] += amount
		elif age_days <= 60:
			grouped[customer]["bucket_31_60"] += amount
		elif age_days <= 90:
			grouped[customer]["bucket_61_90"] += amount
		else:
			grouped[customer]["bucket_90_plus"] += amount
	return {"success": True, "data": list(grouped.values())}


@frappe.whitelist()
def seed_bookkeeping_demo():
	"""Seed a small bookkeeping demo chain if one does not already exist."""
	_require_billing_write_access()
	customer_name = "DEMO CUSTOMER - COMMERCIAL"
	project_name = None
	projects = frappe.get_all("Project", fields=["name"], limit=1)
	if projects:
		project_name = projects[0].name

	customer = frappe.db.exists("GE Party", customer_name)
	if not customer:
		customer_doc = frappe.get_doc(
			{
				"doctype": "GE Party",
				"party_name": customer_name,
				"party_type": "CLIENT",
				"active": 1,
				"city": "Demo City",
				"state": "Demo State",
			}
		)
		customer_doc.insert()
		customer = customer_doc.name

	estimate_name = frappe.db.exists("GE Estimate", {"customer": customer, "remarks": ["like", "%bookkeeping demo%"]})
	if not estimate_name:
		estimate = frappe.get_doc(
			{
				"doctype": "GE Estimate",
				"customer": customer,
				"linked_project": project_name,
				"estimate_date": frappe.utils.nowdate(),
				"valid_until": frappe.utils.add_days(frappe.utils.nowdate(), 15),
				"status": "APPROVED",
				"gst_percent": 18,
				"remarks": "bookkeeping demo estimate",
				"items": [{"description": "Demo surveillance supply", "qty": 1, "rate": 100000}],
			}
		)
		estimate.insert()
		estimate_name = estimate.name

	proforma_name = frappe.db.exists("GE Proforma Invoice", {"linked_estimate": estimate_name})
	if not proforma_name:
		proforma = frappe.get_doc(
			{
				"doctype": "GE Proforma Invoice",
				"customer": customer,
				"linked_estimate": estimate_name,
				"linked_project": project_name,
				"proforma_date": frappe.utils.nowdate(),
				"due_date": frappe.utils.add_days(frappe.utils.nowdate(), 10),
				"status": "APPROVED",
				"gst_percent": 18,
				"remarks": "bookkeeping demo proforma",
				"items": [{"description": "Demo surveillance supply", "qty": 1, "rate": 100000}],
			}
		)
		proforma.insert()
		proforma_name = proforma.name

	invoice_name = frappe.db.exists("GE Invoice", {"customer": customer, "remarks": ["like", "%bookkeeping demo%"]})
	if not invoice_name and project_name:
		invoice = frappe.get_doc(
			{
				"doctype": "GE Invoice",
				"customer": customer,
				"linked_project": project_name,
				"invoice_date": frappe.utils.nowdate(),
				"invoice_type": "RA",
				"status": "APPROVED",
				"gst_percent": 18,
				"remarks": "bookkeeping demo invoice",
				"items": [{"description": "Demo surveillance supply", "qty": 1, "rate": 100000}],
			}
		)
		invoice.insert()
		invoice_name = invoice.name

	if invoice_name and not frappe.db.exists("GE Payment Receipt", {"linked_invoice": invoice_name, "remarks": ["like", "%bookkeeping demo%"]}):
		frappe.get_doc(
			{
				"doctype": "GE Payment Receipt",
				"customer": customer,
				"linked_invoice": invoice_name,
				"linked_project": project_name,
				"received_date": frappe.utils.nowdate(),
				"amount_received": 50000,
				"tds_amount": 5000,
				"payment_mode": "BANK_TRANSFER",
				"remarks": "bookkeeping demo receipt",
			}
		).insert()

	if invoice_name and not frappe.db.exists("GE Payment Follow Up", {"linked_invoice": invoice_name, "summary": ["like", "%bookkeeping demo%"]}):
		frappe.get_doc(
			{
				"doctype": "GE Payment Follow Up",
				"customer": customer,
				"linked_invoice": invoice_name,
				"linked_project": project_name,
				"follow_up_date": frappe.utils.nowdate(),
				"follow_up_mode": "CALL",
				"status": "OPEN",
				"summary": "bookkeeping demo follow-up",
				"next_follow_up_on": frappe.utils.add_days(frappe.utils.nowdate(), 3),
			}
		).insert()

	frappe.db.commit()
	return {"success": True, "message": "Bookkeeping demo data seeded", "data": {"customer": customer, "estimate": estimate_name, "proforma": proforma_name, "invoice": invoice_name, "project": project_name}}
# ============================================================================
# ALERTS API
# ============================================================================

@frappe.whitelist()
def get_alerts(unread_only=False, project=None, limit=50):
        """Get alerts for the current user."""
        _require_authenticated_user()
        from gov_erp.gov_erp.doctype.ge_alert.ge_alert import get_user_alerts

        alerts = get_user_alerts(
                unread_only=cint(unread_only),
                project=project,
                limit=cint(limit) or 50,
        )
        return {"success": True, "data": alerts}


@frappe.whitelist()
def get_unread_alert_count():
        """Get unread alert count for the current user."""
        _require_authenticated_user()
        from gov_erp.gov_erp.doctype.ge_alert.ge_alert import get_unread_count

        count = get_unread_count()
        return {"success": True, "data": {"count": count}}


@frappe.whitelist(methods=["POST"])
def mark_alert_as_read(alert_name=None):
        """Mark a single alert as read."""
        _require_authenticated_user()
        _require_param(alert_name, "alert_name")
        from gov_erp.gov_erp.doctype.ge_alert.ge_alert import mark_alert_read

        mark_alert_read(alert_name)
        frappe.db.commit()
        return {"success": True, "message": "Alert marked as read"}


@frappe.whitelist(methods=["POST"])
def mark_all_alerts_read():
        """Mark all alerts as read for the current user."""
        _require_authenticated_user()
        from gov_erp.gov_erp.doctype.ge_alert.ge_alert import mark_all_read

        mark_all_read()
        frappe.db.commit()
        return {"success": True, "message": "All alerts marked as read"}


# ============================================================================
# REMINDERS API
# ============================================================================

@frappe.whitelist(methods=["POST"])
def create_user_reminder(
        title=None,
        reminder_datetime=None,
        repeat_rule=None,
        linked_project=None,
        linked_site=None,
        linked_stage=None,
        linked_department=None,
        reference_doctype=None,
        reference_name=None,
        notes=None,
        shared_with=None,
):
        """Create a new reminder for the current user."""
        _require_authenticated_user()
        _require_param(title, "title")
        _require_param(reminder_datetime, "reminder_datetime")

        from gov_erp.gov_erp.doctype.ge_user_reminder.ge_user_reminder import create_reminder

        name = create_reminder(
                title=title,
                reminder_datetime=reminder_datetime,
                repeat_rule=repeat_rule,
                linked_project=linked_project,
                linked_site=linked_site,
                linked_stage=linked_stage,
                linked_department=linked_department,
                reference_doctype=reference_doctype,
                reference_name=reference_name,
                notes=notes,
                shared_with=shared_with,
        )
        frappe.db.commit()
        return {"success": True, "data": {"name": name}, "message": "Reminder created"}


@frappe.whitelist()
def get_reminders(project=None, active_only=1, limit=50):
        """Get reminders for the current user."""
        _require_authenticated_user()
        from gov_erp.gov_erp.doctype.ge_user_reminder.ge_user_reminder import get_user_reminders

        reminders = get_user_reminders(
                project=project,
                active_only=cint(active_only),
                limit=cint(limit) or 50,
        )
        return {"success": True, "data": reminders}


@frappe.whitelist(methods=["POST"])
def update_reminder(
        reminder_name=None,
        title=None,
        reminder_datetime=None,
        repeat_rule=None,
        linked_project=None,
        linked_site=None,
        linked_stage=None,
        linked_department=None,
        reference_doctype=None,
        reference_name=None,
        notes=None,
):
        """Update an existing reminder."""
        _require_authenticated_user()
        _require_param(reminder_name, "reminder_name")

        doc = frappe.get_doc("GE User Reminder", reminder_name)
        if doc.user != frappe.session.user and "System Manager" not in frappe.get_roles():
                frappe.throw("You can only modify your own reminders", frappe.PermissionError)

        if title is not None:
                doc.title = title
        if reminder_datetime is not None:
                doc.reminder_datetime = reminder_datetime
        if repeat_rule is not None:
                doc.repeat_rule = repeat_rule
        if linked_project is not None:
                doc.linked_project = linked_project
        if linked_site is not None:
                doc.linked_site = linked_site
        if linked_stage is not None:
                doc.linked_stage = linked_stage
        if linked_department is not None:
                doc.linked_department = linked_department
        if reference_doctype is not None:
                doc.reference_doctype = reference_doctype
        if reference_name is not None:
                doc.reference_name = reference_name
        if notes is not None:
                doc.notes = notes

        doc.save()
        frappe.db.commit()
        return {"success": True, "data": {"name": doc.name}, "message": "Reminder updated"}


@frappe.whitelist(methods=["POST"])
def snooze_reminder(reminder_name=None, minutes=15):
        """Snooze a reminder by N minutes."""
        _require_authenticated_user()
        _require_param(reminder_name, "reminder_name")

        doc = frappe.get_doc("GE User Reminder", reminder_name)
        if doc.user != frappe.session.user and "System Manager" not in frappe.get_roles():
                frappe.throw("You can only modify your own reminders", frappe.PermissionError)

        doc.snooze(cint(minutes) or 15)
        frappe.db.commit()
        return {"success": True, "message": f"Reminder snoozed for {minutes} minutes"}


@frappe.whitelist(methods=["POST"])
def dismiss_reminder(reminder_name=None):
        """Dismiss a reminder."""
        _require_authenticated_user()
        _require_param(reminder_name, "reminder_name")

        doc = frappe.get_doc("GE User Reminder", reminder_name)
        if doc.user != frappe.session.user and "System Manager" not in frappe.get_roles():
                frappe.throw("You can only modify your own reminders", frappe.PermissionError)

        doc.dismiss()
        frappe.db.commit()
        return {"success": True, "message": "Reminder dismissed"}


@frappe.whitelist(methods=["POST"])
def delete_reminder(reminder_name=None):
        """Delete a reminder."""
        _require_authenticated_user()
        _require_param(reminder_name, "reminder_name")

        doc = frappe.get_doc("GE User Reminder", reminder_name)
        if doc.user != frappe.session.user and "System Manager" not in frappe.get_roles():
                frappe.throw("You can only delete your own reminders", frappe.PermissionError)

        doc.delete()
        frappe.db.commit()
        return {"success": True, "message": "Reminder deleted"}


@frappe.whitelist()
def count_missed_reminders():
        """Return count of past-due active/snoozed reminders for the current user.

        A reminder is "missed" when next_reminder_at is in the past,
        status is Active or Snoozed, and is_sent = 0.
        Also counts reminders shared with the current user that are past-due.
        """
        _require_authenticated_user()
        from frappe.utils import now_datetime

        user = frappe.session.user
        now = now_datetime()

        own_count = frappe.db.count(
                "GE User Reminder",
                filters={
                        "user": user,
                        "status": ["in", ["Active", "Snoozed"]],
                        "is_sent": 0,
                        "next_reminder_at": ["<=", now],
                },
        )
        shared_count = frappe.db.count(
                "GE User Reminder",
                filters={
                        "shared_with": user,
                        "status": ["in", ["Active", "Snoozed"]],
                        "is_sent": 0,
                        "next_reminder_at": ["<=", now],
                },
        )
        total = (own_count or 0) + (shared_count or 0)
        return {"success": True, "data": {"count": total}}




@frappe.whitelist(methods=["POST"])
def add_record_comment(
        reference_doctype=None,
        reference_name=None,
        content=None,
        comment_type="Comment",
):
        """Add a comment to a record (project, site, milestone, etc.)."""
        _require_authenticated_user()
        _require_param(reference_doctype, "reference_doctype")
        _require_param(reference_name, "reference_name")
        _require_param(content, "content")

        # Verify the user can see the referenced document
        if not frappe.has_permission(reference_doctype, "read", reference_name):
                frappe.throw("You do not have permission to comment on this record", frappe.PermissionError)

        comment = frappe.get_doc({
                "doctype": "Comment",
                "comment_type": comment_type,
                "reference_doctype": reference_doctype,
                "reference_name": reference_name,
                "content": content,
                "comment_email": frappe.session.user,
        })
        comment.insert(ignore_permissions=True)
        frappe.db.commit()

        # Handle @mentions in the comment content
        _process_mentions(content, reference_doctype, reference_name)

        # Push realtime update
        frappe.publish_realtime(
                event="ge_new_comment",
                message={
                        "reference_doctype": reference_doctype,
                        "reference_name": reference_name,
                        "comment_name": comment.name,
                        "comment_by": frappe.session.user,
                },
                doctype=reference_doctype,
                docname=reference_name,
        )

        return {
                "success": True,
                "data": {
                        "name": comment.name,
                        "content": comment.content,
                        "comment_by": comment.comment_email,
                        "creation": str(comment.creation),
                },
        }


@frappe.whitelist()
def get_record_comments(reference_doctype=None, reference_name=None, limit=50):
        """Get comments for a record."""
        _require_authenticated_user()
        _require_param(reference_doctype, "reference_doctype")
        _require_param(reference_name, "reference_name")

        if not frappe.has_permission(reference_doctype, "read", reference_name):
                frappe.throw("You do not have permission to view this record", frappe.PermissionError)

        comments = frappe.get_all(
                "Comment",
                filters={
                        "reference_doctype": reference_doctype,
                        "reference_name": reference_name,
                        "comment_type": "Comment",
                },
                fields=[
                        "name",
                        "content",
                        "comment_email",
                        "comment_by",
                        "creation",
                        "modified",
                ],
                order_by="creation asc",
                limit_page_length=cint(limit) or 50,
        )

        # Enrich with user full names
        for c in comments:
                c["full_name"] = frappe.db.get_value(
                        "User", c.comment_email, "full_name"
                ) or c.comment_email

        return {"success": True, "data": comments}


@frappe.whitelist(methods=["POST"])
def assign_to_record(
        reference_doctype=None,
        reference_name=None,
        assign_to_user=None,
        description=None,
        priority="Medium",
        date=None,
):
        """Assign a user to a record (creates a ToDo)."""
        _require_authenticated_user()
        _require_param(reference_doctype, "reference_doctype")
        _require_param(reference_name, "reference_name")
        _require_param(assign_to_user, "assign_to_user")

        if not frappe.has_permission(reference_doctype, "read", reference_name):
                frappe.throw("You do not have permission to assign on this record", frappe.PermissionError)

        from frappe.desk.form.assign_to import add as assign_add

        result = assign_add({
                "doctype": reference_doctype,
                "name": reference_name,
                "assign_to": [assign_to_user],
                "description": description or f"Assigned by {frappe.session.user}",
                "priority": priority,
                "date": date,
        })

        frappe.db.commit()

        # Emit alert for the assignee
        from gov_erp.alert_dispatcher import emit_alert

        # Try to get project context from the record
        project = None
        if reference_doctype == "Project":
                project = reference_name
        else:
                project = frappe.db.get_value(
                        reference_doctype, reference_name, "linked_project"
                ) if frappe.get_meta(reference_doctype).has_field("linked_project") else None

        emit_alert(
                "approval_assigned",
                f"You have been assigned to {reference_doctype} {reference_name}",
                project=project,
                reference_doctype=reference_doctype,
                reference_name=reference_name,
                extra_recipients=[assign_to_user],
        )

        return {"success": True, "message": f"Assigned to {assign_to_user}"}


@frappe.whitelist()
def get_record_assignments(reference_doctype=None, reference_name=None):
        """Get current assignments (ToDos) for a record."""
        _require_authenticated_user()
        _require_param(reference_doctype, "reference_doctype")
        _require_param(reference_name, "reference_name")

        if not frappe.has_permission(reference_doctype, "read", reference_name):
                frappe.throw("You do not have permission to view this record", frappe.PermissionError)

        todos = frappe.get_all(
                "ToDo",
                filters={
                        "reference_type": reference_doctype,
                        "reference_name": reference_name,
                        "status": ["!=", "Cancelled"],
                },
                fields=[
                        "name",
                        "allocated_to",
                        "description",
                        "priority",
                        "date",
                        "status",
                        "creation",
                ],
                order_by="creation desc",
        )

        for t in todos:
                t["full_name"] = frappe.db.get_value(
                        "User", t.allocated_to, "full_name"
                ) or t.allocated_to

        return {"success": True, "data": todos}


def _process_mentions(content: str, reference_doctype: str, reference_name: str):
        """Parse @mentions from comment content and send alerts."""
        import re

        # Match @user@example.com or @FirstName LastName patterns
        mention_pattern = re.compile(r'@([\w.+-]+@[\w.-]+\.\w+)')
        mentions = mention_pattern.findall(content)

        if not mentions:
                return

        from gov_erp.alert_dispatcher import on_mention

        # Try to determine the project context
        project = None
        if reference_doctype == "Project":
                project = reference_name
        else:
                meta = frappe.get_meta(reference_doctype)
                if meta.has_field("linked_project"):
                        project = frappe.db.get_value(reference_doctype, reference_name, "linked_project")

        actor_name = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user

        for email in mentions:
                if frappe.db.exists("User", email):
                        on_mention(
                                mentioned_user=email,
                                summary=f"{actor_name} mentioned you in {reference_doctype} {reference_name}",
                                project=project,
                                reference_doctype=reference_doctype,
                                reference_name=reference_name,
                        )


# ─── ANDA Import Framework ───────────────────────────────────────────────────

_ANDA_IMPORTER_MAP = {
	"project_overview": "gov_erp.importers.anda.project_overview.ProjectOverviewImporter",
	"milestones_phases": "gov_erp.importers.anda.milestones_phases.MilestonesPhasesImporter",
	"location_survey": "gov_erp.importers.anda.location_survey.LocationSurveyImporter",
	"procurement_tracker": "gov_erp.importers.anda.procurement_tracker.ProcurementTrackerImporter",
	"issue_log": "gov_erp.importers.anda.issue_log.IssueLogImporter",
	"client_payment_milestones": "gov_erp.importers.anda.client_payment_milestones.ClientPaymentMilestonesImporter",
	"material_issuance_consumption": "gov_erp.importers.anda.material_issuance_consumption.MaterialIssuanceImporter",
	"project_communications": "gov_erp.importers.anda.project_communications.ProjectCommunicationsImporter",
	"rma_tracker": "gov_erp.importers.anda.rma_tracker.RMATrackerImporter",
	"project_assets_services": "gov_erp.importers.anda.project_assets_services.ProjectAssetsServicesImporter",
	"petty_cash": "gov_erp.importers.anda.petty_cash.PettyCashImporter",
	"device_uptime": "gov_erp.importers.anda.device_uptime.DeviceUptimeImporter",
	"project_manpower_assignment": "gov_erp.importers.anda.project_manpower_assignment.ProjectManpowerAssignmentImporter",
}


def _require_import_access():
	"""Only System Manager and Director can run ANDA imports."""
	roles = frappe.get_roles(frappe.session.user)
	if "System Manager" not in roles and "Director" not in roles:
		frappe.throw("Import access denied", frappe.PermissionError)


@frappe.whitelist()
def run_anda_import(tab_name, rows, mode="dry_run"):
	"""Run an ANDA tab importer.

	Args:
		tab_name: key from _ANDA_IMPORTER_MAP (e.g. "project_overview")
		rows: JSON array of dicts (one per row from the sheet)
		mode: "dry_run" | "stage_only" | "commit"

	Returns:
		dict with summary, accepted, rejected, duplicate, skipped counts
	"""
	_require_import_access()

	if tab_name not in _ANDA_IMPORTER_MAP:
		frappe.throw(f"Unknown tab: {tab_name}. Valid: {', '.join(sorted(_ANDA_IMPORTER_MAP.keys()))}")

	if isinstance(rows, str):
		rows = json.loads(rows)

	from gov_erp.importers.anda.base import ImportMode
	mode_enum = ImportMode[mode.upper()]

	# Dynamic import of the importer class
	module_path, class_name = _ANDA_IMPORTER_MAP[tab_name].rsplit(".", 1)
	module = frappe.get_module(module_path)
	importer_cls = getattr(module, class_name)

	importer = importer_cls()
	report = importer.run(rows, mode_enum)

	return report.as_dict()


@frappe.whitelist()
def get_anda_import_logs(tab_name=None, limit=20):
	"""Return recent ANDA import audit logs."""
	_require_import_access()

	filters = {}
	if tab_name:
		filters["tab_name"] = tab_name

	logs = frappe.get_all(
		"GE Import Log",
		filters=filters,
		fields=[
			"name", "tab_name", "import_mode",
			"total_rows", "accepted_rows", "rejected_rows",
			"duplicate_rows", "skipped_rows", "unresolved_count",
			"started_at", "finished_at",
		],
		order_by="started_at desc",
		limit_page_length=cint(limit) or 20,
	)
	return logs


@frappe.whitelist()
def get_anda_import_tabs():
	"""Return the list of available ANDA import tab names."""
	_require_import_access()
	return sorted(_ANDA_IMPORTER_MAP.keys())


# ─── Phase 3: Master Data Loading ────────────────────────────────────────────

@frappe.whitelist()
def load_anda_masters(departments=None, designations=None, projects=None, sites=None, vendors=None):
	"""Load master data in dependency order (Phase 3).

	All arguments are optional JSON arrays.  If omitted, canonical ANDA
	defaults are used for departments and designations.

	Returns:
		dict with per-step create/existing counts and any errors.
	"""
	_require_import_access()

	if isinstance(departments, str):
		departments = json.loads(departments)
	if isinstance(designations, str):
		designations = json.loads(designations)
	if isinstance(projects, str):
		projects = json.loads(projects)
	if isinstance(sites, str):
		sites = json.loads(sites)
	if isinstance(vendors, str):
		vendors = json.loads(vendors)

	from gov_erp.importers.anda.master_loaders import load_all_masters
	report = load_all_masters(
		departments=departments,
		designations=designations,
		projects=projects,
		sites=sites,
		vendors=vendors,
	)
	return report.as_dict()


@frappe.whitelist()
def check_anda_master_integrity():
	"""Check reference integrity of master data (Phase 3).

	Returns:
		dict with master counts and readiness flags.
	"""
	_require_import_access()

	from gov_erp.importers.anda.master_loaders import check_reference_integrity
	return check_reference_integrity()


# ─── Phase 4: Orchestrated Transactional Import ──────────────────────────────

@frappe.whitelist()
def run_anda_orchestrated_import(tab_data, mode="dry_run", include_complex=False, tabs=None, skip_master_check=False):
	"""Run imports across multiple tabs in dependency order (Phase 4).

	Args:
		tab_data: JSON object mapping tab_key → list of row dicts.
			Example: {"milestones_phases": [...], "location_survey": [...]}
		mode: "dry_run" | "stage_only" | "commit"
		include_complex: if true, also run complex/noisy tabs
		tabs: optional JSON array of specific tab_keys to run
		skip_master_check: if true, skip master data readiness check

	Returns:
		OrchestratorReport dict with per-tab results and totals.
	"""
	_require_import_access()

	if isinstance(tab_data, str):
		tab_data = json.loads(tab_data)
	if isinstance(tabs, str):
		tabs = json.loads(tabs)

	from gov_erp.importers.anda.orchestrator import run_orchestrated_import
	report = run_orchestrated_import(
		tab_data=tab_data,
		mode=mode,
		include_complex=include_complex,
		tabs=tabs,
		skip_master_check=skip_master_check,
	)
	return report.as_dict()


@frappe.whitelist()
def get_anda_import_order(include_complex=False):
	"""Return the recommended tab import order (Phase 4).

	Returns:
		list of {tab_key, label, risk_level} in dependency order.
	"""
	_require_import_access()

	from gov_erp.importers.anda.orchestrator import get_import_order
	return get_import_order(include_complex=include_complex)


# ─── PM Cockpit Summary ──────────────────────────────────────

@frappe.whitelist()
def get_pm_cockpit_summary(project=None, stages=None):
	"""Aggregated PM cockpit summary with DPRs, commissioning, and dependencies.

	Returns:
		- dpr_summary: recent DPRs, stats, manpower trends
		- commissioning_summary: checklists, test reports, signoffs
		- dependency_summary: blocking issues, overrides
		- document_expiry: docs expiring soon
		- signal_summary: alerts and reminders in project context
		- action_items: prioritized next actions
	"""
	_require_execution_read_access()
	project = _require_param(project, "project")
	stage_scope = [cstr(stage).strip().upper() for stage in _parse_json_list(stages) if cstr(stage).strip()]

	from datetime import datetime, timedelta
	today = frappe.utils.today()
	week_ago = (datetime.strptime(today, "%Y-%m-%d") - timedelta(days=7)).strftime("%Y-%m-%d")
	month_ahead = (datetime.strptime(today, "%Y-%m-%d") + timedelta(days=30)).strftime("%Y-%m-%d")
	week_ahead = (datetime.strptime(today, "%Y-%m-%d") + timedelta(days=7)).strftime("%Y-%m-%d")

	site_filters = {"linked_project": project}
	if stage_scope:
		site_filters["current_site_stage"] = ["in", stage_scope]

	scoped_sites = frappe.get_all(
		"GE Site",
		filters=site_filters,
		fields=["name", "site_blocked", "blocker_reason", "current_site_stage"],
		order_by="modified desc",
		limit_page_length=500,
	)
	scoped_site_names = {row.name for row in scoped_sites}

	def _is_in_scope(row, site_field="linked_site", stage_field=None):
		if not stage_scope:
			return True

		row_site = cstr(row.get(site_field) if hasattr(row, "get") else getattr(row, site_field, None) or "").strip()
		row_stage = ""
		if stage_field:
			row_stage = cstr(row.get(stage_field) if hasattr(row, "get") else getattr(row, stage_field, None) or "").strip().upper()

		if row_site:
			return row_site in scoped_site_names
		if row_stage:
			return row_stage in stage_scope
		return True

	# DPR Summary
	all_dprs = frappe.get_all(
		"GE DPR",
		filters={"linked_project": project},
		fields=["name", "linked_site", "report_date", "manpower_on_site", "equipment_count", "summary", "creation"],
		order_by="report_date desc",
		limit_page_length=500,
	)
	dprs = [row for row in all_dprs if _is_in_scope(row, site_field="linked_site")][:10]
	if stage_scope:
		dpr_total = len([row for row in all_dprs if _is_in_scope(row, site_field="linked_site")])
		dpr_this_week = len([
			row
			for row in all_dprs
			if _is_in_scope(row, site_field="linked_site")
			and row.report_date
			and str(row.report_date) >= week_ago
		])
		dpr_manpower_total = sum(cint(row.manpower_on_site) for row in all_dprs if _is_in_scope(row, site_field="linked_site"))
	else:
		dpr_total = frappe.db.count("GE DPR", {"linked_project": project})
		dpr_this_week = frappe.db.count("GE DPR", {"linked_project": project, "report_date": [">=", week_ago]})
		dpr_manpower_total = frappe.db.sql(
			"SELECT SUM(manpower_on_site) FROM `tabGE DPR` WHERE linked_project = %s",
			(project,),
		)[0][0] or 0

	# Commissioning Summary
	all_checklists = frappe.get_all(
		"GE Commissioning Checklist",
		filters={"linked_project": project},
		fields=["name", "checklist_name", "linked_site", "status", "commissioned_date", "template_type"],
		order_by="creation desc",
		limit_page_length=500,
	)
	checklists = [row for row in all_checklists if _is_in_scope(row, site_field="linked_site")][:10]
	checklist_by_status = {}
	for c in [row for row in all_checklists if _is_in_scope(row, site_field="linked_site")]:
		s = c.status or "Draft"
		checklist_by_status[s] = checklist_by_status.get(s, 0) + 1

	all_test_reports = frappe.get_all(
		"GE Test Report",
		filters={"linked_project": project},
		fields=["name", "report_name", "test_type", "linked_site", "status", "test_date"],
		order_by="creation desc",
		limit_page_length=500,
	)
	test_reports = [row for row in all_test_reports if _is_in_scope(row, site_field="linked_site")][:10]
	test_by_status = {}
	for t in [row for row in all_test_reports if _is_in_scope(row, site_field="linked_site")]:
		s = t.status or "Draft"
		test_by_status[s] = test_by_status.get(s, 0) + 1

	all_signoffs = frappe.get_all(
		"GE Client Signoff",
		filters={"linked_project": project},
		fields=["name", "signoff_type", "linked_site", "status", "signoff_date", "signed_by_client"],
		order_by="creation desc",
		limit_page_length=500,
	)
	signoffs = [row for row in all_signoffs if _is_in_scope(row, site_field="linked_site")][:10]
	signoff_by_status = {}
	for s in [row for row in all_signoffs if _is_in_scope(row, site_field="linked_site")]:
		st = s.status or "Draft"
		signoff_by_status[st] = signoff_by_status.get(st, 0) + 1

	# Dependency Summary (via scoped sites)
	blocked_sites = [s for s in scoped_sites if s.site_blocked]
	# GE Site currently stores only blocked/not-blocked, not blocker severity.
	# Treat blocked sites as hard blockers in the PM cockpit until severity is modeled explicitly.
	hard_blocked = list(blocked_sites)
	soft_blocked = []

	project_rule_filters = {"linked_project": project}
	if stage_scope and scoped_site_names:
		project_rule_filters["linked_site"] = ["in", list(scoped_site_names)]
	project_rules = frappe.get_all(
		"GE Dependency Rule",
		filters=project_rule_filters,
		fields=["name", "linked_site"],
		limit_page_length=500,
	)
	project_rule_names = {row.name for row in project_rules}
	project_site_rule_names = {row.name for row in project_rules if row.linked_site}

	overrides = frappe.get_all(
		"GE Dependency Override",
		filters={"status": ["in", ["REQUESTED", "APPROVED"]]},
		fields=["name", "linked_task", "dependency_rule", "status", "requested_by", "creation"],
		limit_page_length=500,
	)
	project_overrides = []
	for row in overrides:
		if row.dependency_rule in project_rule_names:
			project_overrides.append(row)
		elif stage_scope and not scoped_site_names and row.dependency_rule in project_site_rule_names:
			project_overrides.append(row)

	# Document Expiry
	all_docs = frappe.get_all(
		"GE Project Document",
		filters=[["linked_project", "=", project], ["expiry_date", "is", "set"]],
		fields=["name", "document_name", "linked_site", "expiry_date", "category"],
		order_by="expiry_date asc",
		limit_page_length=500,
	)
	scoped_docs = [row for row in all_docs if _is_in_scope(row, site_field="linked_site")]
	expiring_docs = [
		row for row in scoped_docs
		if row.expiry_date and today <= str(row.expiry_date) <= month_ahead
	][:10]
	expired_docs = [row for row in scoped_docs if row.expiry_date and str(row.expiry_date) < today][:10]

	# Milestones
	all_milestones = frappe.get_all(
		"GE Milestone",
		filters={"linked_project": project},
		fields=["name", "milestone_name", "linked_site", "status", "planned_date", "actual_date"],
		limit_page_length=500,
	)
	milestones = [row for row in all_milestones if _is_in_scope(row, site_field="linked_site")]
	milestone_by_status = {}
	for m in milestones:
		s = m.status or "PLANNED"
		milestone_by_status[s] = milestone_by_status.get(s, 0) + 1
	overdue_milestones = [
		m for m in milestones
		if (m.status or "PLANNED") not in ("COMPLETED", "CANCELLED")
		and m.planned_date
		and str(m.planned_date) < today
	]

	# Alerts and reminders in project context
	from gov_erp.gov_erp.doctype.ge_alert.ge_alert import get_user_alerts
	from gov_erp.gov_erp.doctype.ge_user_reminder.ge_user_reminder import get_user_reminders

	project_alerts = [
		row for row in get_user_alerts(project=project, limit=20)
		if _is_in_scope(row, site_field="linked_site", stage_field="linked_stage")
	]
	project_reminders = [
		row for row in get_user_reminders(project=project, active_only=1, limit=20)
		if _is_in_scope(row, site_field="linked_site", stage_field="linked_stage")
	]
	unread_alerts = [row for row in project_alerts if not cint(row.get("is_read"))]
	due_reminders = [
		row for row in project_reminders
		if row.get("next_reminder_at") and str(row.get("next_reminder_at"))[:10] <= week_ahead
	]

	# Action Items (prioritized)
	action_items = []
	for s in hard_blocked[:3]:
		action_items.append({
			"type": "blocker",
			"priority": "high",
			"title": f"Hard block on {s.name}",
			"detail": s.blocker_reason or "No reason specified",
			"ref_doctype": "GE Site",
			"ref_name": s.name,
		})
	for d in expired_docs[:3]:
		action_items.append({
			"type": "document",
			"priority": "high",
			"title": f"Expired: {d.document_name}",
			"detail": f"Expired on {d.expiry_date}",
			"ref_doctype": "GE Project Document",
			"ref_name": d.name,
		})
	for m in overdue_milestones[:3]:
		action_items.append({
			"type": "milestone",
			"priority": "medium",
			"title": f"Overdue: {m.milestone_name}",
			"detail": f"Due {m.planned_date}",
			"ref_doctype": "GE Milestone",
			"ref_name": m.name,
		})
	for r in due_reminders[:2]:
		reminder_dt = cstr(r.get("next_reminder_at") or r.get("reminder_datetime") or "")
		action_items.append({
			"type": "reminder",
			"priority": "medium",
			"title": cstr(r.get("title") or "Reminder"),
			"detail": f"Due {reminder_dt[:16] or 'soon'}",
			"ref_doctype": cstr(r.get("reference_doctype") or ""),
			"ref_name": cstr(r.get("reference_name") or r.get("name") or ""),
		})
	for a in unread_alerts[:2]:
		action_items.append({
			"type": "alert",
			"priority": "medium",
			"title": cstr(a.get("summary") or "Project alert"),
			"detail": cstr(a.get("detail") or a.get("event_type") or ""),
			"ref_doctype": cstr(a.get("reference_doctype") or ""),
			"ref_name": cstr(a.get("reference_name") or a.get("name") or ""),
		})

	return {
		"success": True,
		"data": {
			"dpr_summary": {
				"recent": dprs,
				"total_count": dpr_total,
				"this_week_count": dpr_this_week,
				"total_manpower": dpr_manpower_total,
			},
			"commissioning_summary": {
				"checklists": checklists[:10],
				"checklist_by_status": checklist_by_status,
				"test_reports": test_reports[:10],
				"test_by_status": test_by_status,
				"signoffs": signoffs[:10],
				"signoff_by_status": signoff_by_status,
			},
			"dependency_summary": {
				"blocked_sites": len(blocked_sites),
				"hard_blocked": len(hard_blocked),
				"soft_blocked": len(soft_blocked),
				"blocked_details": blocked_sites[:10],
				"pending_overrides": [o for o in project_overrides if o.status == "REQUESTED"],
			},
			"document_expiry": {
				"expiring_soon": expiring_docs,
				"expired": expired_docs,
				"expiring_count": len(expiring_docs),
				"expired_count": len(expired_docs),
			},
			"signal_summary": {
				"unread_alerts_count": len(unread_alerts),
				"recent_alerts": project_alerts[:5],
				"active_reminders_count": len(project_reminders),
				"due_reminders_count": len(due_reminders),
				"reminders": project_reminders[:5],
			},
			"milestones_summary": {
				"by_status": milestone_by_status,
				"overdue": overdue_milestones[:10],
				"overdue_count": len(overdue_milestones),
				"total": len(milestones),
			},
			"action_items": action_items,
		},
	}


# ─────────────────────────────────────────────────────────────
# Execution Summary (Phase 2 - Unified Execution Dashboard)
# ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_execution_summary(project=None):
	"""
	Returns a unified execution/commissioning summary for the execution dashboard.
	Shows site-level commissioning readiness, blockers, and aggregated KPIs.
	"""
	filters = {}
	if project:
		filters["linked_project"] = project

	# ─── Sites Summary ───
	sites = frappe.get_all(
		"GE Site",
		filters=filters or None,
		fields=["name", "site_code", "site_name", "linked_project", "status"],
		limit_page_length=500,
	)
	site_names = [s.name for s in sites]
	site_by_status = {}
	for s in sites:
		st = s.status or "Unknown"
		site_by_status[st] = site_by_status.get(st, 0) + 1

	# ─── DPR Stats ───
	dpr_filters = {}
	if project:
		dpr_filters["linked_project"] = project
	if site_names:
		dpr_filters["linked_site"] = ["in", site_names]
	dprs = frappe.get_all(
		"GE DPR",
		filters=dpr_filters or None,
		fields=["name", "linked_project", "linked_site", "report_date", "summary", "manpower_on_site", "equipment_count"],
		order_by="report_date desc",
		limit_page_length=100,
	)
	dpr_count = len(dprs)
	manpower_total = sum(cint(d.manpower_on_site or 0) for d in dprs)
	equipment_total = sum(cint(d.equipment_count or 0) for d in dprs)

	# ─── Commissioning Checklists ───
	cl_filters = {}
	if project:
		cl_filters["linked_project"] = project
	if site_names:
		cl_filters["linked_site"] = ["in", site_names]
	checklists = frappe.get_all(
		"GE Commissioning Checklist",
		filters=cl_filters or None,
		fields=["name", "linked_project", "linked_site", "checklist_name", "status", "commissioned_by", "commissioned_date"],
		limit_page_length=500,
	)
	checklist_counts = _get_commissioning_checklist_item_counts([c.name for c in checklists])
	# Per-site completion
	checklist_by_site = {}
	for c in checklists:
		site = c.linked_site or "Unassigned"
		if site not in checklist_by_site:
			checklist_by_site[site] = {"total": 0, "done": 0, "count": 0}
		counts = checklist_counts.get(c.name, {"total_items": 0, "done_items": 0})
		checklist_by_site[site]["total"] += cint(counts["total_items"] or 0)
		checklist_by_site[site]["done"] += cint(counts["done_items"] or 0)
		checklist_by_site[site]["count"] += 1
	checklist_by_status = {}
	for c in checklists:
		st = c.status or "Not Started"
		checklist_by_status[st] = checklist_by_status.get(st, 0) + 1

	# ─── Test Reports ───
	tr_filters = {}
	if project:
		tr_filters["linked_project"] = project
	if site_names:
		tr_filters["linked_site"] = ["in", site_names]
	test_reports = frappe.get_all(
		"GE Test Report",
		filters=tr_filters or None,
		fields=["name", "linked_project", "linked_site", "test_type", "test_date", "status", "tested_by"],
		order_by="test_date desc",
		limit_page_length=200,
	)
	test_by_status = {}
	for t in test_reports:
		st = t.status or "Draft"
		test_by_status[st] = test_by_status.get(st, 0) + 1
	test_by_site = {}
	for t in test_reports:
		site = t.linked_site or "Unassigned"
		if site not in test_by_site:
			test_by_site[site] = {"total": 0, "approved": 0}
		test_by_site[site]["total"] += 1
		if t.status == "Approved":
			test_by_site[site]["approved"] += 1

	# ─── Client Signoffs ───
	so_filters = {}
	if project:
		so_filters["linked_project"] = project
	if site_names:
		so_filters["linked_site"] = ["in", site_names]
	signoffs = frappe.get_all(
		"GE Client Signoff",
		filters=so_filters or None,
		fields=["name", "linked_project", "linked_site", "signoff_type", "signoff_date", "signed_by_client", "status"],
		order_by="signoff_date desc",
		limit_page_length=200,
	)
	signoff_by_status = {}
	for s in signoffs:
		st = s.status or "Pending"
		signoff_by_status[st] = signoff_by_status.get(st, 0) + 1
	signoff_by_site = {}
	for s in signoffs:
		site = s.linked_site or "Unassigned"
		if site not in signoff_by_site:
			signoff_by_site[site] = {"total": 0, "signed": 0}
		signoff_by_site[site]["total"] += 1
		if s.status in ("Signed", "Approved"):
			signoff_by_site[site]["signed"] += 1

	# ─── Dependency Blockers ───
	blocked_sites = []
	for s in sites:
		# Check rules vs overrides
		rules = frappe.get_all(
			"GE Dependency Rule",
			filters={"linked_site": s.name, "active": 1, "hard_block": 1},
			fields=["name", "linked_task", "prerequisite_reference_name", "block_message"],
			limit_page_length=20,
		)
		rule_names = [r.name for r in rules]
		approved_overrides = frappe.get_all(
			"GE Dependency Override",
			filters={"dependency_rule": ["in", rule_names], "status": "APPROVED"},
			pluck="dependency_rule",
		) if rule_names else []
		active_blocks = [
			{
				"name": r.name,
				"prerequisite_task": r.prerequisite_reference_name or r.linked_task,
				"block_message": r.block_message,
			}
			for r in rules
			if r.name not in approved_overrides
		]
		if active_blocks:
			blocked_sites.append({
				"site": s.name,
				"site_name": s.site_name,
				"project": s.linked_project,
				"block_count": len(active_blocks),
				"blocks": active_blocks[:3],
			})

	# ─── Sites Readiness Summary ───
	readiness_data = []
	for s in sites:
		site_name = s.name
		cl_data = checklist_by_site.get(site_name, {"total": 0, "done": 0, "count": 0})
		tr_data = test_by_site.get(site_name, {"total": 0, "approved": 0})
		so_data = signoff_by_site.get(site_name, {"total": 0, "signed": 0})

		checklist_pct = round(cl_data["done"] / cl_data["total"] * 100) if cl_data["total"] else 0
		test_pct = round(tr_data["approved"] / tr_data["total"] * 100) if tr_data["total"] else 0
		signoff_pct = round(so_data["signed"] / so_data["total"] * 100) if so_data["total"] else 0

		is_blocked = any(b["site"] == site_name for b in blocked_sites)

		readiness_data.append({
			"site": site_name,
			"site_code": s.site_code,
			"site_name": s.site_name,
			"project": s.linked_project,
			"status": s.status,
			"checklist_pct": checklist_pct,
			"checklist_count": cl_data["count"],
			"test_pct": test_pct,
			"test_count": tr_data["total"],
			"signoff_pct": signoff_pct,
			"signoff_count": so_data["total"],
			"is_blocked": is_blocked,
			"overall_readiness": round((checklist_pct + test_pct + signoff_pct) / 3) if (cl_data["total"] or tr_data["total"] or so_data["total"]) else 0,
		})

	# Sort by overall readiness descending (most ready first)
	readiness_data.sort(key=lambda x: (-x["overall_readiness"], x["site"]))

	# ─── Action Items ───
	action_items = []

	# Pending signoffs
	pending_signoffs = [s for s in signoffs if s.status == "Pending"][:5]
	for s in pending_signoffs:
		action_items.append({
			"type": "signoff",
			"priority": "high",
			"title": f"Client signoff pending: {s.signoff_type or 'Signoff'}",
			"detail": f"{s.signed_by_client or 'Client signatory pending'} at {s.linked_site or 'site'}",
			"ref_doctype": "GE Client Signoff",
			"ref_name": s.name,
		})

	# Submitted test reports needing approval
	submitted_tests = [t for t in test_reports if t.status == "Submitted"][:5]
	for t in submitted_tests:
		action_items.append({
			"type": "test_report",
			"priority": "medium",
			"title": f"{t.test_type or 'Test'} report awaiting approval",
			"detail": f"Site: {t.linked_site or '-'}, Date: {t.test_date or '-'}",
			"ref_doctype": "GE Test Report",
			"ref_name": t.name,
		})

	# Blocked sites
	for b in blocked_sites[:3]:
		action_items.append({
			"type": "blocker",
			"priority": "high",
			"title": f"Site blocked: {b['site_name'] or b['site']}",
			"detail": f"{b['block_count']} active block(s)",
			"ref_doctype": "GE Site",
			"ref_name": b["site"],
		})

	# Incomplete checklists
	incomplete_checklists = [c for c in checklists if c.status == "In Progress"][:3]
	for c in incomplete_checklists:
		counts = checklist_counts.get(c.name, {"total_items": 0, "done_items": 0})
		done = cint(counts["done_items"] or 0)
		total = max(cint(counts["total_items"] or 0), 1)
		action_items.append({
			"type": "checklist",
			"priority": "medium",
			"title": f"Checklist in progress: {c.checklist_name or c.name}",
			"detail": f"{done}/{total} items done ({round(done/total*100)}%)",
			"ref_doctype": "GE Commissioning Checklist",
			"ref_name": c.name,
		})

	return {
		"success": True,
		"data": {
			"sites_summary": {
				"total": len(sites),
				"by_status": site_by_status,
				"blocked_count": len(blocked_sites),
				"ready_for_commissioning": len([r for r in readiness_data if r["overall_readiness"] >= 80 and not r["is_blocked"]]),
			},
			"dpr_summary": {
				"total_reports": dpr_count,
				"total_manpower": manpower_total,
				"total_equipment": equipment_total,
				"recent": dprs[:10],
			},
			"commissioning_summary": {
				"checklists_total": len(checklists),
				"checklists_by_status": checklist_by_status,
				"test_reports_total": len(test_reports),
				"test_by_status": test_by_status,
				"signoffs_total": len(signoffs),
				"signoff_by_status": signoff_by_status,
			},
			"blocked_sites": blocked_sites,
			"site_readiness": readiness_data,
			"action_items": action_items,
		},
	}


def _get_commissioning_checklist_item_counts(checklist_names):
	"""Return per-checklist total and completed item counts."""
	names = [cstr(name).strip() for name in checklist_names if cstr(name).strip()]
	if not names:
		return {}

	rows = frappe.db.sql(
		"""
		select
			parent,
			count(*) as total_items,
			sum(case when ifnull(is_completed, 0) = 1 then 1 else 0 end) as done_items
		from `tabGE Commissioning Checklist Item`
		where parenttype = 'GE Commissioning Checklist'
		  and parent in %(parents)s
		group by parent
		""",
		{"parents": tuple(names)},
		as_dict=True,
	)
	counts = {
		row.parent: {
			"total_items": cint(row.total_items or 0),
			"done_items": cint(row.done_items or 0),
		}
		for row in rows
	}
	for name in names:
		counts.setdefault(name, {"total_items": 0, "done_items": 0})
	return counts


# ─────────────────────────────────────────────────────────────
# Unified Notifications Center (Phase 3 - Alerts/Reminders/Collaboration)
# ─────────────────────────────────────────────────────────────

def _is_mention_alert(alert_row):
	"""Return true when an alert row represents an @mention event."""
	event_type = cstr((alert_row or {}).get("event_type") or "").strip().lower()
	return event_type in {"mention", "user_mentioned"}


def _get_mention_alerts(project=None, limit=20):
	"""Return mention-shaped rows backed by the GE Alert stream."""
	from gov_erp.gov_erp.doctype.ge_alert.ge_alert import get_user_alerts

	raw_alerts = get_user_alerts(project=project, limit=max(cint(limit) * 4, 20))
	mentions = []
	for row in raw_alerts:
		if not _is_mention_alert(row):
			continue
		mentions.append(
			{
				"name": row.get("name"),
				"mentioned_user": frappe.session.user,
				"mentioned_by": row.get("actor_name") or row.get("actor") or "Unknown",
				"reference_doctype": row.get("reference_doctype"),
				"reference_name": row.get("reference_name"),
				"context_summary": row.get("detail") or row.get("summary") or "",
				"is_read": cint(row.get("is_read")),
				"creation": row.get("creation"),
				"linked_project": row.get("linked_project"),
				"route_path": row.get("route_path"),
			}
		)
		if len(mentions) >= (cint(limit) or 20):
			break
	return mentions


@frappe.whitelist()
def get_notification_center():
	"""
	Returns a unified view of alerts, reminders, mentions, and due items.
	Used by the notification center page to show all actionable items.
	"""
	_require_authenticated_user()
	from datetime import date, timedelta

	today = str(date.today())
	week_ahead = str(date.today() + timedelta(days=7))
	user = frappe.session.user

	# ─── Alerts ───
	from gov_erp.gov_erp.doctype.ge_alert.ge_alert import get_user_alerts

	all_alerts = get_user_alerts(unread_only=0, limit=30)
	mentions = _get_mention_alerts(limit=30)
	mention_names = {row.get("name") for row in mentions}
	alerts = [row for row in all_alerts if row.get("name") not in mention_names]
	unread_alert_count = len([row for row in alerts if not cint(row.get("is_read"))])

	# ─── Reminders ───
	from gov_erp.gov_erp.doctype.ge_user_reminder.ge_user_reminder import get_user_reminders

	all_reminders = get_user_reminders(active_only=0, limit=50)
	active_reminders = [r for r in all_reminders if r.get("status") == "Active"]
	due_reminders = [
		r for r in active_reminders
		if r.get("next_reminder_at") and str(r.get("next_reminder_at"))[:10] <= week_ahead
	]
	overdue_reminders = [
		r for r in active_reminders
		if r.get("next_reminder_at") and str(r.get("next_reminder_at"))[:10] < today
	]

	unread_mentions = [m for m in mentions if not cint(m.is_read)]

	# ─── Document Expiry (high-value reminders) ───
	expiring_docs = frappe.get_all(
		"GE Project Document",
		filters=[
			["expiry_date", "is", "set"],
			["expiry_date", ">=", today],
			["expiry_date", "<=", week_ahead],
		],
		fields=["name", "document_name", "linked_project", "expiry_date", "category"],
		order_by="expiry_date asc",
		limit_page_length=20,
	)
	expired_docs = frappe.get_all(
		"GE Project Document",
		filters=[
			["expiry_date", "is", "set"],
			["expiry_date", "<", today],
		],
		fields=["name", "document_name", "linked_project", "expiry_date", "category"],
		order_by="expiry_date desc",
		limit_page_length=20,
	)

	# ─── Tender Deadlines ───
	upcoming_tenders = frappe.get_all(
		"GE Tender",
		filters=[
			["submission_date", "is", "set"],
			["submission_date", ">=", today],
			["submission_date", "<=", week_ahead],
			["status", "not in", ["SUBMITTED", "WON", "LOST", "CANCELLED", "DROPPED", "CONVERTED_TO_PROJECT"]],
		],
		fields=["name", "title", "tender_number", "submission_date", "status"],
		order_by="submission_date asc",
		limit_page_length=10,
	)

	# ─── Overdue Milestones ───
	overdue_milestones = frappe.get_all(
		"GE Milestone",
		filters=[
			["status", "not in", ["COMPLETED", "CANCELLED"]],
			["planned_date", "<", today],
		],
		fields=["name", "milestone_name", "linked_project", "linked_site", "planned_date", "status"],
		order_by="planned_date asc",
		limit_page_length=15,
	)

	# ─── Pending Approvals ───
	try:
		pending_approvals = get_pending_approvals().get("data", [])
	except Exception:
		pending_approvals = []

	# ─── Unified Feed (sorted by time) ───
	feed = []

	for a in alerts[:15]:
		feed.append({
			"type": "alert",
			"subtype": a.get("event_type") or "general",
			"title": a.get("summary") or "Notification",
			"detail": a.get("detail") or "",
			"ref_doctype": a.get("reference_doctype"),
			"ref_name": a.get("reference_name"),
			"route": a.get("route_path"),
			"project": a.get("linked_project"),
			"is_read": cint(a.get("is_read")),
			"timestamp": a.get("creation"),
			"source_name": a.get("name"),
		})

	for r in due_reminders[:10]:
		feed.append({
			"type": "reminder",
			"subtype": "due",
			"title": r.get("title") or "Reminder",
			"detail": f"Due: {str(r.get('next_reminder_at') or '')[:16]}",
			"ref_doctype": r.get("reference_doctype"),
			"ref_name": r.get("reference_name"),
			"route": None,
			"project": r.get("linked_project"),
			"is_read": 0,
			"timestamp": r.get("next_reminder_at") or r.get("creation"),
			"source_name": r.get("name"),
		})

	for m in unread_mentions[:10]:
		feed.append({
			"type": "mention",
			"subtype": "mention",
			"title": f"Mentioned by {m.mentioned_by}",
			"detail": m.context_summary or "",
			"ref_doctype": m.reference_doctype,
			"ref_name": m.reference_name,
			"route": m.get("route_path") or None,
			"project": m.get("linked_project"),
			"is_read": 0,
			"timestamp": m.creation,
			"source_name": m.name,
		})

	for d in expiring_docs[:5]:
		feed.append({
			"type": "document",
			"subtype": "expiring",
			"title": f"Document expiring: {d.document_name}",
			"detail": f"Expires {d.expiry_date}",
			"ref_doctype": "GE Project Document",
			"ref_name": d.name,
			"route": None,
			"project": d.linked_project,
			"is_read": 0,
			"timestamp": str(d.expiry_date),
			"source_name": d.name,
		})

	for t in upcoming_tenders[:5]:
		feed.append({
			"type": "tender",
			"subtype": "deadline",
			"title": f"Tender deadline: {t.title or t.tender_number}",
			"detail": f"Due {t.submission_date}",
			"ref_doctype": "GE Tender",
			"ref_name": t.name,
			"route": f"/pre-sales/{t.name}",
			"project": None,
			"is_read": 0,
			"timestamp": str(t.submission_date),
			"source_name": t.name,
		})

	for p in pending_approvals[:5]:
		feed.append({
			"type": "approval",
			"subtype": p.get("type") or "approval",
			"title": f"Pending approval: {p.get('approval_for') or p.get('type') or 'Review'}",
			"detail": p.get("action_hint") or f"Requested by {p.get('requester') or 'system'}",
			"ref_doctype": "GE Tender" if p.get("type") == "Tender Approval" and p.get("tender_id") not in (None, "") else None,
			"ref_name": p.get("tender_id") if p.get("type") == "Tender Approval" else None,
			"route": f"/pre-sales/{p.get('tender_id')}" if p.get("type") == "Tender Approval" and p.get("tender_id") not in (None, "", "-") else "/approvals",
			"project": None,
			"is_read": 0,
			"timestamp": p.get("request_date"),
			"source_name": p.get("id"),
		})

	# Sort feed by timestamp descending
	feed.sort(key=lambda x: x["timestamp"] or "", reverse=True)

	return {
		"success": True,
		"data": {
			"summary": {
				"unread_alerts": unread_alert_count,
				"active_reminders": len(active_reminders),
				"due_reminders": len(due_reminders),
				"overdue_reminders": len(overdue_reminders),
				"unread_mentions": len(unread_mentions),
				"expiring_documents": len(expiring_docs),
				"expired_documents": len(expired_docs),
				"tender_deadlines": len(upcoming_tenders),
				"overdue_milestones": len(overdue_milestones),
				"pending_approvals": len(pending_approvals),
			},
			"alerts": alerts,
			"reminders": all_reminders,
			"mentions": mentions,
			"expiring_documents": expiring_docs,
			"expired_documents": expired_docs,
			"upcoming_tenders": upcoming_tenders,
			"overdue_milestones": overdue_milestones,
			"pending_approvals": pending_approvals,
			"feed": feed[:30],
		},
	}


@frappe.whitelist(methods=["POST"])
def mark_mention_read(mention_name=None):
	"""Mark a mention as read."""
	_require_authenticated_user()
	_require_param(mention_name, "mention_name")

	from gov_erp.gov_erp.doctype.ge_alert.ge_alert import mark_alert_read

	mark_alert_read(mention_name)
	frappe.db.commit()
	return {"success": True, "message": "Mention marked as read"}


@frappe.whitelist()
def get_user_mentions(project=None, limit=20):
	"""Get mentions for the current user, optionally filtered by project."""
	_require_authenticated_user()
	mentions = _get_mention_alerts(project=project, limit=limit)
	return {"success": True, "data": mentions}


# ═══════════════════════════════════════════════════════════
# PM Workspace – Project Issues (Phase 1)
# ═══════════════════════════════════════════════════════════

@frappe.whitelist()
def get_project_issues(project=None, site=None, status=None, severity=None):
	"""Return project issues / blockers for PM workspace."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	if severity:
		filters["severity"] = severity
	data = _list_generic_docs(
		"GE Project Issue",
		filters,
		["name", "title", "linked_project", "linked_site", "severity", "status",
		 "category", "assigned_to", "raised_by", "description", "resolution_notes",
		 "target_date", "resolved_date", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_project_issue(name=None):
	"""Return a single project issue."""
	_require_execution_read_access()
	name = _require_param(name, "name")
	return {"success": True, "data": frappe.get_doc("GE Project Issue", name).as_dict()}


@frappe.whitelist()
def create_project_issue(data):
	"""Create a project issue / blocker."""
	_require_execution_write_access()
	values = _parse_payload(data)
	values.setdefault("status", "Open")
	values.setdefault("severity", "Medium")
	values.setdefault("raised_by", frappe.session.user)
	doc = frappe.get_doc({"doctype": "GE Project Issue", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Issue created"}


@frappe.whitelist()
def update_project_issue(name, data):
	"""Update a project issue."""
	_require_execution_write_access()
	values = _parse_payload(data)
	doc = frappe.get_doc("GE Project Issue", name)
	doc.update(values)
	if cstr(doc.status) == "Resolved" and not doc.resolved_date:
		doc.resolved_date = frappe.utils.today()
	if cstr(doc.status) != "Resolved":
		doc.resolved_date = None
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Issue updated"}


@frappe.whitelist()
def delete_project_issue(name):
	"""Delete a project issue."""
	_require_execution_write_access()
	_delete_generic_doc("GE Project Issue", name)
	return {"success": True, "message": "Issue deleted"}


# ═══════════════════════════════════════════════════════════
# PM Workspace – Central Team Status Aggregation (Phase 1)
# ═══════════════════════════════════════════════════════════

@frappe.whitelist()
def get_pm_central_status(project=None):
	"""Return read-only status slices from all central teams for a project.

	This powers the PM workspace Central Team Status tab, giving the PM
	visibility into Engineering, Procurement, Finance, I&C, and HR
	without owning those workflows.
	"""
	_require_execution_read_access()
	project = _require_param(project, "project")
	proj_filter = {"linked_project": project}

	# ── Engineering slice ──
	drawings = frappe.get_all(
		"GE Drawing",
		filters=proj_filter,
		fields=["name", "title", "revision", "status", "client_approval_status", "file", "modified"],
		order_by="modified desc",
		limit_page_length=10,
	)
	for row in drawings:
		row["file_url"] = row.pop("file", None)
	boqs = frappe.get_all(
		"GE BOQ",
		filters=proj_filter,
		fields=["name", "status", "version", "total_amount", "modified"],
		order_by="modified desc",
		limit_page_length=10,
	)
	for row in boqs:
		row["title"] = f"BOQ v{row.get('version') or 1}"
	change_requests = frappe.get_all(
		"GE Change Request",
		filters=proj_filter,
		fields=["name", "cr_number", "status", "cost_impact", "schedule_impact_days", "creation"],
		order_by="creation desc",
		limit_page_length=10,
	)
	for row in change_requests:
		row["title"] = row.get("cr_number") or row.get("name")
		row["impact"] = (
			f"Cost {row.get('cost_impact') or 0:.0f} / Schedule {row.get('schedule_impact_days') or 0}d"
		)

	# ── Procurement slice ──
	indent_filters = {"material_request_type": "Purchase"}
	indent_names = _get_indent_names_for_project(project)
	if indent_names:
		indent_filters["name"] = ["in", indent_names]
	else:
		indent_filters["name"] = ["in", [""]]
	indents = frappe.get_all(
		"Material Request",
		filters=indent_filters,
		fields=["name", "status", "transaction_date", "creation"],
		order_by="creation desc",
		limit_page_length=10,
	)
	for row in indents:
		row["mr_number"] = row.get("name")
	indent_by_status = {}
	for row in indents:
		indent_by_status[row.get("status", "Unknown")] = indent_by_status.get(row.get("status", "Unknown"), 0) + 1

	dispatch_challans = frappe.get_all(
		"GE Dispatch Challan",
		filters=proj_filter,
		fields=["name", "status", "dispatch_date", "transporter_name", "total_qty"],
		order_by="dispatch_date desc",
		limit_page_length=10,
	)
	for row in dispatch_challans:
		row["challan_number"] = row.get("name")
		row["transporter"] = row.get("transporter_name")

	grns = frappe.get_all(
		"Purchase Receipt",
		filters={"project": project},
		fields=["name", "status", "posting_date", "grand_total"],
		order_by="posting_date desc",
		limit_page_length=10,
	)
	for row in grns:
		row["grn_number"] = row.get("name")
		row["receipt_date"] = row.get("posting_date")
	grn_by_status = {}
	for row in grns:
		grn_by_status[row.get("status", "Unknown")] = grn_by_status.get(row.get("status", "Unknown"), 0) + 1

	# ── Finance slice ──
	invoices = frappe.get_all(
		"GE Invoice",
		filters=proj_filter,
		fields=["name", "status", "invoice_type", "amount", "net_receivable", "total_paid", "outstanding_amount", "invoice_date"],
		order_by="creation desc",
		limit_page_length=10,
	)
	for row in invoices:
		row["number"] = row.get("name")
		row["total_amount"] = row.get("net_receivable") or row.get("amount") or 0
		row["paid_amount"] = row.get("total_paid") or 0
		row["due_date"] = row.get("invoice_date")
	total_invoiced = sum((r.get("total_amount") or 0) for r in invoices)
	total_collected = sum((r.get("paid_amount") or 0) for r in invoices)

	payment_receipts = frappe.get_all(
		"GE Payment Receipt",
		filters=proj_filter,
		fields=["name", "amount_received", "received_date", "receipt_type", "payment_mode"],
		order_by="received_date desc",
		limit_page_length=10,
	)
	for row in payment_receipts:
		row["receipt_number"] = row.get("name")
		row["amount"] = row.get("amount_received") or 0
		row["receipt_date"] = row.get("received_date")
		row["status"] = row.get("receipt_type") or "Received"

	petty_cash = frappe.get_all(
		"GE Petty Cash",
		filters=proj_filter,
		fields=["name", "status", "amount", "category", "entry_date"],
		order_by="entry_date desc",
		limit_page_length=10,
	)
	petty_total = sum((r.get("amount") or 0) for r in petty_cash)
	petty_approved = sum(
		(r.get("amount") or 0)
		for r in petty_cash
		if cstr(r.get("status") or "").strip().lower() == "approved"
	)

	# ── I&C / Execution slice ──
	checklists = frappe.get_all(
		"GE Commissioning Checklist",
		filters=proj_filter,
		fields=["name", "checklist_name", "status", "linked_site", "modified"],
		order_by="modified desc",
		limit_page_length=10,
	)
	item_counts = _get_commissioning_checklist_item_counts([row["name"] for row in checklists])
	for row in checklists:
		counts = item_counts.get(row["name"], {"total_items": 0, "done_items": 0})
		row["total_items"] = counts["total_items"]
		row["done_items"] = counts["done_items"]
	cl_by_status = {}
	for row in checklists:
		cl_by_status[row.get("status", "Unknown")] = cl_by_status.get(row.get("status", "Unknown"), 0) + 1

	test_reports = frappe.get_all("GE Test Report", filters=proj_filter,
		fields=["name", "report_name", "test_type", "status", "test_date", "linked_site"],
		order_by="test_date desc", limit_page_length=10)

	signoffs = frappe.get_all("GE Client Signoff", filters=proj_filter,
		fields=["name", "signoff_type", "status", "signoff_date", "linked_site"],
		order_by="signoff_date desc", limit_page_length=10)

	# ── HR / Admin slice ──
	team_members = frappe.get_all("GE Project Team Member", filters=proj_filter,
		fields=["name", "user", "role_in_project", "linked_site", "is_active"],
		order_by="creation desc")
	active_count = sum(1 for m in team_members if m.get("is_active"))

	manpower_summary_data = frappe.get_all("GE Manpower Log", filters=proj_filter,
		fields=["sum(man_days) as total_man_days", "count(name) as total_entries",
				"sum(overtime_hours) as total_overtime"])
	ms = manpower_summary_data[0] if manpower_summary_data else {}

	return {
		"success": True,
		"data": {
			"engineering": {
				"drawings": drawings,
				"drawing_count": len(drawings),
				"boqs": boqs,
				"boq_count": len(boqs),
				"change_requests": change_requests,
			},
			"procurement": {
				"indents": indents,
				"indent_by_status": indent_by_status,
				"dispatch_challans": dispatch_challans,
				"grns": grns,
				"grn_by_status": grn_by_status,
			},
			"finance": {
				"invoices": invoices,
				"total_invoiced": total_invoiced,
				"total_collected": total_collected,
				"pending_amount": total_invoiced - total_collected,
				"payment_receipts": payment_receipts,
				"petty_cash": petty_cash,
				"petty_total": petty_total,
				"petty_approved": petty_approved,
			},
			"ic": {
				"checklists": checklists,
				"checklist_by_status": cl_by_status,
				"test_reports": test_reports,
				"signoffs": signoffs,
			},
			"hr": {
				"team_members": team_members,
				"active_count": active_count,
				"total_count": len(team_members),
				"manpower": {
					"total_man_days": ms.get("total_man_days") or 0,
					"total_entries": ms.get("total_entries") or 0,
					"total_overtime": ms.get("total_overtime") or 0,
				},
			},
		},
	}


# ── PM Request APIs (Phase 2) ───────────────────────────────

PM_REQUEST_FIELDS = [
	"name", "linked_project", "linked_site", "request_type", "subject",
	"status", "priority", "description", "justification",
	"current_deadline", "proposed_deadline", "delay_days",
	"positions_needed", "position_type", "duration_needed",
	"amount_requested",
	"requested_by", "requested_date", "reviewed_by", "reviewed_date",
	"reviewer_remarks", "creation", "modified",
]


def _require_pm_request_read_access():
	"""PM, PH, Dept Head, Director can read PM requests."""
	_require_roles(
		ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)


def _require_pm_request_write_access():
	"""PM and PH can create / update PM requests."""
	_require_roles(ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)


def _require_pm_request_review_access():
	"""PH, Dept Head, Director can approve / reject PM requests."""
	_require_roles(ROLE_PROJECT_HEAD, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)


@frappe.whitelist()
def get_pm_requests(project=None, request_type=None, status=None):
	"""List PM requests for a project."""
	_require_pm_request_read_access()
	filters = {}
	_apply_project_manager_project_filter(filters, project=project, project_field="linked_project")
	if request_type:
		filters["request_type"] = request_type
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE PM Request", filters=filters, fields=PM_REQUEST_FIELDS,
		order_by="creation desc", limit_page_length=200,
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_pm_request(name):
	"""Get a single PM request."""
	_require_pm_request_read_access()
	doc = frappe.get_doc("GE PM Request", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_pm_request(data):
	"""Create a new PM request. Auto-sets requested_by and requested_date."""
	_require_pm_request_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	values["doctype"] = "GE PM Request"
	# Enforce PM can only create requests for their assigned projects
	linked = values.get("linked_project")
	if linked:
		_ensure_project_manager_project_scope(linked)
	values["status"] = cstr(values.get("status") or "Draft").strip() or "Draft"
	if values["status"] not in ("Draft", "Pending"):
		frappe.throw("New PM requests can only be saved as Draft or Pending")
	values.setdefault("requested_by", frappe.session.user)
	values.setdefault("requested_date", frappe.utils.today())
	values.pop("reviewed_by", None)
	values.pop("reviewed_date", None)
	doc = frappe.get_doc(values).insert()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE PM Request",
			subject_name=doc.name,
			event_type=EventType.CREATED,
			linked_project=linked,
			current_status="Draft",
			submitted_by=frappe.session.user,
			current_owner_user=frappe.session.user,
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{linked}/pm-requests" if linked else "/pm-requests",
			reference_doctype="GE PM Request",
			reference_name=doc.name,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: create_pm_request")

	return {"success": True, "data": doc.as_dict(), "message": "PM request created"}


@frappe.whitelist()
def update_pm_request(name, data):
	"""Update a draft PM request."""
	_require_pm_request_write_access()
	doc = frappe.get_doc("GE PM Request", name)
	if doc.status not in ("Draft",):
		frappe.throw("Only draft requests can be edited")
	values = json.loads(data) if isinstance(data, str) else data
	immutable_fields = {
		"status", "requested_by", "requested_date",
		"reviewed_by", "reviewed_date", "reviewer_remarks",
	}
	overlap = immutable_fields.intersection(values.keys())
	if overlap:
		frappe.throw(f"Draft update cannot modify: {', '.join(sorted(overlap))}")
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "PM request updated"}


@frappe.whitelist()
def submit_pm_request(name):
	"""Submit a draft PM request for PH review."""
	_require_pm_request_write_access()
	doc = frappe.get_doc("GE PM Request", name)
	if doc.status != "Draft":
		frappe.throw("Only draft requests can be submitted")
	doc.status = "Pending"
	doc.requested_by = doc.requested_by or frappe.session.user
	doc.requested_date = doc.requested_date or frappe.utils.today()
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE PM Request",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=doc.linked_project,
			from_status="Draft",
			to_status="Pending",
			current_status="Pending",
			submitted_by=frappe.session.user,
			submitted_on=now_datetime(),
			current_owner_user=frappe.session.user,
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.linked_project}/pm-requests" if doc.linked_project else "/pm-requests",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_pm_request")

	return {"success": True, "data": doc.as_dict(), "message": "PM request submitted for review"}


@frappe.whitelist()
def approve_pm_request(name, remarks=None):
	"""PH approves a pending PM request."""
	_require_pm_request_review_access()
	doc = frappe.get_doc("GE PM Request", name)
	if doc.status != "Pending":
		frappe.throw("Only pending requests can be approved")
	doc.status = "Approved"
	doc.reviewed_by = frappe.session.user
	doc.reviewed_date = frappe.utils.today()
	if remarks:
		doc.reviewer_remarks = remarks
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE PM Request",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.linked_project,
			from_status="Pending",
			to_status="Approved",
			current_status="Approved",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			remarks=remarks or "",
			source_route=f"/projects/{doc.linked_project}/pm-requests" if doc.linked_project else "/pm-requests",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_pm_request")

	return {"success": True, "data": doc.as_dict(), "message": "PM request approved"}


@frappe.whitelist()
def reject_pm_request(name, remarks=None):
	"""PH rejects a pending PM request."""
	_require_pm_request_review_access()
	if not (remarks or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE PM Request", name)
	if doc.status != "Pending":
		frappe.throw("Only pending requests can be rejected")
	doc.status = "Rejected"
	doc.reviewed_by = frappe.session.user
	doc.reviewed_date = frappe.utils.today()
	doc.reviewer_remarks = remarks
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE PM Request",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.linked_project,
			from_status="Pending",
			to_status="Rejected",
			current_status="Rejected",
			current_owner_role=_detect_primary_role(),
			remarks=remarks,
			source_route=f"/projects/{doc.linked_project}/pm-requests" if doc.linked_project else "/pm-requests",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_pm_request")

	return {"success": True, "data": doc.as_dict(), "message": "PM request rejected"}


@frappe.whitelist()
def withdraw_pm_request(name):
	"""PM withdraws a pending or draft PM request."""
	_require_pm_request_write_access()
	doc = frappe.get_doc("GE PM Request", name)
	if doc.status not in ("Draft", "Pending"):
		frappe.throw("Only draft or pending requests can be withdrawn")
	old_status = doc.status
	doc.status = "Withdrawn"
	doc.reviewed_by = None
	doc.reviewed_date = None
	doc.reviewer_remarks = None
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE PM Request",
			subject_name=name,
			event_type=EventType.CANCELLED,
			linked_project=doc.linked_project,
			from_status=old_status,
			to_status="Withdrawn",
			current_status="Withdrawn",
			current_owner_user=frappe.session.user,
			current_owner_role=_detect_primary_role(),
			remarks="Withdrawn by requestor",
			source_route=f"/projects/{doc.linked_project}/pm-requests" if doc.linked_project else "/pm-requests",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: withdraw_pm_request")

	return {"success": True, "data": doc.as_dict(), "message": "PM request withdrawn"}


@frappe.whitelist()
def delete_pm_request(name):
	"""Delete a draft PM request."""
	_require_pm_request_write_access()
	doc = frappe.get_doc("GE PM Request", name)
	if doc.status != "Draft":
		frappe.throw("Only draft requests can be deleted")
	frappe.delete_doc("GE PM Request", name)
	frappe.db.commit()
	return {"success": True, "message": "PM request deleted"}


# ============================================================================
# ACCOUNTABILITY & TRACEABILITY API
# ============================================================================

@frappe.whitelist()
def get_accountability_timeline(subject_doctype=None, subject_name=None):
	"""Return the full accountability record + ordered event timeline for a tracked object."""
	_require_authenticated_user()
	_require_param(subject_doctype, "subject_doctype")
	_require_param(subject_name, "subject_name")
	_enforce_accountability_subject_scope(subject_doctype, subject_name)

	from gov_erp.accountability import get_accountability_timeline as _get_timeline

	result = _get_timeline(subject_doctype, subject_name)
	return {"success": True, "data": result}


@frappe.whitelist()
def get_accountability_record(subject_doctype=None, subject_name=None):
	"""Return the live accountability snapshot (record only, no events) for a tracked object."""
	_require_authenticated_user()
	_require_param(subject_doctype, "subject_doctype")
	_require_param(subject_name, "subject_name")
	_enforce_accountability_subject_scope(subject_doctype, subject_name)

	record = frappe.db.get_value(
		"GE Accountability Record",
		{"subject_doctype": subject_doctype, "subject_name": subject_name},
		"*",
		as_dict=True,
	)
	return {"success": True, "data": record or None}


@frappe.whitelist()
def get_open_accountability_items(
	project=None,
	site=None,
	owner_user=None,
	blocked_only=0,
	escalated_only=0,
	subject_doctype=None,
	limit=100,
):
	"""
	Query open accountability items with optional filters.

	Open = latest_event_type not in COMPLETED/CANCELLED.
	Accessible to Directors, Project Heads, and Department Heads.
	"""
	_require_authenticated_user()
	_require_roles(
		"Director", "Project Head", "Department Head",
		"Project Manager", "Engineering Head", "Procurement Head",
		"Procurement Manager", "Store Manager", "System Manager",
	)
	project = _enforce_accountability_project_scope(project, require_project_for_pm=True)

	from gov_erp.accountability import get_open_accountability_items as _get_open

	items = _get_open(
		project=project,
		site=site,
		owner_user=owner_user,
		blocked_only=bool(cint(blocked_only)),
		escalated_only=bool(cint(escalated_only)),
		subject_doctype=subject_doctype,
		limit=cint(limit) or 100,
	)
	return {"success": True, "data": items}


@frappe.whitelist()
def get_overdue_accountability_items(project=None, site=None, limit=50):
	"""Return accountability records where due_date is in the past and status is open."""
	_require_authenticated_user()
	_require_roles("Director", "Project Head", "Department Head", "System Manager")
	project = _enforce_accountability_project_scope(project, require_project_for_pm=True)

	filters = {
		"latest_event_type": ["not in", ["COMPLETED", "CANCELLED", ""]],
		"due_date": ["<", frappe.utils.today()],
	}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site

	items = frappe.get_all(
		"GE Accountability Record",
		filters=filters,
		fields=[
			"name", "subject_doctype", "subject_name",
			"linked_project", "linked_site", "linked_stage",
			"current_status", "latest_event_type",
			"current_owner_user", "current_owner_role",
			"due_date", "is_blocked", "blocking_reason",
			"source_route", "creation", "modified",
		],
		order_by="due_date asc",
		limit_page_length=cint(limit) or 50,
	)
	return {"success": True, "data": items}


@frappe.whitelist()
def get_blocked_accountability_items(project=None, site=None, limit=50):
	"""Return accountability records that are currently blocked."""
	_require_authenticated_user()
	_require_roles("Director", "Project Head", "Department Head", "System Manager")
	project = _enforce_accountability_project_scope(project, require_project_for_pm=True)

	filters = {
		"is_blocked": 1,
		"latest_event_type": ["not in", ["COMPLETED", "CANCELLED"]],
	}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site

	items = frappe.get_all(
		"GE Accountability Record",
		filters=filters,
		fields=[
			"name", "subject_doctype", "subject_name",
			"linked_project", "linked_site", "linked_stage",
			"current_status", "latest_event_type",
			"current_owner_user", "current_owner_role",
			"blocking_reason", "due_date",
			"source_route", "creation", "modified",
		],
		order_by="modified asc",
		limit_page_length=cint(limit) or 50,
	)
	return {"success": True, "data": items}


@frappe.whitelist()
def get_accountability_events_by_project(project=None, event_type=None, limit=200):
	"""Return all accountability events linked to a project, newest first."""
	_require_authenticated_user()
	_require_param(project, "project")
	project = _enforce_accountability_project_scope(project, require_project_for_pm=True)

	filters = {"linked_project": project}
	if event_type:
		filters["event_type"] = event_type

	events = frappe.get_all(
		"GE Accountability Event",
		filters=filters,
		fields=[
			"name", "accountability_record", "event_type",
			"actor", "actor_role", "actor_department",
			"from_status", "to_status",
			"from_owner_user", "to_owner_user",
			"remarks", "reason_code",
			"linked_site", "linked_stage",
			"reference_doctype", "reference_name",
			"event_time",
		],
		order_by="event_time desc",
		limit_page_length=cint(limit) or 200,
	)
	return {"success": True, "data": events}


@frappe.whitelist()
def get_accountability_dashboard_summary(project=None, site=None, department=None):
	"""
	Director/RCA dashboard summary.
	Returns blocked, overdue, escalated, recently rejected counts + items,
	plus an event-type heatmap for pattern analysis.
	"""
	_require_authenticated_user()
	_require_roles("Director", "Project Head", "Department Head", "System Manager")
	project = _enforce_accountability_project_scope(project, require_project_for_pm=True)

	closed_statuses = ("COMPLETED", "CANCELLED", "CLOSED")
	thirty_days_ago = add_days(today(), -30)
	ninety_days_ago = add_days(today(), -90)

	# ── Base record filters ───────────────────────────────────────────────
	base_filters: dict = {
		"latest_event_type": ["not in", list(closed_statuses)],
	}
	if project:
		base_filters["linked_project"] = project
	if site:
		base_filters["linked_site"] = site
	if department:
		base_filters["current_owner_department"] = department

	record_fields = [
		"name", "subject_doctype", "subject_name",
		"linked_project", "linked_site", "linked_stage",
		"current_status", "latest_event_type",
		"current_owner_user", "current_owner_role", "current_owner_department",
		"is_blocked", "blocking_reason",
		"escalated_to_user", "escalated_to_role",
		"due_date", "source_route", "creation", "modified",
	]

	# ── 1. Blocked items ──────────────────────────────────────────────────
	blocked_filters = {**base_filters, "is_blocked": 1}
	blocked_items = frappe.get_all(
		"GE Accountability Record",
		filters=blocked_filters,
		fields=record_fields,
		order_by="modified asc",
		limit_page_length=50,
	)

	# ── 2. Escalated items ────────────────────────────────────────────────
	escalated_filters = {**base_filters, "escalated_to_user": ["!=", ""]}
	escalated_items = frappe.get_all(
		"GE Accountability Record",
		filters=escalated_filters,
		fields=record_fields,
		order_by="modified asc",
		limit_page_length=50,
	)

	# ── 3. Overdue items (due_date < today, not closed) ───────────────────
	overdue_filters = {
		**base_filters,
		"due_date": ["<", today()],
		"due_date": ["is", "set"],
	}
	overdue_filters["due_date"] = ["<", today()]
	overdue_items = frappe.get_all(
		"GE Accountability Record",
		filters={
			**{k: v for k, v in base_filters.items()},
			"due_date": ["<", today()],
		},
		fields=record_fields,
		order_by="due_date asc",
		limit_page_length=50,
	)
	# Filter out records without a due_date (frappe does not natively filter "is set" + "<")
	overdue_items = [r for r in overdue_items if r.get("due_date")]

	# ── 4. All open records total ─────────────────────────────────────────
	total_open = frappe.db.count("GE Accountability Record", base_filters)

	# ── 5. Recently rejected events (last 30 days) ────────────────────────
	event_filters: dict = {"event_type": "REJECTED", "event_time": [">=", thirty_days_ago]}
	if project:
		event_filters["linked_project"] = project
	if site:
		event_filters["linked_site"] = site

	rejected_events = frappe.get_all(
		"GE Accountability Event",
		filters=event_filters,
		fields=[
			"name", "accountability_record", "actor", "actor_role", "actor_department",
			"from_status", "to_status", "remarks", "linked_project", "linked_site",
			"reference_doctype", "reference_name", "event_time",
		],
		order_by="event_time desc",
		limit_page_length=30,
	)

	# ── 6. Department heatmap (open records by department) ────────────────
	dept_rows = frappe.get_all(
		"GE Accountability Record",
		filters=base_filters,
		fields=["current_owner_department"],
	)
	dept_heatmap: dict = {}
	for row in dept_rows:
		dept = row.get("current_owner_department") or "Unassigned"
		dept_heatmap[dept] = dept_heatmap.get(dept, 0) + 1

	# Sort by count descending
	dept_heatmap_list = [{"department": k, "count": v} for k, v in dept_heatmap.items()]
	dept_heatmap_list.sort(key=lambda x: x["count"], reverse=True)

	# ── 7. Event type distribution (recent 90 days) ───────────────────────
	all_events_filters: dict = {"event_time": [">=", ninety_days_ago]}
	if project:
		all_events_filters["linked_project"] = project
	if site:
		all_events_filters["linked_site"] = site

	event_type_rows = frappe.get_all(
		"GE Accountability Event",
		filters=all_events_filters,
		fields=["event_type"],
	)
	event_type_counts: dict = {}
	for row in event_type_rows:
		et = row.get("event_type") or "UNKNOWN"
		event_type_counts[et] = event_type_counts.get(et, 0) + 1

	event_type_list = [{"event_type": k, "count": v} for k, v in event_type_counts.items()]
	event_type_list.sort(key=lambda x: x["count"], reverse=True)

	return {
		"success": True,
		"data": {
			"summary": {
				"total_open": total_open,
				"total_blocked": len(blocked_items),
				"total_overdue": len(overdue_items),
				"total_escalated": len(escalated_items),
				"total_rejected_recent": len(rejected_events),
			},
			"blocked_items": blocked_items,
			"overdue_items": overdue_items,
			"escalated_items": escalated_items,
			"rejected_events": rejected_events,
			"department_heatmap": dept_heatmap_list,
			"event_type_distribution": event_type_list,
		},
	}


# ── Phase 9: Backfill / Migration ────────────────────────────────────────────

@frappe.whitelist()
def backfill_accountability_records(doctype=None, limit=100, dry_run=1):
	"""
	Phase 9 migration helper.

	Creates baseline GE Accountability Records for existing open objects that
	do not yet have one.  Only Director / System Manager can run this.

	Args:
		doctype  – restrict to one DocType (e.g. "Material Request"). Leave blank
		           to iterate all registered types.
		limit    – max records to process per call (default 100).
		dry_run  – 1 (default) = preview only, 0 = actually write records.

	Returns a report of what was processed / would be created.
	"""
	if "Director" not in frappe.get_roles(frappe.session.user) and "System Manager" not in frappe.get_roles(frappe.session.user):
		frappe.throw("Only Directors or System Managers may run the accountability backfill.")

	dry_run = int(dry_run or 1)
	limit = int(limit or 100)

	# Supported doctype → status-field + open-value pairs
	BACKFILL_MAP = {
		"Material Request": {
			"status_field": "status",
			"open_statuses": ["Draft", "Submitted", "Pending", "Partially Ordered"],
			"project_field": None,  # items-level; skip project linkage
		},
		"GE Cost Sheet": {
			"status_field": "status",
			"open_statuses": ["DRAFT", "PENDING_APPROVAL"],
			"project_field": "linked_project",
		},
		"GE Employee Onboarding": {
			"status_field": "onboarding_status",
			"open_statuses": ["DRAFT", "SUBMITTED", "UNDER_REVIEW"],
			"project_field": "linked_project",
		},
		"GE Invoice": {
			"status_field": "status",
			"open_statuses": ["DRAFT", "SUBMITTED", "APPROVED"],
			"project_field": "linked_project",
		},
		"GE Vendor Comparison": {
			"status_field": "status",
			"open_statuses": ["DRAFT", "PENDING_APPROVAL"],
			"project_field": "linked_project",
		},
		"GE BOQ": {
			"status_field": "status",
			"open_statuses": ["DRAFT", "PENDING_APPROVAL"],
			"project_field": "linked_project",
		},
		"GE Drawing": {
			"status_field": "status",
			"open_statuses": ["Draft", "Submitted", "Pending Approval"],
			"project_field": "linked_project",
		},
	}

	target_types = [doctype] if doctype else list(BACKFILL_MAP.keys())
	report = {"processed": 0, "created": 0, "skipped": 0, "errors": 0, "details": []}

	from gov_erp.accountability import upsert_accountability_record, EventType

	for dt in target_types:
		meta = BACKFILL_MAP.get(dt)
		if not meta:
			report["details"].append({"doctype": dt, "status": "unsupported"})
			continue

		status_field = meta["status_field"]
		project_field = meta["project_field"]

		try:
			filters = [[status_field, "in", meta["open_statuses"]]]
			fields = ["name", status_field]
			if project_field:
				fields.append(project_field)

			rows = frappe.get_all(dt, filters=filters, fields=fields, limit_page_length=limit)
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"Backfill: fetch {dt}")
			report["errors"] += 1
			continue

		for row in rows:
			report["processed"] += 1
			# Check if record already exists
			existing = frappe.db.exists(
				"GE Accountability Record",
				{"subject_doctype": dt, "subject_name": row["name"]},
			)
			if existing:
				report["skipped"] += 1
				report["details"].append({"doctype": dt, "name": row["name"], "action": "skipped_exists"})
				continue

			if dry_run:
				report["created"] += 1  # would create
				report["details"].append({"doctype": dt, "name": row["name"], "action": "would_create"})
			else:
				try:
					linked_project = row.get(project_field) if project_field else None
					upsert_accountability_record(
						subject_doctype=dt,
						subject_name=row["name"],
						event_type=EventType.CREATED,
						linked_project=linked_project,
						current_status=row.get(status_field),
						current_owner_role="Unknown (backfill)",
						source_route="/accountability/backfill",
						remarks="Backfilled by Phase 9 migration",
					)
					frappe.db.commit()
					report["created"] += 1
					report["details"].append({"doctype": dt, "name": row["name"], "action": "created"})
				except Exception:
					frappe.log_error(frappe.get_traceback(), f"Backfill: create record {dt}/{row['name']}")
					report["errors"] += 1
					report["details"].append({"doctype": dt, "name": row["name"], "action": "error"})

	report["dry_run"] = bool(dry_run)
	return {"success": True, "data": report}
