import frappe
from frappe.model.document import Document


class GEMilestone(Document):
	def validate(self):
		if self.actual_date and self.planned_date and self.actual_date < self.planned_date and self.status == "COMPLETED":
			frappe.throw("Actual Date cannot be before Planned Date for a completed milestone")
