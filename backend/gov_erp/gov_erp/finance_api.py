"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

_PROJECT_INVENTORY_RECEIPT_ALIAS_MAP = {
	"linked_project": "linked_project",
	"linked_site": "linked_site",
	"item_code": "item_code",
	"item_name": "item_name",
	"item": "item_name",
	"received_qty": "received_qty",
	"qty": "received_qty",
	"uom": "unit",
	"unit": "unit",
	"received_date": "last_received_on",
	"hsn_code": "hsn_code",
	"make": "make",
	"model_no": "model_no",
	"serial_no": "serial_no",
	"from_vendor_s_project_received": "source_reference",
	"from_vendor_project_received": "source_reference",
	"invoice_no": "invoice_no",
	"purchase_order": "purchase_order",
	"purchase_cost": "purchase_cost",
	"remark": "last_receipt_note",
	"remarks": "last_receipt_note",
}


def _normalize_project_inventory_receipt_values(values):
	normalized = {}
	for key, value in (values or {}).items():
		target = _PROJECT_INVENTORY_RECEIPT_ALIAS_MAP.get(_normalize_sheet_header(key))
		if target:
			if value in (None, "") and normalized.get(target) not in (None, ""):
				continue
			normalized[target] = value
			continue
		normalized[key] = value

	if not cstr(normalized.get("item_code") or "").strip() and cstr(normalized.get("item_name") or "").strip():
		normalized["item_code"] = normalized["item_name"]
	return normalized

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Invoice",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=getattr(doc, "linked_project", None) or getattr(doc, "project", None),
			from_status="DRAFT",
			to_status="SUBMITTED",
			current_status="SUBMITTED",
			current_owner_role=_detect_primary_role(),
			source_route=f"/invoice/{name}",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_invoice")

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Payment Receipt",
			subject_name=doc.name,
			event_type=EventType.CREATED,
			linked_project=getattr(doc, "linked_project", None) or getattr(doc, "project", None),
			current_status="Created",
			remarks=f"Receipt type: {doc.receipt_type}, amount: {getattr(doc, 'amount_received', '')}",
			current_owner_role=_detect_primary_role(),
			source_route=f"/payment-receipt/{doc.name}",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: create_payment_receipt")

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Penalty Deduction",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="APPROVED",
			to_status="APPLIED",
			current_status="APPLIED",
			remarks=f"Applied to invoice {invoice_name}" if invoice_name else None,
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/penalties" if doc.get("linked_project") else "/finance/penalties",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: apply_penalty_deduction")

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
	if (doc.status or "").upper() not in ("", "PENDING"):
		frappe.throw(f"Cannot approve petty cash entry in status '{doc.status}'")
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
	if (doc.status or "").upper() not in ("", "PENDING"):
		frappe.throw(f"Cannot reject petty cash entry in status '{doc.status}'")
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
	if (doc.status or "").upper() not in ("", "PENDING", "DRAFT"):
		frappe.throw(f"Cannot delete petty cash entry in status '{doc.status}'")
	assigned = _get_project_manager_assigned_projects()
	if assigned and doc.linked_project not in assigned:
		frappe.throw("Project Manager cannot delete petty cash outside assigned projects", frappe.PermissionError)
	frappe.delete_doc("GE Petty Cash", name)
	frappe.db.commit()
	return {"success": True, "message": "Petty cash entry deleted"}


