"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

# ── Forwarded from rbac_api ──────────────────────────────────────────────────


def _require_scheduler_admin_access():
	_require_roles(ROLE_SYSTEM_MANAGER, ROLE_DIRECTOR)


@frappe.whitelist()
def get_workspace_permissions(project=None):
	"""Forward to rbac_api.get_workspace_permissions (ops route resolves to gov_erp.api.*)."""
	from gov_erp.rbac_api import get_workspace_permissions as _rbac_get_workspace_permissions
	return _rbac_get_workspace_permissions(project=project)

# ═══════════════════════════════════════════════════════════
# Phase 5 – Auto-Reminder Generation & Due Reminder Processing
# ═══════════════════════════════════════════════════════════

@frappe.whitelist()
def generate_system_reminders():
	"""
	Auto-generate system reminders from real business data:
	- Milestones due within 3 days
	- Documents expiring within 7 days
	- PH approval items pending > 3 days
	Idempotent: won't create duplicates for existing system reminders.
	"""
	_require_scheduler_admin_access()
	from datetime import date, timedelta

	today = date.today()
	three_days = str(today + timedelta(days=3))
	seven_days = str(today + timedelta(days=7))
	three_days_ago = str(today - timedelta(days=3))
	created = 0

	# ── Milestone Reminders (due within 3 days) ──
	milestones = frappe.get_all(
		"GE Milestone",
		filters=[
			["status", "not in", ["COMPLETED", "CANCELLED"]],
			["planned_date", ">=", str(today)],
			["planned_date", "<=", three_days],
		],
		fields=["name", "milestone_name", "linked_project", "planned_date"],
	)
	for ms in milestones:
		try:
			existing = frappe.db.exists("GE User Reminder", {
				"reference_doctype": "GE Milestone",
				"reference_name": ms.name,
				"status": ["in", ["Active", "Snoozed"]],
			})
			if not existing:
				project_team = frappe.get_all(
					"GE Project Team Member",
					filters={"linked_project": ms.linked_project},
					pluck="user",
				) if ms.linked_project else []
				owner = project_team[0] if project_team else frappe.session.user
				doc = frappe.get_doc({
					"doctype": "GE User Reminder",
					"title": f"Milestone due: {ms.milestone_name}",
					"owner_user": owner,
					"reminder_datetime": f"{ms.planned_date} 09:00:00",
					"next_reminder_at": f"{ms.planned_date} 09:00:00",
					"notes": f"Milestone '{ms.milestone_name}' is due on {ms.planned_date}",
					"linked_project": ms.linked_project,
					"reference_doctype": "GE Milestone",
					"reference_name": ms.name,
					"repeat_type": "None",
					"status": "Active",
					"is_system_generated": 1,
				})
				doc.flags.ignore_permissions = True
				doc.insert()
				created += 1
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"generate_system_reminders: milestone {ms.name}")

	# ── Document Expiry Reminders (within 7 days) ──
	docs = frappe.get_all(
		"GE Project Document",
		filters=[
			["expiry_date", "is", "set"],
			["expiry_date", ">=", str(today)],
			["expiry_date", "<=", seven_days],
		],
		fields=["name", "document_name", "linked_project", "expiry_date"],
	)
	for d in docs:
		try:
			existing = frappe.db.exists("GE User Reminder", {
				"reference_doctype": "GE Project Document",
				"reference_name": d.name,
				"status": ["in", ["Active", "Snoozed"]],
			})
			if not existing:
				project_team = frappe.get_all(
					"GE Project Team Member",
					filters={"linked_project": d.linked_project},
					pluck="user",
				) if d.linked_project else []
				owner = project_team[0] if project_team else frappe.session.user
				doc = frappe.get_doc({
					"doctype": "GE User Reminder",
					"title": f"Document expiring: {d.document_name}",
					"owner_user": owner,
					"reminder_datetime": f"{d.expiry_date} 09:00:00",
					"next_reminder_at": f"{d.expiry_date} 09:00:00",
					"notes": f"Document '{d.document_name}' expires on {d.expiry_date}",
					"linked_project": d.linked_project,
					"reference_doctype": "GE Project Document",
					"reference_name": d.name,
					"repeat_type": "None",
					"status": "Active",
					"is_system_generated": 1,
				})
				doc.flags.ignore_permissions = True
				doc.insert()
				created += 1
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"generate_system_reminders: document {d.name}")

	# ── Stale PH Approval Reminders (pending > 3 days) ──
	stale_approvals = frappe.get_all(
		"GE PH Approval Item",
		filters=[
			["status", "=", "Submitted to PH"],
			["raised_on", "<=", three_days_ago],
		],
		fields=["name", "source_type", "source_id", "project", "raised_on"],
	)
	for sa in stale_approvals:
		try:
			existing = frappe.db.exists("GE User Reminder", {
				"reference_doctype": "GE PH Approval Item",
				"reference_name": sa.name,
				"status": ["in", ["Active", "Snoozed"]],
			})
			if not existing:
				ph_users = frappe.get_all(
					"Has Role",
					filters={"role": "Project Head", "parenttype": "User"},
					pluck="parent",
				)
				owner = ph_users[0] if ph_users else frappe.session.user
				doc = frappe.get_doc({
					"doctype": "GE User Reminder",
					"title": f"{sa.source_type} {sa.source_id} awaiting PH approval",
					"owner_user": owner,
					"reminder_datetime": now_datetime(),
					"next_reminder_at": now_datetime(),
					"notes": f"{sa.source_type} {sa.source_id} has been waiting for Project Head approval since {sa.raised_on}",
					"linked_project": sa.project,
					"reference_doctype": "GE PH Approval Item",
					"reference_name": sa.name,
					"repeat_type": "None",
					"status": "Active",
					"is_system_generated": 1,
				})
				doc.flags.ignore_permissions = True
				doc.insert()
				created += 1
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"generate_system_reminders: approval {sa.name}")

	frappe.db.commit()
	return {"success": True, "created": created, "message": f"Generated {created} system reminders"}


