import frappe
from frappe.model.document import Document


class GETender(Document):
	def validate(self):
		if self.emd_required and not self.emd_amount:
			frappe.throw("EMD Amount is required when EMD is marked as required")
		if self.pbg_required and not self.pbg_amount:
			frappe.throw("PBG Amount is required when PBG is marked as required")

	def on_update(self):
		if self.has_value_changed("status") and self.status == "WON" and not self.linked_project:
			self._convert_to_project()

	def _convert_to_project(self):
		"""Create an ERPNext Project from this WON tender and link it back."""
		project = frappe.get_doc(
			{
				"doctype": "Project",
				"project_name": f"{self.tender_number} - {self.title}",
				"status": "Open",
				"expected_start_date": frappe.utils.today(),
				"company": frappe.defaults.get_defaults().get("company"),
				"estimated_costing": self.estimated_value or 0,
				"notes": f"Auto-created from Tender {self.tender_number}",
			}
		)
		project.insert()

		# Link the project back to the tender (bypass on_update to avoid recursion)
		frappe.db.set_value("GE Tender", self.name, "linked_project", project.name, update_modified=False)
		self.linked_project = project.name

		frappe.msgprint(
			f'Project <b>{project.name}</b> created from tender {self.tender_number}.',
			alert=True,
		)
