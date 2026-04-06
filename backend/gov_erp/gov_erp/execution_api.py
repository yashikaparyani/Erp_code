"""Auto-extracted domain module. All public functions are re-exported by api.py."""
import json
from pathlib import Path

from frappe.utils.csvutils import read_csv_content
from frappe.utils.xlsxutils import build_xlsx_response, read_xlsx_file_from_attached_file

from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

# ── Execution APIs ──────────────────────────────────────────

SITE_BULK_UPLOAD_FIELDS = [
	"site_code",
	"site_name",
	"status",
	"linked_project",
	"linked_tender",
	"address",
	"latitude",
	"longitude",
	"location_id",
	"survey_completion_date",
	"tower_count",
	"fiber_length_m",
	"backhaul_type",
	"feasibility_status",
	"power_source",
	"power_availability",
	"road_accessibility",
	"installation_stage",
	"location_progress_pct",
	"remarks",
	"current_site_stage",
	"site_blocked",
	"blocker_reason",
]

SITE_BULK_UPLOAD_SAMPLE_ROW = {
	"site_code": "SITE-001",
	"site_name": "Sector 17 Control Room",
	"status": "PLANNED",
	"linked_project": "PROJ-0001",
	"linked_tender": "",
	"address": "Sector 17, Chandigarh",
	"latitude": 30.7415,
	"longitude": 76.7681,
	"location_id": "LOC-001",
	"survey_completion_date": "2026-04-06",
	"tower_count": 1,
	"fiber_length_m": 250.0,
	"backhaul_type": "Fiber",
	"feasibility_status": "Pending",
	"power_source": "Grid",
	"power_availability": 1,
	"road_accessibility": 1,
	"installation_stage": "Not Started",
	"location_progress_pct": 0,
	"remarks": "Sample row. Replace with real values.",
	"current_site_stage": "SURVEY",
	"site_blocked": 0,
	"blocker_reason": "",
}


def _get_site_doctype_fields():
	doctype_path = (
		Path(__file__).resolve().parent
		/ "gov_erp"
		/ "doctype"
		/ "ge_site"
		/ "ge_site.json"
	)
	data = json.loads(doctype_path.read_text())
	fields_by_name = {}
	for field in data.get("fields", []):
		fieldname = field.get("fieldname")
		if fieldname:
			fields_by_name[fieldname] = field
	return fields_by_name


def _normalize_site_header(value):
	if value is None:
		return ""
	return cstr(value).strip().lower().replace(" ", "_")


def _site_header_aliases():
	fields_by_name = _get_site_doctype_fields()
	aliases = {}
	for fieldname in SITE_BULK_UPLOAD_FIELDS:
		field = fields_by_name.get(fieldname, {})
		for value in [fieldname, field.get("label")]:
			normalized = _normalize_site_header(value)
			if normalized:
				aliases[normalized] = fieldname
	return aliases


def _coerce_site_import_value(fieldtype, value):
	if value in (None, ""):
		return None
	if fieldtype in {"Int", "Check"}:
		return cint(value)
	if fieldtype in {"Float", "Percent"}:
		return flt(value)
	if fieldtype == "Date":
		return getdate(value)
	return value


def _read_site_upload_rows(file_url):
	file_doc = frappe.get_doc("File", {"file_url": file_url})
	file_name = cstr(file_doc.file_name or file_doc.file_url or "").lower()
	if file_name.endswith(".xlsx"):
		return read_xlsx_file_from_attached_file(file_url=file_url)
	if file_name.endswith(".csv"):
		return read_csv_content(file_doc.get_content())
	frappe.throw("Only .xlsx and .csv site upload files are supported")


def _map_site_upload_row(headers, row):
	aliases = _site_header_aliases()
	mapped = {}
	for header, value in zip(headers, row):
		fieldname = aliases.get(_normalize_site_header(header))
		if fieldname:
			mapped[fieldname] = value
	return mapped


def _prepare_site_upload_doc(mapped, default_project=None, default_tender=None):
	fields_by_name = _get_site_doctype_fields()
	values = {}
	for fieldname in SITE_BULK_UPLOAD_FIELDS:
		field = fields_by_name.get(fieldname, {})
		coerced = _coerce_site_import_value(field.get("fieldtype"), mapped.get(fieldname))
		if coerced not in (None, ""):
			values[fieldname] = coerced

	if default_project and not values.get("linked_project"):
		values["linked_project"] = default_project
	if default_tender and not values.get("linked_tender"):
		values["linked_tender"] = default_tender

	values.setdefault("status", "PLANNED")
	values.setdefault("installation_stage", "Not Started")
	values.setdefault("current_site_stage", "SURVEY")
	values.setdefault("site_blocked", 0)
	values.setdefault("power_availability", 0)
	values.setdefault("road_accessibility", 0)
	values.setdefault("location_progress_pct", 0)

	if not cstr(values.get("site_code") or "").strip():
		frappe.throw("site_code is required")
	if not cstr(values.get("site_name") or "").strip():
		frappe.throw("site_name is required")
	if not cstr(values.get("linked_project") or "").strip():
		frappe.throw("linked_project is required")

	return values


@frappe.whitelist()
def download_site_bulk_upload_template():
	"""Download an XLSX template for bulk GE Site creation."""
	_require_execution_write_access()
	header_row = SITE_BULK_UPLOAD_FIELDS
	build_xlsx_response([header_row], "ge_site_bulk_upload_template")


