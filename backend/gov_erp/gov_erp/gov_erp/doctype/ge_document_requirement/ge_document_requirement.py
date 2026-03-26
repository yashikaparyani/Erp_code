import frappe
from frappe.model.document import Document


class GEDocumentRequirement(Document):
	def validate(self):
		if not self.stage:
			frappe.throw("Stage is required")
		if not self.document_category:
			frappe.throw("Document Category is required")