@frappe.whitelist()
def process_due_reminders():
	"""
	Process due reminders: find active reminders whose next_reminder_at has
	passed and emit an alert for each, then mark them as sent.
	Designed to be called from a scheduler hook.
	"""
	_require_scheduler_admin_access()
	from datetime import datetime

	now_str = str(now_datetime())
	due = frappe.get_all(
		"GE User Reminder",
		filters=[
			["status", "=", "Active"],
			["is_sent", "=", 0],
			["next_reminder_at", "<=", now_str],
		],
		fields=["name", "title", "user", "linked_project", "reference_doctype",
			"reference_name", "notes"],
		limit_page_length=50,
	)

	processed = 0
	for r in due:
		try:
			from gov_erp.alert_dispatcher import emit_alert
			_route = None
			if r.linked_project:
				_route = f"/projects/{r.linked_project}?tab=milestones"
			if r.reference_doctype == "GE Project Document" and r.linked_project:
				_route = f"/projects/{r.linked_project}?tab=dossier"
			elif r.reference_doctype == "GE PH Approval Item" and r.linked_project:
				_route = f"/projects/{r.linked_project}?tab=approvals"
			emit_alert(
				"reminder_due",
				r.title or "Reminder due",
				project=r.linked_project,
				reference_doctype=r.reference_doctype,
				reference_name=r.reference_name,
				detail=r.notes or "",
				route_path=_route,
				extra_recipients=[r.user] if r.user else None,
			)
			reminder_doc = frappe.get_doc("GE User Reminder", r.name)
			reminder_doc.is_sent = 1
			reminder_doc.save(ignore_permissions=True)
			processed += 1
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"process_due_reminders: {r.name}")

	if processed:
		frappe.db.commit()
	return {"success": True, "processed": processed}
