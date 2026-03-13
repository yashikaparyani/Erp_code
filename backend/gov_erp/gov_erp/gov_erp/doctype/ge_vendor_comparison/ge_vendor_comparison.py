import frappe
from frappe.model.document import Document


VALID_STATUS_TRANSITIONS = {
	"DRAFT": {"PENDING_APPROVAL"},
	"PENDING_APPROVAL": {"APPROVED", "REJECTED", "DRAFT"},
	"REJECTED": {"DRAFT"},
	"APPROVED": set(),
}


def calculate_quote_amount(qty, rate):
	return (qty or 0) * (rate or 0)


def calculate_vendor_comparison_totals(quotes):
	supplier_totals = {}
	selected_total_amount = 0

	for quote in quotes:
		supplier = getattr(quote, "supplier", None) or "Unknown Supplier"
		amount = calculate_quote_amount(getattr(quote, "qty", 0), getattr(quote, "rate", 0))
		supplier_totals[supplier] = supplier_totals.get(supplier, 0) + amount
		if getattr(quote, "is_selected", 0):
			selected_total_amount += amount

	return {
		"quote_count": len(quotes),
		"distinct_supplier_count": len(supplier_totals),
		"total_items": len(quotes),
		"lowest_total_amount": min(supplier_totals.values()) if supplier_totals else 0,
		"selected_total_amount": selected_total_amount,
	}


def validate_vendor_comparison_status_transition(old_status, new_status):
	if not old_status or old_status == new_status:
		return

	allowed = VALID_STATUS_TRANSITIONS.get(old_status, set())
	if new_status not in allowed:
		raise ValueError(f"Cannot change Vendor Comparison status from {old_status} to {new_status}")


def validate_three_quote_compliance(distinct_supplier_count, selected_quote_count, exception_reason, exception_approved_by):
	if selected_quote_count <= 0:
		raise ValueError("At least one selected quote is required before approving the vendor comparison")

	if distinct_supplier_count >= 3:
		return

	if exception_reason and exception_approved_by:
		return

	raise ValueError(
		"At least 3 distinct supplier quotations are required before approval, "
		"unless an exception reason and approver are recorded"
	)


class GEVendorComparison(Document):
	def before_insert(self):
		if not self.prepared_by_user:
			self.prepared_by_user = frappe.session.user

	def validate(self):
		self._calculate_totals()
		self._validate_status_transition()
		self._validate_selected_supplier()

	def before_save(self):
		if self.has_value_changed("status") and self.status == "APPROVED":
			self._enforce_approval_compliance()

	def _calculate_totals(self):
		for quote in self.quotes:
			quote.amount = calculate_quote_amount(quote.qty, quote.rate)

		totals = calculate_vendor_comparison_totals(self.quotes)
		self.quote_count = totals["quote_count"]
		self.distinct_supplier_count = totals["distinct_supplier_count"]
		self.total_items = totals["total_items"]
		self.lowest_total_amount = totals["lowest_total_amount"]
		self.selected_total_amount = totals["selected_total_amount"]

	def _validate_status_transition(self):
		if not self.has_value_changed("status"):
			return

		old_status = self.get_doc_before_save()
		if not old_status:
			return

		try:
			validate_vendor_comparison_status_transition(old_status.status, self.status)
		except ValueError as exc:
			frappe.throw(str(exc))

	def _validate_selected_supplier(self):
		if not self.recommended_supplier:
			return

		quoted_suppliers = {quote.supplier for quote in self.quotes if quote.supplier}
		if self.recommended_supplier not in quoted_suppliers:
			frappe.throw("Recommended Supplier must be one of the suppliers quoted in this comparison")

	def _enforce_approval_compliance(self):
		try:
			validate_three_quote_compliance(
				self.distinct_supplier_count,
				sum(1 for quote in self.quotes if quote.is_selected),
				self.exception_reason,
				self.exception_approved_by,
			)
		except ValueError as exc:
			frappe.throw(str(exc))

	def on_update(self):
		if self.has_value_changed("status") and self.status == "APPROVED":
			self.approved_at = frappe.utils.now()
			self.approved_by = frappe.session.user
			frappe.db.set_value(
				"GE Vendor Comparison",
				self.name,
				{"approved_at": self.approved_at, "approved_by": self.approved_by},
				update_modified=False,
			)
