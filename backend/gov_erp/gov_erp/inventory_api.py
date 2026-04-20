"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

INVENTORY_IN_REFERENCE_HEADERS = [
	"Received Date",
	"HSN CODE",
	"item",
	"Make",
	"Model No..",
	"Serial No.",
	"QTY",
	"UOM",
	"From Vendor's/Project Received",
	"Invoice no.",
	"Purchase Order",
	"purchase cost.",
	"REMARK",
]

DISPATCH_OUT_REFERENCE_HEADERS = [
	"Send Date",
	"challan no.",
	"ITEM OF DESCRIPTION",
	"MAKE",
	"MODEL NO.",
	"SERIAL NO.",
	"QTY",
	"UOM",
	"Issued location /project",
	"Name of person issued",
	"Remark",
]

_DISPATCH_PARENT_ALIAS_MAP = {
	"dispatch_date": "dispatch_date",
	"send_date": "dispatch_date",
	"challan_no": "challan_reference",
	"challan_reference": "challan_reference",
	"issued_location_project": "target_site_name",
	"target_site_name": "target_site_name",
	"name_of_person_issued": "issued_to_name",
	"issued_to_name": "issued_to_name",
	"remark": "remarks",
	"remarks": "remarks",
}

_DISPATCH_ITEM_ALIAS_MAP = {
	"item_link": "item_link",
	"item_code": "item_link",
	"description": "description",
	"item_of_description": "description",
	"item_of_discription": "description",
	"make": "make",
	"model_no": "model_no",
	"serial_no": "serial_numbers",
	"serial_numbers": "serial_numbers",
	"qty": "qty",
	"quantity": "qty",
	"uom": "uom",
	"remark": "remarks",
	"remarks": "remarks",
}


def _normalize_aliased_payload(values, alias_map):
	normalized = {}
	for key, value in (values or {}).items():
		target = alias_map.get(_normalize_sheet_header(key))
		if target:
			if value in (None, "") and normalized.get(target) not in (None, ""):
				continue
			normalized[target] = value
			continue
		normalized[key] = value
	return normalized


def _normalize_dispatch_item_payload(values):
	row = _normalize_aliased_payload(values, _DISPATCH_ITEM_ALIAS_MAP)
	if not cstr(row.get("description") or "").strip() and cstr(row.get("item_link") or "").strip():
		row["description"] = row["item_link"]
	return row


def _normalize_dispatch_challan_payload(values):
	normalized = _normalize_aliased_payload(values, _DISPATCH_PARENT_ALIAS_MAP)
	if "items" in normalized:
		normalized["items"] = [_normalize_dispatch_item_payload(item) for item in normalized.get("items") or []]
	if normalized.get("challan_reference") and not normalized.get("tracking_reference"):
		normalized["tracking_reference"] = normalized["challan_reference"]
	return normalized


