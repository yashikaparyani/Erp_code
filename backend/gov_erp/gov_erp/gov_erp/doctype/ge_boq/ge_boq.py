import frappe
from frappe.model.document import Document


VALID_STATUS_TRANSITIONS = {
	"DRAFT": {"PENDING_APPROVAL"},
	"PENDING_APPROVAL": {"APPROVED", "REJECTED", "DRAFT"},
	"REJECTED": {"DRAFT"},
	"APPROVED": set(),
}


def calculate_line_amount(qty, rate):
	return (qty or 0) * (rate or 0)


def calculate_boq_totals(items):
	total_amount = 0
	for item in items:
		total_amount += calculate_line_amount(getattr(item, "qty", 0), getattr(item, "rate", 0))
	return {"total_amount": total_amount, "total_items": len(items)}


def validate_status_transition(old_status, new_status):
	if not old_status or old_status == new_status:
		return

	allowed = VALID_STATUS_TRANSITIONS.get(old_status, set())
	if new_status not in allowed:
		raise ValueError(f"Cannot change BOQ status from {old_status} to {new_status}")


def validate_survey_gate(tender_name, survey_statuses, bypass=False):
	"""Ensure all surveys for a tender are completed before BOQ approval.

	Args:
		tender_name: The linked tender name.
		survey_statuses: List of survey status strings.
		bypass: If True, skip the gate (for historical imports). An audit log is created.
	"""
	if bypass:
		frappe.logger("boq").info(
			f"Survey gate bypassed for tender {tender_name} by {frappe.session.user}"
		)
		return

	if not survey_statuses:
		raise ValueError(
			f"No surveys found for tender {tender_name}. "
			"At least one completed survey is required before submitting BOQ for approval."
		)

	incomplete = [status for status in survey_statuses if status != "Completed"]
	if incomplete:
		raise ValueError(
			f"{len(incomplete)} of {len(survey_statuses)} survey(s) for tender {tender_name} "
			"are not yet completed. All surveys must be completed before submitting BOQ for approval."
		)


class GEBOQ(Document):
	def before_insert(self):
		if not self.created_by_user:
			self.created_by_user = frappe.session.user

	def validate(self):
		self._calculate_totals()
		self._validate_status_transition()

	def before_save(self):
		if self.has_value_changed("status") and self.status == "PENDING_APPROVAL":
			self._enforce_survey_gate()

	def _calculate_totals(self):
		"""Recalculate line-item amounts and BOQ totals."""
		for item in self.items:
			item.amount = calculate_line_amount(item.qty, item.rate)
		totals = calculate_boq_totals(self.items)
		self.total_amount = totals["total_amount"]
		self.total_items = totals["total_items"]

	def _enforce_survey_gate(self):
		"""Block approval submission unless all surveys for the linked tender are completed.

		Set self.bypass_survey_gate = 1 (or pass via flags) for historical imports.
		Bypass is logged for audit.
		"""
		bypass = getattr(self, "bypass_survey_gate", 0) or self.flags.get("bypass_survey_gate")
		surveys = frappe.get_all(
			"GE Survey",
			filters={"linked_tender": self.linked_tender},
			fields=["status"],
		)
		try:
			validate_survey_gate(
				self.linked_tender,
				[survey.status for survey in surveys],
				bypass=bool(bypass),
			)
		except ValueError as exc:
			frappe.throw(str(exc))

	def _validate_status_transition(self):
		"""Ensure valid status transitions."""
		if not self.has_value_changed("status"):
			return

		old_status = self.get_doc_before_save()
		if not old_status:
			return

		try:
			validate_status_transition(old_status.status, self.status)
		except ValueError as exc:
			frappe.throw(str(exc))

	def on_update(self):
		if self.has_value_changed("status") and self.status == "APPROVED":
			self.approved_at = frappe.utils.now()
			self.approved_by = frappe.session.user
			frappe.db.set_value(
				"GE BOQ", self.name,
				{"approved_at": self.approved_at, "approved_by": self.approved_by},
				update_modified=False,
			)
