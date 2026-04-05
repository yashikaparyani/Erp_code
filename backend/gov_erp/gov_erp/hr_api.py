"""Auto-extracted domain module. All public functions are re-exported by api.py."""
from gov_erp.api_utils import *  # noqa: F401,F403 — shared utilities

# ── HR / Onboarding APIs ─────────────────────────────────────

@frappe.whitelist()
def get_onboardings(status=None, company=None, search=None):
	"""Return onboarding records, optionally filtered."""
	_require_hr_read_access()
	filters = {}
	or_filters = []
	if status:
		filters["onboarding_status"] = status
	if company:
		filters["company"] = company
	if search:
		search_text = f"%{search.strip()}%"
		or_filters = [
			["name", "like", search_text],
			["employee_name", "like", search_text],
			["designation", "like", search_text],
			["company", "like", search_text],
			["project_location", "like", search_text],
			["project_city", "like", search_text],
			["contact_number", "like", search_text],
			["personal_email", "like", search_text],
		]
	data = frappe.get_all(
		"GE Employee Onboarding",
		filters=filters,
		or_filters=or_filters,
		fields=[
			"name", "employee_name", "company", "designation", "onboarding_status",
			"date_of_joining", "employee_reference", "submitted_by",
			"reviewed_by", "approved_by", "approved_at", "rejected_by",
			"rejection_reason", "form_source", "project_location", "project_city",
			"creation", "modified",
		],
		order_by="creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_onboarding(name=None):
	"""Return a single onboarding record with all fields and child tables."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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
	if not doc.submitted_by:
		doc.submitted_by = frappe.session.user
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Employee Onboarding",
			subject_name=name,
			event_type=EventType.SUBMITTED,
			linked_project=doc.get("linked_project"),
			from_status="DRAFT",
			to_status="SUBMITTED",
			current_status="SUBMITTED",
			current_owner_role=_detect_primary_role(),
			source_route="/hr/onboarding",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: submit_onboarding")

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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Employee Onboarding",
			subject_name=name,
			event_type=EventType.ACKNOWLEDGED,
			linked_project=doc.get("linked_project"),
			from_status="SUBMITTED",
			to_status="UNDER_REVIEW",
			current_status="UNDER_REVIEW",
			current_owner_role=_detect_primary_role(),
			source_route="/hr/onboarding",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: review_onboarding")

	return {"success": True, "data": doc.as_dict(), "message": "Onboarding is now under review"}


@frappe.whitelist()
def return_onboarding_to_submitted(name):
	"""Move onboarding from UNDER_REVIEW back to SUBMITTED."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status != "UNDER_REVIEW":
		return {"success": False, "message": f"Onboarding is in {doc.onboarding_status} status, must be UNDER_REVIEW to send back"}
	doc.onboarding_status = "SUBMITTED"
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Employee Onboarding",
			subject_name=name,
			event_type=EventType.RETURNED,
			linked_project=doc.get("linked_project"),
			from_status="UNDER_REVIEW",
			to_status="SUBMITTED",
			current_status="SUBMITTED",
			current_owner_role=_detect_primary_role(),
			source_route="/hr/onboarding",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: return_onboarding_to_submitted")

	return {"success": True, "data": doc.as_dict(), "message": "Onboarding returned to submitted state"}


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
	doc.approved_by = frappe.session.user
	doc.approved_at = frappe.utils.now()
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Employee Onboarding",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="UNDER_REVIEW",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route="/hr/onboarding",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_onboarding")

	return {"success": True, "data": doc.as_dict(), "message": "Onboarding approved"}


@frappe.whitelist()
def reject_onboarding(name, reason=None):
	"""Reject an onboarding that is under review."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status != "UNDER_REVIEW":
		return {"success": False, "message": f"Onboarding is in {doc.onboarding_status} status, must be UNDER_REVIEW to reject"}
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc.onboarding_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Employee Onboarding",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status="UNDER_REVIEW",
			to_status="REJECTED",
			current_status="REJECTED",
			remarks=reason,
			current_owner_role=_detect_primary_role(),
			source_route="/hr/onboarding",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_onboarding")

	return {"success": True, "data": doc.as_dict(), "message": "Onboarding rejected"}


@frappe.whitelist()
def reopen_onboarding_draft(name):
	"""Move onboarding back to DRAFT from a rejected or submitted state."""
	_require_hr_write_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)
	if doc.onboarding_status not in {"REJECTED", "SUBMITTED"}:
		return {"success": False, "message": f"Onboarding is in {doc.onboarding_status} status, cannot move it to DRAFT"}
	doc.onboarding_status = "DRAFT"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Onboarding moved back to draft"}


@frappe.whitelist()
def preview_onboarding_employee_mapping(name):
	"""Return the employee payload that would be created from an approved onboarding record."""
	_require_hr_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Employee Onboarding", name)

	from gov_erp.gov_erp.doctype.ge_employee_onboarding.ge_employee_onboarding import (
		get_onboarding_mapping_readiness,
		map_onboarding_to_employee_dict,
	)

	preview = map_onboarding_to_employee_dict(doc)
	readiness = get_onboarding_mapping_readiness(doc)

	return {
		"success": True,
		"data": {
			"employee_preview": preview,
			"readiness": readiness,
		},
	}


@frappe.whitelist()
def map_onboarding_to_employee(name):
	"""Create an ERPNext Employee from an approved onboarding record."""
	_require_hr_write_access()
	doc = frappe.get_doc("GE Employee Onboarding", name)

	from gov_erp.gov_erp.doctype.ge_employee_onboarding.ge_employee_onboarding import (
		get_onboarding_mapping_readiness,
		map_onboarding_to_employee_dict,
	)
	readiness = get_onboarding_mapping_readiness(doc)
	if not readiness["can_map"]:
		return {
			"success": False,
			"message": "Onboarding is not ready to map: " + "; ".join(readiness["blocking_reasons"]),
			"data": {"readiness": readiness},
		}

	emp_data = map_onboarding_to_employee_dict(doc)
	emp_data["doctype"] = "Employee"
	emp_data["status"] = "Active"

	employee = frappe.get_doc(emp_data)
	try:
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

		# Link back only after employee sync completes
		doc.employee_reference = employee.name
		doc.onboarding_status = "MAPPED_TO_EMPLOYEE"
		doc.save()
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		if getattr(employee, "name", None) and frappe.db.exists("Employee", employee.name):
			frappe.delete_doc("Employee", employee.name, ignore_permissions=True, force=True)
			frappe.db.commit()
		raise

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
def get_attendance_log(name=None):
	"""Return one attendance log."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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