@frappe.whitelist()
def get_inventory_reference_schema():
	"""Expose workbook-style header references for stores, receipts, and dispatch UX."""
	_require_authenticated_user()
	return {
		"success": True,
		"data": {
			"in_sheet": {
				"title": "All Received Materials Details-2026",
				"supported_for": ["ho_inventory", "site_inventory", "grn_reference"],
				"headers": INVENTORY_IN_REFERENCE_HEADERS,
			},
			"out_sheet": {
				"title": "All Issued Materials Details - 2026",
				"supported_for": ["ho_dispatch_challan"],
				"headers": DISPATCH_OUT_REFERENCE_HEADERS,
			},
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
			"total_qty", "challan_reference", "issued_to_name", "linked_stock_entry",
			"approved_by", "approved_at", "creation", "modified",
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
	values = _normalize_dispatch_challan_payload(_parse_payload(data))
	doc = frappe.get_doc({"doctype": "GE Dispatch Challan", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dispatch challan created"}


@frappe.whitelist()
def update_dispatch_challan(name, data):
	"""Update a dispatch challan."""
	_require_store_write_access()
	values = _normalize_dispatch_challan_payload(_parse_payload(data))
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
	"""Mark an approved dispatch challan as dispatched after stock validation.

	Posts OUT entries to the GE Inventory Ledger for every item line.
	"""
	_require_store_write_access()
	doc = frappe.get_doc("GE Dispatch Challan", name)
	if doc.status != "APPROVED":
		return {
			"success": False,
			"message": f"Dispatch challan is in {doc.status} status, must be APPROVED to dispatch",
		}
	doc.status = "DISPATCHED"
	doc.save()

	# ── Post OUT entries to inventory ledger ──────────────────────────
	_post_dispatch_challan_ledger_entries(doc)

	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Dispatch challan dispatched — stock updated"}


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
		ignore_permissions=True,
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
		ignore_permissions=True,
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
	doc = frappe.get_doc("Material Request", name, ignore_permissions=True)
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
	values["linked_site"] = _ensure_site_belongs_to_project(project, values.get("linked_site"), allow_blank=True)
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

	rows = frappe.get_all("Material Request", filters=filters, fields=["status", "docstatus"], ignore_permissions=True)
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
	doc = frappe.get_doc("Material Request", name, ignore_permissions=True)
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
	doc = frappe.get_doc("Material Request", name, ignore_permissions=True)
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
	doc = frappe.get_doc("Material Request", name, ignore_permissions=True)
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
	doc = frappe.get_doc("Material Request", name, ignore_permissions=True)
	if doc.docstatus != 1:
		frappe.throw("Only submitted indents can be rejected.")
	doc.status = "Stopped"
	doc.save(ignore_permissions=True)
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
	doc = frappe.get_doc("Material Request", name, ignore_permissions=True)
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
	doc = frappe.get_doc("Material Request", name, ignore_permissions=True)
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
		ignore_permissions=True,
	)
	total = frappe.db.count("Purchase Order", filters=filters)
	if data and _project_head_workflow_ready():
		status_map = _latest_project_head_status_by_source("PO", [row.name for row in data])
		for row in data:
			row["ph_status"] = status_map.get(row.name)
	return {"success": True, "data": data, "total": total}


@frappe.whitelist()
def get_purchase_order(name=None):
	"""Return one ERPNext purchase order."""
	_require_procurement_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("Purchase Order", name, ignore_permissions=True)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def get_po_stats(project=None):
	"""Aggregate purchase order counts and value for procurement dashboards."""
	_require_procurement_read_access()
	filters = {}
	if project:
		filters["project"] = project
	rows = frappe.get_all("Purchase Order", filters=filters, fields=["status", "docstatus", "grand_total"], ignore_permissions=True)
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
	po.insert(ignore_permissions=True)

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

	po = frappe.get_doc("Purchase Order", name, ignore_permissions=True)
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

	po.save(ignore_permissions=True)

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
	po = frappe.get_doc("Purchase Order", name, ignore_permissions=True)
	if po.docstatus != 0:
		frappe.throw("Only draft Purchase Orders can be deleted")

	# Delete linked extension if exists
	if frappe.db.exists("GE PO Extension", name):
		frappe.delete_doc("GE PO Extension", name)

	frappe.delete_doc("Purchase Order", name, ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "message": f"Purchase Order {name} deleted"}


@frappe.whitelist()
def submit_purchase_order(name=None):
	"""Submit a draft Purchase Order."""
	_require_procurement_write_access()
	name = _require_param(name, "name")
	po = frappe.get_doc("Purchase Order", name, ignore_permissions=True)
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
	po = frappe.get_doc("Purchase Order", name, ignore_permissions=True)
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
	_require_procurement_approval_access()
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
	_require_procurement_approval_access()
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
		ignore_permissions=True,
	)
	total = frappe.db.count("Purchase Receipt", filters=filters)
	return {"success": True, "data": data, "total": total}


@frappe.whitelist()
def get_grn(name=None):
	"""Return one ERPNext purchase receipt."""
	_require_store_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("Purchase Receipt", name, ignore_permissions=True)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_grn(data):
	"""Create a GRN backed by Purchase Receipt, optionally deriving lines from a PO."""
	_require_store_write_access()
	values = _parse_payload(data)
	if values.get("purchase_order") and not values.get("items"):
		po = frappe.get_doc("Purchase Order", values["purchase_order"], ignore_permissions=True)
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
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "GRN created"}


@frappe.whitelist()
def get_grn_stats(project=None):
	"""Aggregate GRN counts and value for stores dashboards."""
	_require_store_read_access()
	filters = {}
	if project:
		filters["project"] = project
	rows = frappe.get_all("Purchase Receipt", filters=filters, fields=["status", "docstatus", "grand_total"], ignore_permissions=True)
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
		ignore_permissions=True,
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
				ignore_permissions=True,
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
		ignore_permissions=True,
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
			ignore_permissions=True,
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


# ╔═══════════════════════════════════════════════════════════════╗
#   GE Inventory Ledger — dynamic IN/OUT stock tracking
# ╚═══════════════════════════════════════════════════════════════╝

def _post_ledger_entry(
	item_code, qty, direction, voucher_type, voucher_no,
	item_description=None, make=None, model_no=None, hsn_code=None,
	serial_numbers=None, uom=None, rate=None, warehouse=None,
	project=None, party_name=None, posting_date=None, remarks=None,
):
	"""Insert a single GE Inventory Ledger row and compute running balance."""
	posting_date = posting_date or frappe.utils.today()
	qty = abs(float(qty or 0))
	qty_in = qty if direction == "IN" else 0
	qty_out = qty if direction == "OUT" else 0

	# Running balance for this item (across all warehouses)
	prev_balance = frappe.db.sql(
		"""SELECT COALESCE(SUM(qty_in - qty_out), 0) AS bal
		   FROM `tabGE Inventory Ledger`
		   WHERE item_code = %s""",
		(item_code,),
	)
	prev_bal = float(prev_balance[0][0]) if prev_balance else 0
	new_balance = prev_bal + qty_in - qty_out

	doc = frappe.get_doc({
		"doctype": "GE Inventory Ledger",
		"posting_date": posting_date,
		"direction": direction,
		"item_code": item_code,
		"item_description": item_description or "",
		"make": make or "",
		"model_no": model_no or "",
		"hsn_code": hsn_code or "",
		"serial_numbers": serial_numbers or "",
		"qty_in": qty_in,
		"qty_out": qty_out,
		"uom": uom or "Nos",
		"rate": rate or 0,
		"balance_qty": new_balance,
		"voucher_type": voucher_type,
		"voucher_no": voucher_no,
		"warehouse": warehouse,
		"project": project,
		"party_name": party_name or "",
		"remarks": remarks or "",
	})
	doc.insert(ignore_permissions=True)
	return doc


def _post_dispatch_challan_ledger_entries(challan_doc):
	"""Create OUT ledger entries for every item in a dispatched challan."""
	for item in challan_doc.items or []:
		_post_ledger_entry(
			item_code=getattr(item, "item_link", None),
			item_description=item.description,
			make=getattr(item, "make", None),
			model_no=getattr(item, "model_no", None),
			serial_numbers=getattr(item, "serial_numbers", None),
			qty=item.qty,
			uom=getattr(item, "uom", None),
			direction="OUT",
			voucher_type="GE Dispatch Challan",
			voucher_no=challan_doc.name,
			warehouse=challan_doc.from_warehouse,
			project=challan_doc.linked_project,
			party_name=challan_doc.target_site_name or challan_doc.issued_to_name or "",
			posting_date=challan_doc.dispatch_date,
		)


# ╔═══════════════════════════════════════════════════════════════╗
#   GE Material Receipt — CRUD APIs (replaces raw Purchase Receipt usage)
# ╚═══════════════════════════════════════════════════════════════╝

_RECEIPT_ITEM_ALIAS_MAP = {
	"item_link": "item_link",
	"item_code": "item_link",
	"item": "description",
	"description": "description",
	"item_of_description": "description",
	"hsn_code": "hsn_code",
	"hsn": "hsn_code",
	"make": "make",
	"model_no": "model_no",
	"model_no_": "model_no",
	"serial_no": "serial_numbers",
	"serial_numbers": "serial_numbers",
	"serial_no_": "serial_numbers",
	"qty": "qty",
	"quantity": "qty",
	"uom": "uom",
	"purchase_cost": "purchase_cost",
	"purchase_cost_": "purchase_cost",
	"rate": "purchase_cost",
	"vendor_invoice_no": "vendor_invoice_no",
	"invoice_no": "vendor_invoice_no",
	"invoice_no_": "vendor_invoice_no",
	"linked_purchase_order": "linked_purchase_order",
	"purchase_order": "linked_purchase_order",
	"remark": "remark",
	"remarks": "remark",
}


def _normalize_receipt_item_payload(values):
	row = _normalize_aliased_payload(values, _RECEIPT_ITEM_ALIAS_MAP)
	if not cstr(row.get("description") or "").strip() and cstr(row.get("item_link") or "").strip():
		row["description"] = row["item_link"]
	return row


@frappe.whitelist()
def get_material_receipts(
	status=None, warehouse=None, project=None, receipt_type=None,
	limit_page_length=50, limit_start=0,
):
	"""List GE Material Receipts for stores inward dashboard."""
	_require_store_read_access()
	filters = {}
	if status:
		filters["status"] = status
	if warehouse:
		filters["warehouse"] = warehouse
	if project:
		filters["linked_project"] = project
	if receipt_type:
		filters["receipt_type"] = receipt_type

	data = frappe.get_all(
		"GE Material Receipt",
		filters=filters,
		fields=[
			"name", "receipt_date", "receipt_type", "status",
			"received_from", "linked_project", "warehouse",
			"total_items", "total_qty", "total_value",
			"vendor_invoice_reference", "creation", "modified",
		],
		order_by="receipt_date desc, creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
		ignore_permissions=True,
	)
	total = frappe.db.count("GE Material Receipt", filters=filters)
	return {"success": True, "data": data, "total": total}


@frappe.whitelist()
def get_material_receipt(name=None):
	"""Return one GE Material Receipt with items."""
	_require_store_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_material_receipt(data):
	"""Create a new GE Material Receipt (inward GRN)."""
	_require_store_write_access()
	values = _parse_payload(data)
	items = []
	for raw_item in values.pop("items", []):
		items.append(_normalize_receipt_item_payload(raw_item))
	values["items"] = items

	doc = frappe.get_doc({"doctype": "GE Material Receipt", **values})
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Material receipt created"}


@frappe.whitelist()
def update_material_receipt(name=None, data=None):
	"""Update a DRAFT GE Material Receipt."""
	_require_store_write_access()
	name = _require_param(name, "name")
	values = _parse_payload(data)
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	if doc.status != "DRAFT":
		frappe.throw("Only DRAFT receipts can be edited")

	items = values.pop("items", None)
	for key, val in values.items():
		if hasattr(doc, key) and key not in ("name", "doctype", "status"):
			setattr(doc, key, val)
	if items is not None:
		doc.items = []
		for raw_item in items:
			doc.append("items", _normalize_receipt_item_payload(raw_item))

	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Material receipt updated"}


@frappe.whitelist()
def delete_material_receipt(name=None):
	"""Delete a DRAFT GE Material Receipt."""
	_require_store_write_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	if doc.status not in ("DRAFT", "REJECTED"):
		frappe.throw("Only DRAFT or REJECTED receipts can be deleted")
	doc.delete(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "message": "Material receipt deleted"}


@frappe.whitelist()
def submit_material_receipt(name=None):
	"""Submit a DRAFT material receipt for approval."""
	_require_store_write_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	if doc.status != "DRAFT":
		frappe.throw("Only DRAFT receipts can be submitted")
	doc.status = "SUBMITTED"
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Material receipt submitted for approval"}


@frappe.whitelist()
def approve_material_receipt(name=None):
	"""Approve a submitted material receipt — posts IN entries to inventory ledger."""
	_require_store_approval_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	if doc.status != "SUBMITTED":
		frappe.throw("Only SUBMITTED receipts can be approved")
	doc.status = "APPROVED"
	doc.approved_by = frappe.session.user
	doc.approved_at = frappe.utils.now_datetime()
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Material receipt approved — stock updated"}


@frappe.whitelist()
def reject_material_receipt(name=None, reason=None):
	"""Reject a submitted material receipt."""
	_require_store_approval_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	if doc.status != "SUBMITTED":
		frappe.throw("Only SUBMITTED receipts can be rejected")
	doc.status = "REJECTED"
	if reason:
		doc.remarks = (doc.remarks or "") + f"\n[REJECTED] {cstr(reason).strip()}"
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Material receipt rejected"}


@frappe.whitelist()
def get_material_receipt_stats(project=None):
	"""Aggregate material receipt stats for stores dashboard."""
	_require_store_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	rows = frappe.get_all(
		"GE Material Receipt",
		filters=filters,
		fields=["status", "total_qty", "total_value"],
		ignore_permissions=True,
	)
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"draft": sum(1 for r in rows if r.status == "DRAFT"),
			"submitted": sum(1 for r in rows if r.status == "SUBMITTED"),
			"approved": sum(1 for r in rows if r.status == "APPROVED"),
			"rejected": sum(1 for r in rows if r.status == "REJECTED"),
			"total_qty": sum(r.total_qty or 0 for r in rows),
			"total_value": sum(r.total_value or 0 for r in rows),
		},
	}


