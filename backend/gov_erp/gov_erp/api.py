import json

import frappe
from gov_erp.gov_erp.doctype.ge_dependency_rule.ge_dependency_rule import (
	evaluate_dependency_state,
	resolve_reference_status,
)
from gov_erp.role_utils import (
	ROLE_ACCOUNTS,
	ROLE_DEPARTMENT_HEAD,
	ROLE_ENGINEERING_HEAD,
	ROLE_ENGINEER,
	ROLE_HR_MANAGER,
	ROLE_PRESALES_EXECUTIVE,
	ROLE_PRESALES_HEAD,
	ROLE_PROCUREMENT_MANAGER,
	ROLE_PURCHASE,
	ROLE_PROJECT_MANAGER,
	ROLE_SYSTEM_MANAGER,
	ROLE_STORE_MANAGER,
	ROLE_STORES_LOGISTICS_HEAD,
	ROLE_TOP_MANAGEMENT,
)


def _require_authenticated_user():
	if frappe.session.user == "Guest":
		frappe.throw("Authentication required", frappe.PermissionError)


def _require_roles(*roles):
	_require_authenticated_user()
	allowed_roles = set(roles) | {ROLE_SYSTEM_MANAGER}
	user_roles = set(frappe.get_roles(frappe.session.user))
	if user_roles.isdisjoint(allowed_roles):
		role_list = ", ".join(sorted(allowed_roles))
		frappe.throw(f"Insufficient role access. One of these roles is required: {role_list}", frappe.PermissionError)


def _require_tender_read_access():
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_DEPARTMENT_HEAD,
		ROLE_TOP_MANAGEMENT,
	)


def _require_tender_write_access():
	_require_roles(ROLE_PRESALES_HEAD, ROLE_PRESALES_EXECUTIVE)


def _require_tender_conversion_access():
	_require_roles(ROLE_PRESALES_HEAD, ROLE_DEPARTMENT_HEAD)


def _require_survey_read_access():
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_ENGINEERING_HEAD,
		ROLE_ENGINEER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_TOP_MANAGEMENT,
	)


def _require_survey_write_access():
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_ENGINEER)


def _require_boq_read_access():
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_ENGINEERING_HEAD,
		ROLE_DEPARTMENT_HEAD,
		ROLE_ACCOUNTS,
		ROLE_TOP_MANAGEMENT,
	)


def _require_boq_write_access():
	_require_roles(ROLE_PRESALES_HEAD, ROLE_PRESALES_EXECUTIVE)


def _require_boq_approval_access():
	_require_roles(ROLE_DEPARTMENT_HEAD)


def _require_cost_sheet_read_access():
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_ENGINEERING_HEAD,
		ROLE_DEPARTMENT_HEAD,
		ROLE_ACCOUNTS,
		ROLE_TOP_MANAGEMENT,
	)


def _require_cost_sheet_write_access():
	_require_roles(ROLE_PRESALES_HEAD, ROLE_PRESALES_EXECUTIVE)


def _require_cost_sheet_approval_access():
	_require_roles(ROLE_DEPARTMENT_HEAD)


def _require_procurement_read_access():
	_require_roles(
		ROLE_PROCUREMENT_MANAGER,
		ROLE_PURCHASE,
		ROLE_PRESALES_HEAD,
		ROLE_ACCOUNTS,
		ROLE_DEPARTMENT_HEAD,
		ROLE_TOP_MANAGEMENT,
	)


def _require_procurement_write_access():
	_require_roles(ROLE_PROCUREMENT_MANAGER, ROLE_PURCHASE)


def _require_procurement_approval_access():
	_require_roles(ROLE_DEPARTMENT_HEAD)


def _require_store_read_access():
	_require_roles(
		ROLE_STORE_MANAGER,
		ROLE_STORES_LOGISTICS_HEAD,
		ROLE_PROCUREMENT_MANAGER,
		ROLE_PURCHASE,
		ROLE_DEPARTMENT_HEAD,
		ROLE_TOP_MANAGEMENT,
	)


def _require_store_write_access():
	_require_roles(ROLE_STORE_MANAGER, ROLE_STORES_LOGISTICS_HEAD)


def _require_store_approval_access():
	_require_roles(ROLE_DEPARTMENT_HEAD)


def _require_execution_read_access():
	_require_roles(
		ROLE_PROJECT_MANAGER,
		ROLE_ENGINEERING_HEAD,
		ROLE_ENGINEER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_TOP_MANAGEMENT,
	)


