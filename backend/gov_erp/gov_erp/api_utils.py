"""Shared utilities for gov_erp API domain modules."""

# Export everything (including _-prefixed helpers) via 'from api_utils import *'
__all__ = [
    "FRONTEND_ROLE_PRIORITY",
    "PermissionEngine",
    "ROLE_ACCOUNTS",
    "ROLE_ACCOUNTS_HEAD",
    "ROLE_DEPARTMENT_HEAD",
    "ROLE_DIRECTOR",
    "ROLE_ENGINEER",
    "ROLE_ENGINEERING_HEAD",
    "ROLE_FIELD_TECHNICIAN",
    "ROLE_HR_HEAD",
    "ROLE_HR_MANAGER",
    "ROLE_OM_OPERATOR",
    "ROLE_PRESALES_EXECUTIVE",
    "ROLE_PRESALES_HEAD",
    "ROLE_PROCUREMENT_HEAD",
    "ROLE_PROCUREMENT_MANAGER",
    "ROLE_PROJECT_HEAD",
    "ROLE_PROJECT_MANAGER",
    "ROLE_PURCHASE",
    "ROLE_RMA_HEAD",
    "ROLE_RMA_MANAGER",
    "ROLE_STORES_LOGISTICS_HEAD",
    "ROLE_STORE_MANAGER",
    "ROLE_SYSTEM_MANAGER",
    "SPINE_STAGES",
    "WORKFLOW_STAGE_KEYS",
    "WORKFLOW_SUPER_ROLES",
    "WORKFLOW_PROTECTED_FIELDS",
    "_apply_creation_date_filters",
    "_append_project_workflow_event",
    "_apply_project_manager_project_filter",
    "_approval_supporting_docs",
    "_attach_computed_tender_funnel_status",
    "_attach_indent_accountability_summary",
    "_attach_indent_project_summary",
    "_build_workflow_event",
    "_compute_project_spine_progress",
    "_count_records",
    "_create_costing_queue_entry",
    "_create_generic_doc",
    "_create_indent_document",
    "_delete_generic_doc",
    "_derive_project_from_tender",
    "_derive_tender_from_project",
    "_derive_tender_funnel_status",
    "_detect_primary_role",
    "_enforce_accountability_project_scope",
    "_enforce_accountability_subject_scope",
    "_ensure_customer_exists",
    "_ensure_project_manager_project_scope",
    "_ensure_site_belongs_to_project",
    "_get_commissioning_checklist_item_counts",
    "_get_default_company",
    "_get_default_warehouse",
    "_get_indent_names_for_project",
    "_get_indent_requester_user",
    "_get_permission_engine",
    "_get_primary_frontend_role",
    "_get_project_manager_assigned_projects",
    "_get_project_workflow_readiness",
    "_get_reference_context",
    "_get_reference_status_for_rule",
    "_get_stock_age_bucket",
    "_latest_project_head_status_by_source",
    "_list_generic_docs",
    "_normalize_sheet_header",
    "_parse_json_list",
    "_parse_payload",
    "_prepare_indent_doc_values",
    "_project_head_workflow_ready",
    "_project_related_filters",
    "_refresh_project_spine",
    "_require_any_capability",
    "_require_attendance_manage_access",
    "_require_authenticated_user",
    "_require_billing_approval_access",
    "_require_billing_read_access",
    "_require_billing_write_access",
    "_require_boq_approval_access",
    "_require_boq_read_access",
    "_require_boq_write_access",
    "_require_capability",
    "_require_comm_log_read_access",
    "_require_comm_log_write_access",
    "_require_cost_sheet_approval_access",
    "_require_cost_sheet_read_access",
    "_require_cost_sheet_write_access",
    "_require_dependency_override_approval_access",
    "_require_device_uptime_read_access",
    "_require_device_uptime_write_access",
    "_require_document_delete_access",
    "_require_document_read_access",
    "_require_document_write_access",
    "_require_execution_read_access",
    "_require_execution_write_access",
    "_require_hr_approval_access",
    "_require_hr_read_access",
    "_require_hr_write_access",
    "_require_leave_manage_access",
    "_require_manpower_read_access",
    "_require_manpower_write_access",
    "_require_milestone_read_access",
    "_require_milestone_write_access",
    "_require_module_access",
    "_require_om_approval_access",
    "_require_om_read_access",
    "_require_om_write_access",
    "_require_param",
    "_require_procurement_approval_access",
    "_require_procurement_read_access",
    "_require_procurement_write_access",
    "_require_project_asset_access",
    "_require_project_head_workflow",
    "_require_project_inventory_read_access",
    "_require_project_inventory_write_access",
    "_require_regularization_manage_access",
    "_require_rma_approval_access",
    "_require_rma_read_access",
    "_require_rma_write_access",
    "_require_roles",
    "_require_store_approval_access",
    "_require_store_read_access",
    "_require_store_write_access",
    "_require_survey_read_access",
    "_require_survey_write_access",
    "_require_tender_conversion_access",
    "_require_tender_read_access",
    "_require_tender_write_access",
    "_resolve_site_context",
    "_serialize_survey_record",
    "_serialize_workflow_state",
    "_source_route_for_project_head_item",
    "_sync_approval_with_costing_queue",
    "_sync_project_workflow_fields",
    "_strip_workflow_fields",
    "_block_delete_if_workflow_active",
    "_update_generic_doc",
    "_user_has_any_role",
    "_user_has_capability",
    "add_days",
    "cint",
    "cstr",
    "date_diff",
    "defaultdict",
    "delete_session",
    "evaluate_dependency_state",
    "flt",
    "frappe",
    "get_datetime",
    "get_health_payload",
    "get_next_workflow_stage",
    "get_session_context",
    "get_workflow_stage",
    "getdate",
    "health_check",
    "json",
    "logout_current_session",
    "now_datetime",
    "resolve_reference_status",
    "today",
]

