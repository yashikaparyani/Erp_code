import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import today

from gov_erp.api import (
	approve_dependency_override,
	create_dependency_override,
	create_dependency_rule,
	evaluate_task_dependencies,
)


class TestExecutionRuntime(FrappeTestCase):
	def setUp(self):
		super().setUp()
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	def test_evaluate_task_dependencies_blocks_pending_survey(self):
		task = self._make_task()
		tender = self._make_tender()
		survey = self._make_survey(tender.name, status="Pending")

		rule = create_dependency_rule(
			{
				"linked_task": task.name,
				"prerequisite_type": "SURVEY",
				"linked_project": task.project,
				"prerequisite_reference_doctype": "GE Survey",
				"prerequisite_reference_name": survey.name,
				"required_status": "Completed",
				"hard_block": 1,
				"active": 1,
				"block_message": "Survey must be completed before task start",
			}
		)["data"]

		result = evaluate_task_dependencies(task.name)

		self.assertTrue(rule["name"])
		self.assertFalse(result["data"]["can_start"])
		self.assertEqual(len(result["data"]["blockers"]), 1)
		self.assertEqual(result["data"]["blockers"][0]["reference_doctype"], "GE Survey")
		self.assertEqual(result["data"]["blockers"][0]["reference_name"], survey.name)
		self.assertEqual(result["data"]["blockers"][0]["current_status"], "Pending")
		self.assertEqual(result["data"]["blockers"][0]["required_status"], "Completed")

	def test_evaluate_task_dependencies_allows_after_override_approval(self):
		task = self._make_task()
		tender = self._make_tender()
		survey = self._make_survey(tender.name, status="Pending")

		rule = create_dependency_rule(
			{
				"linked_task": task.name,
				"prerequisite_type": "SURVEY",
				"linked_project": task.project,
				"prerequisite_reference_doctype": "GE Survey",
				"prerequisite_reference_name": survey.name,
				"required_status": "Completed",
				"hard_block": 1,
				"active": 1,
			}
		)["data"]
		override = create_dependency_override(
			{
				"linked_task": task.name,
				"dependency_rule": rule["name"],
				"reason": "Department override for urgent execution",
			}
		)["data"]

		approve_dependency_override(override["name"], reason="Approved for urgent execution")
		result = evaluate_task_dependencies(task.name)

		self.assertTrue(result["data"]["can_start"])
		self.assertEqual(result["data"]["blockers"], [])

	def _make_task(self):
		project = self._make_project()
		task = frappe.get_doc(
			{
				"doctype": "Task",
				"subject": self._unique("Dependency Task"),
				"project": project.name,
				"status": "Open",
			}
		).insert()
		self.addCleanup(self._delete_if_exists, "Task", task.name)
		return task

	def _make_project(self):
		from erpnext.projects.doctype.project.test_project import make_project
		company = frappe.defaults.get_defaults().get("company") or frappe.get_all(
			"Company", fields=["name"], limit=1
		)[0].name
		project = make_project(
			{
				"project_name": self._unique("Dependency Project"),
				"company": company,
				"start_date": today(),
			}
		)
		self.addCleanup(self._delete_if_exists, "Project", project.name)
		return project

	def _make_tender(self):
		party = self._make_party()
		tender = frappe.get_doc(
			{
				"doctype": "GE Tender",
				"tender_number": self._unique("TN"),
				"title": self._unique("Dependency Tender"),
				"client": party.name,
				"status": "DRAFT",
			}
		).insert()
		self.addCleanup(self._delete_if_exists, "GE Tender", tender.name)
		return tender

	def _make_party(self):
		party = frappe.get_doc(
			{
				"doctype": "GE Party",
				"party_name": self._unique("Dependency Client"),
				"party_type": "CLIENT",
			}
		).insert()
		self.addCleanup(self._delete_if_exists, "GE Party", party.name)
		return party

	def _make_survey(self, tender_name, status):
		site = self._make_site()
		survey = frappe.get_doc(
			{
				"doctype": "GE Survey",
				"linked_tender": tender_name,
				"linked_site": site.name,
				"status": status,
			}
		).insert()
		self.addCleanup(self._delete_if_exists, "GE Survey", survey.name)
		return survey

	def _make_site(self):
		project = self._make_project()
		site = frappe.get_doc(
			{
				"doctype": "GE Site",
				"site_code": self._unique("SITE"),
				"site_name": self._unique("Dependency Site"),
				"status": "PLANNED",
				"linked_project": project.name,
			}
		).insert()
		self.addCleanup(self._delete_if_exists, "GE Site", site.name)
		return site

	def _unique(self, prefix):
		return f"{prefix}-{frappe.generate_hash(length=8)}"

	def _delete_if_exists(self, doctype, name):
		if frappe.db.exists(doctype, name):
			frappe.delete_doc(doctype, name, force=1)
