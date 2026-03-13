from gov_erp.gov_erp.doctype.ge_dependency_rule.ge_dependency_rule import (
	evaluate_dependency_state,
	normalize_status,
	resolve_reference_status,
)
from gov_erp.gov_erp.doctype.ge_site.ge_site import validate_coordinates


def test_validate_coordinates_accepts_valid_ranges():
	validate_coordinates(28.61, 77.21)
	validate_coordinates(-10, -20)


def test_validate_coordinates_rejects_invalid_ranges():
	try:
		validate_coordinates(120, 77.21)
	except ValueError as exc:
		assert "Latitude must be between -90 and 90" in str(exc)
	else:
		raise AssertionError("Expected invalid latitude to raise ValueError")

	try:
		validate_coordinates(28.61, 220)
	except ValueError as exc:
		assert "Longitude must be between -180 and 180" in str(exc)
	else:
		raise AssertionError("Expected invalid longitude to raise ValueError")


def test_normalize_status_standardizes_text():
	assert normalize_status("In Progress") == "IN_PROGRESS"
	assert normalize_status(" completed ") == "COMPLETED"


def test_resolve_reference_status_prefers_status_then_workflow_then_docstatus():
	assert resolve_reference_status("Completed", "Ignored", 0) == "Completed"
	assert resolve_reference_status("", "Under Review", 0) == "Under Review"
	assert resolve_reference_status("", "", 1) == "SUBMITTED"


def test_evaluate_dependency_state_allows_satisfied_and_overridden_rules():
	satisfied = evaluate_dependency_state("Completed", "Completed", None, True, True)
	assert satisfied["blocked"] is False

	overridden = evaluate_dependency_state("Pending", "Completed", "APPROVED", True, True)
	assert overridden["blocked"] is False


def test_evaluate_dependency_state_blocks_mismatched_status():
	result = evaluate_dependency_state("Pending", "Completed", None, True, True)
	assert result["blocked"] is True
	assert result["hard_block"] is True
	assert "Required status Completed" in result["reason"]


def test_evaluate_dependency_state_ignores_inactive_rules():
	result = evaluate_dependency_state("Pending", "Completed", None, False, True)
	assert result["blocked"] is False
