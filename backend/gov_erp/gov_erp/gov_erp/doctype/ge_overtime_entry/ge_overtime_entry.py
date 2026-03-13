import frappe
from frappe.model.document import Document


VALID_OVERTIME_TRANSITIONS = {
	"DRAFT": {"SUBMITTED"},
	"SUBMITTED": {"APPROVED", "REJECTED", "DRAFT"},
	"APPROVED": set(),
	"REJECTED": {"DRAFT"},
}


def validate_overtime_status_transition(old_status, new_status):
	if not old_status or old_status == new_status:
		return
	allowed = VALID_OVERTIME_TRANSITIONS.get(old_status, set())
	if new_status not in allowed:
		raise ValueError(f"Cannot change overtime status from {old_status} to {new_status}")


def validate_overtime_hours(hours):
	if hours in (None, ""):
		raise ValueError("Overtime hours are required")
	hours = float(hours)
	if hours <= 0:
		raise ValueError("Overtime hours must be greater than zero")
	if hours > 24:
		raise ValueError("Overtime hours cannot exceed 24 in a single entry")


class GEOvertimeEntry(Document):
	def before_insert(self):
		if not self.submitted_by:
			self.submitted_by = frappe.session.user

	def validate(self):
		self._validate_status_transition()
		try:
			validate_overtime_hours(self.overtime_hours)
		except ValueError as exc:
			frappe.throw(str(exc))

	def on_update(self):
		if self.has_value_changed("overtime_status") and self.overtime_status == "APPROVED":
			self.approved_by = frappe.session.user
			self.approved_at = frappe.utils.now()
			frappe.db.set_value(
				"GE Overtime Entry",
				self.name,
				{"approved_by": self.approved_by, "approved_at": self.approved_at},
				update_modified=False,
			)

	def _validate_status_transition(self):
		if not self.has_value_changed("overtime_status"):
			return
		old = self.get_doc_before_save()
		if not old:
			return
		try:
			validate_overtime_status_transition(old.overtime_status, self.overtime_status)
		except ValueError as exc:
			frappe.throw(str(exc))

