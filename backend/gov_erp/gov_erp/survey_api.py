"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

# ── Survey APIs ──────────────────────────────────────────────

def _serialize_survey_row(row):
	data = _serialize_survey_record(row)
	resolved = _resolve_site_context(
		linked_site=data.get("linked_site"),
		site_name=data.get("site_name"),
		linked_project=data.get("linked_project"),
		linked_tender=data.get("linked_tender"),
	)
	data.update({
		"linked_site": resolved.get("linked_site") or "",
		"linked_project": resolved.get("linked_project") or "",
		"linked_tender": resolved.get("linked_tender") or "",
		"site_name": resolved.get("site_name") or data.get("site_name") or "",
		"context_status": resolved.get("context_status"),
		"context_note": resolved.get("context_note") or data.get("context_note") or "",
		"needs_site_relink": resolved.get("context_status") != "resolved",
	})
	return data


def _normalize_survey_payload(values):
	resolved = _resolve_site_context(
		linked_site=values.get("linked_site"),
		site_name=values.get("site_name"),
		linked_project=values.get("linked_project"),
		linked_tender=values.get("linked_tender"),
		require_site=True,
	)
	values["linked_site"] = _require_param(resolved.get("linked_site"), "linked_site")
	values["linked_project"] = resolved.get("linked_project") or ""
	values["site_name"] = resolved.get("site_name") or values.get("site_name")
	values["linked_tender"] = resolved.get("linked_tender") or ""
	return values


@frappe.whitelist()
def get_surveys(tender=None, project=None, site=None, status=None):
	"""Return normalized surveys scoped by project/site/tender/status."""
	_require_survey_read_access()
	filters = {}
	_apply_project_manager_project_filter(filters, project=project, project_field="linked_project")
	if tender:
		filters["linked_tender"] = tender
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Survey",
		filters=filters,
		fields=[
			"name", "linked_site", "linked_project", "linked_tender", "site_name", "status",
			"survey_date", "surveyed_by", "coordinates", "summary",
			"creation", "modified",
		],
		order_by="creation desc",
	)
	serialized = [_serialize_survey_row(row) for row in data]
	return {"success": True, "data": serialized, "total": len(serialized)}


@frappe.whitelist()
def get_survey(name=None):
	"""Return a single normalized survey with all fields."""
	_require_survey_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Survey", name)
	serialized = _serialize_survey_row(doc)
	if _get_project_manager_assigned_projects() and serialized.get("linked_project"):
		_ensure_project_manager_project_scope(serialized.get("linked_project"))
	return {"success": True, "data": serialized}


@frappe.whitelist()
def create_survey(data):
	"""Create a new site-linked survey."""
	_require_survey_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	values = _normalize_survey_payload(values)
	if _get_project_manager_assigned_projects():
		_ensure_project_manager_project_scope(values.get("linked_project"))
	doc = frappe.get_doc({"doctype": "GE Survey", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": _serialize_survey_row(doc), "message": "Survey created"}


@frappe.whitelist()
def update_survey(name, data):
	"""Update an existing survey."""
	_require_survey_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Survey", name)
	if _get_project_manager_assigned_projects():
		serialized = _serialize_survey_row(doc)
		if serialized.get("linked_project"):
			_ensure_project_manager_project_scope(serialized.get("linked_project"))
	if any(field in values for field in ("linked_site", "linked_project", "linked_tender", "site_name")):
		merged_values = doc.as_dict()
		merged_values.update(values)
		values = _normalize_survey_payload(merged_values)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": _serialize_survey_row(doc), "message": "Survey updated"}


@frappe.whitelist()
def delete_survey(name):
	"""Delete a survey."""
	_require_survey_write_access()
	doc = frappe.get_doc("GE Survey", name)
	if _get_project_manager_assigned_projects():
		serialized = _serialize_survey_row(doc)
		if serialized.get("linked_project"):
			_ensure_project_manager_project_scope(serialized.get("linked_project"))
	frappe.delete_doc("GE Survey", name)
	frappe.db.commit()
	return {"success": True, "message": "Survey deleted"}


@frappe.whitelist()
def get_survey_stats(tender=None, project=None, site=None):
	"""Aggregate normalized survey stats for the dashboard."""
	_require_survey_read_access()
	filters = {}
	_apply_project_manager_project_filter(filters, project=project, project_field="linked_project")
	if tender:
		filters["linked_tender"] = tender
	if site:
		filters["linked_site"] = site
	surveys = frappe.get_all("GE Survey", filters=filters, fields=["status"])
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
def check_survey_complete(tender=None, project=None, site=None):
	"""Check if all surveys for a tender/project/site are completed (gate for BOQ)."""
	_require_boq_read_access()
	filters = {}
	_apply_project_manager_project_filter(filters, project=project, project_field="linked_project")
	if site:
		filters["linked_site"] = site
	elif tender:
		filters["linked_tender"] = tender
	elif project:
		filters["linked_project"] = project
	else:
		frappe.throw("tender, project, or site is required")
	surveys = frappe.get_all(
		"GE Survey",
		filters=filters,
		fields=["status"],
	)
	if not surveys:
		return {"success": True, "complete": False, "reason": "No surveys found for this scope"}
	incomplete = [s for s in surveys if s.status != "Completed"]
	return {
		"success": True,
		"complete": len(incomplete) == 0,
		"total": len(surveys),
		"completed": len(surveys) - len(incomplete),
		"pending": len(incomplete),
	}


@frappe.whitelist()
def backfill_survey_context(dry_run=1, limit=0):
	"""Backfill linked_site/project/tender on legacy surveys where resolution is safe.
	Also persists context_status on each survey so unresolved rows are visibly flagged.

	Args:
		dry_run – 1 (default) preview only, 0 = commit changes.
		limit   – max rows to process per call. 0 = all rows.
	"""
	_require_survey_write_access()
	dry_run = cint(dry_run)
	limit = cint(limit) or 0
	rows = frappe.get_all(
		"GE Survey",
		fields=["name", "linked_site", "linked_project", "linked_tender", "site_name"],
		limit_page_length=limit or 0,
	)
	updated = []
	unresolved = []
	for row in rows:
		serialized = _serialize_survey_row(row)
		changes = {}
		for field in ("linked_site", "linked_project", "linked_tender", "site_name"):
			if serialized.get(field) and serialized.get(field) != row.get(field):
				changes[field] = serialized.get(field)
		# Persist context_status so unresolved rows are explicitly flagged
		ctx_status = serialized.get("context_status") or ("resolved" if serialized.get("linked_site") else "missing_site")
		changes["context_status"] = ctx_status
		if changes:
			updated.append({"name": row.get("name"), **changes})
			if not dry_run:
				for fieldname, value in changes.items():
					frappe.db.set_value("GE Survey", row.get("name"), fieldname, value, update_modified=False)
		if serialized.get("needs_site_relink"):
			unresolved.append({
				"name": row.get("name"),
				"site_name": row.get("site_name"),
				"linked_tender": row.get("linked_tender"),
				"linked_project": row.get("linked_project"),
				"context_status": ctx_status,
				"context_note": serialized.get("context_note"),
			})
	if not dry_run:
		frappe.db.commit()
	return {
		"success": True,
		"data": {
			"dry_run": bool(dry_run),
			"updated_count": len(updated),
			"unresolved_count": len(unresolved),
			"updated": updated,
			"unresolved": unresolved,
		},
	}


