from gov_erp.gov_erp.doctype.ge_boq.ge_boq import (
	calculate_boq_totals,
	calculate_line_amount,
	validate_status_transition,
	validate_survey_gate,
)


class Row:
	def __init__(self, qty, rate):
		self.qty = qty
		self.rate = rate


def test_calculate_line_amount_handles_empty_values():
	assert calculate_line_amount(None, 100) == 0
	assert calculate_line_amount(2, None) == 0
	assert calculate_line_amount(2, 50) == 100


def test_calculate_boq_totals_sums_items():
	rows = [Row(2, 10), Row(3, 5), Row(None, 20)]
	totals = calculate_boq_totals(rows)

	assert totals == {"total_amount": 35, "total_items": 3}


def test_validate_status_transition_accepts_valid_moves():
	validate_status_transition("DRAFT", "PENDING_APPROVAL")
	validate_status_transition("PENDING_APPROVAL", "APPROVED")
	validate_status_transition("REJECTED", "DRAFT")


def test_validate_status_transition_rejects_invalid_moves():
	try:
		validate_status_transition("DRAFT", "APPROVED")
	except ValueError as exc:
		assert "Cannot change BOQ status" in str(exc)
	else:
		raise AssertionError("Expected invalid BOQ transition to raise ValueError")


def test_validate_survey_gate_rejects_missing_surveys():
	try:
		validate_survey_gate("TENDER-001", [])
	except ValueError as exc:
		assert "No surveys found" in str(exc)
	else:
		raise AssertionError("Expected missing surveys to fail gate")


def test_validate_survey_gate_rejects_incomplete_surveys():
	try:
		validate_survey_gate("TENDER-001", ["Completed", "Pending"])
	except ValueError as exc:
		assert "not yet completed" in str(exc)
	else:
		raise AssertionError("Expected incomplete surveys to fail gate")


def test_validate_survey_gate_accepts_completed_surveys():
	validate_survey_gate("TENDER-001", ["Completed", "Completed"])
