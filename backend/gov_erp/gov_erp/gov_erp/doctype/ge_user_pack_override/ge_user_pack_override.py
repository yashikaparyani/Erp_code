import frappe
from frappe.model.document import Document


class GEUserPackOverride(Document):
	def before_save(self):
		if not self.granted_by:
			self.granted_by = frappe.session.user
