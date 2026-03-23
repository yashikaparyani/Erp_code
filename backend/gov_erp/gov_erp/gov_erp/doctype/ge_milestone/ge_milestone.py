import frappe
from frappe.model.document import Document


VALID_MILESTONE_TRANSITIONS = {
	"PLANNED": {"IN_PROGRESS", "CANCELLED"},
	"IN_PROGRESS": {"BLOCKED", "COMPLETED", "CANCELLED"},
	"BLOCKED": {"IN_PROGRESS", "CANCELLED"},
	"COMPLETED": set(),
	"CANCELLED": set(),
}


class GEMilestone(Document):
	def validate(self):
		self._validate_status_transition()
		self._validate_dates()

	def on_update(self):
		if self.has_value_changed("status") or self.has_value_changed("progress_pct"):
			self._sync_site_progress()

	def _validate_status_transition(self):
		if not self.has_value_changed("status"):
			return
		old = self.get_doc_before_save()
		if not old:
			return
		allowed = VALID_MILESTONE_TRANSITIONS.get(old.status, set())
		if self.status not in allowed:
			frappe.throw(
				f"Cannot change milestone status from {old.status} to {self.status}. "
				f"Allowed: {', '.join(sorted(allowed)) or 'none (terminal state)'}"
			)

	def _validate_dates(self):
		if self.planned_start_date and self.planned_end_date:
			if self.planned_start_date > self.planned_end_date:
				frappe.throw("Planned start date cannot be after planned end date")
		if self.actual_start_date and self.actual_end_date:
			if self.actual_start_date > self.actual_end_date:
				frappe.throw("Actual start date cannot be after actual end date")

	def _sync_site_progress(self):
		"""When a milestone changes, recompute the linked site's progress."""
		if not self.linked_site:
			return

		milestones = frappe.get_all(
			"GE Milestone",
			filters={"linked_site": self.linked_site},
			fields=["progress_pct", "status"],
		)
		if not milestones:
			return

		total = len(milestones)
		completed = sum(1 for m in milestones if m.status == "COMPLETED")
		avg_progress = sum(m.progress_pct or 0 for m in milestones) / total

		frappe.db.set_value(
			"GE Site",
			self.linked_site,
			{
				"site_progress_pct": avg_progress,
				"location_progress_pct": (completed / total) * 100,
			},
			update_modified=False,
		)
