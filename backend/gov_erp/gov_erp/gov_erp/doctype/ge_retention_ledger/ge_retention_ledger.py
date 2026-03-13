import frappe
from frappe.model.document import Document


class GERetentionLedger(Document):
	def validate(self):
		if (self.release_amount or 0) < 0:
			frappe.throw("Negative retention release is not allowed")
		if (self.release_amount or 0) > (self.retention_amount or 0):
			frappe.throw("Release amount cannot exceed retention amount")
