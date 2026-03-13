from gov_erp.gov_erp.doctype.ge_employee_onboarding.ge_employee_onboarding import (
	check_mandatory_documents,
	map_onboarding_to_employee_dict,
	validate_aadhar,
	validate_dob_before_doj,
	validate_onboarding_status_transition,
	validate_pan,
)


# ── Status transition tests ──────────────────────────────────


def test_valid_onboarding_transitions():
	validate_onboarding_status_transition("DRAFT", "SUBMITTED")
	validate_onboarding_status_transition("SUBMITTED", "UNDER_REVIEW")
	validate_onboarding_status_transition("UNDER_REVIEW", "APPROVED")
	validate_onboarding_status_transition("APPROVED", "MAPPED_TO_EMPLOYEE")
	validate_onboarding_status_transition("REJECTED", "DRAFT")
	validate_onboarding_status_transition("SUBMITTED", "DRAFT")


def test_invalid_onboarding_transitions():
	bad_moves = [
		("DRAFT", "APPROVED"),
		("DRAFT", "UNDER_REVIEW"),
		("SUBMITTED", "APPROVED"),
		("UNDER_REVIEW", "MAPPED_TO_EMPLOYEE"),
		("APPROVED", "DRAFT"),
		("MAPPED_TO_EMPLOYEE", "DRAFT"),
	]
	for old, new in bad_moves:
		try:
			validate_onboarding_status_transition(old, new)
		except ValueError as exc:
			assert "Cannot change onboarding status" in str(exc)
		else:
			raise AssertionError(f"Expected transition {old}->{new} to be rejected")


def test_same_status_is_no_op():
	validate_onboarding_status_transition("DRAFT", "DRAFT")
	validate_onboarding_status_transition("APPROVED", "APPROVED")


def test_none_old_status_is_no_op():
	validate_onboarding_status_transition(None, "DRAFT")


# ── Aadhar validation tests ──────────────────────────────────


def test_valid_aadhar():
	validate_aadhar("123456789012")
	validate_aadhar(" 123456789012 ")
	validate_aadhar(None)
	validate_aadhar("")


def test_invalid_aadhar():
	bad_values = ["12345678901", "1234567890123", "abcdefghijkl", "1234-5678-9012"]
	for val in bad_values:
		try:
			validate_aadhar(val)
		except ValueError as exc:
			assert "12 digits" in str(exc)
		else:
			raise AssertionError(f"Expected aadhar '{val}' to fail validation")


# ── PAN validation tests ──────────────────────────────────────


def test_valid_pan():
	validate_pan("ABCDE1234F")
	validate_pan(" abcde1234f ")
	validate_pan(None)
	validate_pan("")


def test_invalid_pan():
	bad_values = ["ABCDE1234", "12345ABCDF", "ABCDEABCDF", "ABCDE12345"]
	for val in bad_values:
		try:
			validate_pan(val)
		except ValueError as exc:
			assert "PAN number" in str(exc)
		else:
			raise AssertionError(f"Expected PAN '{val}' to fail validation")


# ── DOB validation tests ──────────────────────────────────────


def test_dob_before_doj_valid():
	validate_dob_before_doj("1990-01-01", "2020-01-01")
	validate_dob_before_doj(None, "2020-01-01")
	validate_dob_before_doj("1990-01-01", None)


def test_dob_after_doj_invalid():
	try:
		validate_dob_before_doj("2025-01-01", "2020-01-01")
	except ValueError as exc:
		assert "before Date of Joining" in str(exc)
	else:
		raise AssertionError("Expected DOB after DOJ to fail")


def test_dob_equal_doj_invalid():
	try:
		validate_dob_before_doj("2020-01-01", "2020-01-01")
	except ValueError as exc:
		assert "before Date of Joining" in str(exc)
	else:
		raise AssertionError("Expected DOB equal to DOJ to fail")


# ── Mandatory documents check ────────────────────────────────


class DocStub:
	def __init__(self, document_type, is_mandatory, file=None):
		self.document_type = document_type
		self.is_mandatory = is_mandatory
		self.file = file


def test_all_mandatory_docs_present():
	docs = [
		DocStub("Aadhar Card", 1, "/files/aadhar.pdf"),
		DocStub("PAN Card", 1, "/files/pan.pdf"),
		DocStub("CV", 0, None),
	]
	assert check_mandatory_documents(docs) == []


def test_missing_mandatory_docs():
	docs = [
		DocStub("Aadhar Card", 1, "/files/aadhar.pdf"),
		DocStub("PAN Card", 1, None),
		DocStub("10th Mark Sheet", 1, None),
		DocStub("CV", 0, None),
	]
	missing = check_mandatory_documents(docs)
	assert "PAN Card" in missing
	assert "10th Mark Sheet" in missing
	assert len(missing) == 2


def test_empty_docs_list():
	assert check_mandatory_documents([]) == []


# ── Employee mapping ─────────────────────────────────────────


class OnboardingStub:
	def __init__(self, **kwargs):
		for k, v in kwargs.items():
			setattr(self, k, v)


def test_map_onboarding_to_employee_dict():
	onb = OnboardingStub(
		employee_name="Rajesh Kumar",
		company="Technosys Security Solutions",
		date_of_joining="2026-01-15",
		designation="Security Guard",
		gender="Male",
		date_of_birth="1990-05-10",
		contact_number="9876543210",
		personal_email="rajesh@example.com",
		local_address="Local addr",
		permanent_address="Permanent addr",
		marital_status="Married",
		blood_group="B+",
		salutation="Mr",
	)
	result = map_onboarding_to_employee_dict(onb)

	assert result["first_name"] == "Rajesh Kumar"
	assert result["company"] == "Technosys Security Solutions"
	assert result["date_of_joining"] == "2026-01-15"
	assert result["designation"] == "Security Guard"
	assert result["gender"] == "Male"
	assert result["date_of_birth"] == "1990-05-10"
	assert result["cell_phone"] == "9876543210"
	assert result["personal_email"] == "rajesh@example.com"
	assert result["current_address"] == "Local addr"
	assert result["permanent_address"] == "Permanent addr"
	assert result["marital_status"] == "Married"
	assert result["blood_group"] == "B+"
	assert result["salutation"] == "Mr"