import json
import re
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


def _derive_project_from_tender(linked_tender):
	linked_tender = cstr(linked_tender or "").strip()
	if not linked_tender:
		return ""
	return cstr(frappe.db.get_value("GE Tender", linked_tender, "linked_project") or "").strip()


def _derive_tender_from_project(linked_project):
	linked_project = cstr(linked_project or "").strip()
	if not linked_project:
		return ""
	return cstr(
		frappe.db.get_value(
			"GE Tender",
			{"linked_project": linked_project},
			"name",
			order_by="modified desc",
		)
		or ""
	).strip()


def _resolve_site_context(linked_site=None, site_name=None, linked_project=None, linked_tender=None, require_site=False):
	linked_site = cstr(linked_site or "").strip()
	site_name = cstr(site_name or "").strip()
	linked_project = cstr(linked_project or "").strip()
	linked_tender = cstr(linked_tender or "").strip()
	site_doc = None
	context_status = "resolved"
	context_note = ""

	if linked_site:
		if not frappe.db.exists("GE Site", linked_site):
			frappe.throw(f"GE Site {linked_site} was not found")
		site_doc = frappe.get_doc("GE Site", linked_site)
	elif site_name:
		filters = {"site_name": site_name}
		if linked_project:
			filters["linked_project"] = linked_project
		if linked_tender:
			filters["linked_tender"] = linked_tender
		matches = frappe.get_all("GE Site", filters=filters, fields=["name"], limit_page_length=2)
		if not matches and (linked_project or linked_tender):
			matches = frappe.get_all("GE Site", filters={"site_name": site_name}, fields=["name"], limit_page_length=2)
		if len(matches) == 1:
			site_doc = frappe.get_doc("GE Site", matches[0].name)
		elif len(matches) > 1 and require_site:
			frappe.throw(f"Multiple sites matched '{site_name}'. Please select a specific site.")
		elif len(matches) > 1:
			context_status = "needs_site_relink"
			context_note = f"Multiple sites matched '{site_name}'"

	if require_site and not site_doc:
		frappe.throw("Linked site is required")

	if site_doc:
		if linked_project and site_doc.linked_project and cstr(site_doc.linked_project) != linked_project:
			frappe.throw(f"Site {site_doc.name} does not belong to project {linked_project}")
		if linked_tender and site_doc.linked_tender and cstr(site_doc.linked_tender) != linked_tender:
			frappe.throw(f"Site {site_doc.name} does not belong to tender {linked_tender}")
		linked_site = cstr(site_doc.name).strip()
		site_name = cstr(site_doc.site_name or site_name).strip()
		linked_project = cstr(site_doc.linked_project or linked_project).strip()
		linked_tender = cstr(site_doc.linked_tender or linked_tender).strip()
		if not linked_project:
			context_status = "needs_site_relink"
			context_note = f"Site {linked_site} is not linked to a project"

	if not linked_project and linked_tender:
		linked_project = _derive_project_from_tender(linked_tender)
	if not linked_tender and linked_project:
		linked_tender = _derive_tender_from_project(linked_project)
	if not linked_site:
		context_status = "missing_site"
		context_note = context_note or "No linked site was supplied or resolved"

	return {
		"linked_site": linked_site,
		"site_name": site_name,
		"linked_project": linked_project,
		"linked_tender": linked_tender,
		"site_doc": site_doc,
		"context_status": context_status,
		"context_note": context_note,
	}


