"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

# ============================================================================
# ACCOUNTABILITY & TRACEABILITY API
# ============================================================================

@frappe.whitelist()
def get_accountability_timeline(subject_doctype=None, subject_name=None):
	"""Return the full accountability record + ordered event timeline for a tracked object."""
	_require_authenticated_user()
	_require_param(subject_doctype, "subject_doctype")
	_require_param(subject_name, "subject_name")
	_enforce_accountability_subject_scope(subject_doctype, subject_name)

	from gov_erp.accountability import get_accountability_timeline as _get_timeline

	result = _get_timeline(subject_doctype, subject_name)
	return {"success": True, "data": result}


@frappe.whitelist()
def get_accountability_record(subject_doctype=None, subject_name=None):
	"""Return the live accountability snapshot (record only, no events) for a tracked object."""
	_require_authenticated_user()
	_require_param(subject_doctype, "subject_doctype")
	_require_param(subject_name, "subject_name")
	_enforce_accountability_subject_scope(subject_doctype, subject_name)

	record = frappe.db.get_value(
		"GE Accountability Record",
		{"subject_doctype": subject_doctype, "subject_name": subject_name},
		"*",
		as_dict=True,
	)
	return {"success": True, "data": record or None}


@frappe.whitelist()
def get_open_accountability_items(
	project=None,
	site=None,
	owner_user=None,
	blocked_only=0,
	escalated_only=0,
	subject_doctype=None,
	limit=100,
):
	"""
	Query open accountability items with optional filters.

	Open = latest_event_type not in COMPLETED/CANCELLED.
	Accessible to Directors, Project Heads, and Department Heads.
	"""
	_require_authenticated_user()
	_require_roles(
		"Director", "Project Head", "Department Head",
		"Project Manager", "Engineering Head", "Engineer", "Procurement Head",
		"Procurement Manager", "Store Manager", "HR Manager", "System Manager",
	)
	project = _enforce_accountability_project_scope(project, require_project_for_pm=True)

	from gov_erp.accountability import get_open_accountability_items as _get_open

	items = _get_open(
		project=project,
		site=site,
		owner_user=owner_user,
		blocked_only=bool(cint(blocked_only)),
		escalated_only=bool(cint(escalated_only)),
		subject_doctype=subject_doctype,
		limit=cint(limit) or 100,
	)
	return {"success": True, "data": items}


@frappe.whitelist()
def get_overdue_accountability_items(project=None, site=None, limit=50):
	"""Return accountability records where due_date is in the past and status is open."""
	_require_authenticated_user()
	_require_roles("Director", "Project Head", "Department Head", "Engineering Head", "Procurement Manager", "HR Manager", "System Manager")
	project = _enforce_accountability_project_scope(project, require_project_for_pm=True)

	filters = {
		"latest_event_type": ["not in", ["COMPLETED", "CANCELLED", ""]],
		"due_date": ["<", frappe.utils.today()],
	}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site

	items = frappe.get_all(
		"GE Accountability Record",
		filters=filters,
		fields=[
			"name", "subject_doctype", "subject_name",
			"linked_project", "linked_site", "linked_stage",
			"current_status", "latest_event_type",
			"current_owner_user", "current_owner_role",
			"due_date", "is_blocked", "blocking_reason",
			"source_route", "creation", "modified",
		],
		order_by="due_date asc",
		limit_page_length=cint(limit) or 50,
	)
	return {"success": True, "data": items}


@frappe.whitelist()
def get_blocked_accountability_items(project=None, site=None, limit=50):
	"""Return accountability records that are currently blocked."""
	_require_authenticated_user()
	_require_roles("Director", "Project Head", "Department Head", "Engineering Head", "Procurement Manager", "HR Manager", "System Manager")
	project = _enforce_accountability_project_scope(project, require_project_for_pm=True)

	filters = {
		"is_blocked": 1,
		"latest_event_type": ["not in", ["COMPLETED", "CANCELLED"]],
	}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site

	items = frappe.get_all(
		"GE Accountability Record",
		filters=filters,
		fields=[
			"name", "subject_doctype", "subject_name",
			"linked_project", "linked_site", "linked_stage",
			"current_status", "latest_event_type",
			"current_owner_user", "current_owner_role",
			"blocking_reason", "due_date",
			"source_route", "creation", "modified",
		],
		order_by="modified asc",
		limit_page_length=cint(limit) or 50,
	)
	return {"success": True, "data": items}


