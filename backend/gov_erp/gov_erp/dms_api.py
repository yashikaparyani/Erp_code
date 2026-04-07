"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

_TEMP_UPLOAD_REFERENCE_FIELDS = (
	("GE Project Document", "file"),
	("GE Test Report", "file"),
	("GE Drawing", "file"),
	("GE Employee Document", "file"),
	("GE Commercial Document", "file_url"),
)

@frappe.whitelist()
def get_documents(folder=None):
	"""Return uploaded files for the document briefcase UI."""
	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_HR_MANAGER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)
	filters = {"is_folder": 0}
	if folder:
		filters["folder"] = folder
	data = frappe.get_all(
		"File",
		filters=filters,
		fields=[
			"name",
			"file_name",
			"file_url",
			"file_size",
			"folder",
			"is_private",
			"attached_to_doctype",
			"attached_to_name",
			"creation",
			"modified",
			"owner",
		],
		order_by="modified desc",
	)
	for row in data:
		row["uploaded_by"] = row.owner
	return {"success": True, "data": data}


def _project_document_group_key(row):
	return (
		row.get("document_name") or row.get("name"),
		row.get("linked_project") or "",
		row.get("linked_site") or "",
	)


def _project_document_sort_key(row):
	return (
		frappe.utils.cint(row.get("version") or 0),
		row.get("modified") or "",
		row.get("creation") or "",
		row.get("name") or "",
	)


def _is_temp_upload_file_referenced(file_url):
	"""Return True when a temp-upload file URL is already linked from a business record."""
	for doctype, fieldname in _TEMP_UPLOAD_REFERENCE_FIELDS:
		if frappe.db.exists(doctype, {fieldname: file_url}):
			return True
	return False


def _annotate_project_documents(rows, latest_only=False):
	today = frappe.utils.nowdate()
	group_latest = {}
	group_counts = {}

	for raw_row in rows:
		row = dict(raw_row)
		key = _project_document_group_key(row)
		group_counts[key] = group_counts.get(key, 0) + 1
		current_latest = group_latest.get(key)
		if not current_latest or _project_document_sort_key(row) > _project_document_sort_key(current_latest):
			group_latest[key] = row

	annotated = []
	for raw_row in rows:
		row = dict(raw_row)
		key = _project_document_group_key(row)
		latest_row = group_latest.get(key) or {}
		row["file_name"] = row.get("document_name")
		row["file_url"] = row.get("file")
		row["uploaded_by"] = row.get("uploaded_by") or row.get("owner")
		row["version_count"] = group_counts.get(key, 1)
		row["is_latest_version"] = row.get("name") == latest_row.get("name")
		row["days_until_expiry"] = (
			frappe.utils.date_diff(row.get("expiry_date"), today) if row.get("expiry_date") else None
		)
		if latest_only and not row["is_latest_version"]:
			continue
		annotated.append(row)

	return annotated


@frappe.whitelist()
def get_project_documents(folder=None, project=None, category=None, site=None, latest_only=0, stage=None, reference_doctype=None, subcategory=None):
	"""Return custom GE Project Document records."""
	_require_document_read_access()
	filters = {}
	if folder:
		filters["folder"] = folder
	if project:
		filters["linked_project"] = project
	if category:
		filters["category"] = category
	if site:
		filters["linked_site"] = site
	if stage:
		filters["linked_stage"] = stage
	if reference_doctype:
		filters["reference_doctype"] = reference_doctype
	if subcategory:
		filters["document_subcategory"] = subcategory
	data = frappe.get_all(
		"GE Project Document",
		filters=filters,
		fields=[
			"name",
			"document_name",
			"folder",
			"linked_project",
			"linked_site",
			"linked_stage",
			"source_document",
			"category",
			"document_subcategory",
			"reference_doctype",
			"reference_name",
			"supersedes_document",
			"is_mandatory",
			"file",
			"version",
			"uploaded_by",
			"uploaded_on",
			"submitted_by",
			"submitted_on",
			"valid_from",
			"valid_till",
			"expiry_date",
			"status",
			"assigned_to",
			"accepted_by",
			"due_date",
			"blocker_reason",
			"escalated_to",
			"reviewed_by",
			"approved_by",
			"approved_rejected_by",
			"closure_note",
			"remarks",
			"creation",
			"modified",
			"owner",
		],
		order_by="modified desc, creation desc, version desc",
	)
	return {
		"success": True,
		"data": _annotate_project_documents(data, latest_only=frappe.utils.cint(latest_only)),
	}


