"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

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
		linked = _ensure_project_manager_project_scope(linked)
	if values.get("linked_site"):
		values["linked_site"] = _ensure_site_belongs_to_project(linked, values.get("linked_site"), allow_blank=False)
	values["linked_project"] = linked
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


