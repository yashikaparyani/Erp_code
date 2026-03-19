import json

import frappe
from frappe.model.document import Document
from gov_erp.project_workflow import get_workflow_stage


class GETender(Document):
	def validate(self):
		if not getattr(self, "tender_owner", None):
			self.tender_owner = frappe.session.user
		if self.emd_required and not self.emd_amount:
			frappe.throw("EMD Amount is required when EMD is marked as required")
		if self.pbg_required and not self.pbg_amount:
			frappe.throw("PBG Amount is required when PBG is marked as required")

	def _convert_to_project(self):
		"""Create an ERPNext Project from this WON tender and link it back."""
		stage_config = get_workflow_stage("SURVEY")
		project = frappe.get_doc(
			{
				"doctype": "Project",
				"project_name": f"{self.tender_number} - {self.title}",
				"status": "Open",
				"expected_start_date": frappe.utils.today(),
				"company": frappe.defaults.get_defaults().get("company"),
				"estimated_costing": self.estimated_value or 0,
				"notes": f"Auto-created from Tender {self.tender_number}",
				"linked_tender": self.name,
				"current_project_stage": "SURVEY",
				"current_stage_status": "IN_PROGRESS",
				"current_stage_owner_department": stage_config["owner_department"],
				"workflow_last_action": "TENDER_CONVERTED_TO_PROJECT",
				"workflow_last_actor": frappe.session.user,
				"workflow_last_action_at": frappe.utils.now(),
				"workflow_history_json": json.dumps(
					[
						{
							"timestamp": frappe.utils.now(),
							"actor": frappe.session.user,
							"action": "TENDER_CONVERTED_TO_PROJECT",
							"stage": "SURVEY",
							"next_stage": None,
							"remarks": f"Converted from tender {self.name}",
							"metadata": {"tender": self.name},
						}
					]
				),
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
