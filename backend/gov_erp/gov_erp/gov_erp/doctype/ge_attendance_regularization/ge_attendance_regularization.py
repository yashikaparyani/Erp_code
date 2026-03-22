import frappe
from frappe.model.document import Document
from frappe.utils import get_datetime, getdate


VALID_REGULARIZATION_TRANSITIONS = {
	"DRAFT": {"SUBMITTED"},
	"SUBMITTED": {"APPROVED", "REJECTED", "DRAFT"},
	"APPROVED": set(),
	"REJECTED": {"DRAFT"},
}


def validate_regularization_status_transition(old_status, new_status):
	if not old_status or old_status == new_status:
		return
	allowed = VALID_REGULARIZATION_TRANSITIONS.get(old_status, set())
	if new_status not in allowed:
		raise ValueError(f"Cannot change regularization status from {old_status} to {new_status}")


class GEAttendanceRegularization(Document):
	def before_insert(self):
		if not self.submitted_by:
			self.submitted_by = frappe.session.user

	def validate(self):
		self._validate_status_transition()
		self._validate_times()

	def on_update(self):
		if self.has_value_changed("regularization_status") and self.regularization_status == "APPROVED":
			self.approved_by = frappe.session.user
			self.approved_at = frappe.utils.now()
			frappe.db.set_value(
				"GE Attendance Regularization",
				self.name,
				{"approved_by": self.approved_by, "approved_at": self.approved_at},
				update_modified=False,
			)

	def _validate_times(self):
		if self.requested_check_in and self.requested_check_out and get_datetime(self.requested_check_out) < get_datetime(self.requested_check_in):
			frappe.throw("Requested check-out must be after requested check-in")
		if self.regularization_date and self.requested_check_in and getdate(self.requested_check_in) != getdate(self.regularization_date):
			frappe.throw("Requested check-in must fall on the regularization date")
		if self.regularization_date and self.requested_check_out and getdate(self.requested_check_out) != getdate(self.regularization_date):
			frappe.throw("Requested check-out must fall on the regularization date")

	def _validate_status_transition(self):
		if not self.has_value_changed("regularization_status"):
			return
		old = self.get_doc_before_save()
		if not old:
			return
		try:
			validate_regularization_status_transition(old.regularization_status, self.regularization_status)
		except ValueError as exc:
			frappe.throw(str(exc))