# ╔═══════════════════════════════════════════════════════════════╗
#   Dynamic Stock Balance — computed from GE Inventory Ledger
# ╚═══════════════════════════════════════════════════════════════╝

@frappe.whitelist()
def get_dynamic_stock_balance(item_code=None, warehouse=None, project=None, limit_page_length=100):
	"""Return current stock balance per item, computed from the GE Inventory Ledger.

	Each row: item_code, description, make, model, total_in, total_out, balance, uom.
	"""
	_require_store_read_access()

	conds = ["1=1"]
	params = []
	if item_code:
		conds.append("item_code = %s")
		params.append(item_code)
	if warehouse:
		conds.append("warehouse = %s")
		params.append(warehouse)
	if project:
		conds.append("project = %s")
		params.append(project)

	sql = f"""
		SELECT
			item_code,
			MAX(item_description) AS item_description,
			MAX(make)             AS make,
			MAX(model_no)         AS model_no,
			MAX(hsn_code)         AS hsn_code,
			MAX(uom)              AS uom,
			SUM(qty_in)           AS total_in,
			SUM(qty_out)          AS total_out,
			SUM(qty_in) - SUM(qty_out) AS balance,
			MAX(rate)             AS last_rate,
			(SUM(qty_in) - SUM(qty_out)) * MAX(rate) AS stock_value
		FROM `tabGE Inventory Ledger`
		WHERE {" AND ".join(conds)}
		GROUP BY item_code
		ORDER BY item_code
		LIMIT %s
	"""
	params.append(int(limit_page_length))
	data = frappe.db.sql(sql, params, as_dict=True)

	totals = {
		"total_in": sum(r.total_in or 0 for r in data),
		"total_out": sum(r.total_out or 0 for r in data),
		"balance": sum(r.balance or 0 for r in data),
		"stock_value": sum(r.stock_value or 0 for r in data),
		"item_count": len(data),
	}

	return {"success": True, "data": data, "totals": totals}