@frappe.whitelist()
def bulk_upload_sites(file_url, default_project=None, default_tender=None, dry_run=0):
	"""Create GE Site records from an attached XLSX/CSV file."""
	_require_execution_write_access()
	file_url = _require_param(file_url, "file_url")
	rows = _read_site_upload_rows(file_url)
	if not rows or len(rows) < 2:
		frappe.throw("Upload file must contain a header row and at least one data row")

	headers = rows[0]
	created = []
	skipped = []
	errors = []
	dry_run = cint(dry_run)

	for row_idx, row in enumerate(rows[1:], start=2):
		if not any(value not in (None, "") for value in row):
			continue

		try:
			mapped = _map_site_upload_row(headers, row)
			values = _prepare_site_upload_doc(
				mapped,
				default_project=default_project,
				default_tender=default_tender,
			)
			if frappe.db.exists("GE Site", values["site_code"]):
				skipped.append({"row": row_idx, "site_code": values["site_code"], "reason": "already exists"})
				continue

			doc = frappe.get_doc({"doctype": "GE Site", **values})
			if dry_run:
				doc.run_method("validate")
			else:
				doc.insert()
			created.append({"row": row_idx, "site_code": values["site_code"], "site_name": values["site_name"]})
		except Exception as exc:
			errors.append({"row": row_idx, "message": cstr(exc)})

	if created and not dry_run:
		frappe.db.commit()

	return {
		"success": len(errors) == 0,
		"data": {
			"dry_run": bool(dry_run),
			"created_count": len(created),
			"skipped_count": len(skipped),
			"error_count": len(errors),
			"created": created,
			"skipped": skipped,
			"errors": errors,
			"headers": SITE_BULK_UPLOAD_FIELDS,
		},
		"message": "Site upload validated" if dry_run else "Site upload processed",
	}


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
def get_site(name=None):
	"""Return a single site."""
	_require_execution_read_access()
	name = _require_param(name, "name")
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
	_require_milestone_read_access()
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
def get_milestone(name=None):
	"""Return a single milestone."""
	_require_milestone_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Milestone", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_milestone(data):
	"""Create a milestone."""
	_require_milestone_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Milestone", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Milestone created"}


@frappe.whitelist()
def update_milestone(name, data):
	"""Update a milestone."""
	_require_milestone_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Milestone", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Milestone updated"}


@frappe.whitelist()
def delete_milestone(name):
	"""Delete a milestone."""
	_require_milestone_write_access()
	frappe.delete_doc("GE Milestone", name)
	frappe.db.commit()
	return {"success": True, "message": "Milestone deleted"}


@frappe.whitelist()
def sync_site_milestone_progress(site_name):
	"""Recompute site progress from its linked milestones.

	Returns the updated site_progress_pct and location_progress_pct.
	"""
	_require_execution_write_access()
	site_name = _require_param(site_name, "site_name")

	milestones = frappe.get_all(
		"GE Milestone",
		filters={"linked_site": site_name},
		fields=["progress_pct", "status"],
	)
	if not milestones:
		return {"success": True, "data": {"milestones": 0, "site_progress_pct": 0, "location_progress_pct": 0}, "message": "No milestones linked"}

	total = len(milestones)
	completed = sum(1 for m in milestones if m.status == "COMPLETED")
	avg_progress = sum(m.progress_pct or 0 for m in milestones) / total
	completion_pct = (completed / total) * 100

	frappe.db.set_value(
		"GE Site", site_name,
		{"site_progress_pct": avg_progress, "location_progress_pct": completion_pct},
		update_modified=False,
	)
	frappe.db.commit()

	return {
		"success": True,
		"data": {
			"milestones": total,
			"completed": completed,
			"site_progress_pct": avg_progress,
			"location_progress_pct": completion_pct,
		},
		"message": "Site progress synced from milestones",
	}


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


# ── DPR (Daily Progress Report) APIs ─────────────────────────

@frappe.whitelist()
def get_dprs(project=None, site=None, report_date=None):
	"""Return DPR records."""
	_require_execution_read_access()
	filters = {}
	_apply_project_manager_project_filter(filters, project=project, project_field="linked_project")
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
def get_dpr(name=None):
	"""Return a single DPR with child tables."""
	_require_execution_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE DPR", name)
	assigned = _get_project_manager_assigned_projects()
	if assigned and doc.linked_project not in assigned:
		frappe.throw("Project Manager cannot access DPR outside assigned projects", frappe.PermissionError)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_dpr(data):
	"""Create a DPR. Enforces one DPR per site per day."""
	_require_execution_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	if values.get("linked_project"):
		values["linked_project"] = _ensure_project_manager_project_scope(values.get("linked_project"))
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
	assigned = _get_project_manager_assigned_projects()
	if assigned and doc.linked_project not in assigned:
		frappe.throw("Project Manager cannot update DPR outside assigned projects", frappe.PermissionError)
	if "linked_project" in values:
		values["linked_project"] = _ensure_project_manager_project_scope(values.get("linked_project"))
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "DPR updated"}


@frappe.whitelist()
def delete_dpr(name):
	"""Delete a DPR."""
	_require_execution_write_access()
	doc = frappe.get_doc("GE DPR", name)
	assigned = _get_project_manager_assigned_projects()
	if assigned and doc.linked_project not in assigned:
		frappe.throw("Project Manager cannot delete DPR outside assigned projects", frappe.PermissionError)
	frappe.delete_doc("GE DPR", name)
	frappe.db.commit()
	return {"success": True, "message": "DPR deleted"}


@frappe.whitelist()
def submit_dpr(name=None):
	"""Submit a DPR for approval."""
	_require_execution_write_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE DPR", name)
	assigned = _get_project_manager_assigned_projects()
	if assigned and doc.linked_project not in assigned:
		frappe.throw("Project Manager cannot submit DPR outside assigned projects", frappe.PermissionError)
	if (doc.get("status") or "").strip().lower() not in ("", "draft"):
		return {"success": False, "message": f"Cannot submit DPR in status '{doc.status}'"}
	doc.status = "Submitted"
	doc.submitted_by = frappe.session.user
	doc.submitted_on = frappe.utils.now()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "DPR submitted for approval"}


