"""Runtime tests for PM Request lifecycle, DMS upload/versioning/status,
and PH Approval Hub (petty-cash → PH approve/reject → costing queue).

These require ``bench --site <site> run-tests`` (full Frappe context).
They are also collectable by plain ``pytest`` — the heavy ERPNext import
is deferred to helper methods.
"""

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import now_datetime, today

from gov_erp.pm_workspace_api import (
	approve_pm_request,
	create_pm_request,
	get_pm_request,
	reject_pm_request,
	submit_pm_request,
	update_pm_request,
)
from gov_erp.dms_api import (
	get_document_versions,
	get_project_documents,
	update_document_status,
	upload_project_document,
)
from gov_erp.finance_api import (
	approve_petty_cash_entry,
	create_petty_cash_entry,
	ph_approve_item,
	ph_reject_item,
	submit_petty_cash_to_ph,
)


class TestPMRequestRuntime(FrappeTestCase):
	"""Full PM Request lifecycle: create → update → submit → approve/reject."""

	def setUp(self):
		super().setUp()
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	# ── Happy path: Draft → Pending → Approved ──────────────────────────

	def test_pm_request_create_submit_approve(self):
		project = self._make_project()

		result = create_pm_request({
			"linked_project": project.name,
			"request_type": "Timeline Extension",
			"subject": "Extend delivery by 2 weeks",
			"description": "Site access delayed due to monsoon.",
			"priority": "Urgent",
			"current_deadline": today(),
			"proposed_deadline": frappe.utils.add_days(today(), 14),
		})
		self.assertTrue(result["success"])
		name = result["data"]["name"]
		self._track_doc("GE PM Request", name)

		self.assertEqual(result["data"]["status"], "Draft")
		self.assertEqual(result["data"]["linked_project"], project.name)

		# Update while still draft
		upd = update_pm_request(name, {"description": "Updated: monsoon + flooding."})
		self.assertTrue(upd["success"])
		self.assertIn("flooding", upd["data"]["description"])

		# Submit for PH review
		sub = submit_pm_request(name)
		self.assertTrue(sub["success"])
		self.assertEqual(sub["data"]["status"], "Pending")

		# PH approves
		app = approve_pm_request(name, remarks="Extension granted")
		self.assertTrue(app["success"])
		self.assertEqual(app["data"]["status"], "Approved")
		self.assertEqual(app["data"]["reviewed_by"], "Administrator")
		self.assertTrue(app["data"]["reviewed_date"])

	# ── Reject path: Draft → Pending → Rejected ────────────────────────

	def test_pm_request_create_submit_reject(self):
		project = self._make_project()

		result = create_pm_request({
			"linked_project": project.name,
			"request_type": "Staffing Request",
			"subject": "Need 2 more electricians",
			"positions_needed": 2,
			"position_type": "Electrician",
			"duration_needed": "3 months",
		})
		name = result["data"]["name"]
		self._track_doc("GE PM Request", name)

		submit_pm_request(name)

		rej = reject_pm_request(name, remarks="Budget not approved")
		self.assertTrue(rej["success"])
		self.assertEqual(rej["data"]["status"], "Rejected")
		self.assertEqual(rej["data"]["reviewer_remarks"], "Budget not approved")

	# ── Guard: reject without remarks must fail ─────────────────────────

	def test_pm_request_reject_requires_remarks(self):
		project = self._make_project()
		result = create_pm_request({
			"linked_project": project.name,
			"request_type": "Hold Recommendation",
			"subject": "Escalation test",
			"description": "Hold justification text",
			"justification": "Budget overrun detected",
		})
		name = result["data"]["name"]
		self._track_doc("GE PM Request", name)
		submit_pm_request(name)

		with self.assertRaises(frappe.ValidationError):
			reject_pm_request(name, remarks="")

	# ── Guard: cannot update after submit ───────────────────────────────

	def test_pm_request_update_blocked_after_submit(self):
		project = self._make_project()
		result = create_pm_request({
			"linked_project": project.name,
			"request_type": "Hold Recommendation",
			"subject": "Hold test",
			"description": "Hold description",
			"justification": "Budget justification",
		})
		name = result["data"]["name"]
		self._track_doc("GE PM Request", name)
		submit_pm_request(name)

		with self.assertRaises(frappe.ValidationError):
			update_pm_request(name, {"subject": "Should fail"})

	# ── Read ────────────────────────────────────────────────────────────

	def test_pm_request_get(self):
		project = self._make_project()
		result = create_pm_request({
			"linked_project": project.name,
			"request_type": "Petty Cash Exception",
			"subject": "Get test",
			"amount_requested": 5000,
		})
		name = result["data"]["name"]
		self._track_doc("GE PM Request", name)

		got = get_pm_request(name)
		self.assertTrue(got["success"])
		self.assertEqual(got["data"]["name"], name)

	# ── Helpers ──────────────────────────────────────────────────────────

	def _make_project(self):
		from erpnext.projects.doctype.project.test_project import make_project
		project = make_project({
			"project_name": self._unique("PM Req Project"),
			"company": self._default_company(),
			"start_date": today(),
		})
		self._track_doc("Project", project.name)
		return project

	def _default_company(self):
		return frappe.defaults.get_defaults().get("company") or frappe.get_all(
			"Company", fields=["name"], limit=1
		)[0].name

	def _track_doc(self, doctype, name):
		self.addCleanup(self._delete_if_exists, doctype, name)

	def _delete_if_exists(self, doctype, name):
		if frappe.db.exists(doctype, name):
			frappe.delete_doc(doctype, name, force=1)

	def _unique(self, prefix):
		return f"{prefix}-{frappe.generate_hash(length=8)}"