@frappe.whitelist()
def get_item_ledger(item_code=None, warehouse=None, limit_page_length=50, limit_start=0):
	"""Return the chronological ledger for a single item — every IN/OUT movement."""
	_require_store_read_access()
	item_code = _require_param(item_code, "item_code")
	filters = {"item_code": item_code}
	if warehouse:
		filters["warehouse"] = warehouse
	data = frappe.get_all(
		"GE Inventory Ledger",
		filters=filters,
		fields=[
			"name", "posting_date", "direction", "item_code", "item_description",
			"make", "model_no", "serial_numbers", "qty_in", "qty_out",
			"balance_qty", "uom", "rate", "voucher_type", "voucher_no",
			"warehouse", "project", "party_name", "remarks",
		],
		order_by="posting_date desc, creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
		ignore_permissions=True,
	)
	total = frappe.db.count("GE Inventory Ledger", filters=filters)
	return {"success": True, "data": data, "total": total}


# ╔═══════════════════════════════════════════════════════════════╗
#   GE Inventory Ledger — dynamic IN/OUT stock tracking
# ╚═══════════════════════════════════════════════════════════════╝

def _post_ledger_entry(
	item_code, qty, direction, voucher_type, voucher_no,
	item_description=None, make=None, model_no=None, hsn_code=None,
	serial_numbers=None, uom=None, rate=None, warehouse=None,
	project=None, party_name=None, posting_date=None, remarks=None,
):
	"""Insert a single GE Inventory Ledger row and compute running balance."""
	posting_date = posting_date or frappe.utils.today()
	qty = abs(float(qty or 0))
	qty_in = qty if direction == "IN" else 0
	qty_out = qty if direction == "OUT" else 0

	# Running balance for this item (across all warehouses)
	prev_balance = frappe.db.sql(
		"""SELECT COALESCE(SUM(qty_in - qty_out), 0) AS bal
		   FROM `tabGE Inventory Ledger`
		   WHERE item_code = %s""",
		(item_code,),
	)
	prev_bal = float(prev_balance[0][0]) if prev_balance else 0
	new_balance = prev_bal + qty_in - qty_out

	doc = frappe.get_doc({
		"doctype": "GE Inventory Ledger",
		"posting_date": posting_date,
		"direction": direction,
		"item_code": item_code,
		"item_description": item_description or "",
		"make": make or "",
		"model_no": model_no or "",
		"hsn_code": hsn_code or "",
		"serial_numbers": serial_numbers or "",
		"qty_in": qty_in,
		"qty_out": qty_out,
		"uom": uom or "Nos",
		"rate": rate or 0,
		"balance_qty": new_balance,
		"voucher_type": voucher_type,
		"voucher_no": voucher_no,
		"warehouse": warehouse,
		"project": project,
		"party_name": party_name or "",
		"remarks": remarks or "",
	})
	doc.insert(ignore_permissions=True)
	return doc


