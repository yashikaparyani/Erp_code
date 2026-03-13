from gov_erp.gov_erp.doctype.ge_cost_sheet.ge_cost_sheet import (
	calculate_cost_amount,
	calculate_cost_sheet_totals,
	map_boq_items_to_cost_sheet_items,
	validate_cost_status_transition,
)


class Row:
	def __init__(self, qty, base_rate):
		self.qty = qty
		self.base_rate = base_rate


def test_calculate_cost_amount_handles_empty_values():
	assert calculate_cost_amount(None, 100) == 0
	assert calculate_cost_amount(5, None) == 0
	assert calculate_cost_amount(2, 50) == 100


def test_calculate_cost_sheet_totals_applies_margin():
	rows = [Row(2, 100), Row(1, 50)]
	totals = calculate_cost_sheet_totals(rows, 20)

	assert totals["base_cost"] == 250
	assert totals["sell_value"] == 300
	assert totals["total_items"] == 2


def test_validate_cost_status_transition_accepts_valid_moves():
	validate_cost_status_transition("DRAFT", "PENDING_APPROVAL")
	validate_cost_status_transition("PENDING_APPROVAL", "APPROVED")
	validate_cost_status_transition("REJECTED", "DRAFT")


def test_validate_cost_status_transition_rejects_invalid_moves():
	try:
		validate_cost_status_transition("DRAFT", "APPROVED")
	except ValueError as exc:
		assert "Cannot change Cost Sheet status" in str(exc)
	else:
		raise AssertionError("Expected invalid Cost Sheet transition to raise ValueError")


class BOQItemStub:
	"""Mimics a GE BOQ Item row for pure-function testing."""
	def __init__(self, **kwargs):
		for k, v in kwargs.items():
			setattr(self, k, v)


def test_map_boq_items_to_cost_sheet_items_maps_fields():
	boq_items = [
		BOQItemStub(site_name="Site A", item_link="ITEM-001", description="Camera", qty=10, unit="Nos", rate=500, make="Hikvision", model="DS-123"),
		BOQItemStub(site_name="Site B", item_link="ITEM-002", description="Cable", qty=200, unit="Mtrs", rate=25, make="Polycab", model="X1"),
	]
	result = map_boq_items_to_cost_sheet_items(boq_items)

	assert len(result) == 2

	assert result[0]["site_name"] == "Site A"
	assert result[0]["item_link"] == "ITEM-001"
	assert result[0]["description"] == "Camera"
	assert result[0]["qty"] == 10
	assert result[0]["unit"] == "Nos"
	assert result[0]["base_rate"] == 500
	assert result[0]["cost_type"] == "Material"

	assert result[1]["site_name"] == "Site B"
	assert result[1]["base_rate"] == 25
	assert result[1]["unit"] == "Mtrs"


def test_map_boq_items_to_cost_sheet_items_handles_empty():
	result = map_boq_items_to_cost_sheet_items([])
	assert result == []


def test_map_boq_items_to_cost_sheet_items_handles_missing_attrs():
	boq_items = [BOQItemStub(description="Bare item")]
	result = map_boq_items_to_cost_sheet_items(boq_items)
	assert result[0]["site_name"] == ""
	assert result[0]["item_link"] == ""
	assert result[0]["qty"] == 0
	assert result[0]["base_rate"] == 0
	assert result[0]["unit"] == "Nos"
	assert result[0]["cost_type"] == "Material"
