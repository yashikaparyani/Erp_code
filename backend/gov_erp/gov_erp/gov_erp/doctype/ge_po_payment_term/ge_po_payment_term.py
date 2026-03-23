import frappe
from frappe.model.document import Document


class GEPOPaymentTerm(Document):
	def validate(self):
		self.amount = (self.percentage or 0) / 100 * (self.get("po_grand_total") or 0)