def _post_dispatch_challan_ledger_entries(challan_doc):
	"""Create OUT ledger entries for every item in a dispatched challan."""
	for item in challan_doc.items or []:
		_post_ledger_entry(
			item_code=getattr(item, "item_link", None),
			item_description=item.description,
			make=getattr(item, "make", None),
			model_no=getattr(item, "model_no", None),
			serial_numbers=getattr(item, "serial_numbers", None),
			qty=item.qty,
			uom=getattr(item, "uom", None),
			direction="OUT",
			voucher_type="GE Dispatch Challan",
			voucher_no=challan_doc.name,
			warehouse=challan_doc.from_warehouse,
			project=challan_doc.linked_project,
			party_name=challan_doc.target_site_name or challan_doc.issued_to_name or "",
			posting_date=challan_doc.dispatch_date,
		)


# ╔═══════════════════════════════════════════════════════════════╗
#   GE Material Receipt — CRUD APIs (replaces raw Purchase Receipt usage)
# ╚═══════════════════════════════════════════════════════════════╝

_RECEIPT_ITEM_ALIAS_MAP = {
	"item_link": "item_link",
	"item_code": "item_link",
	"item": "description",
	"description": "description",
	"item_of_description": "description",
	"hsn_code": "hsn_code",
	"hsn": "hsn_code",
	"make": "make",
	"model_no": "model_no",
	"model_no_": "model_no",
	"serial_no": "serial_numbers",
	"serial_numbers": "serial_numbers",
	"serial_no_": "serial_numbers",
	"qty": "qty",
	"quantity": "qty",
	"uom": "uom",
	"purchase_cost": "purchase_cost",
	"purchase_cost_": "purchase_cost",
	"rate": "purchase_cost",
	"vendor_invoice_no": "vendor_invoice_no",
	"invoice_no": "vendor_invoice_no",
	"invoice_no_": "vendor_invoice_no",
	"linked_purchase_order": "linked_purchase_order",
	"purchase_order": "linked_purchase_order",
	"remark": "remark",
	"remarks": "remark",
}