def _get_cycle_bounds(from_date=None, to_date=None):
	if from_date and to_date:
		return getdate(from_date), getdate(to_date)
	reference = getdate(from_date or to_date or today())
	return getdate(f"{reference.year}-01-01"), getdate(f"{reference.year}-12-31")


def _date_ranges_overlap(range_start, range_end, cycle_start, cycle_end):
	return getdate(range_start) <= cycle_end and getdate(range_end) >= cycle_start


def _overlap_days(range_start, range_end, cycle_start, cycle_end):
	if not _date_ranges_overlap(range_start, range_end, cycle_start, cycle_end):
		return 0
	start = max(getdate(range_start), cycle_start)
	end = min(getdate(range_end), cycle_end)
	return date_diff(end, start) + 1


def _calculate_leave_balances(employee=None, from_date=None, to_date=None, exclude_application=None):
	cycle_start, cycle_end = _get_cycle_bounds(from_date, to_date)
	allocation_filters = {}
	application_filters = {"leave_status": "APPROVED"}
	if employee:
		allocation_filters["employee"] = employee
		application_filters["employee"] = employee

	allocations = frappe.get_all(
		"GE Leave Allocation",
		filters=allocation_filters,
		fields=["name", "employee", "leave_type", "allocation_days", "from_date", "to_date"],
	)
	applications = frappe.get_all(
		"GE Leave Application",
		filters=application_filters,
		fields=["name", "employee", "leave_type", "from_date", "to_date", "total_leave_days"],
	)
	leave_types = {
		row.name: row
		for row in frappe.get_all(
			"GE Leave Type",
			fields=["name", "leave_type_name", "color", "annual_allocation", "is_paid_leave", "is_active"],
		)
	}

	balance_map = defaultdict(lambda: {
		"employee": "",
		"leave_type": "",
		"leave_type_label": "",
		"allocated": 0.0,
		"consumed": 0.0,
		"remaining": 0.0,
		"color": "#1e6b87",
		"is_paid_leave": 1,
	})

	for allocation in allocations:
		if not allocation.from_date or not allocation.to_date:
			continue
		if not _date_ranges_overlap(allocation.from_date, allocation.to_date, cycle_start, cycle_end):
			continue
		key = (allocation.employee, allocation.leave_type)
		leave_type_meta = leave_types.get(allocation.leave_type)
		entry = balance_map[key]
		entry["employee"] = allocation.employee
		entry["leave_type"] = allocation.leave_type
		entry["leave_type_label"] = leave_type_meta.leave_type_name if leave_type_meta else allocation.leave_type
		entry["allocated"] += flt(allocation.allocation_days)
		entry["color"] = leave_type_meta.color if leave_type_meta and leave_type_meta.color else entry["color"]
		entry["is_paid_leave"] = leave_type_meta.is_paid_leave if leave_type_meta else entry["is_paid_leave"]

	for application in applications:
		if exclude_application and application.name == exclude_application:
			continue
		if not application.from_date or not application.to_date:
			continue
		overlap = _overlap_days(application.from_date, application.to_date, cycle_start, cycle_end)
		if overlap <= 0:
			continue
		key = (application.employee, application.leave_type)
		leave_type_meta = leave_types.get(application.leave_type)
		entry = balance_map[key]
		entry["employee"] = application.employee
		entry["leave_type"] = application.leave_type
		entry["leave_type_label"] = leave_type_meta.leave_type_name if leave_type_meta else application.leave_type
		entry["consumed"] += flt(overlap)
		entry["color"] = leave_type_meta.color if leave_type_meta and leave_type_meta.color else entry["color"]
		entry["is_paid_leave"] = leave_type_meta.is_paid_leave if leave_type_meta else entry["is_paid_leave"]

	for entry in balance_map.values():
		entry["remaining"] = flt(entry["allocated"] - entry["consumed"])

	return {
		"cycle_start": str(cycle_start),
		"cycle_end": str(cycle_end),
		"rows": sorted(balance_map.values(), key=lambda row: (row["employee"], row["leave_type_label"])),
	}


