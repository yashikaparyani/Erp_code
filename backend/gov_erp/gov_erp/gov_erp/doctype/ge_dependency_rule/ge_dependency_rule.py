import frappe
from frappe.model.document import Document


def normalize_status(status):
	return (status or "").strip().upper().replace(" ", "_")


def resolve_reference_status(status=None, workflow_state=None, docstatus=None):
	if status:
		return status
	if workflow_state:
		return workflow_state
	if docstatus is not None:
		return {0: "DRAFT", 1: "SUBMITTED", 2: "CANCELLED"}.get(docstatus, str(docstatus))
	return ""


def evaluate_dependency_state(current_status, required_status, override_status=None, active=True, hard_block=True):
	if not active:
		return {"blocked": False, "hard_block": False, "reason": "Rule inactive"}

	if normalize_status(override_status) == "APPROVED":
		return {"blocked": False, "hard_block": False, "reason": "Approved override present"}

	if normalize_status(current_status) == normalize_status(required_status):
		return {"blocked": False, "hard_block": False, "reason": "Prerequisite satisfied"}

	return {
		"blocked": True,
		"hard_block": bool(hard_block),
		"reason": f"Required status {required_status}, current status {current_status or 'UNKNOWN'}",
	}


class GEDependencyRule(Document):
	def validate(self):
		if bool(self.prerequisite_reference_doctype) != bool(self.prerequisite_reference_name):
			frappe.throw("Prerequisite Reference DocType and Prerequisite Reference Name must be provided together")
