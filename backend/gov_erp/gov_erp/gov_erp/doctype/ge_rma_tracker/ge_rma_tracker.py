import frappe
from frappe.model.document import Document
from frappe.utils import getdate, nowdate


VALID_TRANSITIONS = {
	"PENDING": {"APPROVED", "REJECTED"},
	"APPROVED": {"IN_TRANSIT"},
	"IN_TRANSIT": {"RECEIVED_AT_SERVICE_CENTER"},
	"RECEIVED_AT_SERVICE_CENTER": {"UNDER_REPAIR"},
	"UNDER_REPAIR": {"REPAIRED", "REPLACED"},
	"REPAIRED": {"CLOSED"},
	"REPLACED": {"CLOSED"},
	"REJECTED": {"CLOSED", "PENDING"},
	"CLOSED": set(),
}


class GERMATracker(Document):
	def validate(self):
		self._validate_status_transition()
		self._validate_gating_rules()
		self._sync_aging_days()
		self._apply_rma_business_rules()

	def _validate_status_transition(self):
		if not self.has_value_changed("rma_status"):
			return
		old = self.get_doc_before_save()
		if not old:
			return
		old_status = old.rma_status
		allowed = VALID_TRANSITIONS.get(old_status, set())
		if self.rma_status not in allowed:
			frappe.throw(
				f"Cannot change RMA status from {old_status} to {self.rma_status}. "
				f"Allowed: {', '.join(sorted(allowed)) or 'none (terminal state)'}"
			)

	def _validate_gating_rules(self):
		if not self.has_value_changed("rma_status"):
			return

		if self.rma_status == "APPROVED" and not self.approved_by_project_head:
			frappe.throw("Project Head approval is required before marking RMA as APPROVED.")

		if self.rma_status == "REPLACED" and not self.replaced_serial_number:
			frappe.throw("Replacement serial number is required before marking RMA as REPLACED.")

		if self.rma_status == "CLOSED" and not self.actual_resolution_date:
			frappe.throw("Actual resolution date is required before closing an RMA.")

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
