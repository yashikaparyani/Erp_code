import frappe
from frappe.model.document import Document


VALID_STATUS_TRANSITIONS = {
	"DRAFT": {"SUBMITTED"},
	"SUBMITTED": {"APPROVED", "REJECTED", "DRAFT"},
	"APPROVED": {"CANCELLED"},
	"REJECTED": {"DRAFT"},
	"CANCELLED": set(),
}


class GEMaterialReceipt(Document):
	def validate(self):
		self._compute_totals()
		if self.flags.get("_skip_transition_check"):
			return
		old_status = (self.get_db_value("status") or "DRAFT") if not self.is_new() else "DRAFT"
		new_status = self.status or "DRAFT"
		if old_status != new_status:
			allowed = VALID_STATUS_TRANSITIONS.get(old_status, set())
			if new_status not in allowed:
				frappe.throw(f"Cannot change status from {old_status} to {new_status}")

	def _compute_totals(self):
		total_qty = 0
		total_value = 0
		for item in self.items or []:
			qty = item.qty or 0
			cost = item.purchase_cost or 0
			total_qty += qty
			total_value += qty * cost
		self.total_items = len(self.items or [])
		self.total_qty = total_qty
		self.total_value = total_value

	def on_update(self):
		if self.status == "APPROVED":
			_post_inventory_ledger_entries(self, "IN")

	def on_trash(self):
		# Remove any ledger entries if the receipt is deleted
		frappe.db.delete("GE Inventory Ledger", {"voucher_type": "GE Material Receipt", "voucher_no": self.name})


def _post_inventory_ledger_entries(receipt_doc, direction):
	"""Create GE Inventory Ledger entries for each line item."""
	from gov_erp.inventory_api import _post_ledger_entry
	for item in receipt_doc.items or []:
		_post_ledger_entry(
			item_code=item.item_link,
			item_description=item.description,
			make=item.make,
			model_no=item.model_no,
			hsn_code=item.hsn_code,
			serial_numbers=item.serial_numbers,
			qty=item.qty,
			uom=item.uom,
			rate=item.purchase_cost,
			direction=direction,
			voucher_type="GE Material Receipt",
			voucher_no=receipt_doc.name,
			warehouse=receipt_doc.warehouse,
			project=receipt_doc.linked_project,
			party_name=receipt_doc.received_from,
			posting_date=receipt_doc.receipt_date,
		)
