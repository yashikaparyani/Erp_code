import frappe
from frappe.model.document import Document


class GECostingQueue(Document):
	def validate(self):
		self._derive_project_from_site()

	def _derive_project_from_site(self):
		"""If linked_site is provided but project is missing, derive it."""
		if self.linked_site and not self.project:
			site_project = frappe.db.get_value("GE Site", self.linked_site, "linked_project")
			if site_project:
				self.project = site_project

