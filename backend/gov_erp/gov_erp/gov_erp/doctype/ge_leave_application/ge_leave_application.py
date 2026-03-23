import frappe
from frappe.model.document import Document
from frappe.utils import date_diff, getdate


VALID_LEAVE_TRANSITIONS = {
	"DRAFT": {"SUBMITTED"},
	"SUBMITTED": {"APPROVED", "REJECTED", "DRAFT"},
	"APPROVED": set(),
	"REJECTED": {"DRAFT"},
}


def validate_leave_status_transition(old_status, new_status):
	if not old_status or old_status == new_status:
		return
	allowed = VALID_LEAVE_TRANSITIONS.get(old_status, set())
	if new_status not in allowed:
		raise ValueError(f"Cannot change leave status from {old_status} to {new_status}")


class GELeaveApplication(Document):
	def before_insert(self):
		if not self.submitted_by:
			self.submitted_by = frappe.session.user

	def validate(self):
		self._validate_dates()
		self._validate_status_transition()
		self._validate_days()

	def on_update(self):
		if self.has_value_changed("leave_status") and self.leave_status == "APPROVED":
			self.approved_by = frappe.session.user
			self.approved_at = frappe.utils.now()
			frappe.db.set_value(
				"GE Leave Application",
				self.name,
				{"approved_by": self.approved_by, "approved_at": self.approved_at},
				update_modified=False,
			)

	def _validate_dates(self):
		if not self.from_date or not self.to_date:
			return
		if getdate(self.from_date) > getdate(self.to_date):
			frappe.throw("Leave start date cannot be after end date")
		if not self.total_leave_days:
			self.total_leave_days = date_diff(self.to_date, self.from_date) + 1

	def _validate_days(self):
		if self.total_leave_days is None:
			self.total_leave_days = 0
		if float(self.total_leave_days) <= 0:
			frappe.throw("Total leave days must be greater than zero")

	def _validate_status_transition(self):
		if not self.has_value_changed("leave_status"):
			return
		old = self.get_doc_before_save()
		if not old:
			return
		try:
			validate_leave_status_transition(old.leave_status, self.leave_status)
		except ValueError as exc:
			frappe.throw(str(exc))
