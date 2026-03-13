import frappe
from frappe.model.document import Document


class GEDispatchChallanItem(Document):
	def validate(self):
		if (self.qty or 0) <= 0:
			frappe.throw("Dispatch quantity must be greater than zero")
