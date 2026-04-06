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

	def _convert_to_project(self, historical_start_date=None, historical_end_date=None):
		"""Create an ERPNext Project from this WON tender and link it back.

		Args:
			historical_start_date: Override the project start date (for historical imports).
				Falls back to: loa_date → agreement_date → work_order_date → today()
			historical_end_date: Override the expected end date.
				Falls back to: physical_completion_date → implementation_completion_date
				→ tenure_end_date.
		"""
		stage_config = get_workflow_stage("SURVEY")

		# Derive best-guess start date for the project
		start_date = (
			historical_start_date
			or getattr(self, "loa_date", None)
			or getattr(self, "agreement_date", None)
			or getattr(self, "work_order_date", None)
			or frappe.utils.today()
		)
		end_date = (
			historical_end_date
			or getattr(self, "physical_completion_date", None)
			or getattr(self, "implementation_completion_date", None)
			or getattr(self, "tenure_end_date", None)
			or None
		)

		project = frappe.get_doc(
			{
				"doctype": "Project",
				"project_name": f"{self.tender_number} - {self.title}",
				"status": "Open",
				"expected_start_date": start_date,
				"expected_end_date": end_date,
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
