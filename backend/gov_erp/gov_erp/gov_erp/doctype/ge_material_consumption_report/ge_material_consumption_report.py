from frappe.model.document import Document
import frappe


class GEMaterialConsumptionReport(Document):
	def validate(self):
		self.consumed_qty = float(self.consumed_qty or 0)
		if self.consumed_qty <= 0:
			frappe.throw("Consumed quantity must be greater than zero")
