import frappe
from frappe.model.document import Document


INSTALLATION_STAGE_ORDER = [
	"Not Started", "Survey", "Civil Work", "Equipment Installation",
	"Cabling", "Testing", "Commissioned", "Handed Over",
]

VALID_SITE_STATUS_TRANSITIONS = {
	"PLANNED": {"ACTIVE", "CANCELLED"},
	"ACTIVE": {"ON_HOLD", "COMPLETED", "CANCELLED"},
	"ON_HOLD": {"ACTIVE", "CANCELLED"},
	"COMPLETED": set(),
	"CANCELLED": set(),
}


def validate_coordinates(latitude, longitude):
	if latitude is not None and not (-90 <= float(latitude) <= 90):
		raise ValueError("Latitude must be between -90 and 90")
	if longitude is not None and not (-180 <= float(longitude) <= 180):
		raise ValueError("Longitude must be between -180 and 180")


class GESite(Document):
	def validate(self):
		try:
			validate_coordinates(self.latitude, self.longitude)
		except ValueError as exc:
			frappe.throw(str(exc))

		self._validate_status_transition()
		self._validate_installation_stage()

	def _validate_status_transition(self):
		if not self.has_value_changed("status"):
			return
		old = self.get_doc_before_save()
		if not old:
			return
		allowed = VALID_SITE_STATUS_TRANSITIONS.get(old.status, set())
		if self.status not in allowed:
			frappe.throw(
				f"Cannot change site status from {old.status} to {self.status}. "
				f"Allowed: {', '.join(sorted(allowed)) or 'none (terminal state)'}"
			)

	def _validate_installation_stage(self):
		"""Ensure installation stages can only move forward (no regression)."""
		if not self.has_value_changed("installation_stage"):
			return
		old = self.get_doc_before_save()
		if not old or not old.installation_stage:
			return
		old_idx = INSTALLATION_STAGE_ORDER.index(old.installation_stage) if old.installation_stage in INSTALLATION_STAGE_ORDER else -1
		new_idx = INSTALLATION_STAGE_ORDER.index(self.installation_stage) if self.installation_stage in INSTALLATION_STAGE_ORDER else -1
		if old_idx >= 0 and new_idx >= 0 and new_idx < old_idx:
			frappe.throw(
				f"Installation stage cannot regress from '{old.installation_stage}' to '{self.installation_stage}'"
			)