@frappe.whitelist()
def get_accountability_events_by_project(project=None, event_type=None, limit=200):
	"""Return all accountability events linked to a project, newest first."""
	_require_authenticated_user()
	_require_param(project, "project")
	project = _enforce_accountability_project_scope(project, require_project_for_pm=True)

	filters = {"linked_project": project}
	if event_type:
		filters["event_type"] = event_type

	events = frappe.get_all(
		"GE Accountability Event",
		filters=filters,
		fields=[
			"name", "accountability_record", "event_type",
			"actor", "actor_role", "actor_department",
			"from_status", "to_status",
			"from_owner_user", "to_owner_user",
			"remarks", "reason_code",
			"linked_site", "linked_stage",
			"reference_doctype", "reference_name",
			"event_time",
		],
		order_by="event_time desc",
		limit_page_length=cint(limit) or 200,
	)
	return {"success": True, "data": events}


@frappe.whitelist()
def get_accountability_dashboard_summary(project=None, site=None, department=None):
	"""
	Director/RCA dashboard summary.
	Returns blocked, overdue, escalated, recently rejected counts + items,
	plus an event-type heatmap for pattern analysis.
	"""
	_require_authenticated_user()
	_require_roles("Director", "Project Head", "Department Head", "Engineering Head", "Procurement Manager", "HR Manager", "System Manager")
	project = _enforce_accountability_project_scope(project, require_project_for_pm=True)

	closed_statuses = ("COMPLETED", "CANCELLED", "CLOSED")
	thirty_days_ago = add_days(today(), -30)
	ninety_days_ago = add_days(today(), -90)

	# ── Base record filters ───────────────────────────────────────────────
	base_filters: dict = {
		"latest_event_type": ["not in", list(closed_statuses)],
	}
	if project:
		base_filters["linked_project"] = project
	if site:
		base_filters["linked_site"] = site
	if department:
		base_filters["current_owner_department"] = department

	record_fields = [
		"name", "subject_doctype", "subject_name",
		"linked_project", "linked_site", "linked_stage",
		"current_status", "latest_event_type",
		"current_owner_user", "current_owner_role", "current_owner_department",
		"is_blocked", "blocking_reason",
		"escalated_to_user", "escalated_to_role",
		"due_date", "source_route", "creation", "modified",
	]

	# ── 1. Blocked items ──────────────────────────────────────────────────
	blocked_filters = {**base_filters, "is_blocked": 1}
	blocked_items = frappe.get_all(
		"GE Accountability Record",
		filters=blocked_filters,
		fields=record_fields,
		order_by="modified asc",
		limit_page_length=50,
	)

	# ── 2. Escalated items ────────────────────────────────────────────────
	escalated_filters = {**base_filters, "escalated_to_user": ["!=", ""]}
	escalated_items = frappe.get_all(
		"GE Accountability Record",
		filters=escalated_filters,
		fields=record_fields,
		order_by="modified asc",
		limit_page_length=50,
	)

	# ── 3. Overdue items (due_date < today, not closed) ───────────────────
	overdue_filters = {
		**base_filters,
		"due_date": ["<", today()],
		"due_date": ["is", "set"],
	}
	overdue_filters["due_date"] = ["<", today()]
	overdue_items = frappe.get_all(
		"GE Accountability Record",
		filters={
			**{k: v for k, v in base_filters.items()},
			"due_date": ["<", today()],
		},
		fields=record_fields,
		order_by="due_date asc",
		limit_page_length=50,
	)
	# Filter out records without a due_date (frappe does not natively filter "is set" + "<")
	overdue_items = [r for r in overdue_items if r.get("due_date")]

	# ── 4. All open records total ─────────────────────────────────────────
	total_open = frappe.db.count("GE Accountability Record", base_filters)

	# ── 5. Recently rejected events (last 30 days) ────────────────────────
	event_filters: dict = {"event_type": "REJECTED", "event_time": [">=", thirty_days_ago]}
	if project:
		event_filters["linked_project"] = project
	if site:
		event_filters["linked_site"] = site

	rejected_events = frappe.get_all(
		"GE Accountability Event",
		filters=event_filters,
		fields=[
			"name", "accountability_record", "actor", "actor_role", "actor_department",
			"from_status", "to_status", "remarks", "linked_project", "linked_site",
			"reference_doctype", "reference_name", "event_time",
		],
		order_by="event_time desc",
		limit_page_length=30,
	)

	# ── 6. Department heatmap (open records by department) ────────────────
	dept_rows = frappe.get_all(
		"GE Accountability Record",
		filters=base_filters,
		fields=["current_owner_department"],
	)
	dept_heatmap: dict = {}
	for row in dept_rows:
		dept = row.get("current_owner_department") or "Unassigned"
		dept_heatmap[dept] = dept_heatmap.get(dept, 0) + 1

	# Sort by count descending
	dept_heatmap_list = [{"department": k, "count": v} for k, v in dept_heatmap.items()]
	dept_heatmap_list.sort(key=lambda x: x["count"], reverse=True)

	# ── 7. Event type distribution (recent 90 days) ───────────────────────
	all_events_filters: dict = {"event_time": [">=", ninety_days_ago]}
	if project:
		all_events_filters["linked_project"] = project
	if site:
		all_events_filters["linked_site"] = site

	event_type_rows = frappe.get_all(
		"GE Accountability Event",
		filters=all_events_filters,
		fields=["event_type"],
	)
	event_type_counts: dict = {}
	for row in event_type_rows:
		et = row.get("event_type") or "UNKNOWN"
		event_type_counts[et] = event_type_counts.get(et, 0) + 1

	event_type_list = [{"event_type": k, "count": v} for k, v in event_type_counts.items()]
	event_type_list.sort(key=lambda x: x["count"], reverse=True)

	return {
		"success": True,
		"data": {
			"summary": {
				"total_open": total_open,
				"total_blocked": len(blocked_items),
				"total_overdue": len(overdue_items),
				"total_escalated": len(escalated_items),
				"total_rejected_recent": len(rejected_events),
			},
			"blocked_items": blocked_items,
			"overdue_items": overdue_items,
			"escalated_items": escalated_items,
			"rejected_events": rejected_events,
			"department_heatmap": dept_heatmap_list,
			"event_type_distribution": event_type_list,
		},
	}


