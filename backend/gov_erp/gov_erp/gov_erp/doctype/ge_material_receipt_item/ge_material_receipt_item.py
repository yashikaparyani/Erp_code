import frappe
from frappe.model.document import Document


class GEMaterialReceiptItem(Document):
	def validate(self):
		if (self.qty or 0) <= 0:
			frappe.throw("Received quantity must be greater than zero")
