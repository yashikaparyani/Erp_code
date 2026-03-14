import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import now_datetime, today

from erpnext.projects.doctype.project.test_project import make_project
from gov_erp.api import (
	approve_boq,
	approve_cost_sheet,
	approve_dispatch_challan,
	approve_invoice,
	approve_onboarding,
	approve_rma,
	approve_travel_log,
	approve_vendor_comparison,
	assign_ticket,
	close_rma,
	close_sla_timer,
	close_ticket,
	convert_tender_to_project,
	create_boq,
	create_cost_sheet_from_boq,
	create_dispatch_challan,
	create_invoice,
	create_onboarding,
	create_organization,
	create_payment_receipt,
	create_competitor,
	create_po_from_comparison,
	create_tender_checklist,
	create_tender_reminder,
	create_tender_result,
	create_rma_tracker,
	create_sla_profile,
	create_sla_timer,
	create_tender,
	create_ticket,
	create_vendor_comparison,
	map_onboarding_to_employee,
	mark_dispatch_challan_dispatched,
	mark_invoice_paid,
	pause_sla_timer,
	resolve_ticket,
	resume_sla_timer,
	review_onboarding,
	start_ticket,
	submit_boq_for_approval,
	submit_cost_sheet_for_approval,
	submit_dispatch_challan_for_approval,
	submit_invoice,
	submit_onboarding,
	submit_vendor_comparison_for_approval,
	update_rma_status,
	update_boq,
)