# ── Phase 9: Backfill / Migration ────────────────────────────────────────────

@frappe.whitelist()
def backfill_accountability_records(doctype=None, limit=100, dry_run=1):
	"""
	Phase 9 migration helper.

	Creates baseline GE Accountability Records for existing open objects that
	do not yet have one.  Only Director / System Manager can run this.

	Args:
		doctype  – restrict to one DocType (e.g. "Material Request"). Leave blank
		           to iterate all registered types.
		limit    – max records to process per call (default 100).
		dry_run  – 1 (default) = preview only, 0 = actually write records.

	Returns a report of what was processed / would be created.
	"""
	if "Director" not in frappe.get_roles(frappe.session.user) and "System Manager" not in frappe.get_roles(frappe.session.user):
		frappe.throw("Only Directors or System Managers may run the accountability backfill.")

	dry_run = int(dry_run or 1)
	limit = int(limit or 100)

	# Supported doctype → status-field + open-value pairs
	BACKFILL_MAP = {
		"Material Request": {
			"status_field": "status",
			"open_statuses": ["Draft", "Submitted", "Pending", "Partially Ordered"],
			"project_field": None,  # items-level; skip project linkage
		},
		"GE Cost Sheet": {
			"status_field": "status",
			"open_statuses": ["DRAFT", "PENDING_APPROVAL"],
			"project_field": "linked_project",
		},
		"GE Employee Onboarding": {
			"status_field": "onboarding_status",
			"open_statuses": ["DRAFT", "SUBMITTED", "UNDER_REVIEW"],
			"project_field": "linked_project",
		},
		"GE Invoice": {
			"status_field": "status",
			"open_statuses": ["DRAFT", "SUBMITTED", "APPROVED"],
			"project_field": "linked_project",
		},
		"GE Vendor Comparison": {
			"status_field": "status",
			"open_statuses": ["DRAFT", "PENDING_APPROVAL"],
			"project_field": "linked_project",
		},
		"GE BOQ": {
			"status_field": "status",
			"open_statuses": ["DRAFT", "PENDING_APPROVAL"],
			"project_field": "linked_project",
		},
		"GE Drawing": {
			"status_field": "status",
			"open_statuses": ["Draft", "Submitted", "Pending Approval"],
			"project_field": "linked_project",
		},
	}

	target_types = [doctype] if doctype else list(BACKFILL_MAP.keys())
	report = {"processed": 0, "created": 0, "skipped": 0, "errors": 0, "details": []}

	from gov_erp.accountability import upsert_accountability_record, EventType

	for dt in target_types:
		meta = BACKFILL_MAP.get(dt)
		if not meta:
			report["details"].append({"doctype": dt, "status": "unsupported"})
			continue

		status_field = meta["status_field"]
		project_field = meta["project_field"]

		try:
			filters = [[status_field, "in", meta["open_statuses"]]]
			fields = ["name", status_field]
			if project_field:
				fields.append(project_field)

			rows = frappe.get_all(dt, filters=filters, fields=fields, limit_page_length=limit)
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"Backfill: fetch {dt}")
			report["errors"] += 1
			continue

		for row in rows:
			report["processed"] += 1
			# Check if record already exists
			existing = frappe.db.exists(
				"GE Accountability Record",
				{"subject_doctype": dt, "subject_name": row["name"]},
			)
			if existing:
				report["skipped"] += 1
				report["details"].append({"doctype": dt, "name": row["name"], "action": "skipped_exists"})
				continue

			if dry_run:
				report["created"] += 1  # would create
				report["details"].append({"doctype": dt, "name": row["name"], "action": "would_create"})
			else:
				try:
					linked_project = row.get(project_field) if project_field else None
					upsert_accountability_record(
						subject_doctype=dt,
						subject_name=row["name"],
						event_type=EventType.CREATED,
						linked_project=linked_project,
						current_status=row.get(status_field),
						current_owner_role="Unknown (backfill)",
						source_route="/accountability/backfill",
						remarks="Backfilled by Phase 9 migration",
					)
					frappe.db.commit()
					report["created"] += 1
					report["details"].append({"doctype": dt, "name": row["name"], "action": "created"})
				except Exception:
					frappe.log_error(frappe.get_traceback(), f"Backfill: create record {dt}/{row['name']}")
					report["errors"] += 1
					report["details"].append({"doctype": dt, "name": row["name"], "action": "error"})

	report["dry_run"] = bool(dry_run)
	return {"success": True, "data": report}