@frappe.whitelist()
def get_leave_types(active_only=None):
	"""Return leave type setup rows."""
	_require_hr_read_access()
	filters = {}
	if cint(active_only):
		filters["is_active"] = 1
	data = frappe.get_all(
		"GE Leave Type",
		filters=filters,
		fields=["name", "leave_type_name", "annual_allocation", "is_paid_leave", "is_active", "color", "description"],
		order_by="leave_type_name asc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_leave_type(data):
	"""Create a leave type."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Leave Type", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave type created"}


@frappe.whitelist()
def update_leave_type(name, data):
	"""Update a leave type."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Leave Type", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave type updated"}


@frappe.whitelist()
def delete_leave_type(name):
	"""Delete a leave type."""
	_require_leave_manage_access()
	frappe.delete_doc("GE Leave Type", name)
	frappe.db.commit()
	return {"success": True, "message": "Leave type deleted"}


@frappe.whitelist()
def get_leave_allocations(employee=None, leave_type=None):
	"""Return leave allocations."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if leave_type:
		filters["leave_type"] = leave_type
	data = frappe.get_all(
		"GE Leave Allocation",
		filters=filters,
		fields=["name", "employee", "leave_type", "allocation_days", "from_date", "to_date", "notes", "creation", "modified"],
		order_by="from_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def create_leave_allocation(data):
	"""Create a leave allocation."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Leave Allocation", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave allocation created"}


@frappe.whitelist()
def update_leave_allocation(name, data):
	"""Update a leave allocation."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Leave Allocation", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave allocation updated"}


@frappe.whitelist()
def delete_leave_allocation(name):
	"""Delete a leave allocation."""
	_require_leave_manage_access()
	frappe.delete_doc("GE Leave Allocation", name)
	frappe.db.commit()
	return {"success": True, "message": "Leave allocation deleted"}


@frappe.whitelist()
def get_leave_applications(employee=None, status=None, leave_type=None, from_date=None, to_date=None):
	"""Return leave applications."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if status:
		filters["leave_status"] = status
	if leave_type:
		filters["leave_type"] = leave_type
	data = frappe.get_all(
		"GE Leave Application",
		filters=filters,
		fields=[
			"name", "employee", "leave_type", "leave_status", "from_date", "to_date",
			"total_leave_days", "linked_project", "linked_site", "reason",
			"submitted_by", "approved_by", "approved_at", "rejected_by", "rejection_reason",
			"creation", "modified",
		],
		order_by="from_date desc, creation desc",
	)
	if from_date or to_date:
		cycle_start, cycle_end = _get_cycle_bounds(from_date, to_date)
		data = [
			row for row in data
			if row.from_date and row.to_date and _date_ranges_overlap(row.from_date, row.to_date, cycle_start, cycle_end)
		]
	return {"success": True, "data": data}


@frappe.whitelist()
def get_leave_application(name=None):
	"""Return one leave application."""
	_require_hr_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Leave Application", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_leave_application(data):
	"""Create a leave application."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Leave Application", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application created"}


@frappe.whitelist()
def update_leave_application(name, data):
	"""Update a leave application."""
	_require_leave_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Leave Application", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application updated"}


@frappe.whitelist()
def delete_leave_application(name):
	"""Delete a leave application."""
	_require_leave_manage_access()
	frappe.delete_doc("GE Leave Application", name)
	frappe.db.commit()
	return {"success": True, "message": "Leave application deleted"}


@frappe.whitelist()
def submit_leave_application(name):
	"""Move leave application from DRAFT to SUBMITTED."""
	_require_leave_manage_access()
	doc = frappe.get_doc("GE Leave Application", name)
	if doc.leave_status != "DRAFT":
		return {"success": False, "message": f"Leave application is in {doc.leave_status} status, must be DRAFT to submit"}
	doc.leave_status = "SUBMITTED"
	if not doc.submitted_by:
		doc.submitted_by = frappe.session.user
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application submitted"}


@frappe.whitelist()
def approve_leave_application(name):
	"""Approve a submitted leave application if balance is available."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Leave Application", name)
	if doc.leave_status != "SUBMITTED":
		return {"success": False, "message": f"Leave application is in {doc.leave_status} status, must be SUBMITTED to approve"}
	balance = _calculate_leave_balances(doc.employee, doc.from_date, doc.to_date, exclude_application=doc.name)
	balance_row = next((row for row in balance["rows"] if row["employee"] == doc.employee and row["leave_type"] == doc.leave_type), None)
	remaining = flt(balance_row["remaining"]) if balance_row else 0
	if remaining < flt(doc.total_leave_days):
		return {"success": False, "message": f"Insufficient leave balance. Remaining: {remaining}"}
	doc.leave_status = "APPROVED"
	doc.approved_by = frappe.session.user
	doc.approved_at = frappe.utils.now()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application approved"}


