import frappe
from frappe.model.document import Document


class GESurvey(Document):
	def validate(self):
		if not self.linked_site:
			frappe.throw("Linked Site is required for surveys")
		site = frappe.db.get_value(
			"GE Site",
			self.linked_site,
			["site_name", "linked_project", "linked_tender"],
			as_dict=True,
		)
		if not site:
			frappe.throw("Linked Site is invalid")
		self.site_name = site.site_name or self.site_name or self.linked_site
		self.linked_project = site.linked_project or self.linked_project
		if site.linked_tender:
			self.linked_tender = site.linked_tender
		elif self.linked_project and not self.linked_tender:
			self.linked_tender = frappe.db.get_value(
				"GE Tender",
				{"linked_project": self.linked_project},
				"name",
				order_by="modified desc",
			)
		self.context_status = "resolved"