# ── Phase 8: Context Backfill / Legacy Data Migration ────────────────────────

@frappe.whitelist()
def backfill_derive_project(doctype=None, limit=0, dry_run=1):
	"""
	Phase 8 migration: backfill linked_project on doctypes that derive it from
	linked_site via _derive_project_from_site().

	Legacy rows created before Phase 4 may have linked_site set but
	linked_project NULL. This batch resolver reads the GE Site → linked_project
	mapping and fills in the gap.

	Args:
		doctype – restrict to one DocType. Leave blank for all 5 supported types.
		limit   – max rows per doctype. 0 = all.
		dry_run – 1 (default) preview only, 0 = commit.
	"""
	if "Director" not in frappe.get_roles(frappe.session.user) and "System Manager" not in frappe.get_roles(frappe.session.user):
		frappe.throw("Only Directors or System Managers may run backfill_derive_project.")

	dry_run = cint(dry_run)
	limit = cint(limit) or 0

	# doctype → (site_field, project_field)
	DERIVE_MAP = {
		"GE Project Document": ("linked_site", "linked_project"),
		"GE Petty Cash":       ("linked_site", "linked_project"),
		"GE PM Request":       ("linked_site", "linked_project"),
		"GE Costing Queue":    ("linked_site", "project"),
		"GE PH Approval Item": ("linked_site", "project"),
	}

	target_types = [doctype] if doctype else list(DERIVE_MAP.keys())
	report = {"processed": 0, "updated": 0, "skipped": 0, "unresolved": 0, "errors": 0, "details": []}

	# Build site→project cache
	site_project_map = {}
	for site_row in frappe.get_all("GE Site", fields=["name", "linked_project"], limit_page_length=0):
		if site_row.linked_project:
			site_project_map[site_row.name] = site_row.linked_project

	for dt in target_types:
		meta = DERIVE_MAP.get(dt)
		if not meta:
			report["details"].append({"doctype": dt, "status": "unsupported"})
			continue

		site_field, project_field = meta
		try:
			# Rows that have a site but no project
			filters = [[site_field, "is", "set"], [project_field, "in", ["", None]]]
			rows = frappe.get_all(dt, filters=filters, fields=["name", site_field], limit_page_length=limit or 0)
		except Exception:
			frappe.log_error(frappe.get_traceback(), f"backfill_derive_project: fetch {dt}")
			report["errors"] += 1
			continue

		for row in rows:
			report["processed"] += 1
			linked_site = row.get(site_field)
			resolved_project = site_project_map.get(linked_site)

			if not resolved_project:
				report["unresolved"] += 1
				report["details"].append({"doctype": dt, "name": row.name, "site": linked_site, "action": "unresolved"})
				continue

			if dry_run:
				report["updated"] += 1
				report["details"].append({"doctype": dt, "name": row.name, "site": linked_site, "project": resolved_project, "action": "would_update"})
			else:
				try:
					frappe.db.set_value(dt, row.name, project_field, resolved_project, update_modified=False)
					report["updated"] += 1
					report["details"].append({"doctype": dt, "name": row.name, "project": resolved_project, "action": "updated"})
				except Exception:
					frappe.log_error(frappe.get_traceback(), f"backfill_derive_project: update {dt}/{row.name}")
					report["errors"] += 1

	if not dry_run:
		frappe.db.commit()

	report["dry_run"] = bool(dry_run)
	return {"success": True, "data": report}