class TestDMSRuntime(FrappeTestCase):
	"""DMS upload, versioning, status transitions, and project-scoped retrieval."""

	def setUp(self):
		super().setUp()
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	# ── Upload + retrieve ───────────────────────────────────────────────

	def test_upload_and_retrieve_project_document(self):
		project = self._make_project()
		file_url = self._make_file("test-survey-report.pdf")

		result = upload_project_document({
			"document_name": "Site Survey Report",
			"category": "Survey",
			"linked_project": project.name,
			"file": file_url,
		})
		self.assertTrue(result["success"])
		doc_name = result["data"]["name"]
		self._track_doc("GE Project Document", doc_name)

		self.assertEqual(result["data"]["linked_project"], project.name)
		self.assertEqual(result["data"]["category"], "Survey")
		self.assertEqual(result["data"]["version"], 1)

		# Retrieve by project
		result = get_project_documents(project=project.name)
		names = [d["name"] for d in result["data"]]
		self.assertIn(doc_name, names)

	# ── Versioning ──────────────────────────────────────────────────────

	def test_document_versioning(self):
		project = self._make_project()
		file_v1 = self._make_file("boq-v1.pdf")
		file_v2 = self._make_file("boq-v2.pdf")

		v1 = upload_project_document({
			"document_name": "BOQ Draft",
			"category": "Engineering",
			"linked_project": project.name,
			"file": file_v1,
		})
		v1_name = v1["data"]["name"]
		self._track_doc("GE Project Document", v1_name)
		self.assertEqual(v1["data"]["version"], 1)

		v2 = upload_project_document({
			"document_name": "BOQ Draft",
			"category": "Engineering",
			"linked_project": project.name,
			"file": file_v2,
			"supersedes_document": v1_name,
		})
		v2_name = v2["data"]["name"]
		self._track_doc("GE Project Document", v2_name)
		self.assertEqual(v2["data"]["version"], 2)

		versions = get_document_versions(name=v2_name)
		self.assertTrue(versions["success"])
		self.assertGreaterEqual(len(versions["data"]), 2)

	# ── Status transitions ──────────────────────────────────────────────

	def test_document_status_transitions(self):
		project = self._make_project()
		file_url = self._make_file("commissioning.pdf")
		result = upload_project_document({
			"document_name": "Commissioning Report",
			"category": "Commissioning",
			"linked_project": project.name,
			"file": file_url,
		})
		doc_name = result["data"]["name"]
		self._track_doc("GE Project Document", doc_name)

		# Submitted → In Review → Approved
		review = update_document_status({"name": doc_name, "status": "In Review"})
		self.assertTrue(review["success"])
		self.assertEqual(review["data"]["status"], "In Review")

		approved = update_document_status({"name": doc_name, "status": "Approved"})
		self.assertTrue(approved["success"])
		self.assertEqual(approved["data"]["status"], "Approved")

	def test_document_rejection_requires_reason(self):
		project = self._make_project()
		file_url = self._make_file("dispatch-proof.pdf")
		result = upload_project_document({
			"document_name": "Dispatch Challan Proof",
			"category": "Dispatch",
			"linked_project": project.name,
			"file": file_url,
		})
		doc_name = result["data"]["name"]
		self._track_doc("GE Project Document", doc_name)

		with self.assertRaises(frappe.ValidationError):
			update_document_status({"name": doc_name, "status": "Rejected"})

		rej = update_document_status({
			"name": doc_name, "status": "Rejected",
			"reason": "Incorrect site ID",
		})
		self.assertTrue(rej["success"])
		self.assertEqual(rej["data"]["status"], "Rejected")

	# ── Context filtering ───────────────────────────────────────────────

	def test_project_scoped_document_filtering(self):
		p1 = self._make_project()
		p2 = self._make_project()
		f1 = self._make_file("p1.pdf")
		f2 = self._make_file("p2.pdf")

		d1 = upload_project_document({
			"document_name": "P1 Doc", "category": "Survey",
			"linked_project": p1.name, "file": f1,
		})
		self._track_doc("GE Project Document", d1["data"]["name"])

		d2 = upload_project_document({
			"document_name": "P2 Doc", "category": "Survey",
			"linked_project": p2.name, "file": f2,
		})
		self._track_doc("GE Project Document", d2["data"]["name"])

		p1_result = get_project_documents(project=p1.name)
		p1_names = [d["name"] for d in p1_result["data"]]
		self.assertIn(d1["data"]["name"], p1_names)
		self.assertNotIn(d2["data"]["name"], p1_names)

	# ── Helpers ──────────────────────────────────────────────────────────

	def _make_file(self, filename):
		"""Create a real file + File record so DMS file-reference validation passes.

		Uses a minimal valid PNG so Frappe's PDF content check is skipped,
		while still passing the GE Project Document extension whitelist (.png is allowed).
		"""
		import struct, zlib
		unique_name = f"{self._unique('doc')}.png"
		# Minimal valid 1x1 white PNG
		png_header = b"\x89PNG\r\n\x1a\n"
		def _chunk(chunk_type, data):
			c = chunk_type + data
			return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
		ihdr = _chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
		raw_row = b"\x00\xFF\xFF\xFF"  # filter byte + white pixel RGB
		idat = _chunk(b"IDAT", zlib.compress(raw_row))
		iend = _chunk(b"IEND", b"")
		png_bytes = png_header + ihdr + idat + iend

		f = frappe.get_doc({
			"doctype": "File",
			"file_name": unique_name,
			"content": png_bytes,
			"is_private": 1,
		})
		f.save(ignore_permissions=True)
		self._track_doc("File", f.name)
		return f.file_url

	def _make_project(self):
		from erpnext.projects.doctype.project.test_project import make_project
		project = make_project({
			"project_name": self._unique("DMS Project"),
			"company": self._default_company(),
			"start_date": today(),
		})
		self._track_doc("Project", project.name)
		return project

	def _default_company(self):
		return frappe.defaults.get_defaults().get("company") or frappe.get_all(
			"Company", fields=["name"], limit=1
		)[0].name

	def _track_doc(self, doctype, name):
		self.addCleanup(self._delete_if_exists, doctype, name)

	def _delete_if_exists(self, doctype, name):
		if frappe.db.exists(doctype, name):
			frappe.delete_doc(doctype, name, force=1)

	def _unique(self, prefix):
		return f"{prefix}-{frappe.generate_hash(length=8)}"


