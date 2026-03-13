from gov_erp.gov_erp.doctype.ge_attendance_log.ge_attendance_log import (
	validate_attendance_time_window,
)
from gov_erp.gov_erp.doctype.ge_overtime_entry.ge_overtime_entry import (
	validate_overtime_hours,
	validate_overtime_status_transition,
)
from gov_erp.gov_erp.doctype.ge_statutory_ledger.ge_statutory_ledger import (
	validate_contribution_amount,
	validate_statutory_period,
)
from gov_erp.gov_erp.doctype.ge_technician_visit_log.ge_technician_visit_log import (
	validate_visit_time_window,
)
from gov_erp.gov_erp.doctype.ge_travel_log.ge_travel_log import (
	validate_travel_expense_amount,
	validate_travel_status_transition,
)


def test_validate_attendance_time_window_accepts_valid_sequence():
	validate_attendance_time_window("2026-03-13 09:00:00", "2026-03-13 18:00:00")
	validate_attendance_time_window(None, "2026-03-13 18:00:00")


def test_validate_attendance_time_window_rejects_reverse_sequence():
	try:
		validate_attendance_time_window("2026-03-13 18:00:00", "2026-03-13 09:00:00")
	except ValueError as exc:
		assert "Check Out Time" in str(exc)
	else:
		raise AssertionError("Expected reverse attendance window to fail")


def test_valid_travel_status_transitions():
	validate_travel_status_transition("DRAFT", "SUBMITTED")
	validate_travel_status_transition("SUBMITTED", "APPROVED")
	validate_travel_status_transition("SUBMITTED", "REJECTED")
	validate_travel_status_transition("REJECTED", "DRAFT")


def test_invalid_travel_status_transition():
	try:
		validate_travel_status_transition("DRAFT", "APPROVED")
	except ValueError as exc:
		assert "travel log status" in str(exc)
	else:
		raise AssertionError("Expected invalid travel status transition to fail")


def test_validate_travel_expense_amount():
	validate_travel_expense_amount(0)
	validate_travel_expense_amount(1250.50)
	try:
		validate_travel_expense_amount(-1)
	except ValueError as exc:
		assert "cannot be negative" in str(exc)
	else:
		raise AssertionError("Expected negative expense amount to fail")


def test_valid_overtime_status_transitions():
	validate_overtime_status_transition("DRAFT", "SUBMITTED")
	validate_overtime_status_transition("SUBMITTED", "APPROVED")
	validate_overtime_status_transition("REJECTED", "DRAFT")


def test_invalid_overtime_status_transition():
	try:
		validate_overtime_status_transition("APPROVED", "DRAFT")
	except ValueError as exc:
		assert "overtime status" in str(exc)
	else:
		raise AssertionError("Expected invalid overtime status transition to fail")


def test_validate_overtime_hours():
	validate_overtime_hours(1)
	validate_overtime_hours(7.5)
	for value in (0, -1, 25):
		try:
			validate_overtime_hours(value)
		except ValueError:
			pass
		else:
			raise AssertionError(f"Expected overtime hours {value} to fail")


def test_validate_statutory_period():
	validate_statutory_period("2026-03-01", "2026-03-31")
	try:
		validate_statutory_period("2026-03-31", "2026-03-01")
	except ValueError as exc:
		assert "Period End" in str(exc)
	else:
		raise AssertionError("Expected reverse statutory period to fail")


def test_validate_contribution_amount():
	validate_contribution_amount(0, "Employee contribution")
	validate_contribution_amount(500, "Employee contribution")
	try:
		validate_contribution_amount(-10, "Employer contribution")
	except ValueError as exc:
		assert "Employer contribution" in str(exc)
	else:
		raise AssertionError("Expected negative contribution to fail")


def test_validate_visit_time_window():
	validate_visit_time_window("2026-03-13 10:00:00", "2026-03-13 11:00:00")
	try:
		validate_visit_time_window("2026-03-13 12:00:00", "2026-03-13 11:00:00")
	except ValueError as exc:
		assert "check out time" in str(exc)
	else:
		raise AssertionError("Expected reverse visit time window to fail")
