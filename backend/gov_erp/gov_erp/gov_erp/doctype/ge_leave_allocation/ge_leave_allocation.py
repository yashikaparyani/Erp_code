import frappe
from frappe.model.document import Document
from frappe.utils import getdate


class GELeaveAllocation(Document):
	def validate(self):
		if self.allocation_days is None:
			self.allocation_days = 0
		if float(self.allocation_days) < 0:
			frappe.throw("Allocation days cannot be negative")
		if self.from_date and self.to_date and getdate(self.from_date) > getdate(self.to_date):
			frappe.throw("Allocation start date cannot be after end date")
