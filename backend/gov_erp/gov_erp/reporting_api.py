"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities
from gov_erp.execution_api import get_dpr_stats
from gov_erp.finance_api import get_invoice_stats, get_penalty_stats, get_retention_stats
from gov_erp.inventory_api import (
	get_dispatch_challan_stats,
	get_grn_stats,
	get_indent_stats,
	get_po_stats,
	get_stock_aging,
)
from gov_erp.om_api import get_rma_stats, get_ticket_stats
from gov_erp.procurement_api import get_boq_stats, get_vendor_comparison_stats
from gov_erp.survey_api import get_survey_stats
from gov_erp.tender_api import get_tender_stats


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
	from gov_erp.tender_api import get_tender_stats as _get_tender_stats
	from gov_erp.procurement_api import get_boq_stats as _get_boq_stats
	from gov_erp.survey_api import get_survey_stats as _get_survey_stats

	_require_tender_read_access()
	checklist_rows = frappe.get_all("GE Tender Checklist Item", fields=["completion_pct"])
	avg_completion = round(
		(sum(row.completion_pct or 0 for row in checklist_rows) / len(checklist_rows)), 2
	) if checklist_rows else 0
	return {
		"success": True,
		"data": {
			"tenders": _get_tender_stats().get("data", {}),
			"boqs": _get_boq_stats().get("data", {}),
			"surveys": _get_survey_stats().get("data", {}),
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
def get_project_manager_dashboard():
	"""Aggregate project-manager dashboard metrics scoped to assigned projects."""
	_require_roles(ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD, ROLE_DIRECTOR)
	project_filters = {}
	_apply_project_manager_project_filter(project_filters, project_field="name")
	projects = frappe.get_all(
		"Project",
		filters=project_filters,
		fields=["name", "project_name", "status", "current_project_stage", "current_stage_status",
				"spine_blocked", "blocker_summary", "total_sites", "spine_progress_pct"],
	)
	project_names = [p.name for p in projects]
	project_name_map = {p.name: p.project_name for p in projects}
	site_filters = {"linked_project": ["in", project_names]} if project_names else {}
	sites = frappe.get_all(
		"GE Site",
		filters=site_filters,
		fields=["name", "site_code", "site_name", "linked_project", "status", "installation_stage", "current_site_stage", "location_progress_pct"],
	)
	site_names = [s.name for s in sites]
	survey_filters = {"linked_project": ["in", project_names]} if project_names else {}
	if site_names:
		survey_filters["linked_site"] = ["in", site_names]
	surveys = frappe.get_all("GE Survey", filters=survey_filters, fields=["name", "linked_project", "linked_site", "status"])
	petty_cash_filters = {"linked_project": ["in", project_names]} if project_names else {}
	petty_cash = frappe.get_all("GE Petty Cash", filters=petty_cash_filters, fields=["name", "status", "amount"])
	ph_approval_filters = {"project": ["in", project_names]} if project_names else {}
	ph_items = frappe.get_all("GE PH Approval Item", filters=ph_approval_filters, fields=["name", "status", "source_type", "amount"])
	dpr_filters = {"linked_project": ["in", project_names]} if project_names else {}
	dprs = frappe.get_all("GE DPR", filters=dpr_filters, fields=["name", "linked_project", "report_date"])
	today_dprs = [d for d in dprs if cstr(d.report_date) == frappe.utils.nowdate()]
	return {
		"success": True,
		"data": {
			"projects": {
				"total": len(projects),
				"active": sum(1 for p in projects if (p.status or "").lower() not in ("completed", "cancelled")),
				"blocked": sum(1 for p in projects if cint(p.spine_blocked)),
				"avg_progress": round(sum(flt(p.spine_progress_pct) for p in projects) / max(len(projects), 1), 1),
			},
			"project_list": [
				{
					"name": p.name,
					"project_name": p.project_name,
					"status": p.status,
					"stage": p.current_project_stage,
					"stage_status": p.current_stage_status,
					"blocked": cint(p.spine_blocked),
					"blocker": p.blocker_summary,
					"sites": p.total_sites,
					"progress": flt(p.spine_progress_pct),
				} for p in projects[:20]
			],
			"sites": {
				"total": len(sites),
				"active": sum(1 for s in sites if (s.status or "").lower() not in ("closed", "cancelled")),
			},
			"site_list": [
				{
					"name": site.name,
					"site_code": site.site_code,
					"site_name": site.site_name,
					"linked_project": site.linked_project,
					"project_name": project_name_map.get(site.linked_project, site.linked_project),
					"status": site.status,
					"stage": site.current_site_stage or site.installation_stage,
					"progress": flt(site.location_progress_pct),
				}
				for site in sites[:30]
			],
			"surveys": {
				"total": len(surveys),
				"pending": sum(1 for s in surveys if (s.status or "").upper() in ("DRAFT", "IN_PROGRESS", "PENDING")),
				"completed": sum(1 for s in surveys if (s.status or "").upper() in ("COMPLETED", "APPROVED")),
			},
			"petty_cash": {
				"total": len(petty_cash),
				"pending": sum(1 for pc in petty_cash if (pc.status or "").lower() in ("draft", "pending")),
				"approved": sum(1 for pc in petty_cash if (pc.status or "").lower() == "approved"),
				"total_amount": sum(flt(pc.amount) for pc in petty_cash),
			},
			"approvals": {
				"pending_ph": sum(1 for i in ph_items if i.status == "Submitted to PH"),
				"approved": sum(1 for i in ph_items if i.status in ("Approved by PH", "Forwarded to Costing", "Disbursed / Released")),
				"rejected": sum(1 for i in ph_items if i.status == "Rejected by PH"),
			},
			"dprs": {
				"total": len(dprs),
				"today": len(today_dprs),
				"projects_with_today_dpr": len({d.linked_project for d in today_dprs}),
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
	total_project_rows = frappe.db.count("Project")
	live_project_total = frappe.db.count("Project", {"total_sites": [">", 0]})
	empty_shell_projects = max(total_project_rows - live_project_total, 0)
	return {
		"success": True,
		"data": {
			"projects": {
				"total": live_project_total,
				"empty_shells": empty_shell_projects,
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
def get_director_dashboard():
	"""Director-specific dashboard wrapper with explicit ownership of the home view."""
	_require_roles(ROLE_DIRECTOR)
	payload = get_executive_dashboard()
	if not payload.get("success"):
		return payload

	data = payload.get("data") or {}
	data["persona"] = {
		"role": ROLE_DIRECTOR,
		"view": "director",
		"title": "Director Command Center",
	}
	return {"success": True, "data": data}


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
		_reminder_project = r.get("linked_project")
		_reminder_route = f"/projects/{_reminder_project}?tab=activity" if _reminder_project else None
		feed.append({
			"type": "reminder",
			"subtype": "due",
			"title": r.get("title") or "Reminder",
			"detail": f"Due: {str(r.get('next_reminder_at') or '')[:16]}",
			"ref_doctype": r.get("reference_doctype"),
			"ref_name": r.get("reference_name"),
			"route": _reminder_route,
			"project": _reminder_project,
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
		_doc_route = f"/projects/{d.linked_project}?tab=dossier" if d.linked_project else None
		feed.append({
			"type": "document",
			"subtype": "expiring",
			"title": f"Document expiring: {d.document_name}",
			"detail": f"Expires {d.expiry_date}",
			"ref_doctype": "GE Project Document",
			"ref_name": d.name,
			"route": _doc_route,
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

	for ms in overdue_milestones[:5]:
		feed.append({
			"type": "alert",
			"subtype": "overdue_milestone",
			"title": f"Overdue milestone: {ms.milestone_name}",
			"detail": f"Was due {ms.planned_date} on {ms.linked_project or 'project'}",
			"ref_doctype": "GE Milestone",
			"ref_name": ms.name,
			"route": f"/projects/{ms.linked_project}?tab=milestones" if ms.linked_project else None,
			"project": ms.linked_project,
			"is_read": 0,
			"timestamp": str(ms.planned_date),
			"source_name": ms.name,
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
