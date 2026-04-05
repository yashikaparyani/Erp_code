"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

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
	if data and _project_head_workflow_ready():
		status_map = _latest_project_head_status_by_source("RMA PO", [row.name for row in data])
		for row in data:
			row["ph_status"] = status_map.get(row.name)
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


