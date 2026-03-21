import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, date_diff, getdate


VALID_TICKET_TRANSITIONS = {
	"NEW": {"ASSIGNED", "IN_PROGRESS", "CLOSED"},
	"ASSIGNED": {"IN_PROGRESS", "ON_HOLD", "CLOSED"},
	"IN_PROGRESS": {"ON_HOLD", "RESOLVED", "CLOSED"},
	"ON_HOLD": {"IN_PROGRESS", "CLOSED"},
	"RESOLVED": {"CLOSED", "IN_PROGRESS"},
	"CLOSED": set(),
}


class GETicket(Document):
	def validate(self):
		self._validate_status_transition()
		self._validate_escalation_level()

	def before_save(self):
		self._auto_timestamps()
		self._compute_days_to_resolve()

	def _validate_status_transition(self):
		if not self.has_value_changed("status"):
			return
		old = self.get_doc_before_save()
		if not old:
			return
		old_status = old.status
		allowed = VALID_TICKET_TRANSITIONS.get(old_status, set())
		if self.status not in allowed:
			frappe.throw(
				f"Cannot change ticket status from {old_status} to {self.status}. "
				f"Allowed: {', '.join(sorted(allowed)) or 'none'}"
			)

	def _compute_days_to_resolve(self):
		if self.resolved_on and self.raised_on:
			self.days_to_resolve = max(
				date_diff(getdate(self.resolved_on), getdate(self.raised_on)), 0
			)

	def _validate_escalation_level(self):
		if self.escalation_level is None or self.escalation_level == "":
			return
		level = int(self.escalation_level)
		if level < 0 or level > 5:
			frappe.throw("Escalation level must be between 0 and 5")

	def _auto_timestamps(self):
		if not self.has_value_changed("status"):
			return
		if self.status == "RESOLVED" and not self.resolved_on:
			self.resolved_on = now_datetime()
		if self.status == "CLOSED" and not self.closed_on:
			self.closed_on = now_datetime()
