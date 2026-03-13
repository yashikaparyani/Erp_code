import frappe
from frappe.model.document import Document


class GECostSheetItem(Document):
	def validate(self):
		self.base_amount = (self.qty or 0) * (self.base_rate or 0)