@frappe.whitelist()
def approve_dpr(name=None, remarks=None):
	"""Approve a submitted DPR."""
	_require_roles(ROLE_PROJECT_HEAD, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE DPR", name)
	if (doc.get("status") or "").strip().lower() != "submitted":
		return {"success": False, "message": f"Cannot approve DPR in status '{doc.status}'"}
	if doc.get("submitted_by") == frappe.session.user:
		frappe.throw("Cannot approve your own DPR submission", frappe.PermissionError)
	doc.status = "Approved"
	doc.approved_by = frappe.session.user
	doc.approved_on = frappe.utils.now()
	if remarks:
		doc.remarks = (doc.get("remarks") or "") + f"\n[Approval] {remarks}"
	doc.save()
	frappe.db.commit()
	try:
		record_and_log(
			event_type="APPROVED",
			reference_doctype="GE DPR",
			reference_name=name,
			project=doc.linked_project,
			description=f"DPR approved for site {doc.get('linked_site') or 'N/A'}",
		)
	except Exception:
		pass
	return {"success": True, "data": doc.as_dict(), "message": "DPR approved"}


@frappe.whitelist()
def reject_dpr(name=None, remarks=None):
	"""Reject a submitted DPR."""
	_require_roles(ROLE_PROJECT_HEAD, ROLE_DEPARTMENT_HEAD, ROLE_DIRECTOR)
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE DPR", name)
	if (doc.get("status") or "").strip().lower() != "submitted":
		return {"success": False, "message": f"Cannot reject DPR in status '{doc.status}'"}
	if doc.get("submitted_by") == frappe.session.user:
		frappe.throw("Cannot reject your own DPR submission", frappe.PermissionError)
	doc.status = "Rejected"
	doc.rejected_by = frappe.session.user
	doc.rejected_on = frappe.utils.now()
	if remarks:
		doc.remarks = (doc.get("remarks") or "") + f"\n[Rejection] {remarks}"
	doc.save()
	frappe.db.commit()
	try:
		record_and_log(
			event_type="REJECTED",
			reference_doctype="GE DPR",
			reference_name=name,
			project=doc.linked_project,
			description=f"DPR rejected for site {doc.get('linked_site') or 'N/A'}",
		)
	except Exception:
		pass
	return {"success": True, "data": doc.as_dict(), "message": "DPR rejected"}


@frappe.whitelist()
def get_dpr_stats(project=None):
	"""Aggregate DPR stats."""
	_require_execution_read_access()
	filters = {}
	_apply_project_manager_project_filter(filters, project=project, project_field="linked_project")
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
def get_project_team_member(name=None):
	"""Return a single team member record."""
	_require_execution_read_access()
	name = _require_param(name, "name")
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


@frappe.whitelist()
def get_project_document(name=None):
	"""Return a single custom project document."""
	_require_document_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Project Document", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def update_document_folder(name, data):
	"""Update a custom document folder."""
	_require_document_write_access()
	if frappe.db.count("GE Project Document", {"folder": name}):
		values = _parse_payload(data)
		if "linked_project" in values:
			current_project = frappe.db.get_value("GE Document Folder", name, "linked_project")
			if values.get("linked_project") != current_project:
				frappe.throw("Folder project cannot be changed while documents are linked to this folder")
	doc = _update_generic_doc("GE Document Folder", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Document folder updated"}


@frappe.whitelist()
def delete_document_folder(name):
	"""Delete a custom document folder."""
	_require_document_write_access()
	if frappe.db.count("GE Project Document", {"folder": name}):
		frappe.throw("Cannot delete a folder that still contains project documents")
	_delete_generic_doc("GE Document Folder", name)
	return {"success": True, "message": "Document folder deleted"}


@frappe.whitelist()
def update_project_document(name, data):
	"""Update a custom project document."""
	_require_document_write_access()
	values = _parse_payload(data)
	for forbidden in ["file", "version", "uploaded_by", "uploaded_on", "submitted_by", "submitted_on", "linked_project"]:
		if forbidden in values:
			frappe.throw(f"{forbidden} cannot be edited directly on an existing document")
	doc = _update_generic_doc("GE Project Document", name, values)
	return {"success": True, "data": doc.as_dict(), "message": "Project document updated"}


@frappe.whitelist()
def delete_project_document(name):
	"""Delete a custom project document."""
	_require_document_write_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Project Document", name)
	file_url = doc.file
	_delete_generic_doc("GE Project Document", name)
	if file_url and not frappe.db.exists("GE Project Document", {"file": file_url}):
		file_name = frappe.db.get_value("File", {"file_url": file_url}, "name")
		if file_name:
			frappe.delete_doc("File", file_name, ignore_permissions=True)
			frappe.db.commit()
	return {"success": True, "message": "Project document deleted"}


@frappe.whitelist()
def get_drawings(project=None, site=None, status=None, client_approval_status=None):
	"""Return engineering drawings."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	if client_approval_status:
		filters["client_approval_status"] = client_approval_status
	data = _list_generic_docs(
		"GE Drawing",
		filters,
		["name", "drawing_number", "title", "revision", "status", "client_approval_status", "linked_project", "linked_site", "approved_by", "approval_date", "file_url", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_drawing(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
	return {"success": True, "data": frappe.get_doc("GE Drawing", name).as_dict()}


@frappe.whitelist()
def create_drawing(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Drawing", data)
	return {"success": True, "data": doc.as_dict(), "message": "Drawing created"}


@frappe.whitelist()
def update_drawing(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Drawing", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Drawing updated"}


@frappe.whitelist()
def delete_drawing(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Drawing", name)
	return {"success": True, "message": "Drawing deleted"}


@frappe.whitelist()
def get_technical_deviations(project=None, drawing=None, status=None):
	"""Return technical deviations."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if drawing:
		filters["linked_drawing"] = drawing
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE Technical Deviation",
		filters,
		["name", "deviation_id", "linked_project", "linked_drawing", "status", "impact", "raised_by", "approved_by", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_technical_deviation(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
	return {"success": True, "data": frappe.get_doc("GE Technical Deviation", name).as_dict()}


@frappe.whitelist()
def create_technical_deviation(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Technical Deviation", data)
	return {"success": True, "data": doc.as_dict(), "message": "Technical deviation created"}


@frappe.whitelist()
def update_technical_deviation(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Technical Deviation", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Technical deviation updated"}


@frappe.whitelist()
def delete_technical_deviation(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Technical Deviation", name)
	return {"success": True, "message": "Technical deviation deleted"}


@frappe.whitelist()
def get_change_requests(project=None, status=None):
	"""Return change requests."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE Change Request",
		filters,
		["name", "cr_number", "linked_project", "status", "cost_impact", "schedule_impact_days", "raised_by", "approved_by", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_change_request(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
	return {"success": True, "data": frappe.get_doc("GE Change Request", name).as_dict()}


@frappe.whitelist()
def create_change_request(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Change Request", data)
	return {"success": True, "data": doc.as_dict(), "message": "Change request created"}


@frappe.whitelist()
def update_change_request(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Change Request", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Change request updated"}


@frappe.whitelist()
def delete_change_request(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Change Request", name)
	return {"success": True, "message": "Change request deleted"}


@frappe.whitelist()
def get_device_registers(project=None, site=None, device_type=None):
	"""Return device register entries."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if device_type:
		filters["device_type"] = device_type
	data = _list_generic_docs(
		"GE Device Register",
		filters,
		["name", "device_name", "device_type", "linked_project", "linked_site", "serial_no", "ip_address", "warranty_end_date", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_device_register(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
	return {"success": True, "data": frappe.get_doc("GE Device Register", name).as_dict()}


@frappe.whitelist()
def create_device_register(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Device Register", data)
	return {"success": True, "data": doc.as_dict(), "message": "Device register entry created"}


@frappe.whitelist()
def update_device_register(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Device Register", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Device register entry updated"}


@frappe.whitelist()
def delete_device_register(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Device Register", name)
	return {"success": True, "message": "Device register entry deleted"}


@frappe.whitelist()
def get_ip_pools(project=None, site=None, status=None):
	"""Return IP pools."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE IP Pool",
		filters,
		["name", "network_name", "linked_project", "linked_site", "subnet", "gateway", "vlan_id", "total_ips", "allocated_ips", "status", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_ip_pool(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
	return {"success": True, "data": frappe.get_doc("GE IP Pool", name).as_dict()}


@frappe.whitelist()
def create_ip_pool(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE IP Pool", data)
	return {"success": True, "data": doc.as_dict(), "message": "IP pool created"}


@frappe.whitelist()
def update_ip_pool(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE IP Pool", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "IP pool updated"}


@frappe.whitelist()
def delete_ip_pool(name):
	_require_execution_write_access()
	_delete_generic_doc("GE IP Pool", name)
	return {"success": True, "message": "IP pool deleted"}


@frappe.whitelist()
def get_ip_allocations(pool=None, device=None, status=None):
	"""Return IP allocations."""
	_require_execution_read_access()
	filters = {}
	if pool:
		filters["linked_pool"] = pool
	if device:
		filters["linked_device"] = device
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE IP Allocation",
		filters,
		["name", "ip_address", "linked_pool", "linked_device", "allocated_on", "allocated_by", "released_on", "status", "creation", "modified"],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_ip_allocation(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
	return {"success": True, "data": frappe.get_doc("GE IP Allocation", name).as_dict()}


@frappe.whitelist()
def create_ip_allocation(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE IP Allocation", data)
	return {"success": True, "data": doc.as_dict(), "message": "IP allocation created"}


@frappe.whitelist()
def update_ip_allocation(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE IP Allocation", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "IP allocation updated"}


@frappe.whitelist()
def delete_ip_allocation(name):
	_require_execution_write_access()
	_delete_generic_doc("GE IP Allocation", name)
	return {"success": True, "message": "IP allocation deleted"}


@frappe.whitelist()
def get_commissioning_checklists(project=None, site=None, status=None):
	"""Return commissioning checklists."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE Commissioning Checklist",
		filters,
		["name", "checklist_name", "linked_project", "linked_site", "template_type", "status", "commissioned_by", "commissioned_date", "creation", "modified"],
	)
	item_counts = _get_commissioning_checklist_item_counts([row["name"] for row in data])
	for row in data:
		counts = item_counts.get(row["name"], {"total_items": 0, "done_items": 0})
		row["total_items"] = counts["total_items"]
		row["done_items"] = counts["done_items"]
	return {"success": True, "data": data}


@frappe.whitelist()
def get_commissioning_checklist(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
	return {"success": True, "data": frappe.get_doc("GE Commissioning Checklist", name).as_dict()}


@frappe.whitelist()
def create_commissioning_checklist(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Commissioning Checklist", data)
	return {"success": True, "data": doc.as_dict(), "message": "Commissioning checklist created"}


@frappe.whitelist()
def update_commissioning_checklist(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Commissioning Checklist", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Commissioning checklist updated"}


@frappe.whitelist()
def delete_commissioning_checklist(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Commissioning Checklist", name)
	return {"success": True, "message": "Commissioning checklist deleted"}


@frappe.whitelist()
def get_test_reports(project=None, site=None, status=None):
	"""Return test reports."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE Test Report",
		filters,
		[
			"name", "report_name", "test_type", "linked_project", "linked_site",
			"status", "tested_by", "test_date", "file", "remarks",
			"creation", "modified",
		],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_test_report(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
	return {"success": True, "data": frappe.get_doc("GE Test Report", name).as_dict()}


@frappe.whitelist()
def create_test_report(data):
	_require_execution_write_access()
	values = _parse_payload(data)
	values.setdefault("status", "Submitted")
	values.setdefault("tested_by", frappe.session.user)
	values.setdefault("test_date", frappe.utils.today())
	doc = frappe.get_doc({"doctype": "GE Test Report", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Test report created"}


@frappe.whitelist()
def update_test_report(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Test Report", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Test report updated"}


@frappe.whitelist()
def delete_test_report(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Test Report", name)
	return {"success": True, "message": "Test report deleted"}


@frappe.whitelist()
def get_client_signoffs(project=None, site=None, status=None):
	"""Return client signoffs."""
	_require_execution_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if status:
		filters["status"] = status
	data = _list_generic_docs(
		"GE Client Signoff",
		filters,
		[
			"name", "signoff_type", "linked_project", "linked_site", "status",
			"signed_by_client", "signoff_date", "attachment", "remarks",
			"creation", "modified",
		],
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_client_signoff(name=None):
	_require_execution_read_access()
	name = _require_param(name, "name")
	return {"success": True, "data": frappe.get_doc("GE Client Signoff", name).as_dict()}


@frappe.whitelist()
def create_client_signoff(data):
	_require_execution_write_access()
	doc = _create_generic_doc("GE Client Signoff", data)
	return {"success": True, "data": doc.as_dict(), "message": "Client signoff created"}


@frappe.whitelist()
def update_client_signoff(name, data):
	_require_execution_write_access()
	doc = _update_generic_doc("GE Client Signoff", name, data)
	return {"success": True, "data": doc.as_dict(), "message": "Client signoff updated"}


@frappe.whitelist()
def delete_client_signoff(name):
	_require_execution_write_access()
	_delete_generic_doc("GE Client Signoff", name)
	return {"success": True, "message": "Client signoff deleted"}


# ── Project Communication Log APIs ──────────────────────────

@frappe.whitelist()
def get_comm_logs(project=None, site=None, comm_type=None, direction=None):
	"""Return project communication log entries."""
	_require_comm_log_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if comm_type:
		filters["communication_type"] = comm_type
	if direction:
		filters["direction"] = direction
	data = frappe.get_all(
		"GE Project Communication Log",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site",
			"communication_date", "communication_type", "direction",
			"subject", "reference_number", "issue_summary",
			"response_status", "response_detail", "attachment",
			"counterparty_name", "counterparty_role",
			"follow_up_required", "follow_up_date", "logged_by",
			"creation", "modified",
		],
		order_by="communication_date desc, modified desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_comm_log(name=None):
	"""Return a single communication log entry."""
	_require_comm_log_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Project Communication Log", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_comm_log(data):
	"""Create a communication log entry."""
	_require_comm_log_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	comm_type = cstr(values.get("communication_type") or values.get("type") or "").strip().lower()
	type_map = {
		"email": "Email",
		"meeting": "Meeting",
		"call": "Call",
		"client call": "Call",
		"phone call": "Call",
		"whatsapp": "WhatsApp",
		"whats app": "WhatsApp",
		"letter": "Letter",
		"site visit": "Site Visit",
		"site_visit": "Site Visit",
		"other": "Other",
	}
	if comm_type in type_map:
		values["communication_type"] = type_map[comm_type]
	direction = cstr(values.get("direction") or "").strip().lower()
	if direction in {"incoming", "inward", "inbound"}:
		values["direction"] = "Inbound"
	elif direction in {"outgoing", "outward", "outbound"}:
		values["direction"] = "Outbound"
	elif direction == "internal":
		values["direction"] = "Internal"
	values.setdefault("summary", values.get("subject"))
	values.setdefault("response_status", "Pending")
	values.setdefault("communication_date", frappe.utils.today())
	values.setdefault("logged_by", frappe.session.user)
	doc = frappe.get_doc({"doctype": "GE Project Communication Log", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Communication log created"}


@frappe.whitelist()
def update_comm_log(name, data):
	"""Update a communication log entry."""
	_require_comm_log_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	comm_type = cstr(values.get("communication_type") or values.get("type") or "").strip().lower()
	type_map = {
		"email": "Email",
		"meeting": "Meeting",
		"call": "Call",
		"client call": "Call",
		"phone call": "Call",
		"whatsapp": "WhatsApp",
		"whats app": "WhatsApp",
		"letter": "Letter",
		"site visit": "Site Visit",
		"site_visit": "Site Visit",
		"other": "Other",
	}
	if comm_type in type_map:
		values["communication_type"] = type_map[comm_type]
	direction = cstr(values.get("direction") or "").strip().lower()
	if direction in {"incoming", "inward", "inbound"}:
		values["direction"] = "Inbound"
	elif direction in {"outgoing", "outward", "outbound"}:
		values["direction"] = "Outbound"
	elif direction == "internal":
		values["direction"] = "Internal"
	if values.get("subject") and not values.get("summary"):
		values["summary"] = values.get("subject")
	if "communication_date" in values and not values.get("communication_date"):
		values["communication_date"] = frappe.utils.today()
	doc = frappe.get_doc("GE Project Communication Log", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Communication log updated"}


@frappe.whitelist()
def delete_comm_log(name):
	"""Delete a communication log entry."""
	_require_comm_log_write_access()
	frappe.delete_doc("GE Project Communication Log", name)
	frappe.db.commit()
	return {"success": True, "message": "Communication log deleted"}


# ── Project Asset APIs ───────────────────────────────────────

@frappe.whitelist()
def get_project_assets(project=None, site=None, asset_type=None, status=None):
	"""Return project asset records."""
	_require_project_asset_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if asset_type:
		filters["asset_type"] = asset_type
	if status:
		filters["status"] = status
	data = frappe.get_all(
		"GE Project Asset",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site",
			"asset_name", "asset_type", "status",
			"serial_no", "make_model", "quantity", "unit_cost",
			"vendor", "deployment_date", "warranty_end_date",
			"assigned_to", "creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_project_asset(name=None):
	"""Return a single project asset record."""
	_require_project_asset_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Project Asset", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_project_asset(data):
	"""Create a project asset record."""
	_require_project_asset_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Project Asset", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Asset created"}


@frappe.whitelist()
def update_project_asset(name, data):
	"""Update a project asset record."""
	_require_project_asset_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Project Asset", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Asset updated"}


@frappe.whitelist()
def delete_project_asset(name):
	"""Delete a project asset record."""
	_require_project_asset_access()
	frappe.delete_doc("GE Project Asset", name)
	frappe.db.commit()
	return {"success": True, "message": "Asset deleted"}


# ── Manpower Log APIs ────────────────────────────────────────

@frappe.whitelist()
def get_manpower_logs(project=None, site=None, log_date=None):
	"""Return manpower log entries."""
	_require_manpower_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if log_date:
		filters["log_date"] = log_date
	data = frappe.get_all(
		"GE Manpower Log",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site",
			"log_date", "worker_name", "designation", "role_in_project",
			"is_contractor", "contractor_company",
			"man_days", "daily_rate", "total_cost",
			"overtime_hours", "overtime_rate", "overtime_cost",
			"creation", "modified",
		],
		order_by="log_date desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_manpower_log(name=None):
	"""Return a single manpower log entry."""
	_require_manpower_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Manpower Log", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_manpower_log(data):
	"""Create a manpower log entry."""
	_require_manpower_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Manpower Log", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Manpower log created"}


@frappe.whitelist()
def update_manpower_log(name, data):
	"""Update a manpower log entry."""
	_require_manpower_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Manpower Log", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Manpower log updated"}


@frappe.whitelist()
def delete_manpower_log(name):
	"""Delete a manpower log entry."""
	_require_manpower_write_access()
	frappe.delete_doc("GE Manpower Log", name)
	frappe.db.commit()
	return {"success": True, "message": "Manpower log deleted"}


@frappe.whitelist()
def get_manpower_summary(project=None, site=None):
	"""Return aggregated manpower stats for a project/site."""
	_require_manpower_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	rows = frappe.get_all(
		"GE Manpower Log",
		filters=filters,
		fields=["man_days", "total_cost", "overtime_hours", "overtime_cost"],
	)
	total_man_days = sum(r.man_days or 0 for r in rows)
	total_cost = sum((r.total_cost or 0) + (r.overtime_cost or 0) for r in rows)
	total_overtime = sum(r.overtime_hours or 0 for r in rows)
	return {
		"success": True,
		"data": {
			"total_entries": len(rows),
			"total_man_days": round(total_man_days, 2),
			"total_overtime_hours": round(total_overtime, 2),
			"total_cost": round(total_cost, 2),
		},
	}


# ── Project Staffing Assignment APIs ─────────────────────────

@frappe.whitelist()
def get_staffing_assignments(project=None, site=None, is_active=None, position=None):
	"""Return staffing assignment records, optionally filtered."""
	_require_manpower_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	if is_active is not None and is_active != "":
		filters["is_active"] = cint(is_active)
	if position:
		filters["position"] = position
	rows = frappe.get_all(
		"GE Project Staffing Assignment",
		filters=filters,
		fields=[
			"name", "linked_project", "linked_site", "employee_name",
			"employee_code", "position", "qualifications", "contact_number",
			"email", "join_date", "leave_date", "total_days_on_project",
			"is_active", "remarks",
		],
		order_by="creation desc",
		limit_page_length=500,
	)
	return {"success": True, "data": rows}


@frappe.whitelist()
def get_staffing_assignment(name):
	"""Return a single staffing assignment."""
	_require_manpower_read_access()
	doc = frappe.get_doc("GE Project Staffing Assignment", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_staffing_assignment(data):
	"""Create a new project staffing assignment."""
	_require_manpower_write_access()
	if isinstance(data, str):
		data = frappe.parse_json(data)
	doc = frappe.new_doc("GE Project Staffing Assignment")
	for field in [
		"linked_project", "linked_site", "employee_name", "employee_code",
		"position", "qualifications", "contact_number", "email",
		"join_date", "leave_date", "is_active", "remarks",
	]:
		if field in data:
			doc.set(field, data[field])
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Staffing assignment created"}


@frappe.whitelist()
def update_staffing_assignment(name, data):
	"""Update an existing staffing assignment."""
	_require_manpower_write_access()
	if isinstance(data, str):
		data = frappe.parse_json(data)
	doc = frappe.get_doc("GE Project Staffing Assignment", name)
	for field in [
		"linked_project", "linked_site", "employee_name", "employee_code",
		"position", "qualifications", "contact_number", "email",
		"join_date", "leave_date", "is_active", "remarks",
	]:
		if field in data:
			doc.set(field, data[field])
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Staffing assignment updated"}


@frappe.whitelist()
def delete_staffing_assignment(name):
	"""Delete a staffing assignment."""
	_require_manpower_write_access()
	frappe.delete_doc("GE Project Staffing Assignment", name)
	frappe.db.commit()
	return {"success": True, "message": "Staffing assignment deleted"}


@frappe.whitelist()
def end_staffing_assignment(name, leave_date=None, remarks=None):
	"""End a staffing assignment by setting leave_date and letting the controller auto-deactivate it."""
	_require_manpower_write_access()
	doc = frappe.get_doc("GE Project Staffing Assignment", name)
	doc.leave_date = leave_date or frappe.utils.today()
	if remarks:
		doc.remarks = f"{doc.remarks}\n{remarks}".strip() if doc.remarks else remarks
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Staffing assignment ended"}


@frappe.whitelist()
def get_staffing_summary(project=None, site=None):
	"""Return aggregated staffing stats for a project/site."""
	_require_manpower_read_access()
	filters = {}
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	rows = frappe.get_all(
		"GE Project Staffing Assignment",
		filters=filters,
		fields=["is_active", "total_days_on_project", "position"],
	)
	active = [r for r in rows if r.is_active]
	positions = {}
	for r in rows:
		positions[r.position] = positions.get(r.position, 0) + 1
	return {
		"success": True,
		"data": {
			"total_assignments": len(rows),
			"active_assignments": len(active),
			"position_breakdown": positions,
			"total_person_days": sum(r.total_days_on_project or 0 for r in rows),
		},
	}


# ── Device Uptime Log APIs ───────────────────────────────────

@frappe.whitelist()
def get_device_uptime_logs(site=None, project=None, device_type=None, sla_status=None):
	"""Return device uptime log entries."""
	_require_device_uptime_read_access()
	filters = {}
	if site:
		filters["linked_site"] = site
	if project:
		filters["linked_project"] = project
	if device_type:
		filters["device_type"] = device_type
	if sla_status:
		filters["sla_status"] = sla_status
	data = frappe.get_all(
		"GE Device Uptime Log",
		filters=filters,
		fields=[
			"name", "linked_site", "linked_project",
			"device_name", "device_type", "serial_no",
			"log_date", "uptime_hours", "downtime_hours",
			"sla_target_uptime_pct", "actual_uptime_pct", "sla_status",
			"downtime_reason", "linked_ticket",
			"reported_by", "verified_by",
			"creation", "modified",
		],
		order_by="log_date desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_device_uptime_log(name=None):
	"""Return a single device uptime log entry."""
	_require_device_uptime_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Device Uptime Log", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_device_uptime_log(data):
	"""Create a device uptime log entry."""
	_require_device_uptime_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Device Uptime Log", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Device uptime log created"}


@frappe.whitelist()
def update_device_uptime_log(name, data):
	"""Update a device uptime log entry."""
	_require_device_uptime_write_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Device Uptime Log", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Device uptime log updated"}


@frappe.whitelist()
def delete_device_uptime_log(name):
	"""Delete a device uptime log entry."""
	_require_device_uptime_write_access()
	frappe.delete_doc("GE Device Uptime Log", name)
	frappe.db.commit()
	return {"success": True, "message": "Device uptime log deleted"}


@frappe.whitelist()
def get_site_uptime_summary(site=None):
	"""Return per-device uptime summary for a site."""
	_require_device_uptime_read_access()
	site = _require_param(site, "site")
	rows = frappe.get_all(
		"GE Device Uptime Log",
		filters={"linked_site": site},
		fields=["device_name", "device_type", "uptime_hours", "downtime_hours",
			"sla_target_uptime_pct", "actual_uptime_pct", "sla_status"],
		order_by="device_name asc",
	)
	# Group by device_name
	devices = {}
	for r in rows:
		key = r.device_name
		if key not in devices:
			devices[key] = {
				"device_name": r.device_name,
				"device_type": r.device_type,
				"total_uptime_hours": 0.0,
				"total_downtime_hours": 0.0,
				"sla_target_uptime_pct": r.sla_target_uptime_pct,
				"log_count": 0,
				"non_compliant_days": 0,
			}
		devices[key]["total_uptime_hours"] += r.uptime_hours or 0.0
		devices[key]["total_downtime_hours"] += r.downtime_hours or 0.0
		devices[key]["log_count"] += 1
		if r.sla_status == "Non-Compliant":
			devices[key]["non_compliant_days"] += 1

	for d in devices.values():
		total = d["total_uptime_hours"] + d["total_downtime_hours"]
		d["avg_uptime_pct"] = round((d["total_uptime_hours"] / total) * 100, 2) if total else None

	return {"success": True, "data": list(devices.values())}


# ── Technical Deviation Workflow Helpers ──────────────────────

@frappe.whitelist()
def approve_technical_deviation(name):
	"""Approve a technical deviation (Engineering Head/Project Manager only)."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Technical Deviation", name)
	if doc.status not in ("Open",):
		frappe.throw(f"Cannot approve deviation in '{doc.status}' state. Must be 'Open'.")
	doc.status = "Approved"
	doc.approved_by = frappe.session.user
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Technical Deviation",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Open",
			to_status="Approved",
			current_status="Approved",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/technical-deviations" if doc.get("linked_project") else "/technical-deviations",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_technical_deviation")

	return {"success": True, "data": doc.as_dict(), "message": "Technical deviation approved"}


@frappe.whitelist()
def reject_technical_deviation(name, reason=None):
	"""Reject a technical deviation."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Technical Deviation", name)
	if doc.status not in ("Open",):
		frappe.throw(f"Cannot reject deviation in '{doc.status}' state. Must be 'Open'.")
	doc.status = "Rejected"
	doc.approved_by = frappe.session.user
	doc.remarks = (doc.remarks or "") + f"\nRejection reason: {reason}"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Technical Deviation",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Open",
			to_status="Rejected",
			current_status="Rejected",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route=f"/projects/{doc.get('linked_project')}/technical-deviations" if doc.get("linked_project") else "/technical-deviations",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_technical_deviation")

	return {"success": True, "data": doc.as_dict(), "message": "Technical deviation rejected"}


@frappe.whitelist()
def close_technical_deviation(name):
	"""Close an approved or rejected deviation."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Technical Deviation", name)
	if doc.status not in ("Approved", "Rejected"):
		frappe.throw(f"Cannot close deviation in '{doc.status}' state. Must be 'Approved' or 'Rejected'.")
	doc.status = "Closed"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Technical deviation closed"}


# ── Change Request Workflow Helpers ──────────────────────────

@frappe.whitelist()
def submit_change_request(name):
	"""Submit a draft change request for review."""
	_require_execution_write_access()
	doc = frappe.get_doc("GE Change Request", name)
	if doc.status != "Draft":
		frappe.throw(f"Cannot submit change request in '{doc.status}' state. Must be 'Draft'.")
	doc.status = "Submitted"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Change Request",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Draft",
			to_status="Submitted",
			current_status="Submitted",
			submitted_by=frappe.session.user,
			submitted_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/change-requests" if doc.get("linked_project") else "/change-requests",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_change_request")

	return {"success": True, "data": doc.as_dict(), "message": "Change request submitted for review"}


@frappe.whitelist()
def approve_change_request(name):
	"""Approve a submitted change request."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Change Request", name)
	if doc.status != "Submitted":
		frappe.throw(f"Cannot approve change request in '{doc.status}' state. Must be 'Submitted'.")
	doc.status = "Approved"
	doc.approved_by = frappe.session.user
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Change Request",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Submitted",
			to_status="Approved",
			current_status="Approved",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/change-requests" if doc.get("linked_project") else "/change-requests",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_change_request")

	return {"success": True, "data": doc.as_dict(), "message": "Change request approved"}


@frappe.whitelist()
def reject_change_request(name, reason=None):
	"""Reject a submitted change request."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_HEAD)
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Change Request", name)
	if doc.status != "Submitted":
		frappe.throw(f"Cannot reject change request in '{doc.status}' state. Must be 'Submitted'.")
	doc.status = "Rejected"
	doc.approved_by = frappe.session.user
	doc.remarks = (doc.remarks or "") + f"\nRejection reason: {reason}"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Change Request",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Submitted",
			to_status="Rejected",
			current_status="Rejected",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route=f"/projects/{doc.get('linked_project')}/change-requests" if doc.get("linked_project") else "/change-requests",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_change_request")

	return {"success": True, "data": doc.as_dict(), "message": "Change request rejected"}


# ── Test Report Workflow Helpers ─────────────────────────────

@frappe.whitelist()
def approve_test_report(name):
	"""Approve a submitted test report."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Test Report", name)
	if doc.status != "Submitted":
		frappe.throw(f"Cannot approve test report in '{doc.status}' state. Must be 'Submitted'.")
	doc.status = "Approved"
	doc.approved_by = frappe.session.user
	doc.approval_date = frappe.utils.today()
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Test Report",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Submitted",
			to_status="Approved",
			current_status="Approved",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route="/execution/commissioning/test-reports",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_test_report")

	return {"success": True, "data": doc.as_dict(), "message": "Test report approved"}


@frappe.whitelist()
def reject_test_report(name, reason=None):
	"""Reject a submitted test report."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Test Report", name)
	if doc.status != "Submitted":
		frappe.throw(f"Cannot reject test report in '{doc.status}' state. Must be 'Submitted'.")
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc.status = "Rejected"
	doc.approved_by = frappe.session.user
	doc.approval_date = frappe.utils.today()
	doc.remarks = (doc.remarks or "") + f"\nRejection reason: {reason}"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Test Report",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Submitted",
			to_status="Rejected",
			current_status="Rejected",
			remarks=reason,
			current_owner_role=_detect_primary_role(),
			source_route="/execution/commissioning/test-reports",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_test_report")

	return {"success": True, "data": doc.as_dict(), "message": "Test report rejected"}


# ── Device Register Lifecycle Helpers ────────────────────────

@frappe.whitelist()
def commission_device(name):
	"""Mark a deployed/active device as commissioned."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER)
	doc = frappe.get_doc("GE Device Register", name)
	if doc.status not in ("Deployed", "Active"):
		frappe.throw(f"Cannot commission device in '{doc.status}' state. Must be 'Deployed' or 'Active'.")
	doc.status = "Commissioned"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Device commissioned"}


@frappe.whitelist()
def mark_device_faulty(name, remarks=None):
	"""Flag a device as faulty."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_FIELD_TECHNICIAN)
	doc = frappe.get_doc("GE Device Register", name)
	if doc.status == "Decommissioned":
		frappe.throw("Cannot mark a decommissioned device as faulty.")
	doc.status = "Faulty"
	if remarks:
		doc.remarks = (doc.remarks or "") + f"\nFaulty: {remarks}"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Device marked faulty"}


@frappe.whitelist()
def decommission_device(name, remarks=None):
	"""Decommission a device and release its IP allocation if any."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER)
	doc = frappe.get_doc("GE Device Register", name)
	doc.status = "Decommissioned"
	if remarks:
		doc.remarks = (doc.remarks or "") + f"\nDecommissioned: {remarks}"
	doc.save()
	# Release linked IP allocation if present
	if doc.ip_address:
		try:
			alloc = frappe.get_doc("GE IP Allocation", doc.ip_address)
			if alloc.status == "Active":
				alloc.status = "Released"
				alloc.released_on = frappe.utils.today()
				alloc.save()
		except frappe.DoesNotExistError:
			pass
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Device decommissioned"}


# ── IP Allocation Lifecycle Helpers ──────────────────────────

@frappe.whitelist()
def release_ip_allocation(name):
	"""Release an active IP allocation back to its pool."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER)
	doc = frappe.get_doc("GE IP Allocation", name)
	if doc.status != "Active":
		frappe.throw(f"Cannot release IP allocation in '{doc.status}' state. Must be 'Active'.")
	doc.status = "Released"
	doc.released_on = frappe.utils.today()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "IP allocation released"}


# ── Commissioning Checklist Workflow Helpers ─────────────────

@frappe.whitelist()
def start_commissioning_checklist(name):
	"""Move a draft commissioning checklist to In Progress."""
	_require_execution_write_access()
	doc = frappe.get_doc("GE Commissioning Checklist", name)
	if doc.status != "Draft":
		frappe.throw(f"Cannot start checklist in '{doc.status}' state. Must be 'Draft'.")
	doc.status = "In Progress"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Commissioning checklist started"}


@frappe.whitelist()
def complete_commissioning_checklist(name):
	"""Complete a commissioning checklist after verifying all items."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER)
	doc = frappe.get_doc("GE Commissioning Checklist", name)
	if doc.status != "In Progress":
		frappe.throw(f"Cannot complete checklist in '{doc.status}' state. Must be 'In Progress'.")
	# Verify all items are completed
	items = doc.get("items") or []
	incomplete = [item for item in items if not item.is_completed]
	if incomplete:
		frappe.throw(f"{len(incomplete)} checklist item(s) are still incomplete. Complete all items first.")
	doc.status = "Completed"
	doc.commissioned_by = frappe.session.user
	doc.commissioned_date = frappe.utils.today()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Commissioning checklist completed"}


# ── Client Signoff Workflow Helpers ──────────────────────────

@frappe.whitelist()
def sign_client_signoff(name, signed_by_client=None):
	"""Record client signature on a pending signoff."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_MANAGER, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Client Signoff", name)
	if doc.status != "Pending":
		frappe.throw(f"Cannot sign in '{doc.status}' state. Must be 'Pending'.")
	if not (signed_by_client or doc.signed_by_client):
		frappe.throw("Signed By Client is required before recording signoff.")
	doc.status = "Signed"
	if signed_by_client:
		doc.signed_by_client = signed_by_client
	doc.signoff_date = frappe.utils.today()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Client signoff recorded"}


@frappe.whitelist()
def approve_client_signoff(name):
	"""Final internal approval after client signature."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Client Signoff", name)
	if doc.status != "Signed":
		frappe.throw(f"Cannot approve signoff in '{doc.status}' state. Must be 'Signed'.")
	doc.status = "Approved"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Client signoff approved"}


# ── Drawing Workflow Helpers ─────────────────────────────────

@frappe.whitelist()
def submit_drawing(name):
	"""Submit a draft drawing for approval."""
	_require_execution_write_access()
	doc = frappe.get_doc("GE Drawing", name)
	if doc.status != "Draft":
		frappe.throw(f"Cannot submit drawing in '{doc.status}' state. Must be 'Draft'.")
	doc.status = "Submitted"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Drawing",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Draft",
			to_status="Submitted",
			current_status="Submitted",
			submitted_by=frappe.session.user,
			submitted_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/drawings" if doc.get("linked_project") else "/drawings",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_drawing")

	return {"success": True, "data": doc.as_dict(), "message": "Drawing submitted for approval"}


@frappe.whitelist()
def approve_drawing(name):
	"""Approve a submitted drawing."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Drawing", name)
	if doc.status != "Submitted":
		frappe.throw(f"Cannot approve drawing in '{doc.status}' state. Must be 'Submitted'.")
	doc.status = "Approved"
	doc.approved_by = frappe.session.user
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Drawing",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Submitted",
			to_status="Approved",
			current_status="Approved",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route=f"/projects/{doc.get('linked_project')}/drawings" if doc.get("linked_project") else "/drawings",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_drawing")

	return {"success": True, "data": doc.as_dict(), "message": "Drawing approved"}


@frappe.whitelist()
def supersede_drawing(name, superseded_by=None):
	"""Mark an approved drawing as superseded by a newer revision."""
	_require_roles(ROLE_ENGINEERING_HEAD, ROLE_PROJECT_HEAD)
	doc = frappe.get_doc("GE Drawing", name)
	if doc.status != "Approved":
		frappe.throw(f"Cannot supersede drawing in '{doc.status}' state. Must be 'Approved'.")
	doc.status = "Superseded"
	if superseded_by:
		doc.supersedes_drawing = superseded_by
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Drawing",
			subject_name=name,
			event_type=EventType.OVERRIDDEN,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="Approved",
			to_status="Superseded",
			current_status="Superseded",
			current_owner_role=_detect_primary_role(),
			remarks=f"Superseded by {superseded_by}" if superseded_by else "Superseded",
			source_route=f"/projects/{doc.get('linked_project')}/drawings" if doc.get("linked_project") else "/drawings",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: supersede_drawing")

	return {"success": True, "data": doc.as_dict(), "message": "Drawing superseded"}