@frappe.whitelist()
def submit_petty_cash_to_ph(name=None, remarks=None):
	"""Send an approved petty cash entry to PH approval queue for costing release."""
	_require_petty_cash_write_access()
	_require_project_head_workflow()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Petty Cash", name)
	if (doc.get("status") or "").strip().lower() != "approved":
		frappe.throw("Only approved petty cash entries can be sent to Project Head")

	existing_name = frappe.db.get_value(
		"GE PH Approval Item",
		{
			"source_type": "Petty Cash",
			"source_name": doc.name,
			"status": ["not in", ["Rejected by PH", "Disbursed / Released"]],
		},
		"name",
	)
	if existing_name:
		return {
			"success": True,
			"data": frappe.get_doc("GE PH Approval Item", existing_name).as_dict(),
			"message": f"Petty cash {doc.name} is already in the Project Head approval chain",
		}

	ph_item = frappe.get_doc({
		"doctype": "GE PH Approval Item",
		"source_type": "Petty Cash",
		"source_name": doc.name,
		"source_id": doc.name,
		"originating_module": "Finance",
		"project": doc.linked_project,
		"linked_site": doc.linked_site,
		"raised_by": frappe.session.user,
		"raised_on": now_datetime(),
		"amount": doc.amount,
		"status": "Submitted to PH",
		"linked_record": f"/petty-cash/{doc.name}",
		"priority": "Medium",
		"remarks": cstr(remarks).strip() or doc.get("description") or "",
	})
	ph_item.insert()
	frappe.db.commit()

	try:
		from gov_erp.alert_dispatcher import emit_alert
		emit_alert(
			"approval_assigned",
			f"Petty cash {doc.name} submitted for Project Head approval",
			project=doc.linked_project,
			reference_doctype="GE PH Approval Item",
			reference_name=ph_item.name,
			route_path=f"/projects/{doc.linked_project}?tab=approvals" if doc.linked_project else "/approvals",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Alert: submit_petty_cash_to_ph")

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Petty Cash",
			subject_name=doc.name,
			event_type=EventType.SUBMITTED,
			linked_project=doc.linked_project,
			from_status="approved",
			to_status="Submitted to PH",
			current_status="Submitted to PH",
			remarks=cstr(remarks).strip() or None,
			current_owner_role=_detect_primary_role(),
			source_route=f"/petty-cash/{doc.name}",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_petty_cash_to_ph")

	return {"success": True, "data": ph_item.as_dict(), "message": f"Petty cash {doc.name} submitted to Project Head for approval"}


@frappe.whitelist()
def create_petty_cash_fund_request(data):
	"""Create a PH-bound petty cash fund request."""
	_require_petty_cash_write_access()
	_require_project_head_workflow()
	values = _parse_payload(data)
	project = _ensure_project_manager_project_scope(values.get("project"))
	linked_site = _ensure_site_belongs_to_project(project, values.get("linked_site"), allow_blank=True)
	amount = flt(values.get("amount"))
	purpose = cstr(values.get("purpose")).strip()
	if amount <= 0:
		frappe.throw("Amount must be greater than zero")
	if not purpose:
		frappe.throw("Purpose is required")

	doc = frappe.get_doc({
		"doctype": "GE PH Approval Item",
		"source_type": "Petty Cash",
		"source_name": "",
		"source_id": "",
		"originating_module": "Project Management",
		"project": project,
		"linked_site": linked_site or None,
		"raised_by": frappe.session.user,
		"raised_on": values.get("requested_on") or now_datetime(),
		"amount": amount,
		"status": "Submitted to PH",
		"linked_record": "/petty-cash",
		"priority": values.get("priority") or "Medium",
		"remarks": purpose,
	})
	doc.insert()
	doc.source_name = doc.name
	doc.source_id = doc.name
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Fund request submitted to Project Head"}


@frappe.whitelist()
def get_petty_cash_fund_requests(project=None, site=None, status=None):
	"""List petty cash fund requests that move through PH approval."""
	_require_petty_cash_read_access()
	_require_project_head_workflow()
	filters = {"source_type": "Petty Cash"}
	_apply_project_manager_project_filter(filters, project=project, project_field="project")
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	rows = frappe.get_all(
		"GE PH Approval Item",
		filters=filters,
		fields=[
			"name", "project", "linked_site", "raised_by", "raised_on", "amount",
			"remarks", "status", "ph_approver", "ph_remarks",
		],
		order_by="raised_on desc, creation desc",
	)
	return {
		"success": True,
		"data": [
			{
				"name": row.name,
				"project": row.project,
				"linked_site": row.linked_site,
				"requested_by": row.raised_by,
				"requested_on": row.raised_on,
				"amount": row.amount,
				"purpose": row.remarks,
				"status": row.status,
				"ph_approver": row.ph_approver,
				"ph_remarks": row.ph_remarks,
			}
			for row in rows
		],
		"stats": {
			"pending": sum(1 for row in rows if row.status == "Submitted to PH"),
			"approved": sum(1 for row in rows if row.status == "Forwarded to Costing"),
			"rejected": sum(1 for row in rows if row.status == "Rejected by PH"),
		},
	}


@frappe.whitelist()
def submit_po_to_ph(name, remarks=None):
	"""Send a submitted purchase order to the PH approval queue."""
	_require_procurement_write_access()
	_require_project_head_workflow()
	name = _require_param(name, "name")
	po = frappe.get_doc("Purchase Order", name)
	if po.docstatus != 1:
		frappe.throw("Only submitted Purchase Orders can be sent to Project Head")

	existing_name = frappe.db.get_value(
		"GE PH Approval Item",
		{
			"source_type": "PO",
			"source_name": po.name,
			"status": ["not in", ["Rejected by PH", "Disbursed / Released"]],
		},
		"name",
	)
	if existing_name:
		return {
			"success": True,
			"data": frappe.get_doc("GE PH Approval Item", existing_name).as_dict(),
			"message": f"PO {po.name} is already in the Project Head approval chain",
		}

	doc = frappe.get_doc({
		"doctype": "GE PH Approval Item",
		"source_type": "PO",
		"source_name": po.name,
		"source_id": po.name,
		"originating_module": "Procurement",
		"project": po.project,
		"raised_by": frappe.session.user,
		"raised_on": now_datetime(),
		"amount": po.grand_total or po.rounded_total,
		"status": "Submitted to PH",
		"linked_record": _source_route_for_project_head_item("PO", po.name),
		"priority": "Medium",
		"remarks": cstr(remarks).strip(),
	})
	doc.insert()
	frappe.db.commit()

	# Notify Project Head that a PO needs approval
	try:
		from gov_erp.alert_dispatcher import emit_alert
		emit_alert(
			"approval_assigned",
			f"PO {po.name} submitted for Project Head approval",
			project=po.project,
			reference_doctype="GE PH Approval Item",
			reference_name=doc.name,
			route_path=f"/projects/{po.project}?tab=approvals" if po.project else "/approvals",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Alert: submit_po_to_ph")

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="Purchase Order",
			subject_name=po.name,
			event_type=EventType.SUBMITTED,
			linked_project=po.project,
			from_status="Submitted",
			to_status="Submitted to PH",
			current_status="Submitted to PH",
			remarks=cstr(remarks).strip() or None,
			current_owner_role=_detect_primary_role(),
			source_route=f"/purchase-order/{po.name}",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_po_to_ph")

	return {"success": True, "data": doc.as_dict(), "message": f"PO {po.name} submitted to Project Head for approval"}


@frappe.whitelist()
def submit_rma_po_to_ph(name, remarks=None):
	"""Send an RMA-linked PO spend request to the PH approval queue."""
	_require_rma_write_access()
	_require_project_head_workflow()
	name = _require_param(name, "name")
	rma = frappe.get_doc("GE RMA Tracker", name)

	existing_name = frappe.db.get_value(
		"GE PH Approval Item",
		{
			"source_type": "RMA PO",
			"source_name": rma.name,
			"status": ["not in", ["Rejected by PH", "Disbursed / Released"]],
		},
		"name",
	)
	if existing_name:
		return {
			"success": True,
			"data": frappe.get_doc("GE PH Approval Item", existing_name).as_dict(),
			"message": f"RMA PO {rma.rma_purchase_order_no or rma.name} is already in the Project Head approval chain",
		}

	doc = frappe.get_doc({
		"doctype": "GE PH Approval Item",
		"source_type": "RMA PO",
		"source_name": rma.name,
		"source_id": rma.rma_purchase_order_no or rma.name,
		"originating_module": "RMA",
		"project": rma.linked_project,
		"raised_by": frappe.session.user,
		"raised_on": now_datetime(),
		"amount": rma.repair_invoice_amount or rma.repair_cost,
		"status": "Submitted to PH",
		"linked_record": _source_route_for_project_head_item("RMA PO", rma.name),
		"priority": "Medium",
		"remarks": cstr(remarks).strip() or cstr(rma.remarks).strip(),
	})
	doc.insert()
	frappe.db.commit()

	# Notify Project Head that an RMA PO needs approval
	try:
		from gov_erp.alert_dispatcher import emit_alert
		emit_alert(
			"approval_assigned",
			f"RMA PO {doc.source_id} submitted for Project Head approval",
			project=rma.linked_project,
			reference_doctype="GE PH Approval Item",
			reference_name=doc.name,
			route_path=f"/projects/{rma.linked_project}?tab=approvals" if rma.linked_project else "/approvals",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Alert: submit_rma_po_to_ph")

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE RMA Tracker",
			subject_name=rma.name,
			event_type=EventType.SUBMITTED,
			linked_project=rma.linked_project,
			from_status="Open",
			to_status="Submitted to PH",
			current_status="Submitted to PH",
			remarks=cstr(remarks).strip() or None,
			current_owner_role=_detect_primary_role(),
			source_route=f"/rma/{rma.name}",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_rma_po_to_ph")

	return {"success": True, "data": doc.as_dict(), "message": f"RMA PO {doc.source_id} submitted to Project Head for approval"}


@frappe.whitelist()
def get_ph_approval_items(tab=None, project=None, status=None, limit_page_length=50, limit_start=0):
	"""List Project Head approval items by lane."""
	_require_roles(ROLE_PROJECT_HEAD, ROLE_DIRECTOR)
	_require_project_head_workflow()
	filters = {}
	tab_map = {"po": "PO", "rma_po": "RMA PO", "petty_cash": "Petty Cash"}
	if tab:
		filters["source_type"] = tab_map.get(tab, tab)
	if project:
		filters["project"] = project
	if status:
		filters["status"] = status
	rows = frappe.get_all(
		"GE PH Approval Item",
		filters=filters,
		fields=[
			"name", "source_type", "source_name", "source_id", "originating_module",
			"project", "linked_site", "raised_by", "raised_on", "amount", "status", "linked_record",
			"priority", "remarks", "ph_approver", "ph_approval_date",
			"costing_queue_ref", "disbursement_status",
		],
		order_by="raised_on desc, creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
	)
	stats_filters = {k: v for k, v in filters.items() if k != "status"}
	stats_rows = frappe.get_all(
		"GE PH Approval Item",
		filters=stats_filters,
		fields=["status"],
		page_length=0,
	)
	return {
		"success": True,
		"data": rows,
		"stats": {
			"pending": sum(1 for row in stats_rows if row.status == "Submitted to PH"),
			"approved": sum(1 for row in stats_rows if row.status == "Approved by PH"),
			"rejected": sum(1 for row in stats_rows if row.status == "Rejected by PH"),
			"forwarded": sum(1 for row in stats_rows if row.status in {"Forwarded to Costing", "Disbursed / Released"}),
		},
	}


@frappe.whitelist()
def get_ph_approval_item(name):
	"""Return one PH approval item with source attachments."""
	_require_roles(ROLE_PROJECT_HEAD, ROLE_DIRECTOR, ROLE_ACCOUNTS)
	_require_project_head_workflow()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE PH Approval Item", name)
	data = doc.as_dict()
	data["supporting_docs"] = _approval_supporting_docs(doc.source_type, doc.source_name)
	return {"success": True, "data": data}


@frappe.whitelist()
def ph_approve_item(name, remarks=None):
	"""Approve a PH approval item and forward it to costing."""
	_require_roles(ROLE_PROJECT_HEAD, ROLE_DIRECTOR)
	_require_project_head_workflow()
	doc = frappe.get_doc("GE PH Approval Item", _require_param(name, "name"))
	if doc.status != "Submitted to PH":
		frappe.throw(f"Only submitted items can be approved (current: {doc.status})")
	doc.ph_approver = frappe.session.user
	doc.ph_approval_date = now_datetime()
	doc.ph_remarks = cstr(remarks).strip()
	doc.status = "Approved by PH"
	if doc.source_type == "RMA PO" and doc.source_name and frappe.db.exists("GE RMA Tracker", doc.source_name):
		rma = frappe.get_doc("GE RMA Tracker", doc.source_name)
		rma.approved_by_project_head = frappe.session.user
		rma.save()
	queue = _create_costing_queue_entry(doc)
	_sync_approval_with_costing_queue(doc, queue)
	doc.save()
	frappe.db.commit()

	# Accountability ledger
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE PH Approval Item",
			subject_name=doc.name,
			event_type=EventType.APPROVED,
			linked_project=doc.project,
			from_status="Submitted to PH",
			to_status="Approved by PH",
			current_status="Approved by PH",
			submitted_by=frappe.session.user,
			submitted_on=now_datetime(),
			current_owner_role="Project Head",
			source_route=f"/projects/{doc.project}?tab=approvals" if doc.project else "/approvals",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: ph_approve_item")

	# Alert the requester
	try:
		from gov_erp.alert_dispatcher import emit_alert
		emit_alert(
			"approval_acted",
			f"{doc.source_type} {doc.source_id} approved by Project Head",
			project=doc.project,
			reference_doctype="GE PH Approval Item",
			reference_name=doc.name,
			route_path=f"/projects/{doc.project}?tab=approvals" if doc.project else "/approvals",
			extra_recipients=[doc.raised_by] if doc.raised_by else None,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Alert: ph_approve_item")

	return {"success": True, "data": doc.as_dict(), "message": "Request approved and forwarded to Costing"}


@frappe.whitelist()
def ph_reject_item(name, remarks=None):
	"""Reject a PH approval item."""
	_require_roles(ROLE_PROJECT_HEAD, ROLE_DIRECTOR)
	_require_project_head_workflow()
	doc = frappe.get_doc("GE PH Approval Item", _require_param(name, "name"))
	if doc.status != "Submitted to PH":
		frappe.throw(f"Only submitted items can be rejected (current: {doc.status})")
	doc.ph_approver = frappe.session.user
	doc.ph_approval_date = now_datetime()
	doc.ph_remarks = cstr(remarks).strip()
	doc.status = "Rejected by PH"
	doc.save()
	frappe.db.commit()

	# Accountability ledger
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE PH Approval Item",
			subject_name=doc.name,
			event_type=EventType.REJECTED,
			linked_project=doc.project,
			from_status="Submitted to PH",
			to_status="Rejected by PH",
			current_status="Rejected by PH",
			submitted_by=frappe.session.user,
			submitted_on=now_datetime(),
			current_owner_role="Project Head",
			source_route=f"/projects/{doc.project}?tab=approvals" if doc.project else "/approvals",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: ph_reject_item")

	# Alert the requester
	try:
		from gov_erp.alert_dispatcher import emit_alert
		emit_alert(
			"approval_acted",
			f"{doc.source_type} {doc.source_id} rejected by Project Head",
			project=doc.project,
			reference_doctype="GE PH Approval Item",
			reference_name=doc.name,
			route_path=f"/projects/{doc.project}?tab=approvals" if doc.project else "/approvals",
			extra_recipients=[doc.raised_by] if doc.raised_by else None,
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Alert: ph_reject_item")

	return {"success": True, "data": doc.as_dict(), "message": "Request rejected"}


@frappe.whitelist()
def get_costing_queue(project=None, status=None, source_type=None, limit_page_length=50, limit_start=0):
	"""List PH-approved items awaiting costing action."""
	_require_roles(ROLE_ACCOUNTS, ROLE_DIRECTOR, ROLE_PROJECT_HEAD)
	_require_project_head_workflow()
	filters = {}
	if project:
		filters["project"] = project
	if status:
		filters["disbursement_status"] = status
	if source_type:
		filters["source_type"] = source_type
	rows = frappe.get_all(
		"GE Costing Queue",
		filters=filters,
		fields=[
			"name", "source_type", "source_name", "source_id", "entry_label",
			"ph_approver", "ph_approval_date", "amount", "project", "linked_site",
			"vendor_beneficiary", "disbursement_status", "linked_record",
		],
		order_by="creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
	)
	stats_filters = {k: v for k, v in filters.items() if k != "disbursement_status"}
	stats_rows = frappe.get_all(
		"GE Costing Queue",
		filters=stats_filters,
		fields=["disbursement_status"],
		page_length=0,
	)
	return {
		"success": True,
		"data": rows,
		"stats": {
			"pending": sum(1 for row in stats_rows if (row.disbursement_status or "Pending") == "Pending"),
			"released": sum(1 for row in stats_rows if row.disbursement_status == "Released"),
			"held": sum(1 for row in stats_rows if row.disbursement_status == "Held"),
			"rejected": sum(1 for row in stats_rows if row.disbursement_status == "Rejected"),
		},
	}


@frappe.whitelist()
def get_costing_queue_item(name):
	"""Return one costing queue entry."""
	_require_roles(ROLE_ACCOUNTS, ROLE_DIRECTOR, ROLE_PROJECT_HEAD)
	_require_project_head_workflow()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Costing Queue", name)
	return {"success": True, "data": doc.as_dict()}


def _costing_queue_action(name, next_status, remarks=None):
	queue = frappe.get_doc("GE Costing Queue", _require_param(name, "name"))
	current = (queue.disbursement_status or "").strip()
	VALID_TRANSITIONS = {
		"Released": ("Pending", "Held", ""),
		"Held": ("Pending", ""),
		"Rejected": ("Pending", "Held", ""),
	}
	allowed_from = VALID_TRANSITIONS.get(next_status, ())
	if current not in allowed_from:
		frappe.throw(f"Cannot change costing queue status from '{current}' to '{next_status}'")
	queue.disbursement_status = next_status
	queue.costing_remarks = cstr(remarks).strip()
	queue.disbursed_by = frappe.session.user
	queue.disbursed_on = now_datetime()
	queue.save()
	if queue.approval_item and frappe.db.exists("GE PH Approval Item", queue.approval_item):
		approval_doc = frappe.get_doc("GE PH Approval Item", queue.approval_item)
		_sync_approval_with_costing_queue(approval_doc, queue)
		approval_doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		_event_map = {
			"Released": EventType.APPROVED,
			"Held": EventType.BLOCKED,
			"Rejected": EventType.REJECTED,
		}
		record_and_log(
			subject_doctype="GE Costing Queue",
			subject_name=queue.name,
			event_type=_event_map.get(next_status, EventType.SUBMITTED),
			linked_project=queue.project if hasattr(queue, "project") else None,
			from_status=current,
			to_status=next_status,
			current_status=next_status,
			remarks=cstr(remarks).strip() or None,
			current_owner_role=_detect_primary_role(),
			source_route=f"/costing-queue/{queue.name}",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: _costing_queue_action")

	return {"success": True, "data": queue.as_dict()}


@frappe.whitelist()
def costing_release_item(name, remarks=None):
	"""Release / disburse a costing queue item."""
	_require_roles(ROLE_ACCOUNTS, ROLE_DIRECTOR)
	_require_project_head_workflow()
	result = _costing_queue_action(name, "Released", remarks)
	result["message"] = "Costing item released"
	return result


@frappe.whitelist()
def costing_hold_item(name, remarks=None):
	"""Put a costing queue item on hold."""
	_require_roles(ROLE_ACCOUNTS, ROLE_DIRECTOR)
	_require_project_head_workflow()
	result = _costing_queue_action(name, "Held", remarks)
	result["message"] = "Costing item held"
	return result


@frappe.whitelist()
def costing_reject_item(name, remarks=None):
	"""Reject a costing queue item."""
	_require_roles(ROLE_ACCOUNTS, ROLE_DIRECTOR)
	_require_project_head_workflow()
	result = _costing_queue_action(name, "Rejected", remarks)
	result["message"] = "Costing item rejected"
	return result


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
			"hsn_code",
			"make",
			"model_no",
			"serial_no",
			"unit",
			"received_qty",
			"consumed_qty",
			"balance_qty",
			"last_received_on",
			"source_reference",
			"invoice_no",
			"purchase_order",
			"purchase_cost",
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
	values = _normalize_project_inventory_receipt_values(_parse_payload(data))
	project = _ensure_project_manager_project_scope(values.get("linked_project"))
	values["linked_site"] = _ensure_site_belongs_to_project(project, values.get("linked_site"), allow_blank=True)
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
				"hsn_code": values.get("hsn_code"),
				"make": values.get("make"),
				"model_no": values.get("model_no"),
				"serial_no": values.get("serial_no"),
				"unit": values.get("unit"),
				"received_qty": received_qty,
				"consumed_qty": 0,
				"last_received_on": values.get("last_received_on"),
				"source_reference": values.get("source_reference"),
				"invoice_no": values.get("invoice_no"),
				"purchase_order": values.get("purchase_order"),
				"purchase_cost": flt(values.get("purchase_cost")),
				"last_grn_ref": values.get("last_grn_ref"),
				"last_receipt_note": values.get("last_receipt_note"),
			}
		)
	doc.item_name = values.get("item_name") or doc.item_name or item_code
	doc.hsn_code = values.get("hsn_code") or doc.hsn_code
	doc.make = values.get("make") or doc.make
	doc.model_no = values.get("model_no") or doc.model_no
	doc.serial_no = values.get("serial_no") or doc.serial_no
	doc.unit = values.get("unit") or doc.unit
	doc.last_received_on = values.get("last_received_on") or doc.last_received_on
	doc.source_reference = values.get("source_reference") or doc.source_reference
	doc.invoice_no = values.get("invoice_no") or doc.invoice_no
	doc.purchase_order = values.get("purchase_order") or doc.purchase_order
	if values.get("purchase_cost") not in (None, ""):
		doc.purchase_cost = flt(values.get("purchase_cost"))
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
	values["linked_site"] = _ensure_site_belongs_to_project(project, values.get("linked_site"), allow_blank=True)
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