@frappe.whitelist()
def backfill_boq_context(limit=0, dry_run=1):
	"""
	Phase 8 migration: backfill linked_project and linked_tender on GE BOQ rows.

	Legacy BOQs may lack linked_project or linked_tender. This resolves them
	by tracing through the tender→project chain.

	Args:
		limit   – max rows. 0 = all.
		dry_run – 1 (default) preview only, 0 = commit.
	"""
	if "Director" not in frappe.get_roles(frappe.session.user) and "System Manager" not in frappe.get_roles(frappe.session.user):
		frappe.throw("Only Directors or System Managers may run backfill_boq_context.")

	dry_run = cint(dry_run)
	limit = cint(limit) or 0

	# Build tender→project cache
	tender_project_map = {}
	for t in frappe.get_all("GE Tender", fields=["name", "linked_project"], limit_page_length=0):
		if t.linked_project:
			tender_project_map[t.name] = t.linked_project

	# Also build project→tender cache for BOQs that have project but not tender
	project_tender_map = {}
	for t in frappe.get_all("GE Tender", fields=["name", "linked_project"], limit_page_length=0):
		if t.linked_project:
			project_tender_map.setdefault(t.linked_project, t.name)

	# Fetch BOQs missing either field
	rows = frappe.get_all(
		"GE BOQ",
		filters=[["linked_project", "in", ["", None]], ["linked_tender", "in", ["", None]]],
		or_filters=[["linked_project", "in", ["", None]], ["linked_tender", "in", ["", None]]],
		fields=["name", "linked_project", "linked_tender"],
		limit_page_length=limit or 0,
	)

	report = {"processed": 0, "updated": 0, "skipped": 0, "unresolved": 0, "errors": 0, "details": []}

	for row in rows:
		report["processed"] += 1
		changes = {}
		tender = row.linked_tender
		project = row.linked_project

		# If we have tender but no project, derive project
		if tender and not project:
			resolved = tender_project_map.get(tender)
			if resolved:
				changes["linked_project"] = resolved

		# If we have project but no tender, derive tender
		if project and not tender:
			resolved = project_tender_map.get(project)
			if resolved:
				changes["linked_tender"] = resolved

		if not changes:
			if not tender and not project:
				report["unresolved"] += 1
				report["details"].append({"name": row.name, "action": "unresolved_both_missing"})
			else:
				report["skipped"] += 1
			continue

		if dry_run:
			report["updated"] += 1
			report["details"].append({"name": row.name, "action": "would_update", **changes})
		else:
			try:
				for field, value in changes.items():
					frappe.db.set_value("GE BOQ", row.name, field, value, update_modified=False)
				report["updated"] += 1
				report["details"].append({"name": row.name, "action": "updated", **changes})
			except Exception:
				frappe.log_error(frappe.get_traceback(), f"backfill_boq_context: {row.name}")
				report["errors"] += 1

	if not dry_run:
		frappe.db.commit()

	report["dry_run"] = bool(dry_run)
	return {"success": True, "data": report}


