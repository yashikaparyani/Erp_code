import frappe
from frappe.model.document import Document


class GELeaveType(Document):
	def validate(self):
		if self.annual_allocation is None:
			self.annual_allocation = 0
		if float(self.annual_allocation) < 0:
			frappe.throw("Annual allocation cannot be negative")