def _normalize_receipt_item_payload(values):
	row = _normalize_aliased_payload(values, _RECEIPT_ITEM_ALIAS_MAP)
	if not cstr(row.get("description") or "").strip() and cstr(row.get("item_link") or "").strip():
		row["description"] = row["item_link"]
	return row


@frappe.whitelist()
def get_material_receipts(
	status=None, warehouse=None, project=None, receipt_type=None,
	limit_page_length=50, limit_start=0,
):
	"""List GE Material Receipts for stores inward dashboard."""
	_require_store_read_access()
	filters = {}
	if status:
		filters["status"] = status
	if warehouse:
		filters["warehouse"] = warehouse
	if project:
		filters["linked_project"] = project
	if receipt_type:
		filters["receipt_type"] = receipt_type

	data = frappe.get_all(
		"GE Material Receipt",
		filters=filters,
		fields=[
			"name", "receipt_date", "receipt_type", "status",
			"received_from", "linked_project", "warehouse",
			"total_items", "total_qty", "total_value",
			"vendor_invoice_reference", "creation", "modified",
		],
		order_by="receipt_date desc, creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
		ignore_permissions=True,
	)
	total = frappe.db.count("GE Material Receipt", filters=filters)
	return {"success": True, "data": data, "total": total}


@frappe.whitelist()
def get_material_receipt(name=None):
	"""Return one GE Material Receipt with items."""
	_require_store_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_material_receipt(data):
	"""Create a new GE Material Receipt (inward GRN)."""
	_require_store_write_access()
	values = _parse_payload(data)
	items = []
	for raw_item in values.pop("items", []):
		items.append(_normalize_receipt_item_payload(raw_item))
	values["items"] = items

	doc = frappe.get_doc({"doctype": "GE Material Receipt", **values})
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Material receipt created"}