@frappe.whitelist()
def reject_leave_application(name, reason=None):
	"""Reject a submitted leave application."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Leave Application", name)
	if doc.leave_status != "SUBMITTED":
		return {"success": False, "message": f"Leave application is in {doc.leave_status} status, must be SUBMITTED to reject"}
	doc.leave_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	if reason:
		doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application rejected"}


@frappe.whitelist()
def reopen_leave_application(name):
	"""Move a rejected or submitted leave application back to draft."""
	_require_leave_manage_access()
	doc = frappe.get_doc("GE Leave Application", name)
	if doc.leave_status not in {"REJECTED", "SUBMITTED"}:
		return {"success": False, "message": f"Leave application is in {doc.leave_status} status, cannot move it to DRAFT"}
	doc.leave_status = "DRAFT"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Leave application moved back to draft"}


@frappe.whitelist()
def get_leave_balances(employee=None, from_date=None, to_date=None):
	"""Return leave balances for the selected cycle."""
	_require_hr_read_access()
	balance = _calculate_leave_balances(employee, from_date, to_date)
	return {"success": True, "data": balance}


@frappe.whitelist()
def get_holiday_lists(company=None):
	"""Return available holiday lists."""
	_require_hr_read_access()
	if not frappe.db.exists("DocType", "Holiday List"):
		return {"success": True, "data": []}
	filters = {}
	if company:
		filters["company"] = company
	data = frappe.get_all(
		"Holiday List",
		filters=filters,
		fields=["name", "holiday_list_name", "from_date", "to_date", "weekly_off", "color", "modified"],
		order_by="from_date desc, modified desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_holiday_list(name=None):
	"""Return one holiday list with its child rows."""
	_require_hr_read_access()
	if not frappe.db.exists("DocType", "Holiday List"):
		return {"success": True, "data": {"name": name, "holidays": []}}
	name = _require_param(name, "name")
	doc = frappe.get_doc("Holiday List", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def get_leave_calendar(from_date=None, to_date=None, employee=None):
	"""Return leave and holiday events for calendar views."""
	_require_hr_read_access()
	cycle_start, cycle_end = _get_cycle_bounds(from_date or today(), to_date or add_days(today(), 30))
	leave_filters = {"leave_status": "APPROVED"}
	if employee:
		leave_filters["employee"] = employee
	leave_rows = frappe.get_all(
		"GE Leave Application",
		filters=leave_filters,
		fields=["name", "employee", "leave_type", "from_date", "to_date", "total_leave_days"],
	)
	leaves = [
		{
			"name": row.name,
			"title": f"{row.employee} - {row.leave_type}",
			"start": str(max(getdate(row.from_date), cycle_start)),
			"end": str(min(getdate(row.to_date), cycle_end)),
			"employee": row.employee,
			"leave_type": row.leave_type,
			"kind": "leave",
		}
		for row in leave_rows
		if row.from_date and row.to_date and _date_ranges_overlap(row.from_date, row.to_date, cycle_start, cycle_end)
	]

	holiday_events = []
	if frappe.db.exists("DocType", "Holiday List"):
		for holiday_list in frappe.get_all("Holiday List", fields=["name", "holiday_list_name"]):
			doc = frappe.get_doc("Holiday List", holiday_list.name)
			for holiday in doc.holidays:
				if cycle_start <= getdate(holiday.holiday_date) <= cycle_end:
					holiday_events.append({
						"name": f"{holiday_list.name}:{holiday.holiday_date}",
						"title": holiday.description or holiday.weekly_off or holiday_list.holiday_list_name,
						"start": str(holiday.holiday_date),
						"end": str(holiday.holiday_date),
						"holiday_list": holiday_list.name,
						"kind": "holiday",
					})

	return {
		"success": True,
		"data": {
			"from_date": str(cycle_start),
			"to_date": str(cycle_end),
			"leaves": leaves,
			"holidays": holiday_events,
		},
	}


@frappe.whitelist()
def get_who_is_in(attendance_date=None, department=None):
	"""Return who is in, on leave, absent, or unmarked for a selected date."""
	_require_hr_read_access()
	target_date = getdate(attendance_date or today())
	emp_filters = {"status": "Active"}
	if department:
		emp_filters["department"] = department
	employees = frappe.get_all(
		"Employee",
		filters=emp_filters,
		fields=["name", "employee_name", "designation", "department", "branch"],
		order_by="employee_name asc",
	)
	attendance_rows = {
		row.employee: row
		for row in frappe.get_all(
			"GE Attendance Log",
			filters={"attendance_date": str(target_date)},
			fields=["employee", "attendance_status", "linked_site", "linked_project", "check_in_time", "check_out_time"],
		)
	}
	leave_rows = frappe.get_all(
		"GE Leave Application",
		filters={"leave_status": "APPROVED"},
		fields=["employee", "leave_type", "from_date", "to_date"],
	)
	leaves_by_employee = {}
	for row in leave_rows:
		if row.from_date and row.to_date and _date_ranges_overlap(row.from_date, row.to_date, target_date, target_date):
			leaves_by_employee[row.employee] = row

	rows = []
	for employee_row in employees:
		attendance_row = attendance_rows.get(employee_row.name)
		leave_row = leaves_by_employee.get(employee_row.name)
		state = "Unmarked"
		if attendance_row:
			if attendance_row.attendance_status in {"PRESENT", "HALF_DAY", "ON_DUTY"}:
				state = "In"
			elif attendance_row.attendance_status == "ABSENT":
				state = "Absent"
			elif attendance_row.attendance_status == "WEEK_OFF":
				state = "Week Off"
		elif leave_row:
			state = "On Leave"
		rows.append({
			"employee": employee_row.name,
			"employee_name": employee_row.employee_name,
			"designation": employee_row.designation,
			"department": employee_row.department,
			"branch": employee_row.branch,
			"state": state,
			"attendance_status": attendance_row.attendance_status if attendance_row else None,
			"leave_type": leave_row.leave_type if leave_row else None,
			"linked_site": attendance_row.linked_site if attendance_row else None,
			"linked_project": attendance_row.linked_project if attendance_row else None,
		})

	return {
		"success": True,
		"data": {
			"attendance_date": str(target_date),
			"summary": {
				"total": len(rows),
				"in": sum(1 for row in rows if row["state"] == "In"),
				"on_leave": sum(1 for row in rows if row["state"] == "On Leave"),
				"absent": sum(1 for row in rows if row["state"] == "Absent"),
				"unmarked": sum(1 for row in rows if row["state"] == "Unmarked"),
			},
			"rows": rows,
		},
	}


@frappe.whitelist()
def get_attendance_muster(attendance_date=None, department=None):
	"""Return a muster-style employee status list for a given date."""
	_require_hr_read_access()
	target_date = getdate(attendance_date or today())
	who_is_in = get_who_is_in(str(target_date), department)
	rows = []
	for row in who_is_in["data"]["rows"]:
		rows.append({
			"employee": row["employee"],
			"employee_name": row["employee_name"],
			"designation": row["designation"],
			"department": row["department"],
			"status": row["attendance_status"] or ("ON_LEAVE" if row["state"] == "On Leave" else row["state"].upper().replace(" ", "_")),
			"state": row["state"],
			"linked_site": row["linked_site"],
			"linked_project": row["linked_project"],
		})
	return {"success": True, "data": {"attendance_date": str(target_date), "rows": rows}}


@frappe.whitelist()
def get_swipe_ingestion_placeholder():
	"""Return placeholder information for future swipe ingestion integration."""
	_require_hr_read_access()
	return {
		"success": True,
		"data": {
			"status": "PENDING_INTEGRATION",
			"supported_sources": ["Biometric device export", "CSV upload", "API bridge"],
			"required_fields": ["employee", "swipe_time", "device_id", "direction"],
			"notes": "Device integration is pending. Use attendance logs and regularization until the bridge is connected.",
		},
	}


@frappe.whitelist()
def get_attendance_regularizations(employee=None, status=None, regularization_date=None):
	"""Return attendance regularization requests."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if status:
		filters["regularization_status"] = status
	if regularization_date:
		filters["regularization_date"] = regularization_date
	data = frappe.get_all(
		"GE Attendance Regularization",
		filters=filters,
		fields=[
			"name", "employee", "regularization_date", "regularization_status",
			"requested_check_in", "requested_check_out", "requested_status",
			"linked_attendance_log", "reason", "submitted_by", "approved_by",
			"approved_at", "rejected_by", "rejection_reason", "creation", "modified",
		],
		order_by="regularization_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_attendance_regularization(name=None):
	"""Return one attendance regularization request."""
	_require_hr_read_access()
	name = _require_param(name, "name")
	doc = frappe.get_doc("GE Attendance Regularization", name)
	return {"success": True, "data": doc.as_dict()}


@frappe.whitelist()
def create_attendance_regularization(data):
	"""Create an attendance regularization request."""
	_require_regularization_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc({"doctype": "GE Attendance Regularization", **values})
	doc.insert()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization created"}


@frappe.whitelist()
def update_attendance_regularization(name, data):
	"""Update an attendance regularization request."""
	_require_regularization_manage_access()
	values = json.loads(data) if isinstance(data, str) else data
	doc = frappe.get_doc("GE Attendance Regularization", name)
	doc.update(values)
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization updated"}


@frappe.whitelist()
def delete_attendance_regularization(name):
	"""Delete an attendance regularization request."""
	_require_regularization_manage_access()
	frappe.delete_doc("GE Attendance Regularization", name)
	frappe.db.commit()
	return {"success": True, "message": "Attendance regularization deleted"}


@frappe.whitelist()
def submit_attendance_regularization(name):
	"""Move regularization request from DRAFT to SUBMITTED."""
	_require_regularization_manage_access()
	doc = frappe.get_doc("GE Attendance Regularization", name)
	if doc.regularization_status != "DRAFT":
		return {"success": False, "message": f"Regularization is in {doc.regularization_status} status, must be DRAFT to submit"}
	doc.regularization_status = "SUBMITTED"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization submitted"}


@frappe.whitelist()
def approve_attendance_regularization(name):
	"""Approve a regularization request and apply it to the attendance log."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Attendance Regularization", name)
	if doc.regularization_status != "SUBMITTED":
		return {"success": False, "message": f"Regularization is in {doc.regularization_status} status, must be SUBMITTED to approve"}

	attendance_name = doc.linked_attendance_log or frappe.db.get_value(
		"GE Attendance Log",
		{"employee": doc.employee, "attendance_date": doc.regularization_date},
		"name",
	)
	if attendance_name:
		attendance_doc = frappe.get_doc("GE Attendance Log", attendance_name)
	else:
		attendance_doc = frappe.get_doc({
			"doctype": "GE Attendance Log",
			"employee": doc.employee,
			"attendance_date": doc.regularization_date,
		})
		attendance_doc.insert()

	if doc.requested_status:
		attendance_doc.attendance_status = doc.requested_status
	if doc.requested_check_in:
		attendance_doc.check_in_time = doc.requested_check_in
	if doc.requested_check_out:
		attendance_doc.check_out_time = doc.requested_check_out
	attendance_doc.save()

	doc.linked_attendance_log = attendance_doc.name
	doc.regularization_status = "APPROVED"
	doc.approved_by = frappe.session.user
	doc.approved_at = frappe.utils.now()
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization approved"}


@frappe.whitelist()
def reject_attendance_regularization(name, reason=None):
	"""Reject a submitted attendance regularization request."""
	_require_hr_approval_access()
	doc = frappe.get_doc("GE Attendance Regularization", name)
	if doc.regularization_status != "SUBMITTED":
		return {"success": False, "message": f"Regularization is in {doc.regularization_status} status, must be SUBMITTED to reject"}
	doc.regularization_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	if reason:
		doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization rejected"}


@frappe.whitelist()
def reopen_attendance_regularization(name):
	"""Move a rejected or submitted regularization request back to draft."""
	_require_regularization_manage_access()
	doc = frappe.get_doc("GE Attendance Regularization", name)
	if doc.regularization_status not in {"REJECTED", "SUBMITTED"}:
		return {"success": False, "message": f"Regularization is in {doc.regularization_status} status, cannot move it to DRAFT"}
	doc.regularization_status = "DRAFT"
	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Attendance regularization moved back to draft"}


def _format_hr_inbox_age(timestamp):
	if not timestamp:
		return "-"
	delta = now_datetime() - get_datetime(timestamp)
	total_seconds = max(int(delta.total_seconds()), 0)
	total_hours = total_seconds // 3600
	days = total_hours // 24
	hours = total_hours % 24
	minutes = (total_seconds % 3600) // 60
	if days > 0:
		return f"{days}d {hours}h"
	if total_hours > 0:
		return f"{total_hours}h {minutes}m"
	return f"{minutes}m"


def _build_hr_inbox_item(
	workflow_type,
	workflow_label,
	row,
	status,
	title,
	subtitle,
	requested_by,
	action_owner,
	created_at,
	acted_at,
	view,
	actions,
	path,
	request_date=None,
	remarks=None,
	amount=None,
):
	timestamp = created_at if view == "pending" else (acted_at or created_at)
	return {
		"workflow_type": workflow_type,
		"workflow_label": workflow_label,
		"name": row.name,
		"status": status,
		"title": title,
		"subtitle": subtitle,
		"requested_by": requested_by or "-",
		"action_owner": action_owner or "HR Approver",
		"created_at": created_at,
		"acted_at": acted_at,
		"age": _format_hr_inbox_age(timestamp),
		"actions": actions,
		"path": path,
		"request_date": request_date,
		"remarks": remarks,
		"amount": amount,
		"sort_timestamp": str(timestamp or ""),
	}


@frappe.whitelist()
def get_hr_approval_inbox(view=None, request_type=None):
	"""Return a unified HR approval inbox across onboarding, leave, travel, overtime, and regularization."""
	_require_hr_approval_access()
	view = cstr(view or "pending").strip().lower()
	request_type = cstr(request_type or "all").strip().lower()
	if view not in {"pending", "completed"}:
		return {"success": False, "message": f"Unsupported inbox view: {view}"}

	include_all = request_type in {"", "all"}
	items = []
	counts = {
		"onboarding": 0,
		"leave": 0,
		"travel": 0,
		"overtime": 0,
		"regularization": 0,
	}

	def include(type_key):
		return include_all or request_type == type_key

	def register(type_key, row):
		counts[type_key] += 1
		items.append(row)

	if include("onboarding"):
		onboarding_statuses = ["SUBMITTED", "UNDER_REVIEW"] if view == "pending" else ["APPROVED", "REJECTED", "MAPPED_TO_EMPLOYEE"]
		onboardings = frappe.get_all(
			"GE Employee Onboarding",
			filters={"onboarding_status": ["in", onboarding_statuses]},
			fields=[
				"name", "employee_name", "designation", "company", "onboarding_status",
				"submitted_by", "reviewed_by", "approved_by", "approved_at",
				"rejected_by", "rejection_reason", "date_of_joining", "creation", "modified",
			],
			order_by="creation asc" if view == "pending" else "modified desc",
		)
		for row in onboardings:
			actions = []
			if view == "pending":
				if row.onboarding_status == "SUBMITTED":
					actions = ["review"]
				elif row.onboarding_status == "UNDER_REVIEW":
					actions = ["approve", "reject"]
			register(
				"onboarding",
				_build_hr_inbox_item(
					"onboarding",
					"Onboarding",
					row,
					row.onboarding_status,
					row.employee_name or row.name,
					" | ".join([value for value in [row.designation, row.company] if value]) or "Employee onboarding review",
					row.submitted_by,
					row.reviewed_by if row.onboarding_status == "UNDER_REVIEW" else (row.approved_by or row.rejected_by or "HR Approver"),
					row.creation,
					row.approved_at or row.modified,
					view,
					actions,
					"/hr/onboarding",
					request_date=row.date_of_joining,
					remarks=row.rejection_reason,
				),
			)

	if include("leave"):
		leave_statuses = ["SUBMITTED"] if view == "pending" else ["APPROVED", "REJECTED"]
		leave_rows = frappe.get_all(
			"GE Leave Application",
			filters={"leave_status": ["in", leave_statuses]},
			fields=[
				"name", "employee", "leave_type", "leave_status", "from_date", "to_date",
				"reason", "submitted_by", "approved_by", "approved_at", "rejected_by",
				"rejection_reason", "creation", "modified",
			],
			order_by="creation asc" if view == "pending" else "modified desc",
		)
		for row in leave_rows:
			register(
				"leave",
				_build_hr_inbox_item(
					"leave",
					"Leave",
					row,
					row.leave_status,
					row.employee or row.name,
					f"{row.leave_type} | {row.from_date} to {row.to_date}",
					row.submitted_by,
					row.approved_by or row.rejected_by or "HR Approver",
					row.creation,
					row.approved_at or row.modified,
					view,
					["approve", "reject"] if view == "pending" else [],
					"/hr/attendance",
					request_date=row.from_date,
					remarks=row.reason if view == "pending" else row.rejection_reason,
				),
			)

	if include("travel"):
		travel_statuses = ["SUBMITTED"] if view == "pending" else ["APPROVED", "REJECTED"]
		travel_rows = frappe.get_all(
			"GE Travel Log",
			filters={"travel_status": ["in", travel_statuses]},
			fields=[
				"name", "employee", "travel_date", "travel_status", "from_location", "to_location",
				"expense_amount", "submitted_by", "approved_by", "approved_at", "rejected_by",
				"rejection_reason", "creation", "modified",
			],
			order_by="creation asc" if view == "pending" else "modified desc",
		)
		for row in travel_rows:
			register(
				"travel",
				_build_hr_inbox_item(
					"travel",
					"Travel",
					row,
					row.travel_status,
					row.employee or row.name,
					" | ".join([value for value in [row.from_location, row.to_location] if value]) or "Travel request",
					row.submitted_by,
					row.approved_by or row.rejected_by or "HR Approver",
					row.creation,
					row.approved_at or row.modified,
					view,
					["approve", "reject"] if view == "pending" else [],
					"/hr/travel-logs",
					request_date=row.travel_date,
					remarks=row.rejection_reason,
					amount=row.expense_amount,
				),
			)

	if include("overtime"):
		overtime_statuses = ["SUBMITTED"] if view == "pending" else ["APPROVED", "REJECTED"]
		overtime_rows = frappe.get_all(
			"GE Overtime Entry",
			filters={"overtime_status": ["in", overtime_statuses]},
			fields=[
				"name", "employee", "overtime_date", "overtime_hours", "overtime_status",
				"submitted_by", "approved_by", "approved_at", "rejected_by",
				"rejection_reason", "creation", "modified",
			],
			order_by="creation asc" if view == "pending" else "modified desc",
		)
		for row in overtime_rows:
			register(
				"overtime",
				_build_hr_inbox_item(
					"overtime",
					"Overtime",
					row,
					row.overtime_status,
					row.employee or row.name,
					f"{flt(row.overtime_hours)} hours overtime",
					row.submitted_by,
					row.approved_by or row.rejected_by or "HR Approver",
					row.creation,
					row.approved_at or row.modified,
					view,
					["approve", "reject"] if view == "pending" else [],
					"/hr/overtime",
					request_date=row.overtime_date,
					remarks=row.rejection_reason,
				),
			)

	if include("regularization"):
		regularization_statuses = ["SUBMITTED"] if view == "pending" else ["APPROVED", "REJECTED"]
		regularization_rows = frappe.get_all(
			"GE Attendance Regularization",
			filters={"regularization_status": ["in", regularization_statuses]},
			fields=[
				"name", "employee", "regularization_date", "regularization_status", "requested_status",
				"reason", "submitted_by", "approved_by", "approved_at", "rejected_by",
				"rejection_reason", "creation", "modified",
			],
			order_by="creation asc" if view == "pending" else "modified desc",
		)
		for row in regularization_rows:
			register(
				"regularization",
				_build_hr_inbox_item(
					"regularization",
					"Regularization",
					row,
					row.regularization_status,
					row.employee or row.name,
					f"{row.requested_status or 'Attendance correction'} | {row.regularization_date}",
					row.submitted_by,
					row.approved_by or row.rejected_by or "HR Approver",
					row.creation,
					row.approved_at or row.modified,
					view,
					["approve", "reject"] if view == "pending" else [],
					"/hr/attendance",
					request_date=row.regularization_date,
					remarks=row.reason if view == "pending" else row.rejection_reason,
				),
			)

	items.sort(key=lambda row: row["sort_timestamp"], reverse=view == "completed")
	for item in items:
		item.pop("sort_timestamp", None)

	return {
		"success": True,
		"data": {
			"view": view,
			"request_type": request_type or "all",
			"summary": {
				**counts,
				"total": len(items),
			},
			"items": items,
		},
	}


@frappe.whitelist()
def act_on_hr_approval(request_type, name, action, remarks=None):
	"""Dispatch an approval inbox action to the correct HR workflow method."""
	_require_hr_approval_access()
	request_type = cstr(request_type).strip().lower()
	action = cstr(action).strip().lower()
	name = _require_param(name, "name")

	dispatch_map = {
		"onboarding": {
			"review": review_onboarding,
			"approve": approve_onboarding,
			"reject": lambda doc_name: reject_onboarding(doc_name, reason=remarks),
		},
		"leave": {
			"approve": approve_leave_application,
			"reject": lambda doc_name: reject_leave_application(doc_name, reason=remarks),
		},
		"travel": {
			"approve": approve_travel_log,
			"reject": lambda doc_name: reject_travel_log(doc_name, reason=remarks),
		},
		"overtime": {
			"approve": approve_overtime_entry,
			"reject": lambda doc_name: reject_overtime_entry(doc_name, reason=remarks),
		},
		"regularization": {
			"approve": approve_attendance_regularization,
			"reject": lambda doc_name: reject_attendance_regularization(doc_name, reason=remarks),
		},
	}

	workflow_actions = dispatch_map.get(request_type)
	if not workflow_actions or action not in workflow_actions:
		return {"success": False, "message": f"Unsupported inbox action {action} for request type {request_type}"}

	return workflow_actions[action](name)


@frappe.whitelist()
def get_travel_logs(employee=None, status=None, project=None, site=None):
	"""Return travel logs."""
	_require_hr_read_access()
	filters = {}
	if employee:
		filters["employee"] = employee
	if status:
		filters["travel_status"] = status
	if project:
		filters["linked_project"] = project
	if site:
		filters["linked_site"] = site
	data = frappe.get_all(
		"GE Travel Log",
		filters=filters,
		fields=[
			"name", "employee", "travel_date", "travel_status", "from_location",
			"to_location", "linked_project", "linked_site", "expense_amount", "submitted_by", "approved_by",
			"approved_at", "creation", "modified",
		],
		order_by="travel_date desc, creation desc",
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_travel_log(name=None):
	"""Return one travel log."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Travel Log",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			from_status="SUBMITTED",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route="/hr/travel-logs",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_travel_log")

	return {"success": True, "data": doc.as_dict(), "message": "Travel log approved"}


@frappe.whitelist()
def reject_travel_log(name, reason=None):
	"""Reject a submitted travel log."""
	_require_hr_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Travel Log", name)
	if doc.travel_status != "SUBMITTED":
		return {"success": False, "message": f"Travel log is in {doc.travel_status} status, must be SUBMITTED to reject"}
	doc.travel_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Travel Log",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			from_status="SUBMITTED",
			to_status="REJECTED",
			current_status="REJECTED",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route="/hr/travel-logs",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_travel_log")

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
def get_overtime_entry(name=None):
	"""Return one overtime entry."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Overtime Entry",
			subject_name=name,
			event_type=EventType.APPROVED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="SUBMITTED",
			to_status="APPROVED",
			current_status="APPROVED",
			approved_by=frappe.session.user,
			approved_on=now_datetime(),
			current_owner_role=_detect_primary_role(),
			source_route="/hr/overtime",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: approve_overtime_entry")

	return {"success": True, "data": doc.as_dict(), "message": "Overtime entry approved"}


@frappe.whitelist()
def reject_overtime_entry(name, reason=None):
	"""Reject a submitted overtime entry."""
	_require_hr_approval_access()
	if not (reason or "").strip():
		frappe.throw("A rejection reason is required. Please provide remarks.")
	doc = frappe.get_doc("GE Overtime Entry", name)
	if doc.overtime_status != "SUBMITTED":
		return {"success": False, "message": f"Overtime entry is in {doc.overtime_status} status, must be SUBMITTED to reject"}
	doc.overtime_status = "REJECTED"
	doc.rejected_by = frappe.session.user
	doc.rejection_reason = reason
	doc.save()
	frappe.db.commit()

	# ── Accountability ledger ─────────────────────────────────────────────
	try:
		from gov_erp.accountability import record_and_log, EventType
		record_and_log(
			subject_doctype="GE Overtime Entry",
			subject_name=name,
			event_type=EventType.REJECTED,
			linked_project=doc.get("linked_project"),
			linked_site=doc.get("linked_site"),
			from_status="SUBMITTED",
			to_status="REJECTED",
			current_status="REJECTED",
			current_owner_role=_detect_primary_role(),
			remarks=reason,
			source_route="/hr/overtime",
		)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Accountability: reject_overtime_entry")

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
def get_statutory_ledger(name=None):
	"""Return one statutory ledger entry."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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
def get_technician_visit_log(name=None):
	"""Return one technician visit log."""
	_require_hr_read_access()
	name = _require_param(name, "name")
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


# ── Employee Directory ───────────────────────────────────────


def _require_employee_read_access():
	_require_module_access("hr")


def _require_employee_write_access():
	_require_any_capability("hr.employee.manage", "hr.onboarding.manage")


_EMPLOYEE_LIST_FIELDS = [
	"name",
	"employee_name",
	"first_name",
	"last_name",
	"designation",
	"department",
	"branch",
	"status",
	"gender",
	"date_of_joining",
	"cell_number",
	"company_email",
	"personal_email",
	"image",
	"reports_to",
	"company",
	"user_id",
]

_EMPLOYEE_DETAIL_FIELDS = _EMPLOYEE_LIST_FIELDS + [
	"middle_name",
	"employee_number",
	"date_of_birth",
	"salutation",
	"marital_status",
	"blood_group",
	"current_address",
	"current_accommodation_type",
	"permanent_address",
	"permanent_accommodation_type",
	"person_to_be_contacted",
	"emergency_phone_number",
	"relation",
	"bank_name",
	"bank_ac_no",
	"iban",
	"salary_mode",
	"ctc",
	"salary_currency",
	"passport_number",
	"valid_upto",
	"date_of_issue",
	"place_of_issue",
	"holiday_list",
	"attendance_device_id",
	"date_of_retirement",
	"contract_end_date",
	"notice_number_of_days",
	"scheduled_confirmation_date",
	"final_confirmation_date",
	"resignation_letter_date",
	"relieving_date",
	"reason_for_leaving",
	"bio",
	"creation",
	"modified",
]


@frappe.whitelist()
def get_employees(status=None, department=None, designation=None, branch=None, search=None):
	"""Return the employee directory list."""
	_require_employee_read_access()
	filters = {}
	if status:
		filters["status"] = status
	if department:
		filters["department"] = department
	if designation:
		filters["designation"] = designation
	if branch:
		filters["branch"] = branch

	or_filters = None
	if search:
		search_term = f"%{search}%"
		or_filters = [
			["employee_name", "like", search_term],
			["name", "like", search_term],
			["cell_number", "like", search_term],
			["designation", "like", search_term],
			["department", "like", search_term],
			["company_email", "like", search_term],
		]

	data = frappe.get_all(
		"Employee",
		filters=filters,
		or_filters=or_filters,
		fields=_EMPLOYEE_LIST_FIELDS,
		order_by="employee_name asc",
		limit_page_length=0,
	)
	return {"success": True, "data": data}


@frappe.whitelist()
def get_employee(name=None):
	"""Return a single employee with profile details, education, and experience."""
	_require_employee_read_access()
	name = _require_param(name, "name")
	emp = frappe.get_doc("Employee", name)
	result = {f: emp.get(f) for f in _EMPLOYEE_DETAIL_FIELDS if emp.get(f) is not None}
	result["name"] = emp.name

	# Education child table
	result["education"] = [
		{
			"school_univ": row.school_univ,
			"qualification": row.qualification,
			"level": row.level,
			"year_of_passing": row.year_of_passing,
			"class_per": row.get("class_per"),
		}
		for row in (emp.education or [])
	]

	# Experience child table
	result["experience"] = [
		{
			"company_name": row.company_name,
			"designation": row.designation,
			"salary": row.get("salary"),
			"total_experience": row.get("total_experience"),
		}
		for row in (emp.external_work_history or [])
	]

	return {"success": True, "data": result}


@frappe.whitelist()
def get_employee_stats():
	"""Return employee directory summary counts."""
	_require_employee_read_access()
	rows = frappe.get_all("Employee", fields=["status", "department", "gender"])
	departments = set()
	active = inactive = male = female = 0
	for r in rows:
		if r.status == "Active":
			active += 1
		else:
			inactive += 1
		if r.gender == "Male":
			male += 1
		elif r.gender == "Female":
			female += 1
		if r.department:
			departments.add(r.department)
	return {
		"success": True,
		"data": {
			"total": len(rows),
			"active": active,
			"inactive": inactive,
			"male": male,
			"female": female,
			"departments": len(departments),
		},
	}


@frappe.whitelist()
def update_employee(name, data):
	"""Update writable fields on an Employee record."""
	_require_employee_write_access()
	name = _require_param(name, "name")
	values = _parse_payload(data)

	# Fields that may be updated via the profile UI
	WRITABLE_FIELDS = {
		"first_name", "middle_name", "last_name", "salutation", "gender",
		"date_of_birth", "date_of_joining", "designation", "department", "branch",
		"reports_to", "status", "cell_number", "personal_email", "company_email",
		"current_address", "current_accommodation_type",
		"permanent_address", "permanent_accommodation_type",
		"person_to_be_contacted", "emergency_phone_number", "relation",
		"bank_name", "bank_ac_no", "iban", "salary_mode",
		"marital_status", "blood_group",
		"passport_number", "valid_upto", "date_of_issue", "place_of_issue",
		"holiday_list", "attendance_device_id",
		"scheduled_confirmation_date", "final_confirmation_date",
		"contract_end_date", "notice_number_of_days", "date_of_retirement",
		"bio",
	}

	doc = frappe.get_doc("Employee", name)
	for key, val in values.items():
		if key in WRITABLE_FIELDS:
			doc.set(key, val)

	doc.save()
	frappe.db.commit()
	return {"success": True, "data": doc.as_dict(), "message": "Employee updated"}


@frappe.whitelist()
def get_employee_family(name=None):
	"""Return family/dependent info stored as Employee custom fields or child table."""
	_require_employee_read_access()
	name = _require_param(name, "name")
	emp = frappe.get_doc("Employee", name)
	return {
		"success": True,
		"data": {
			"name": emp.name,
			"marital_status": emp.marital_status,
			"blood_group": emp.blood_group,
			"family_background": emp.family_background,
			"health_details": emp.health_details,
			"person_to_be_contacted": emp.person_to_be_contacted,
			"emergency_phone_number": emp.emergency_phone_number,
			"relation": emp.relation,
		},
	}


@frappe.whitelist()
def get_employee_education(name=None):
	"""Return education rows for an employee."""
	_require_employee_read_access()
	name = _require_param(name, "name")
	emp = frappe.get_doc("Employee", name)
	rows = [
		{
			"school_univ": row.school_univ,
			"qualification": row.qualification,
			"level": row.level,
			"year_of_passing": row.year_of_passing,
			"class_per": row.get("class_per"),
		}
		for row in (emp.education or [])
	]
	return {"success": True, "data": rows}


@frappe.whitelist()
def get_employee_experience(name=None):
	"""Return work experience rows for an employee."""
	_require_employee_read_access()
	name = _require_param(name, "name")
	emp = frappe.get_doc("Employee", name)
	rows = [
		{
			"company_name": row.company_name,
			"designation": row.designation,
			"salary": row.get("salary"),
			"total_experience": row.get("total_experience"),
		}
		for row in (emp.external_work_history or [])
	]
	return {"success": True, "data": rows}


