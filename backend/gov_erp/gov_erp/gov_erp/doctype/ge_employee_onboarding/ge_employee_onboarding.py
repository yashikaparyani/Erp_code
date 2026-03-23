import re

import frappe
from frappe.model.document import Document


VALID_ONBOARDING_TRANSITIONS = {
	"DRAFT": {"SUBMITTED"},
	"SUBMITTED": {"UNDER_REVIEW", "DRAFT"},
	"UNDER_REVIEW": {"APPROVED", "REJECTED", "SUBMITTED"},
	"APPROVED": {"MAPPED_TO_EMPLOYEE"},
	"REJECTED": {"DRAFT"},
	"MAPPED_TO_EMPLOYEE": set(),
}

AADHAR_PATTERN = re.compile(r"^\d{12}$")
PAN_PATTERN = re.compile(r"^[A-Z]{5}\d{4}[A-Z]$")


def validate_onboarding_status_transition(old_status, new_status):
	if not old_status or old_status == new_status:
		return
	allowed = VALID_ONBOARDING_TRANSITIONS.get(old_status, set())
	if new_status not in allowed:
		raise ValueError(f"Cannot change onboarding status from {old_status} to {new_status}")


def validate_aadhar(aadhar_number):
	if not aadhar_number:
		return
	if not AADHAR_PATTERN.match(aadhar_number.strip()):
		raise ValueError("Aadhar number must be exactly 12 digits")


def validate_pan(pan_number):
	if not pan_number:
		return
	cleaned = pan_number.strip().upper()
	if not PAN_PATTERN.match(cleaned):
		raise ValueError("PAN number must follow the format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)")


def validate_dob_before_doj(date_of_birth, date_of_joining):
	if not date_of_birth or not date_of_joining:
		return
	from frappe.utils import getdate
	if getdate(date_of_birth) >= getdate(date_of_joining):
		raise ValueError("Date of Birth must be before Date of Joining")


def check_mandatory_documents(documents):
	"""Return list of mandatory document types that have no file attached."""
	missing = []
	for doc in documents:
		if doc.is_mandatory and not doc.file:
			missing.append(doc.document_type)
	return missing


def get_onboarding_mapping_readiness(onboarding):
	"""Return whether an onboarding record is safe to map into Employee."""
	missing_documents = check_mandatory_documents(getattr(onboarding, "documents", []) or [])
	missing_fields = []

	if not (getattr(onboarding, "employee_name", "") or "").strip():
		missing_fields.append("Employee Name")
	if not (getattr(onboarding, "company", "") or "").strip():
		missing_fields.append("Company")
	if not getattr(onboarding, "date_of_joining", None):
		missing_fields.append("Date Of Joining")

	status = getattr(onboarding, "onboarding_status", None)
	linked_employee = getattr(onboarding, "employee_reference", None)
	blocking_reasons = []

	if status != "APPROVED":
		blocking_reasons.append(f"Record must be APPROVED before mapping (current: {status or 'UNKNOWN'})")
	if linked_employee:
		blocking_reasons.append(f"Already linked to Employee {linked_employee}")
	if missing_fields:
		blocking_reasons.append(f"Missing required fields: {', '.join(missing_fields)}")
	if missing_documents:
		blocking_reasons.append(f"Missing mandatory documents: {', '.join(missing_documents)}")

	return {
		"can_map": not blocking_reasons,
		"status": status,
		"linked_employee": linked_employee,
		"missing_documents": missing_documents,
		"missing_fields": missing_fields,
		"blocking_reasons": blocking_reasons,
		"education_rows": len(getattr(onboarding, "education", []) or []),
		"experience_rows": len(getattr(onboarding, "experience", []) or []),
		"document_rows": len(getattr(onboarding, "documents", []) or []),
	}


def map_onboarding_to_employee_dict(onboarding):
	"""Build a dict suitable for creating/updating an ERPNext Employee from an onboarding record."""
	return {
		"first_name": onboarding.employee_name or "",
		"company": onboarding.company,
		"date_of_joining": onboarding.date_of_joining,
		"designation": onboarding.designation,
		"gender": onboarding.gender,
		"date_of_birth": onboarding.date_of_birth,
		"cell_number": onboarding.contact_number,
		"personal_email": onboarding.personal_email,
		"current_address": onboarding.local_address,
		"permanent_address": onboarding.permanent_address,
		"marital_status": onboarding.marital_status,
		"blood_group": onboarding.blood_group,
		"salutation": onboarding.salutation,
	}


class GEEmployeeOnboarding(Document):
	def before_insert(self):
		if not self.submitted_by:
			self.submitted_by = frappe.session.user

	def validate(self):
		self._validate_status_transition()
		self._validate_identity()
		self._validate_dates()

	def _validate_status_transition(self):
		if not self.has_value_changed("onboarding_status"):
			return
		old = self.get_doc_before_save()
		if not old:
			return
		try:
			validate_onboarding_status_transition(old.onboarding_status, self.onboarding_status)
		except ValueError as exc:
			frappe.throw(str(exc))

	def _validate_identity(self):
		try:
			validate_aadhar(self.aadhar_number)
		except ValueError as exc:
			frappe.throw(str(exc))
		try:
			validate_pan(self.pan_number)
		except ValueError as exc:
			frappe.throw(str(exc))

	def _validate_dates(self):
		try:
			validate_dob_before_doj(self.date_of_birth, self.date_of_joining)
		except ValueError as exc:
			frappe.throw(str(exc))

	def on_update(self):
		if self.has_value_changed("onboarding_status") and self.onboarding_status == "APPROVED":
			self.approved_at = frappe.utils.now()
			self.approved_by = frappe.session.user
			frappe.db.set_value(
				"GE Employee Onboarding", self.name,
				{"approved_at": self.approved_at, "approved_by": self.approved_by},
				update_modified=False,
			)