@frappe.whitelist()
def update_material_receipt(name=None, data=None):
	"""Update a DRAFT GE Material Receipt."""
	_require_store_write_access()
	name = _require_param(name, "name")
	values = _parse_payload(data)
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	if doc.status != "DRAFT":
		frappe.throw("Only DRAFT receipts can be edited")

	items = values.pop("items", None)
	for key, val in values.items():
		if hasattr(doc, key) and key not in ("name", "doctype", "status"):
			setattr(doc, key, val)
	if items is not None:
		doc.items = []
		for raw_item in items:
			doc.append("items", _normalize_receipt_item_payload(raw_item))

	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Material receipt updated"}


@frappe.whitelist()
def delete_material_receipt(name=None):
	"""Delete a DRAFT GE Material Receipt."""
	_require_store_write_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	if doc.status not in ("DRAFT", "REJECTED"):
		frappe.throw("Only DRAFT or REJECTED receipts can be deleted")
	doc.delete(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "message": "Material receipt deleted"}


@frappe.whitelist()
def submit_material_receipt(name=None):
	"""Submit a DRAFT material receipt for approval."""
	_require_store_write_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	if doc.status != "DRAFT":
		frappe.throw("Only DRAFT receipts can be submitted")
	doc.status = "SUBMITTED"
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Material receipt submitted for approval"}


@frappe.whitelist()
def approve_material_receipt(name=None):
	"""Approve a submitted material receipt — posts IN entries to inventory ledger."""
	_require_store_approval_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	if doc.status != "SUBMITTED":
		frappe.throw("Only SUBMITTED receipts can be approved")
	doc.status = "APPROVED"
	doc.approved_by = frappe.session.user
	doc.approved_at = frappe.utils.now_datetime()
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Material receipt approved — stock updated"}


