import frappe
from frappe.model.document import Document
from frappe.utils import getdate, nowdate


VALID_TRANSITIONS = {
	"PENDING": ["APPROVED", "REJECTED"],
	"APPROVED": ["IN_TRANSIT"],
	"IN_TRANSIT": ["RECEIVED_AT_SERVICE_CENTER"],
	"RECEIVED_AT_SERVICE_CENTER": ["UNDER_REPAIR"],
	"UNDER_REPAIR": ["REPAIRED", "REPLACED"],
}


class GERMATracker(Document):
	def validate(self):
		self._sync_aging_days()
		self._apply_rma_business_rules()

	def _sync_aging_days(self):
		if not self.faulty_date:
			self.aging_days = 0
			return

		start_date = getdate(self.faulty_date)
		end_date = getdate(self.received_at_location_date) if self.received_at_location_date else getdate(nowdate())
		self.aging_days = max((end_date - start_date).days, 0)

	def _apply_rma_business_rules(self):
		if self.warranty_status == "UNDER_WARRANTY":
			self.repair_cost = 0

		if self.repairability_status == "NON_REPAIRABLE" and not self.repairing_status:
			self.repairing_status = "SCRAP"

		if self.approval_status == "APPROVED" and self.warranty_status == "NON_WARRANTY" and not self.rma_purchase_order_no:
			frappe.throw("RMA PO number is required once a non-warranty repair is approved.")