@frappe.whitelist()
def get_document_folders(project=None, department=None, source=None):
	"""Return document folders from File or custom GE Document Folder records."""
	use_custom = bool(project or department or source == "custom")
	if use_custom:
		_require_document_read_access()
		filters = {}
		if project:
			filters["linked_project"] = project
		if department:
			filters["department"] = department
		folders = frappe.get_all(
			"GE Document Folder",
			filters=filters,
			fields=["name", "folder_name", "parent_folder", "linked_project", "department", "sort_order", "creation", "owner"],
			order_by="sort_order asc, creation asc",
		)
		count_rows = frappe.db.sql(
			"""
				select folder, count(*) as file_count
				from `tabGE Project Document`
				where ifnull(folder, '') != ''
				group by folder
			""",
			as_dict=True,
		)
		counts = {row.folder: row.file_count for row in count_rows}
		data = []
		for folder_row in folders:
			row = dict(folder_row)
			row["file_name"] = row["folder_name"]
			row["folder"] = row.get("parent_folder") or "Home"
			row["file_count"] = counts.get(folder_row.name, 0)
			data.append(row)
		return {"success": True, "data": data}

	_require_roles(
		ROLE_PRESALES_HEAD,
		ROLE_PRESALES_EXECUTIVE,
		ROLE_HR_MANAGER,
		ROLE_DEPARTMENT_HEAD,
		ROLE_DIRECTOR,
	)
	folders = frappe.get_all(
		"File",
		filters={"is_folder": 1},
		fields=["name", "file_name", "folder", "creation", "owner"],
		order_by="file_name asc, creation asc",
	)
	count_rows = frappe.db.sql(
		"""
		select folder, count(*) as file_count
		from `tabFile`
		where ifnull(is_folder, 0) = 0 and ifnull(folder, '') != ''
		group by folder
		""",
		as_dict=True,
	)
	counts = {row.folder: row.file_count for row in count_rows}
	data = []
	for folder_row in folders:
		row = dict(folder_row)
		row["file_count"] = counts.get(folder_row.name, 0)
		data.append(row)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_document_folder(data):
	"""Create a custom document folder under GE Document Folder."""
	_require_document_write_access()
	values = _parse_payload(data)
	doc = frappe.get_doc({"doctype": "GE Document Folder", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Document folder created"}


@frappe.whitelist()
def upload_project_document(data):
	"""Create a custom GE Project Document record."""
	_require_document_write_access()
	values = _parse_payload(data)
	reference_context = _get_reference_context(values.get("reference_doctype"), values.get("reference_name"))
	if reference_context.get("linked_site") and not values.get("linked_site"):
		values["linked_site"] = reference_context.get("linked_site")
	if reference_context.get("linked_project") and not values.get("linked_project"):
		values["linked_project"] = reference_context.get("linked_project")
	context = _resolve_site_context(
		linked_site=values.get("linked_site"),
		linked_project=values.get("linked_project"),
		linked_tender=values.get("linked_tender"),
		site_name=values.get("site_name"),
		require_site=False,
	)
	if context.get("linked_site"):
		values["linked_site"] = context.get("linked_site")
	if context.get("linked_project"):
		values["linked_project"] = context.get("linked_project")
	values.setdefault("uploaded_by", frappe.session.user)
	values.setdefault("uploaded_on", frappe.utils.now_datetime())
	values.setdefault("submitted_by", frappe.session.user)
	values.setdefault("submitted_on", frappe.utils.now_datetime())
	values.setdefault("status", "Submitted")
	values["file"] = _require_param(values.get("file"), "file")
	values["linked_project"] = _require_param(values.get("linked_project"), "linked_project")
	if not values.get("version"):
		latest_version = (
			frappe.db.sql(
				"""
				select coalesce(max(version), 0)
				from `tabGE Project Document`
				where document_name = %s
				  and linked_project = %s
				  and coalesce(linked_site, '') = %s
				""",
				(
					values.get("document_name"),
					values.get("linked_project"),
					values.get("linked_site") or "",
				),
			)[0][0]
			or 0
		)
		values["version"] = int(latest_version) + 1
	doc = frappe.get_doc({"doctype": "GE Project Document", **values})
	doc.insert()
	frappe.db.commit()
	# Accountability: log document upload
	try:
		from gov_erp.accountability import record_and_log, EventType
		evt = EventType.DOC_SUPERSEDED if values.get("supersedes_document") else EventType.DOC_UPLOADED
		record_and_log(
			subject_doctype="GE Project Document",
			subject_name=doc.name,
			event_type=evt,
			linked_project=doc.linked_project,
			from_status="",
			to_status=doc.status or "Submitted",
			current_status=doc.status or "Submitted",
			current_owner_role=_detect_primary_role(),
			source_route="/documents",
			remarks=f"Stage: {doc.linked_stage or 'N/A'}, Category: {doc.category}, Subcategory: {doc.document_subcategory or 'N/A'}",
		)
	except Exception:
		frappe.log_error(f"Accountability log failed for doc upload {doc.name}", "Accountability Error")
	return {"success": True, "data": doc.as_dict(), "message": "Project document uploaded"}


@frappe.whitelist()
def update_document_status(data):
	"""Update the workflow status of a GE Project Document with accountability logging.
	Supports: In Review, Approved, Rejected, Closed transitions.
	"""
	_require_document_write_access()
	values = _parse_payload(data)
	name = _require_param(values.get("name"), "name")
	new_status = _require_param(values.get("status"), "status")
	reason = values.get("reason") or values.get("remarks") or ""

	doc = frappe.get_doc("GE Project Document", name)
	old_status = doc.status

	if new_status == "Rejected" and not (reason or "").strip():
		frappe.throw("Reason is required when rejecting a document")

	doc.status = new_status
	if new_status == "In Review" and not doc.reviewed_by:
		doc.reviewed_by = frappe.session.user
	if new_status == "Approved":
		if not doc.approved_by:
			doc.approved_by = frappe.session.user
		if not doc.approved_rejected_by:
			doc.approved_rejected_by = frappe.session.user
	if new_status == "Rejected":
		if not doc.approved_rejected_by:
			doc.approved_rejected_by = frappe.session.user
	if reason:
		doc.remarks = reason
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	# Map status to accountability event type
	status_event_map = {
		"In Review": "DOC_REVIEWED",
		"Approved": "DOC_APPROVED",
		"Rejected": "DOC_REJECTED",
		"Closed": "COMPLETED",
	}
	evt_name = status_event_map.get(new_status)
	if evt_name:
		try:
			from gov_erp.accountability import record_and_log, EventType
			record_and_log(
				subject_doctype="GE Project Document",
				subject_name=doc.name,
				event_type=getattr(EventType, evt_name),
				linked_project=doc.linked_project,
				from_status=old_status,
				to_status=new_status,
				current_status=new_status,
				current_owner_role=_detect_primary_role(),
				source_route="/documents",
				remarks=reason or f"Document {new_status.lower()}",
			)
		except Exception:
			frappe.log_error(f"Accountability log failed for doc status change {doc.name}", "Accountability Error")

	return {"success": True, "data": doc.as_dict(), "message": f"Document status updated to {new_status}"}


@frappe.whitelist()
def delete_uploaded_project_file(file_url=None):
	"""Delete a recent orphan upload by file_url when downstream record creation fails."""
	_require_document_write_access()
	file_url = _require_param(file_url, "file_url")
	file_name = frappe.db.get_value("File", {"file_url": file_url}, "name")
	if not file_name:
		return {"success": True, "message": "No uploaded file record found for cleanup"}

	file_doc = frappe.get_doc("File", file_name)
	user_roles = set(frappe.get_roles(frappe.session.user))
	is_admin = "System Manager" in user_roles or "Director" in user_roles
	if not is_admin and cstr(file_doc.owner or "") != cstr(frappe.session.user):
		frappe.throw("You can only clean up files that you uploaded", frappe.PermissionError)

	if file_doc.attached_to_doctype or file_doc.attached_to_name or file_doc.attached_to_field:
		return {"success": True, "message": "File is already attached and cannot be cleaned up"}

	if _is_temp_upload_file_referenced(file_url):
		return {"success": True, "message": "File is already linked from a business record and cannot be cleaned up"}

	file_age_seconds = abs(frappe.utils.time_diff_in_seconds(frappe.utils.now_datetime(), file_doc.creation))
	if file_age_seconds > 3600:
		return {"success": True, "message": "File is no longer a recent temp upload and was left untouched"}

	if cint(file_doc.is_folder):
		return {"success": True, "message": "Folders are not eligible for temp upload cleanup"}

	frappe.delete_doc("File", file_name, ignore_permissions=True)
	frappe.db.commit()
	return {"success": True, "message": "Uploaded file cleaned up"}


@frappe.whitelist()
def get_document_versions(name=None):
	"""Return all versions of a project document grouped by logical document name and project."""
	_require_document_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Project Document", name)
	data = frappe.get_all(
		"GE Project Document",
		filters={
			"document_name": doc.document_name,
			"linked_project": doc.linked_project,
			"linked_site": doc.linked_site,
		},
		fields=[
			"name",
			"document_name",
			"folder",
			"linked_project",
			"linked_site",
			"linked_stage",
			"category",
			"document_subcategory",
			"reference_doctype",
			"reference_name",
			"supersedes_document",
			"file",
			"version",
			"uploaded_by",
			"uploaded_on",
			"valid_from",
			"valid_till",
			"expiry_date",
			"reviewed_by",
			"approved_by",
			"remarks",
			"creation",
		],
		order_by="version desc, creation desc",
	)
	return {"success": True, "data": _annotate_project_documents(data)}


@frappe.whitelist()
def get_expiring_documents(project=None, days=30):
	"""Return project documents that are expiring within the given number of days."""
	_require_document_read_access()
	from frappe.utils import add_days, nowdate
	today = nowdate()
	cutoff = add_days(today, int(days))
	filters = [
		["expiry_date", "is", "set"],
		["expiry_date", "<=", cutoff],
		["expiry_date", ">=", today],
	]
	if project:
		filters.append(["linked_project", "=", project])
	data = frappe.get_all(
		"GE Project Document",
		filters=filters,
		fields=[
			"name", "document_name", "linked_project", "linked_site",
			"category", "file", "version", "expiry_date", "uploaded_by",
			"uploaded_on", "creation",
		],
		order_by="expiry_date asc",
	)
	for row in data:
		row["file_url"] = row.file
		row["days_until_expiry"] = (
			frappe.utils.date_diff(row.expiry_date, today)
		)
	return {"success": True, "data": data}


def _process_expiring_documents():
	"""Scheduler job: emit document_expiring alerts for docs expiring within 7 days."""
	from frappe.utils import add_days, nowdate
	from gov_erp.alert_dispatcher import on_document_event

	today = nowdate()
	cutoff = add_days(today, 7)
	expiring = frappe.get_all(
		"GE Project Document",
		filters=[
			["expiry_date", "is", "set"],
			["expiry_date", "<=", cutoff],
			["expiry_date", ">=", today],
		],
		fields=["name", "document_name", "linked_project", "linked_site", "expiry_date"],
	)
	for doc_row in expiring:
		days_left = frappe.utils.date_diff(doc_row.expiry_date, today)
		try:
			on_document_event(
				project=doc_row.linked_project,
				event="expiring",
				doc_title=f"{doc_row.document_name} (expires in {days_left} day{'s' if days_left != 1 else ''})",
			)
		except Exception:
			frappe.log_error(f"Expiry alert failed for {doc_row.name}", "Alert Error")


# ────────────────────────────────────────────────────────────────
# Document Traceability: Requirement rules, dossier, gates
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_document_requirements(stage=None):
	"""Return all GE Document Requirement rules, optionally filtered by stage."""
	_require_document_read_access()
	filters = {}
	if stage:
		filters["stage"] = stage
	data = frappe.get_all(
		"GE Document Requirement",
		filters=filters,
		fields=[
			"name", "stage", "document_category", "document_subcategory",
			"is_mandatory", "scope_level", "uploader_role", "reviewer_role",
			"description",
		],
		order_by="stage asc, document_category asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def check_stage_document_completeness(project=None, stage=None, site=None):
	"""Check which required documents exist and which are missing for a given stage."""
	_require_document_read_access()
	stage = _require_param(stage, "stage")
	if not project and site:
		project = frappe.db.get_value("GE Site", site, "linked_project")
	project = _require_param(project, "project")

	requirements = frappe.get_all(
		"GE Document Requirement",
		filters={"stage": stage},
		fields=[
			"name", "stage", "document_category", "document_subcategory",
			"is_mandatory", "scope_level",
		],
	)

	doc_filters = {"linked_project": project, "linked_stage": stage}
	if site:
		doc_filters["linked_site"] = site
	existing_docs = frappe.get_all(
		"GE Project Document",
		filters=doc_filters,
		fields=["name", "document_name", "category", "document_subcategory", "status", "linked_site"],
	)

	existing_set = set()
	for d in existing_docs:
		if (d.status or "").strip().lower() == "rejected":
			continue
		existing_set.add((d.category, d.document_subcategory or ""))

	results = []
	all_satisfied = True
	for req in requirements:
		key = (req.document_category, req.document_subcategory or "")
		found = key in existing_set
		if req.is_mandatory and not found:
			all_satisfied = False
		results.append({
			"requirement": req.name,
			"stage": req.stage,
			"category": req.document_category,
			"subcategory": req.document_subcategory,
			"mandatory": req.is_mandatory,
			"scope_level": req.scope_level,
			"satisfied": found,
		})

	return {
		"success": True,
		"data": {
			"requirements": results,
			"all_mandatory_satisfied": all_satisfied,
			"total": len(results),
			"satisfied_count": sum(1 for r in results if r["satisfied"]),
			"missing_mandatory_count": sum(1 for r in results if r["mandatory"] and not r["satisfied"]),
		},
	}


@frappe.whitelist()
def get_project_dossier(project=None):
	"""Return all documents for a project grouped by stage for dossier view."""
	_require_document_read_access()
	project = _require_param(project, "project")

	docs = frappe.get_all(
		"GE Project Document",
		filters={"linked_project": project},
		fields=[
			"name", "document_name", "linked_stage", "linked_site",
			"category", "document_subcategory", "reference_doctype",
			"reference_name", "file", "version", "status",
			"is_mandatory", "uploaded_by", "uploaded_on",
			"reviewed_by", "approved_by", "valid_from", "valid_till",
			"expiry_date", "supersedes_document", "creation",
		],
		order_by="linked_stage asc, category asc, creation desc",
	)

	stages = {}
	for doc in docs:
		stage_key = doc.linked_stage or "Unclassified"
		if stage_key not in stages:
			stages[stage_key] = []
		stages[stage_key].append(doc)

	return {"success": True, "data": {"project": project, "stages": stages, "total_documents": len(docs)}}


@frappe.whitelist()
def get_site_dossier(site=None):
	"""Return all documents for a site, grouped by stage."""
	_require_document_read_access()
	site = _require_param(site, "site")

	if not frappe.db.exists("GE Site", site):
		frappe.throw(f"Site {site} does not exist")
	project = frappe.db.get_value("GE Site", site, "linked_project")

	docs = frappe.get_all(
		"GE Project Document",
		filters={"linked_site": site},
		fields=[
			"name", "document_name", "linked_project", "linked_stage",
			"category", "document_subcategory", "reference_doctype",
			"reference_name", "file", "version", "status",
			"is_mandatory", "uploaded_by", "uploaded_on",
			"reviewed_by", "approved_by", "valid_from", "valid_till",
			"expiry_date", "supersedes_document", "creation",
		],
		order_by="linked_stage asc, category asc, creation desc",
	)

	stages = {}
	for doc in docs:
		stage_key = doc.linked_stage or "Unclassified"
		if stage_key not in stages:
			stages[stage_key] = []
		stages[stage_key].append(doc)

	return {"success": True, "data": {"site": site, "project": project, "stages": stages, "total_documents": len(docs)}}


@frappe.whitelist()
def get_record_documents(reference_doctype=None, reference_name=None):
	"""Return all documents linked to a specific record (e.g., a BOQ, a PO, etc.)."""
	_require_document_read_access()
	reference_doctype = cstr(reference_doctype or "").strip()
	reference_name = cstr(reference_name or "").strip()

	if not reference_doctype or not reference_name:
		return {"success": True, "data": []}

	docs = frappe.get_all(
		"GE Project Document",
		filters={
			"reference_doctype": reference_doctype,
			"reference_name": reference_name,
		},
		fields=[
			"name", "document_name", "linked_project", "linked_site",
			"linked_stage", "category", "document_subcategory",
			"file", "version", "status", "is_mandatory",
			"uploaded_by", "uploaded_on", "reviewed_by", "approved_by",
			"valid_from", "valid_till", "expiry_date",
			"supersedes_document", "creation",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": docs}


@frappe.whitelist()
def check_progression_gate(project=None, target_stage=None, site=None):
	"""Check if all mandatory documents from prior stages are present before advancing.
	Returns warn/block status.
	"""
	_require_document_read_access()
	target_stage = _require_param(target_stage, "target_stage")
	if not project and site:
		project = frappe.db.get_value("GE Site", site, "linked_project")
	project = _require_param(project, "project")

	STAGE_ORDER = [
		"Survey", "BOM_BOQ", "Drawing", "Indent", "Quotation_Vendor_Comparison",
		"PO", "Dispatch", "GRN_Inventory", "Execution", "Commissioning",
		"O_M", "SLA", "RMA", "Commercial", "Closure",
	]
	if target_stage not in STAGE_ORDER:
		return {"success": False, "message": f"Unknown stage: {target_stage}"}

	target_idx = STAGE_ORDER.index(target_stage)
	prior_stages = STAGE_ORDER[:target_idx]

	missing_mandatory = []
	warnings = []

	for prior_stage in prior_stages:
		requirements = frappe.get_all(
			"GE Document Requirement",
			filters={"stage": prior_stage, "is_mandatory": 1},
			fields=["name", "stage", "document_category", "document_subcategory", "scope_level"],
		)
		if not requirements:
			continue

		doc_filters = {"linked_project": project, "linked_stage": prior_stage}
		if site:
			doc_filters["linked_site"] = site
		existing_docs = frappe.get_all(
			"GE Project Document",
			filters=doc_filters,
			fields=["category", "document_subcategory", "status", "expiry_date"],
		)
		existing_set = set()
		for d in existing_docs:
			if (d.get("status") or "").strip().lower() == "rejected":
				continue
			# Expired mandatory documents do not satisfy the gate
			exp = d.get("expiry_date")
			if exp:
				from datetime import date as _date
				if isinstance(exp, str):
					try:
						exp = _date.fromisoformat(exp)
					except Exception:
						exp = None
				if exp and exp < _date.today():
					continue
			existing_set.add((d.category, d.document_subcategory or ""))

		for req in requirements:
			key = (req.document_category, req.document_subcategory or "")
			if key not in existing_set:
				missing_mandatory.append({
					"stage": req.stage,
					"category": req.document_category,
					"subcategory": req.document_subcategory,
				})

	can_proceed = len(missing_mandatory) == 0
	return {
		"success": True,
		"data": {
			"target_stage": target_stage,
			"can_proceed": can_proceed,
			"missing_mandatory": missing_mandatory,
			"missing_count": len(missing_mandatory),
			"message": "All mandatory documents present" if can_proceed
				else f"{len(missing_mandatory)} mandatory document(s) missing from prior stages",
		},
	}
