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

	def on_update(self):
		"""Auto-advance site stage when survey is marked as Completed."""
		# Only trigger if status was just updated to Completed
		if self.status == "Completed" and self.db_get("status") != "Completed":
			self._auto_advance_site_stage()

	def _auto_advance_site_stage(self):
		"""
		If all surveys for a project are now completed, automatically advance
		all sites from SURVEY to BOQ_DESIGN stage.
		"""
		if not self.linked_project or not self.linked_site:
			return

		# Get all sites for this project
		sites = frappe.get_all(
			"GE Site",
			filters={"linked_project": self.linked_project},
			fields=["name", "current_site_stage"],
		)

		if not sites:
			return

		# Get all surveys for this project
		all_surveys = frappe.get_all(
			"GE Survey",
			filters={"linked_project": self.linked_project},
			fields=["name", "status"],
		)

		if not all_surveys:
			return

		# Check if ALL surveys are completed
		incomplete_count = sum(1 for s in all_surveys if s.status != "Completed")
		if incomplete_count > 0:
			# Not all surveys are done yet
			return

		# All surveys completed! Now advance all sites from SURVEY to BOQ_DESIGN
		from gov_erp.project_api import SPINE_STAGES

		for site_doc in sites:
			current_stage = site_doc.current_site_stage or "SURVEY"

			# Only advance if site is still in SURVEY stage
			if current_stage == "SURVEY":
				site_obj = frappe.get_doc("GE Site", site_doc.name)
				site_obj.current_site_stage = "BOQ_DESIGN"

				# Compute progress percent
				old_idx = SPINE_STAGES.index("SURVEY") if "SURVEY" in SPINE_STAGES else 0
				new_idx = SPINE_STAGES.index("BOQ_DESIGN") if "BOQ_DESIGN" in SPINE_STAGES else 1
				max_idx = len(SPINE_STAGES) - 1
				site_obj.site_progress_pct = round((new_idx / max_idx) * 100, 2) if max_idx else 100

				site_obj.save(ignore_permissions=True)

				# Log the transition
				frappe.get_doc({
					"doctype": "Comment",
					"comment_type": "Info",
					"reference_doctype": "GE Site",
					"reference_name": site_doc.name,
					"content": f"Stage auto-advanced: SURVEY → BOQ_DESIGN (all surveys completed)",
				}).insert(ignore_permissions=True)

		# Refresh project spine progress
		try:
			from gov_erp.project_api import _refresh_project_spine
			_refresh_project_spine(self.linked_project)
		except Exception:
			pass

		frappe.db.commit()
