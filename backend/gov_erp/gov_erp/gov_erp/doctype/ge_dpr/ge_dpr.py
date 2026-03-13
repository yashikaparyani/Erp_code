import frappe
from frappe.model.document import Document


class GEDPR(Document):
	def validate(self):
		self.enforce_one_per_site_per_day()

	def enforce_one_per_site_per_day(self):
		"""Ensure only one DPR exists per site per day."""
		if not self.linked_site or not self.report_date:
			return
		existing = frappe.db.exists("GE DPR", {
			"linked_site": self.linked_site,
			"report_date": self.report_date,
			"name": ["!=", self.name],
		})
		if existing:
			frappe.throw(f"A DPR already exists for site {self.linked_site} on {self.report_date}")