@frappe.whitelist()
def get_legacy_data_report(limit=500):
	"""
	Phase 8 diagnostic: produce a summary of legacy rows that need attention.

	Returns counts and sample records for each category of unmigrated data.
	Read-only — no changes made.
	"""
	if "Director" not in frappe.get_roles(frappe.session.user) and "System Manager" not in frappe.get_roles(frappe.session.user):
		frappe.throw("Only Directors or System Managers may view the legacy data report.")

	limit = cint(limit) or 500
	report = {"categories": []}

	def _append_category(category, count_loader, sample_loader=None):
		try:
			entry = {"category": category, "count": count_loader()}
			if sample_loader:
				entry["samples"] = sample_loader()
			report["categories"].append(entry)
		except Exception:
			frappe.log_error(
				frappe.get_traceback(),
				f"accountability_api.get_legacy_data_report failed for {category}",
			)
			report["categories"].append({"category": category, "count": None, "error": "query_failed"})

	# 1. Surveys missing linked_site
	_append_category(
		"survey_missing_site",
		lambda: frappe.db.count("GE Survey", filters=[["linked_site", "in", ["", None]]]),
		lambda: frappe.get_all(
			"GE Survey",
			filters=[["linked_site", "in", ["", None]]],
			fields=["name", "site_name", "linked_project"],
			limit_page_length=10,
		),
	)

	# 2. Surveys with context_status != resolved
	_append_category(
		"survey_unresolved_context",
		lambda: frappe.db.count("GE Survey", filters=[["context_status", "!=", "resolved"]]),
		lambda: frappe.get_all(
			"GE Survey",
			filters=[["context_status", "!=", "resolved"]],
			fields=["name", "context_status", "site_name"],
			limit_page_length=10,
		),
	)

	# 3. Derive-project doctypes missing linked_project
	for dt, site_field, project_field in [
		("GE Project Document", "linked_site", "linked_project"),
		("GE Petty Cash", "linked_site", "linked_project"),
		("GE PM Request", "linked_site", "linked_project"),
		("GE Costing Queue", "linked_site", "project"),
		("GE PH Approval Item", "linked_site", "project"),
	]:
		_append_category(
			f"{dt}_missing_project",
			lambda dt=dt, site_field=site_field, project_field=project_field: frappe.db.count(
				dt,
				filters=[[site_field, "is", "set"], [project_field, "in", ["", None]]],
			),
		)

	# 4. BOQs missing context
	_append_category(
		"boq_missing_project",
		lambda: frappe.db.count("GE BOQ", filters=[["linked_project", "in", ["", None]]]),
	)
	_append_category(
		"boq_missing_tender",
		lambda: frappe.db.count("GE BOQ", filters=[["linked_tender", "in", ["", None]]]),
	)

	# 5. RMA Tracker missing project
	_append_category(
		"rma_missing_project",
		lambda: frappe.db.count("GE RMA Tracker", filters=[["linked_project", "in", ["", None]]]),
	)

	return {"success": True, "data": report}

