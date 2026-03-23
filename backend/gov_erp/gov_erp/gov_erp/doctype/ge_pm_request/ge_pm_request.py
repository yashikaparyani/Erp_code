import frappe
from frappe.model.document import Document
from frappe.utils import cstr, date_diff, getdate, today


class GEPMRequest(Document):
	def validate(self):
		self._default_request_metadata()
		self._normalize_type_specific_fields()
		self._validate_workflow_payload()

	def _default_request_metadata(self):
		if not self.requested_by:
			self.requested_by = frappe.session.user
		if not self.requested_date:
			self.requested_date = today()

	def _normalize_type_specific_fields(self):
		request_type = cstr(self.request_type)
		if request_type == "Timeline Extension":
			if self.current_deadline and self.proposed_deadline:
				current = getdate(self.current_deadline)
				proposed = getdate(self.proposed_deadline)
				if proposed < current:
					frappe.throw("Proposed deadline cannot be earlier than current deadline")
				self.delay_days = max(date_diff(proposed, current), 0)
			self.positions_needed = None
			self.position_type = None
			self.duration_needed = None
			self.amount_requested = None
		elif request_type == "Staffing Request":
			self.current_deadline = None
			self.proposed_deadline = None
			self.delay_days = None
			self.amount_requested = None
		elif request_type == "Petty Cash Exception":
			self.current_deadline = None
			self.proposed_deadline = None
			self.delay_days = None
			self.positions_needed = None
			self.position_type = None
			self.duration_needed = None
		else:
			self.current_deadline = None
			self.proposed_deadline = None
			self.delay_days = None
			self.positions_needed = None
			self.position_type = None
			self.duration_needed = None
			self.amount_requested = None

	def _validate_workflow_payload(self):
		status = cstr(self.status or "Draft")
		request_type = cstr(self.request_type)

		if status not in {"Draft", "Pending", "Approved", "Rejected", "Withdrawn"}:
			frappe.throw("Invalid PM request status")

		if status == "Draft":
			return

		if request_type == "Timeline Extension":
			if not self.current_deadline or not self.proposed_deadline:
				frappe.throw("Timeline Extension requests need current and proposed deadlines")
		elif request_type == "Staffing Request":
			if not self.positions_needed or self.positions_needed <= 0:
				frappe.throw("Staffing Request needs positions needed")
			if not cstr(self.position_type).strip():
				frappe.throw("Staffing Request needs position type")
			if not cstr(self.duration_needed).strip():
				frappe.throw("Staffing Request needs duration needed")
		elif request_type == "Petty Cash Exception":
			if not self.amount_requested or self.amount_requested <= 0:
				frappe.throw("Petty Cash Exception needs amount requested")
		elif request_type in {"Hold Recommendation", "Escalation Memo"}:
			if not cstr(self.description).strip():
				frappe.throw(f"{request_type} needs description")
			if not cstr(self.justification).strip():
				frappe.throw(f"{request_type} needs justification")

		if status in {"Approved", "Rejected"}:
			if not self.reviewed_by or not self.reviewed_date:
				frappe.throw(f"{status} requests must capture reviewer and review date")