def _require_execution_write_access():
	_require_roles(ROLE_PROJECT_MANAGER, ROLE_ENGINEERING_HEAD, ROLE_ENGINEER)


def _require_hr_read_access():
	_require_roles(
		ROLE_HR_MANAGER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_TOP_MANAGEMENT,
	)


def _require_hr_write_access():
	_require_roles(ROLE_HR_MANAGER)


def _require_hr_approval_access():
	_require_roles(ROLE_HR_MANAGER, ROLE_DEPARTMENT_HEAD)


def _require_dependency_override_approval_access():
	_require_roles(ROLE_DEPARTMENT_HEAD)


def _require_billing_read_access():
	_require_roles(
		ROLE_ACCOUNTS,
		ROLE_DEPARTMENT_HEAD,
		ROLE_TOP_MANAGEMENT,
		ROLE_PROJECT_MANAGER,
		ROLE_PRESALES_HEAD,
	)


def _require_billing_write_access():
	_require_roles(ROLE_ACCOUNTS)


def _require_billing_approval_access():
	_require_roles(ROLE_DEPARTMENT_HEAD)


def _require_om_read_access():
	_require_roles(
		ROLE_PROJECT_MANAGER,
		ROLE_ENGINEERING_HEAD,
		ROLE_ENGINEER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_TOP_MANAGEMENT,
	)


def _require_om_write_access():
	_require_roles(ROLE_PROJECT_MANAGER, ROLE_ENGINEERING_HEAD, ROLE_ENGINEER)


def _require_om_approval_access():
	_require_roles(ROLE_DEPARTMENT_HEAD, ROLE_TOP_MANAGEMENT)


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
			"name", "tender_number", "title", "client",
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
def get_organizations():
	"""Alias for get_parties — returns all active parties."""
	_require_tender_read_access()
	return get_parties(active="1")


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
	_require_execution_read_access()
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
	_require_execution_read_access()
	doc = frappe.get_doc("GE Milestone", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_milestone(data):
	"""Create a milestone."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Milestone", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Milestone created"}


@frappe.whitelist()
def update_milestone(name, data):
	"""Update a milestone."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Milestone", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Milestone updated"}


@frappe.whitelist()
def delete_milestone(name):
	"""Delete a milestone."""
	_require_execution_write_access()
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
		po = frappe.get_doc({
			"doctype": "Purchase Order",
			"supplier": supplier,
			"company": company,
			"items": [
				{
					"item_code": item.item_link,
					"qty": item.qty,
					"rate": item.rate,
					"description": item.description,
					"schedule_date": frappe.utils.add_days(frappe.utils.nowdate(), item.lead_time_days or 14),
					"uom": item.unit or "Nos",
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
	_require_om_read_access()
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
			"asset_serial_number", "rma_status", "rework_required",
			"replaced_serial_number", "refund_approved",
			"estimated_resolution_date", "actual_resolution_date",
			"closed_on", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_rma_tracker(name):
	"""Return a single RMA tracker."""
	_require_om_read_access()
	doc = frappe.get_doc("GE RMA Tracker", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_rma_tracker(data):
	"""Create an RMA tracker."""
	_require_om_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE RMA Tracker", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "RMA tracker created"}


@frappe.whitelist()
def update_rma_tracker(name, data):
	"""Update an RMA tracker."""
	_require_om_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE RMA Tracker", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "RMA tracker updated"}


@frappe.whitelist()
def delete_rma_tracker(name):
	"""Delete an RMA tracker."""
	_require_om_write_access()
	doc = frappe.get_doc("GE RMA Tracker", name)
	if doc.rma_status not in ("PENDING", "REJECTED"):
		return {"success": False, "message": f"Cannot delete RMA in {doc.rma_status} status"}
	frappe.delete_doc("GE RMA Tracker", name)
	frappe.db.commit()
	return {"success": True, "message": "RMA tracker deleted"}


@frappe.whitelist()
def approve_rma(name):
	"""Approve an RMA request."""
	_require_om_approval_access()
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
	_require_om_approval_access()
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
	_require_om_write_access()
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
	_require_om_write_access()
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
	_require_om_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	rows = frappe.get_all("GE RMA Tracker", filters=filters, fields=["rma_status", "rework_required", "refund_approved"])
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
		},
	}
