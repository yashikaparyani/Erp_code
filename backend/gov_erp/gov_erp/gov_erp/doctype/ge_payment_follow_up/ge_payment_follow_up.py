import frappe
from frappe.model.document import Document


class GEPaymentFollowUp(Document):
	def validate(self):
		if self.promised_payment_amount and (self.promised_payment_amount or 0) < 0:
			frappe.throw("Promised payment amount cannot be negative")