class TestAppRuntime(FrappeTestCase):
	def setUp(self):
		super().setUp()
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	def test_tender_crud_and_project_conversion(self):
		party = self._make_party()
		tender_result = create_tender(
			{
				"tender_number": self._unique("TN"),
				"title": self._unique("Runtime Tender"),
				"client": party.name,
				"status": "DRAFT",
			}
		)
		tender_name = tender_result["data"]["name"]
		self._track_doc("GE Tender", tender_name)

		doc = frappe.get_doc("GE Tender", tender_name)
		doc.status = "WON"
		doc.save()

		project_name = frappe.get_value("GE Tender", tender_name, "linked_project")
		if project_name:
			self._track_doc("Project", project_name)

		self.assertTrue(project_name)

		manual_tender = frappe.get_doc(
			{
				"doctype": "GE Tender",
				"tender_number": self._unique("TNM"),
				"title": self._unique("Manual Convert Tender"),
				"client": party.name,
				"status": "DRAFT",
			}
		).insert()
		self._track_doc("GE Tender", manual_tender.name)
		frappe.db.set_value("GE Tender", manual_tender.name, "status", "WON", update_modified=False)

		manual_result = convert_tender_to_project(manual_tender.name)
		self.assertTrue(manual_result["success"])
		self.assertTrue(manual_result["data"]["project"])
		self._track_doc("Project", manual_result["data"]["project"])

	def test_extended_tendering_runtime_flow(self):
		party = self._make_party()
		org_result = create_organization(
			{
				"organization_name": self._unique("Runtime Org"),
				"city": "Indore",
				"state": "Madhya Pradesh",
				"active": 1,
			}
		)
		org_name = org_result["data"]["name"]
		self._track_doc("GE Organization", org_name)

		tender_result = create_tender(
			{
				"tender_number": self._unique("TNX"),
				"title": self._unique("Tender Port Runtime"),
				"client": party.name,
				"organization": org_name,
				"status": "DRAFT",
			}
		)
		tender_name = tender_result["data"]["name"]
		self._track_doc("GE Tender", tender_name)

		checklist_result = create_tender_checklist(
			{
				"checklist_name": self._unique("Checklist"),
				"checklist_type": "Technical",
				"status": "Active",
				"items": [{"item_name": "Bid Document", "is_mandatory": 1}],
			}
		)
		self.assertTrue(checklist_result["success"])
		self._track_doc("GE Tender Checklist", checklist_result["data"]["name"])

		reminder_result = create_tender_reminder(
			{
				"tender": tender_name,
				"reminder_date": today(),
				"status": "Pending",
			}
		)
		self.assertTrue(reminder_result["success"])
		self._track_doc("GE Tender Reminder", reminder_result["data"]["name"])

		competitor_result = create_competitor(
			{
				"organization": org_name,
				"company_name": self._unique("Competitor"),
				"win_count": 2,
				"loss_count": 1,
				"win_rate": 66.7,
			}
		)
		self.assertTrue(competitor_result["success"])
		self._track_doc("GE Competitor", competitor_result["data"]["name"])

		tender_result_doc = create_tender_result(
			{
				"tender": tender_name,
				"organization_name": "Runtime Authority",
				"result_stage": "AOC",
				"publication_date": today(),
				"winning_amount": 120000,
				"winner_company": "Runtime Winner",
				"bidders": [
					{"bidder_name": "Runtime Winner", "bid_amount": 120000, "rank": 1, "is_winner": 1},
					{"bidder_name": "Backup Bidder", "bid_amount": 130000, "rank": 2},
				],
			}
		)
		self.assertTrue(tender_result_doc["success"])
		self._track_doc("GE Tender Result", tender_result_doc["data"]["name"])

	def test_boq_and_cost_sheet_runtime_flow(self):
		tender = self._make_tender()
		self._make_survey(tender.name, status="Completed")

		boq_result = create_boq(
			{
				"linked_tender": tender.name,
				"version": 1,
				"status": "DRAFT",
				"items": [
					{"description": "Camera", "qty": 2, "rate": 1500, "site_name": "Site A"},
					{"description": "Pole", "qty": 1, "rate": 2500, "site_name": "Site A"},
				],
			}
		)
		boq_name = boq_result["data"]["name"]
		self._track_doc("GE BOQ", boq_name)

		submit_result = submit_boq_for_approval(boq_name)
		self.assertTrue(submit_result["success"])
		approve_result = approve_boq(boq_name)
		self.assertTrue(approve_result["success"])

		cost_result = create_cost_sheet_from_boq(boq_name)
		self.assertTrue(cost_result["success"])
		cost_name = cost_result["data"]["name"]
		self._track_doc("GE Cost Sheet", cost_name)
		self.assertEqual(cost_result["data"]["linked_boq"], boq_name)

		submit_cost = submit_cost_sheet_for_approval(cost_name)
		self.assertTrue(submit_cost["success"])
		approve_cost = approve_cost_sheet(cost_name)
		self.assertTrue(approve_cost["success"])

	def test_procurement_and_stores_runtime_flow(self):
		item = self._make_item()
		suppliers = [self._make_supplier() for _ in range(3)]

		vc_result = create_vendor_comparison(
			{
				"status": "DRAFT",
				"quotes": [
					{
						"supplier": suppliers[0].name,
						"item_link": item.name,
						"description": item.item_name,
						"qty": 2,
						"rate": 100,
						"is_selected": 1,
					},
					{
						"supplier": suppliers[1].name,
						"item_link": item.name,
						"description": item.item_name,
						"qty": 2,
						"rate": 120,
					},
					{
						"supplier": suppliers[2].name,
						"item_link": item.name,
						"description": item.item_name,
						"qty": 2,
						"rate": 140,
					},
				],
			}
		)
		vc_name = vc_result["data"]["name"]
		self._track_doc("GE Vendor Comparison", vc_name)

		self.assertTrue(submit_vendor_comparison_for_approval(vc_name)["success"])
		self.assertTrue(approve_vendor_comparison(vc_name)["success"])

		po_result = create_po_from_comparison(vc_name)
		self.assertTrue(po_result["success"])
		self.assertGreaterEqual(len(po_result["data"]["purchase_orders"]), 1)
		for po_name in po_result["data"]["purchase_orders"]:
			self._track_doc("Purchase Order", po_name)

		dispatch_result = create_dispatch_challan(
			{
				"dispatch_type": "VENDOR_TO_SITE",
				"dispatch_date": today(),
				"status": "DRAFT",
				"target_site_name": "Runtime Site",
				"items": [
					{
						"item_link": item.name,
						"description": item.item_name,
						"qty": 1,
					}
				],
			}
		)
		dispatch_name = dispatch_result["data"]["name"]
		self._track_doc("GE Dispatch Challan", dispatch_name)

		self.assertTrue(submit_dispatch_challan_for_approval(dispatch_name)["success"])
		self.assertTrue(approve_dispatch_challan(dispatch_name)["success"])
		dispatched = mark_dispatch_challan_dispatched(dispatch_name)
		self.assertTrue(dispatched["success"])
		self.assertEqual(dispatched["data"]["status"], "DISPATCHED")

	def test_hr_runtime_flow(self):
		onboarding_result = create_onboarding(
			{
				"onboarding_status": "DRAFT",
				"company": self._default_company(),
				"employee_name": self._unique("Runtime Employee"),
				"gender": self._default_gender(),
				"date_of_birth": "1995-01-01",
				"date_of_joining": today(),
				"documents": [
					{
						"document_type": "Aadhar Card",
						"is_mandatory": 1,
						"file": "/files/runtime-aadhar.pdf",
					}
				],
			}
		)
		onboarding_name = onboarding_result["data"]["name"]
		self._track_doc("GE Employee Onboarding", onboarding_name)

		self.assertTrue(submit_onboarding(onboarding_name)["success"])
		self.assertTrue(review_onboarding(onboarding_name)["success"])
		self.assertTrue(approve_onboarding(onboarding_name)["success"])

		mapped = map_onboarding_to_employee(onboarding_name)
		self.assertTrue(mapped["success"])
		employee_name = mapped["data"]["employee"]
		self.assertTrue(employee_name)
		self._track_doc("Employee", employee_name)

	def test_billing_and_om_runtime_flow(self):
		project = self._make_project("Billing Project")

		invoice_result = create_invoice(
			{
				"linked_project": project.name,
				"invoice_date": today(),
				"invoice_type": "MILESTONE",
				"milestone_complete": 1,
				"status": "DRAFT",
				"items": [
					{"description": "Implementation", "qty": 1, "rate": 10000},
				],
			}
		)
		invoice_name = invoice_result["data"]["name"]
		self._track_doc("GE Invoice", invoice_name)

		self.assertTrue(submit_invoice(invoice_name)["success"])
		self.assertTrue(approve_invoice(invoice_name)["success"])

		receipt_result = create_payment_receipt(
			{
				"linked_invoice": invoice_name,
				"linked_project": project.name,
				"received_date": today(),
				"amount_received": 5000,
				"payment_mode": "BANK_TRANSFER",
			}
		)
		self.assertTrue(receipt_result["success"])
		self._track_doc("GE Payment Receipt", receipt_result["data"]["name"])
		self.assertTrue(mark_invoice_paid(invoice_name)["success"])

		ticket_result = create_ticket(
			{
				"title": self._unique("Support Ticket"),
				"category": "HARDWARE_ISSUE",
				"priority": "HIGH",
				"status": "NEW",
				"linked_project": project.name,
			}
		)
		ticket_name = ticket_result["data"]["name"]
		self._track_doc("GE Ticket", ticket_name)

		self.assertTrue(assign_ticket(ticket_name, "Administrator")["success"])
		self.assertTrue(start_ticket(ticket_name)["success"])

		sla_profile_result = create_sla_profile(
			{
				"profile_name": self._unique("Runtime SLA"),
				"response_minutes": 30,
				"resolution_minutes": 120,
				"working_hours_type": "24x7",
				"linked_project": project.name,
			}
		)
		sla_profile_name = sla_profile_result["data"]["name"]
		self._track_doc("GE SLA Profile", sla_profile_name)

		timer_result = create_sla_timer(
			{
				"linked_ticket": ticket_name,
				"sla_profile": sla_profile_name,
				"started_on": str(now_datetime()),
			}
		)
		timer_name = timer_result["data"]["name"]
		self._track_doc("GE SLA Timer", timer_name)
		self.assertTrue(pause_sla_timer(timer_name)["success"])
		self.assertTrue(resume_sla_timer(timer_name)["success"])
		self.assertTrue(close_sla_timer(timer_name, response_met=1, resolution_met=1)["success"])

		self.assertTrue(resolve_ticket(ticket_name, resolution_notes="Resolved in runtime test")["success"])
		self.assertTrue(close_ticket(ticket_name)["success"])

		rma_result = create_rma_tracker({"rma_status": "PENDING", "linked_ticket": ticket_name, "linked_project": project.name})
		rma_name = rma_result["data"]["name"]
		self._track_doc("GE RMA Tracker", rma_name)
		self.assertTrue(approve_rma(rma_name)["success"])
		self.assertTrue(update_rma_status(rma_name, "IN_TRANSIT")["success"])
		self.assertTrue(update_rma_status(rma_name, "RECEIVED_AT_SERVICE_CENTER")["success"])
		self.assertTrue(update_rma_status(rma_name, "UNDER_REPAIR")["success"])
		self.assertTrue(update_rma_status(rma_name, "REPAIRED")["success"])
		self.assertTrue(close_rma(rma_name)["success"])

	def test_role_gated_runtime_access(self):
		presales_user = self._make_user_with_roles("Presales Executive")
		hr_user = self._make_user_with_roles("HR Manager")
		dept_head_user = self._make_user_with_roles("Department Head")
		party = self._make_party()

		with self.set_user(presales_user.name):
			tender_result = create_tender(
				{
					"tender_number": self._unique("ROLE"),
					"title": self._unique("Role Tender"),
					"client": party.name,
					"status": "DRAFT",
				}
			)
			self.assertTrue(tender_result["success"])
			tender_name = tender_result["data"]["name"]
			self._track_doc("GE Tender", tender_name)

		with self.set_user(hr_user.name):
			try:
				create_tender(
					{
						"tender_number": self._unique("HR"),
						"title": self._unique("HR Should Fail"),
						"client": party.name,
						"status": "DRAFT",
					}
				)
			except frappe.PermissionError:
				pass
			else:
				raise AssertionError("Expected HR Manager to be denied tender creation")

		tender = self._make_tender()
		self._make_survey(tender.name, status="Completed")
		boq_result = create_boq(
			{
				"linked_tender": tender.name,
				"version": 1,
				"status": "DRAFT",
				"items": [{"description": "Role BOQ Item", "qty": 1, "rate": 100}],
			}
		)
		boq_name = boq_result["data"]["name"]
		self._track_doc("GE BOQ", boq_name)
		self.assertTrue(submit_boq_for_approval(boq_name)["success"])

		with self.set_user(dept_head_user.name):
			self.assertTrue(approve_boq(boq_name)["success"])

	# ---- helpers -------------------------------------------------

	def _make_project(self, prefix="Runtime Project"):
		project = make_project(
			{
				"project_name": self._unique(prefix),
				"company": self._default_company(),
				"start_date": today(),
			}
		)
		self._track_doc("Project", project.name)
		return project

	def _make_party(self):
		party = frappe.get_doc(
			{
				"doctype": "GE Party",
				"party_name": self._unique("Runtime Party"),
				"party_type": "CLIENT",
			}
		).insert()
		self._track_doc("GE Party", party.name)
		return party

	def _make_tender(self):
		party = self._make_party()
		tender = frappe.get_doc(
			{
				"doctype": "GE Tender",
				"tender_number": self._unique("TN"),
				"title": self._unique("Runtime Tender"),
				"client": party.name,
				"status": "DRAFT",
			}
		).insert()
		self._track_doc("GE Tender", tender.name)
		return tender

	def _make_survey(self, tender_name, status):
		survey = frappe.get_doc(
			{
				"doctype": "GE Survey",
				"linked_tender": tender_name,
				"site_name": self._unique("Runtime Site"),
				"status": status,
			}
		).insert()
		self._track_doc("GE Survey", survey.name)
		return survey

	def _make_item(self):
		item = frappe.get_doc(
			{
				"doctype": "Item",
				"item_code": self._unique("ITEM"),
				"item_name": self._unique("Runtime Item"),
				"item_group": self._default_item_group(),
				"stock_uom": self._default_uom(),
				"is_stock_item": 1,
			}
		).insert()
		self._track_doc("Item", item.name)
		return item

	def _make_supplier(self):
		supplier = frappe.get_doc(
			{
				"doctype": "Supplier",
				"supplier_name": self._unique("Runtime Supplier"),
				"supplier_group": self._default_supplier_group(),
				"supplier_type": "Company",
			}
		).insert()
		self._track_doc("Supplier", supplier.name)
		return supplier

	def _make_user_with_roles(self, *roles):
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": f"{self._unique('user').lower()}@example.com",
				"first_name": self._unique("Runtime"),
				"send_welcome_email": 0,
				"enabled": 1,
			}
		)
		for role in roles:
			user.append("roles", {"role": role})
		user.insert()
		self._track_doc("User", user.name)
		return user

	def _default_company(self):
		return frappe.defaults.get_defaults().get("company") or frappe.get_all(
			"Company", fields=["name"], limit=1
		)[0].name

	def _default_item_group(self):
		return frappe.get_all("Item Group", filters={"is_group": 0}, fields=["name"], limit=1)[0].name

	def _default_supplier_group(self):
		return frappe.get_all("Supplier Group", fields=["name"], limit=1)[0].name

	def _default_uom(self):
		return frappe.get_all("UOM", fields=["name"], limit=1)[0].name

	def _default_gender(self):
		return frappe.get_all("Gender", fields=["name"], limit=1)[0].name

	def _track_doc(self, doctype, name):
		self.addCleanup(self._delete_if_exists, doctype, name)

	def _delete_if_exists(self, doctype, name):
		if frappe.db.exists(doctype, name):
			frappe.delete_doc(doctype, name, force=1)

	def _unique(self, prefix):
		return f"{prefix}-{frappe.generate_hash(length=8)}"
