"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Vendor Comparison",
			subject_name=name,
			event_type=EventType.CREATED,
			linked_project=vc.linked_project if hasattr(vc, "linked_project") else None,
			from_status="APPROVED",
			to_status="PO_CREATED",
			current_status="PO_CREATED",
			remarks=f"Created {len(created_pos)} PO(s): {', '.join(created_pos)}",
			current_owner_role=_detect_primary_role(),
			source_route=f"/vendor-comparison/{name}",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: create_po_from_comparison")

	return {
		"success": True,
		"data": {"vendor_comparison": name, "purchase_orders": created_pos},
		"message": f"Created {len(created_pos)} Purchase Order(s)",
	}