class TestPHApprovalHubRuntime(FrappeTestCase):
	"""PH approval hub: petty cash → PH approve/reject → costing queue forwarding."""

	def setUp(self):
		super().setUp()
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	# ── Petty cash → PH approve → costing queue ────────────────────────

	def test_petty_cash_to_ph_approve_flow(self):
		project = self._make_project()

		pc = create_petty_cash_entry({
			"linked_project": project.name,
			"entry_date": today(),
			"status": "Pending",
			"description": "Site consumables",
			"amount": 2500,
		})
		self.assertTrue(pc["success"])
		pc_name = pc["data"]["name"]
		self._track_doc("GE Petty Cash", pc_name)

		# Approve the petty cash entry
		app = approve_petty_cash_entry(pc_name)
		self.assertTrue(app["success"])
		self.assertEqual(app["data"]["status"], "Approved")

		# Submit to PH
		ph = submit_petty_cash_to_ph(name=pc_name, remarks="Urgent site need")
		self.assertTrue(ph["success"])
		ph_item_name = ph["data"]["name"]
		self._track_doc("GE PH Approval Item", ph_item_name)
		self.assertEqual(ph["data"]["source_type"], "Petty Cash")
		self.assertEqual(ph["data"]["status"], "Submitted to PH")

		# PH approves → should create costing queue entry and forward
		approved = ph_approve_item(ph_item_name, remarks="Approved for disbursement")
		self.assertTrue(approved["success"])
		self.assertEqual(approved["data"]["status"], "Forwarded to Costing")
		self.assertEqual(approved["data"]["ph_approver"], "Administrator")

		# Verify costing queue entry was created
		cq = frappe.get_all(
			"GE Costing Queue",
			filters={"approval_item": ph_item_name},
			fields=["name", "project"],
		)
		self.assertTrue(cq, "Costing queue entry should be created after PH approval")
		self._track_doc("GE Costing Queue", cq[0]["name"])

	# ── Petty cash → PH reject ─────────────────────────────────────────

	def test_petty_cash_to_ph_reject_flow(self):
		project = self._make_project()

		pc = create_petty_cash_entry({
			"linked_project": project.name,
			"entry_date": today(),
			"status": "Pending",
			"description": "Unnecessary purchase",
			"amount": 8000,
		})
		pc_name = pc["data"]["name"]
		self._track_doc("GE Petty Cash", pc_name)

		approve_petty_cash_entry(pc_name)
		ph = submit_petty_cash_to_ph(name=pc_name)
		ph_item_name = ph["data"]["name"]
		self._track_doc("GE PH Approval Item", ph_item_name)

		rejected = ph_reject_item(ph_item_name, remarks="Over budget")
		self.assertTrue(rejected["success"])
		self.assertEqual(rejected["data"]["status"], "Rejected by PH")
		# No costing queue forwarding — the rejected approval should not have costing_queue_ref
		self.assertFalse(rejected["data"].get("costing_queue_ref"), "Rejected item should have no costing queue ref")

	# ── Idempotent re-submit guard ──────────────────────────────────────

	def test_petty_cash_submit_to_ph_is_idempotent(self):
		project = self._make_project()

		pc = create_petty_cash_entry({
			"linked_project": project.name,
			"entry_date": today(),
			"status": "Pending",
			"description": "Double-submit test",
			"amount": 500,
		})
		pc_name = pc["data"]["name"]
		self._track_doc("GE Petty Cash", pc_name)

		approve_petty_cash_entry(pc_name)
		first = submit_petty_cash_to_ph(name=pc_name)
		self._track_doc("GE PH Approval Item", first["data"]["name"])

		second = submit_petty_cash_to_ph(name=pc_name)
		self.assertTrue(second["success"])
		# Should return the same item, not create a duplicate
		self.assertEqual(first["data"]["name"], second["data"]["name"])

	# ── Helpers ──────────────────────────────────────────────────────────

	def _make_project(self):
		from erpnext.projects.doctype.project.test_project import make_project
		project = make_project({
			"project_name": self._unique("PH Hub Project"),
			"company": self._default_company(),
			"start_date": today(),
		})
		self._track_doc("Project", project.name)
		return project

	def _default_company(self):
		return frappe.defaults.get_defaults().get("company") or frappe.get_all(
			"Company", fields=["name"], limit=1
		)[0].name

	def _track_doc(self, doctype, name):
		self.addCleanup(self._delete_if_exists, doctype, name)

	def _delete_if_exists(self, doctype, name):
		if frappe.db.exists(doctype, name):
			frappe.delete_doc(doctype, name, force=1)

	def _unique(self, prefix):
		return f"{prefix}-{frappe.generate_hash(length=8)}"