@frappe.whitelist()
def reject_material_receipt(name=None, reason=None):
	"""Reject a submitted material receipt."""
	_require_store_approval_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Material Receipt", name, ignore_permissions=True)
	if doc.status != "SUBMITTED":
		frappe.throw("Only SUBMITTED receipts can be rejected")
	doc.status = "REJECTED"
	if reason:
		doc.remarks = (doc.remarks or "") + f"\n[REJECTED] {cstr(reason).strip()}"
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Material receipt rejected"}


@frappe.whitelist()
def get_material_receipt_stats(project=None):
	"""Aggregate material receipt stats for stores dashboard."""
	_require_store_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	rows = frappe.get_all(
		"GE Material Receipt",
		filters=filters,
		fields=["status", "total_qty", "total_value"],
		ignore_permissions=True,
	)
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"draft": sum(1 for r in rows if r.status == "DRAFT"),
			"submitted": sum(1 for r in rows if r.status == "SUBMITTED"),
			"approved": sum(1 for r in rows if r.status == "APPROVED"),
			"rejected": sum(1 for r in rows if r.status == "REJECTED"),
			"total_qty": sum(r.total_qty or 0 for r in rows),
			"total_value": sum(r.total_value or 0 for r in rows),
		},
	}


# ╔═══════════════════════════════════════════════════════════════╗
#   Dynamic Stock Balance — computed from GE Inventory Ledger
# ╚═══════════════════════════════════════════════════════════════╝

@frappe.whitelist()
def get_dynamic_stock_balance(item_code=None, warehouse=None, project=None, limit_page_length=100):
	"""Return current stock balance per item, computed from the GE Inventory Ledger.

	Each row: item_code, description, make, model, total_in, total_out, balance, uom.
	"""
	_require_store_read_access()

	conds = ["1=1"]
	params = []
	if item_code:
		conds.append("item_code = %s")
		params.append(item_code)
	if warehouse:
		conds.append("warehouse = %s")
		params.append(warehouse)
	if project:
		conds.append("project = %s")
		params.append(project)

	sql = f"""
		SELECT
			item_code,
			MAX(item_description) AS item_description,
			MAX(make)             AS make,
			MAX(model_no)         AS model_no,
			MAX(hsn_code)         AS hsn_code,
			MAX(uom)              AS uom,
			SUM(qty_in)           AS total_in,
			SUM(qty_out)          AS total_out,
			SUM(qty_in) - SUM(qty_out) AS balance,
			MAX(rate)             AS last_rate,
			(SUM(qty_in) - SUM(qty_out)) * MAX(rate) AS stock_value
		FROM `tabGE Inventory Ledger`
		WHERE {" AND ".join(conds)}
		GROUP BY item_code
		ORDER BY item_code
		LIMIT %s
	"""
	params.append(int(limit_page_length))
	data = frappe.db.sql(sql, params, as_dict=True)

	totals = {
		"total_in": sum(r.total_in or 0 for r in data),
		"total_out": sum(r.total_out or 0 for r in data),
		"balance": sum(r.balance or 0 for r in data),
		"stock_value": sum(r.stock_value or 0 for r in data),
		"item_count": len(data),
	}

	return {"success": True, "data": data, "totals": totals}


@frappe.whitelist()
def get_item_ledger(item_code=None, warehouse=None, limit_page_length=50, limit_start=0):
	"""Return the chronological ledger for a single item — every IN/OUT movement."""
	_require_store_read_access()
	item_code = _require_param(item_code, "item_code")
	filters = {"item_code": item_code}
	if warehouse:
		filters["warehouse"] = warehouse
	data = frappe.get_all(
		"GE Inventory Ledger",
		filters=filters,
		fields=[
			"name", "posting_date", "direction", "item_code", "item_description",
			"make", "model_no", "serial_numbers", "qty_in", "qty_out",
			"balance_qty", "uom", "rate", "voucher_type", "voucher_no",
			"warehouse", "project", "party_name", "remarks",
		],
		order_by="posting_date desc, creation desc",
		start=int(limit_start),
		page_length=int(limit_page_length),
		ignore_permissions=True,
	)
	total = frappe.db.count("GE Inventory Ledger", filters=filters)
	return {"success": True, "data": data, "total": total}
