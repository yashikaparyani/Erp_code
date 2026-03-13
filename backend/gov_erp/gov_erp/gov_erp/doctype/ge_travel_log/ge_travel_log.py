import frappe
from frappe.model.document import Document


VALID_TRAVEL_LOG_TRANSITIONS = {
	"DRAFT": {"SUBMITTED"},
	"SUBMITTED": {"APPROVED", "REJECTED", "DRAFT"},
	"APPROVED": set(),
	"REJECTED": {"DRAFT"},
}


def validate_travel_status_transition(old_status, new_status):
	if not old_status or old_status == new_status:
		return
	allowed = VALID_TRAVEL_LOG_TRANSITIONS.get(old_status, set())
	if new_status not in allowed:
		raise ValueError(f"Cannot change travel log status from {old_status} to {new_status}")


def validate_travel_expense_amount(expense_amount):
	if expense_amount in (None, ""):
		return
	if float(expense_amount) < 0:
		raise ValueError("Expense amount cannot be negative")


class GETravelLog(Document):
	def before_insert(self):
		if not self.submitted_by:
			self.submitted_by = frappe.session.user

	def validate(self):
		self._validate_status_transition()
		try:
			validate_travel_expense_amount(self.expense_amount)
		except ValueError as exc:
			frappe.throw(str(exc))

	def on_update(self):
		if self.has_value_changed("travel_status") and self.travel_status == "APPROVED":
			self.approved_by = frappe.session.user
			self.approved_at = frappe.utils.now()
			frappe.db.set_value(
				"GE Travel Log",
				self.name,
				{"approved_by": self.approved_by, "approved_at": self.approved_at},
				update_modified=False,
			)

	def _validate_status_transition(self):
		if not self.has_value_changed("travel_status"):
			return
		old = self.get_doc_before_save()
		if not old:
			return
		try:
			validate_travel_status_transition(old.travel_status, self.travel_status)
		except ValueError as exc:
			frappe.throw(str(exc))