def _ensure_site_belongs_to_project(project, linked_site, allow_blank=True):
	linked_site = cstr(linked_site or "").strip()
	if not linked_site:
		if allow_blank:
			return ""
		frappe.throw("linked_site is required")
	context = _resolve_site_context(linked_site=linked_site, linked_project=project, require_site=True)
	return context["linked_site"]


def _get_reference_context(reference_doctype=None, reference_name=None):
	reference_doctype = cstr(reference_doctype or "").strip()
	reference_name = cstr(reference_name or "").strip()
	if not reference_doctype or not reference_name:
		return {}
	if not frappe.db.exists(reference_doctype, reference_name):
		return {}
	if reference_doctype == "Project":
		return {"linked_project": reference_name}
	if reference_doctype == "GE Site":
		return _resolve_site_context(linked_site=reference_name)

	meta = frappe.get_meta(reference_doctype)
	linked_project = ""
	linked_site = ""
	linked_tender = ""
	site_name = ""
	if meta.has_field("linked_project"):
		linked_project = cstr(frappe.db.get_value(reference_doctype, reference_name, "linked_project") or "").strip()
	if meta.has_field("linked_site"):
		linked_site = cstr(frappe.db.get_value(reference_doctype, reference_name, "linked_site") or "").strip()
	if meta.has_field("linked_tender"):
		linked_tender = cstr(frappe.db.get_value(reference_doctype, reference_name, "linked_tender") or "").strip()
	if meta.has_field("site_name"):
		site_name = cstr(frappe.db.get_value(reference_doctype, reference_name, "site_name") or "").strip()
	if linked_site or site_name or linked_project or linked_tender:
		return _resolve_site_context(
			linked_site=linked_site,
			site_name=site_name,
			linked_project=linked_project,
			linked_tender=linked_tender,
			require_site=False,
		)
	return {}


def _serialize_survey_record(record):
	data = record.as_dict() if callable(getattr(record, "as_dict", None)) else dict(record)
	context = _resolve_site_context(
		linked_site=data.get("linked_site"),
		site_name=data.get("site_name"),
		linked_project=data.get("linked_project"),
		linked_tender=data.get("linked_tender"),
		require_site=False,
	)
	data["linked_site"] = context["linked_site"] or cstr(data.get("linked_site") or "").strip()
	data["site_name"] = context["site_name"] or cstr(data.get("site_name") or "").strip()
	data["linked_project"] = context["linked_project"] or cstr(data.get("linked_project") or "").strip()
	data["linked_tender"] = context["linked_tender"] or cstr(data.get("linked_tender") or "").strip()
	data["needs_site_relink"] = not bool(data.get("linked_site"))
	data["context_status"] = context.get("context_status")
	data["context_note"] = context.get("context_note")
	return data


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
	if ROLE_DIRECTOR in set(frappe.get_roles(frappe.session.user)):
		return
	_get_permission_engine().check_capability(
		capability_key, project=project, site=site, required_mode=required_mode,
	)


def _require_any_capability(*capability_keys, project=None, site=None):
	"""Guard: throw PermissionError if user lacks ALL of the listed capabilities."""
	_require_authenticated_user()
	if ROLE_DIRECTOR in set(frappe.get_roles(frappe.session.user)):
		return
	_get_permission_engine().check_any_capability(
		*capability_keys, project=project, site=site,
	)


