from gov_erp.gov_erp.doctype.ge_vendor_comparison.ge_vendor_comparison import (
	calculate_quote_amount,
	calculate_vendor_comparison_totals,
	validate_three_quote_compliance,
	validate_vendor_comparison_status_transition,
)


class Row:
	def __init__(self, supplier, qty, rate, is_selected=0):
		self.supplier = supplier
		self.qty = qty
		self.rate = rate
		self.is_selected = is_selected


def test_calculate_quote_amount_handles_empty_values():
	assert calculate_quote_amount(None, 100) == 0
	assert calculate_quote_amount(5, None) == 0
	assert calculate_quote_amount(3, 50) == 150


def test_calculate_vendor_comparison_totals_summarizes_quotes():
	rows = [
		Row("Supplier A", 2, 100, 1),
		Row("Supplier B", 2, 90, 0),
		Row("Supplier C", 2, 95, 0),
	]

	totals = calculate_vendor_comparison_totals(rows)

	assert totals["quote_count"] == 3
	assert totals["distinct_supplier_count"] == 3
	assert totals["total_items"] == 3
	assert totals["lowest_total_amount"] == 180
	assert totals["selected_total_amount"] == 200


def test_validate_vendor_comparison_status_transition_accepts_valid_moves():
	validate_vendor_comparison_status_transition("DRAFT", "PENDING_APPROVAL")
	validate_vendor_comparison_status_transition("PENDING_APPROVAL", "APPROVED")
	validate_vendor_comparison_status_transition("REJECTED", "DRAFT")


def test_validate_vendor_comparison_status_transition_rejects_invalid_moves():
	try:
		validate_vendor_comparison_status_transition("DRAFT", "APPROVED")
	except ValueError as exc:
		assert "Cannot change Vendor Comparison status" in str(exc)
	else:
		raise AssertionError("Expected invalid Vendor Comparison transition to raise ValueError")


def test_three_quote_compliance_accepts_three_suppliers():
	validate_three_quote_compliance(3, 1, None, None)


def test_three_quote_compliance_accepts_exception_path():
	validate_three_quote_compliance(2, 1, "Single OEM source", "manager@example.com")


def test_three_quote_compliance_requires_selected_quotes():
	try:
		validate_three_quote_compliance(3, 0, None, None)
	except ValueError as exc:
		assert "selected quote" in str(exc)
	else:
		raise AssertionError("Expected missing selection to raise ValueError")


def test_three_quote_compliance_rejects_under_three_without_exception():
	try:
		validate_three_quote_compliance(2, 1, None, None)
	except ValueError as exc:
		assert "3 distinct supplier quotations" in str(exc)
	else:
		raise AssertionError("Expected under-three-supplier comparison to raise ValueError")
