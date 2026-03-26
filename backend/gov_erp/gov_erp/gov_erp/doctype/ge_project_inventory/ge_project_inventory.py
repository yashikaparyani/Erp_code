from frappe.model.document import Document
import frappe


class GEProjectInventory(Document):
	def validate(self):
		self.received_qty = float(self.received_qty or 0)
		self.consumed_qty = float(self.consumed_qty or 0)
		self.balance_qty = self.received_qty - self.consumed_qty
		if self.received_qty < 0:
			frappe.throw("Received quantity cannot be negative")
		if self.consumed_qty < 0:
			frappe.throw("Consumed quantity cannot be negative")
		if self.balance_qty < 0:
			frappe.throw("Consumed quantity cannot exceed available received quantity")
