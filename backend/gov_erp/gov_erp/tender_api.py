"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

# ── Tender APIs ──────────────────────────────────────────────

@frappe.whitelist()
def get_tenders(filters=None, limit_page_length=50, limit_start=0):
	"""Return list of tenders with pagination."""
	_require_tender_read_access()
	from gov_erp.presales_api import _get_funnel_color_key
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
			"pbg_percent", "user_color_slot", "user_color_remarks",
			"enquiry_pending", "pu_nzd_qualified",
			"bid_opening_date", "latest_corrigendum_date",
			"consultant_name", "closure_letter_received",
		],
		order_by="submission_date asc, creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
	)
	total = frappe.db.count("GE Tender", filters=parsed_filters)

	# Attach computed fields expected by frontend FunnelTenderTable
	tender_names = [t["name"] for t in data]
	latest_bids = {}
	if tender_names:
		bid_rows = frappe.get_all(
			"GE Bid",
			filters={"linked_tender": ["in", tender_names]},
			fields=["name", "linked_tender", "status", "bid_amount", "bid_date"],
			order_by="creation desc",
		)
		for b in bid_rows:
			if b.linked_tender not in latest_bids:
				latest_bids[b.linked_tender] = b

	for t in data:
		_attach_computed_tender_funnel_status(t)
		t["funnel_color_key"] = _get_funnel_color_key(t)
		t["latest_bid"] = latest_bids.get(t["name"])

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