def _require_module_access(module_key):
	"""Guard: throw PermissionError if user cannot access the module."""
	_require_authenticated_user()
	if ROLE_DIRECTOR in set(frappe.get_roles(frappe.session.user)):
		return
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
	_require_roles(ROLE_PRESALES_HEAD, ROLE_PRESALES_EXECUTIVE, ROLE_ENGINEERING_HEAD)


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


def _require_procurement_write_access(project=None, site=None):
	_require_any_capability(
		"procurement.indent.create", "procurement.indent.update",
		"procurement.comparison.create", "procurement.readiness.update",
		project=project, site=site,
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


def _require_document_delete_access(project=None, site=None):
	_require_capability("dms.file.delete", project=project, site=site, required_mode="action")


def _require_document_write_access(project=None, site=None):
	_require_capability("dms.file.upload", project=project, site=site)


def _require_execution_read_access():
	_require_module_access("execution")


def _require_execution_write_access(project=None, site=None):
	_require_any_capability(
		"execution.installation.update", "execution.commissioning.update",
		"execution.evidence.upload", "execution.device.manage",
		project=project, site=site,
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
	"""Return a structured health report covering DB, scheduler, and RBAC.

	When called outside a Frappe request context (no DB), returns a
	basic importability-only response so structural tests still pass.
	"""
	has_db = getattr(frappe, "db", None) and getattr(frappe.db, "sql", None)

	# ── lightweight mode (no DB) ──────────────────────────────────────
	if not has_db:
		return {
			"success": True,
			"app": "gov_erp",
			"message": "Gov ERP backend is importable (no DB context)",
		}

	# ── full diagnostics (DB available) ───────────────────────────────
	checks = {}
	ok = True

	# 1. Database connectivity
	try:
		frappe.db.sql("SELECT 1")
		checks["database"] = "ok"
	except Exception as e:
		checks["database"] = f"fail: {e}"
		ok = False

	# 2. Critical DocType existence
	critical_doctypes = [
		"Project", "GE Site", "GE Tender", "GE Milestone",
		"GE Permission Capability", "GE Permission Pack",
		"GE User Context", "GE Accountability Record",
	]
	missing = [dt for dt in critical_doctypes if not frappe.db.exists("DocType", dt)]
	if missing:
		checks["doctypes"] = f"missing: {', '.join(missing)}"
		ok = False
	else:
		checks["doctypes"] = "ok"

	# 3. RBAC engine importable and has capabilities seeded
	try:
		cap_count = frappe.db.count("GE Permission Capability")
		pack_count = frappe.db.count("GE Permission Pack")
		checks["rbac"] = f"ok ({cap_count} capabilities, {pack_count} packs)"
	except Exception:
		checks["rbac"] = "fail: cannot query RBAC tables"
		ok = False

	# 4. Scheduler hooks resolvable
	from importlib import import_module
	sched_hooks = [
		("gov_erp.gov_erp.doctype.ge_user_reminder.ge_user_reminder", "process_due_reminders"),
		("gov_erp.dms_api", "_process_expiring_documents"),
		("gov_erp.system_api", "generate_system_reminders"),
	]
	sched_errors = []
	for mod_path, func_name in sched_hooks:
		try:
			mod = import_module(mod_path)
			if not hasattr(mod, func_name):
				sched_errors.append(f"{mod_path}.{func_name}: not found")
		except Exception:
			sched_errors.append(f"{mod_path}: import failed")
	if sched_errors:
		checks["scheduler"] = f"fail: {'; '.join(sched_errors)}"
		ok = False
	else:
		checks["scheduler"] = "ok (3 hooks verified)"

	# 5. Recent error log count (last 24h)
	try:
		recent_errors = frappe.db.count("Error Log", {
			"creation": [">=", add_days(now_datetime(), -1)],
			"method": ["like", "%gov_erp%"],
		})
		checks["recent_errors_24h"] = recent_errors
	except Exception:
		checks["recent_errors_24h"] = "unknown"

	return {
		"success": ok,
		"app": "gov_erp",
		"message": "Gov ERP backend is healthy" if ok else "Gov ERP backend has issues",
		"checks": checks,
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


def _normalize_sheet_header(value):
	"""Normalize human spreadsheet headers into stable lookup keys."""
	if value is None:
		return ""
	return re.sub(r"[^a-z0-9]+", "_", cstr(value).strip().lower()).strip("_")


def _get_project_manager_assigned_projects():
	roles = set(frappe.get_roles(frappe.session.user))
	if ROLE_PROJECT_MANAGER not in roles:
		return None
	# System Manager and Director bypass PM scope restrictions
	if "System Manager" in roles or "Director" in roles:
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


def _project_head_workflow_ready():
	return bool(frappe.db.exists("DocType", "GE PH Approval Item")) and bool(
		frappe.db.exists("DocType", "GE Costing Queue")
	)


def _require_project_head_workflow():
	if not _project_head_workflow_ready():
		frappe.throw(
			"Project Head approval workflow is not available yet. Please run bench migrate first.",
			frappe.DoesNotExistError,
		)


def _source_route_for_project_head_item(source_type, source_name):
	if not source_name:
		return ""
	if source_type == "PO":
		return f"/purchase-orders/{source_name}"
	if source_type == "RMA PO":
		return f"/rma/{source_name}"
	if source_type == "Petty Cash":
		return "/petty-cash"
	return ""


def _latest_project_head_status_by_source(source_type, source_names):
	if not source_names or not _project_head_workflow_ready():
		return {}
	rows = frappe.get_all(
		"GE PH Approval Item",
		filters={
			"source_type": source_type,
			"source_name": ["in", list(source_names)],
		},
		fields=["source_name", "status", "disbursement_status", "modified"],
		order_by="modified desc",
	)
	status_map = {}
	for row in rows:
		if row.source_name in status_map:
			continue
		status_map[row.source_name] = row.disbursement_status or row.status
	return status_map


def _approval_supporting_docs(source_type, source_name):
	doctype_map = {
		"PO": "Purchase Order",
		"RMA PO": "GE RMA Tracker",
	}
	source_doctype = doctype_map.get(source_type)
	if not source_doctype or not source_name:
		return []
	return frappe.get_all(
		"File",
		filters={
			"attached_to_doctype": source_doctype,
			"attached_to_name": source_name,
		},
		fields=["name", "file_url", "file_name"],
		order_by="creation desc",
		page_length=10,
	)


def _create_costing_queue_entry(approval_doc):
	existing_name = approval_doc.costing_queue_ref or frappe.db.get_value(
		"GE Costing Queue",
		{"approval_item": approval_doc.name},
		"name",
	)
	if existing_name:
		return frappe.get_doc("GE Costing Queue", existing_name)

	vendor_beneficiary = ""
	if approval_doc.source_type == "PO" and approval_doc.source_name:
		vendor_beneficiary = frappe.db.get_value("Purchase Order", approval_doc.source_name, "supplier") or ""
	elif approval_doc.source_type == "RMA PO" and approval_doc.source_name:
		vendor_beneficiary = frappe.db.get_value("GE RMA Tracker", approval_doc.source_name, "service_partner_name") or ""
	elif approval_doc.source_type == "Petty Cash":
		vendor_beneficiary = approval_doc.raised_by or ""

	queue = frappe.get_doc({
		"doctype": "GE Costing Queue",
		"approval_item": approval_doc.name,
		"source_type": approval_doc.source_type,
		"source_name": approval_doc.source_name,
		"source_id": approval_doc.source_id,
		"entry_label": f"{approval_doc.source_type} • {approval_doc.source_id or approval_doc.name}",
		"project": approval_doc.project,
		"linked_site": approval_doc.linked_site,
		"amount": approval_doc.amount,
		"vendor_beneficiary": vendor_beneficiary,
		"linked_record": approval_doc.linked_record,
		"ph_approver": approval_doc.ph_approver,
		"ph_approval_date": approval_doc.ph_approval_date,
		"ph_remarks": approval_doc.ph_remarks,
		"disbursement_status": "Pending",
	})
	queue.insert()
	return queue


def _sync_approval_with_costing_queue(approval_doc, queue_doc):
	approval_doc.costing_queue_ref = queue_doc.name
	approval_doc.disbursement_status = queue_doc.disbursement_status
	if queue_doc.disbursement_status == "Released":
		approval_doc.status = "Disbursed / Released"
	elif approval_doc.status != "Rejected by PH":
		approval_doc.status = "Forwarded to Costing"


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
	try:
		session_user = frappe.session.user
	except Exception:
		session_user = "Guest"

	if session_user == "Guest":
		return {
			"success": True,
			"app": "gov_erp",
			"message": "Gov ERP backend is reachable",
		}
	return get_health_payload()


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


# ── Cross-domain shared helpers (moved from domain modules during extraction) ──

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


def _list_generic_docs(doctype, filters, fields, order_by="creation desc"):
	return frappe.get_all(doctype, filters=filters, fields=fields, order_by=order_by)


def _create_generic_doc(doctype, data):
	values = _parse_payload(data)
	_strip_workflow_fields(doctype, values)
	doc = frappe.get_doc({"doctype": doctype, **values})
	doc.insert()
	frappe.db.commit()
	return doc


# Fields controlled exclusively by workflow endpoints — generic CRUD must not touch them.
WORKFLOW_PROTECTED_FIELDS = {
	"GE Drawing": {"status", "approved_by", "approval_date", "client_approval_status"},
	"GE Change Request": {"status", "approved_by", "approval_date"},
	"GE Test Report": {"status", "approved_by", "approval_date"},
	"GE Tender": {
		"status", "go_no_go_status", "go_no_go_by", "go_no_go_on", "go_no_go_remarks",
		"technical_readiness", "technical_rejection_reason", "commercial_readiness",
		"finance_readiness", "submission_status", "approval_status",
	},
	"GE BOQ": {"status", "approved_by", "approved_at", "rejected_by", "rejection_reason"},
	"GE Vendor Comparison": {"status", "exception_reason", "exception_approved_by"},
}

# Statuses that indicate a record has entered a controlled lifecycle and must not
# be deleted through the generic delete endpoint.
_NON_DELETABLE_STATUSES = {
	"GE Drawing": {"Submitted", "Approved", "Superseded"},
	"GE Change Request": {"Submitted", "Approved", "Rejected"},
	"GE Test Report": {"Submitted", "Approved", "Rejected"},
	"GE Tender": {"SUBMITTED", "UNDER_EVALUATION", "WON", "LOST", "CANCELLED", "DROPPED", "CONVERTED_TO_PROJECT"},
	"GE BOQ": {"PENDING_APPROVAL", "APPROVED"},
	"GE Vendor Comparison": {"PENDING_APPROVAL", "APPROVED", "REJECTED"},
}


def _strip_workflow_fields(doctype, values):
	"""Remove workflow-protected fields from *values* dict (in-place). Returns stripped key names."""
	protected = WORKFLOW_PROTECTED_FIELDS.get(doctype)
	if not protected:
		return []
	stripped = [k for k in list(values) if k in protected]
	for k in stripped:
		values.pop(k, None)
	return stripped


def _update_generic_doc(doctype, name, data):
	values = _parse_payload(data)
	_strip_workflow_fields(doctype, values)
	doc = frappe.get_doc(doctype, name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return doc


def _block_delete_if_workflow_active(doctype, name):
	"""Throw if a workflow-controlled record has progressed past draft."""
	blocked = _NON_DELETABLE_STATUSES.get(doctype)
	if not blocked:
		return
	status = frappe.db.get_value(doctype, name, "status")
	if status in blocked:
		frappe.throw(
			f"Cannot delete {doctype} '{name}' in '{status}' state. "
			"Only draft records may be deleted.",
			frappe.PermissionError,
		)


def _delete_generic_doc(doctype, name):
	_block_delete_if_workflow_active(doctype, name)
	frappe.delete_doc(doctype, name)
	frappe.db.commit()


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


def _apply_creation_date_filters(filters, from_date=None, to_date=None, fieldname="creation"):
	if from_date and to_date:
		filters[fieldname] = ["between", [from_date, to_date]]
	elif from_date:
		filters[fieldname] = [">=", from_date]
	elif to_date:
		filters[fieldname] = ["<=", to_date]


def _require_project_inventory_read_access():
	_require_roles(ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD, ROLE_DIRECTOR)


def _require_project_inventory_write_access():
	_require_roles(ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
