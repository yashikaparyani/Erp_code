import frappe
from frappe.model.document import Document


class GETenderOrganization(Document):
	def validate(self):
		if self.is_lead:
			existing_lead = frappe.db.exists(
				"GE Tender Organization",
				{
					"linked_tender": self.linked_tender,
					"is_lead": 1,
					"name": ["!=", self.name],
				},
			)
			if existing_lead:
				frappe.throw("A lead organization already exists for this tender. Only one lead is allowed.")
