from gov_erp.gov_erp.doctype.ge_dispatch_challan.ge_dispatch_challan import (
	build_stock_entry_payload,
	calculate_dispatch_totals,
	get_dispatch_stock_entry_purpose,
	group_requested_qty_by_item,
	parse_serial_numbers,
	validate_dispatch_availability,
	validate_dispatch_status_transition,
	validate_serial_number_bundle,
)
from gov_erp.inventory_api import _normalize_dispatch_challan_payload


class Row:
	def __init__(self, item_link, qty, description=None, uom="Nos", serial_numbers=None):
		self.item_link = item_link
		self.qty = qty
		self.description = description or item_link
		self.uom = uom
		self.serial_numbers = serial_numbers


class DispatchDoc:
	def __init__(self, dispatch_type, from_warehouse, to_warehouse, linked_project=None, target_site_name=None):
		self.dispatch_type = dispatch_type
		self.from_warehouse = from_warehouse
		self.to_warehouse = to_warehouse
		self.linked_project = linked_project
		self.target_site_name = target_site_name
		self.name = "DIS-0001"
		self.dispatch_date = "2026-03-13"
		self.items = []


def test_calculate_dispatch_totals_sums_rows():
	rows = [Row("ITEM-1", 2), Row("ITEM-2", 3)]
	totals = calculate_dispatch_totals(rows)

	assert totals["total_items"] == 2
	assert totals["total_qty"] == 5


def test_group_requested_qty_by_item_aggregates_same_item():
	rows = [Row("ITEM-1", 2), Row("ITEM-1", 3), Row("ITEM-2", 1)]

	grouped = group_requested_qty_by_item(rows)

	assert grouped == {"ITEM-1": 5, "ITEM-2": 1}


def test_validate_dispatch_status_transition_accepts_valid_moves():
	validate_dispatch_status_transition("DRAFT", "PENDING_APPROVAL")
	validate_dispatch_status_transition("PENDING_APPROVAL", "APPROVED")
	validate_dispatch_status_transition("APPROVED", "DISPATCHED")


def test_validate_dispatch_status_transition_rejects_invalid_move():
	try:
		validate_dispatch_status_transition("DRAFT", "DISPATCHED")
	except ValueError as exc:
		assert "Cannot change Dispatch Challan status" in str(exc)
	else:
		raise AssertionError("Expected invalid dispatch transition to raise ValueError")


def test_validate_dispatch_availability_accepts_sufficient_stock():
	validate_dispatch_availability({"ITEM-1": 5}, {"ITEM-1": 5})
	validate_dispatch_availability({"ITEM-1": 4, "ITEM-2": 1}, {"ITEM-1": 10, "ITEM-2": 2})


def test_validate_dispatch_availability_rejects_short_stock():
	try:
		validate_dispatch_availability({"ITEM-1": 6}, {"ITEM-1": 5})
	except ValueError as exc:
		assert "Insufficient stock for item ITEM-1" in str(exc)
	else:
		raise AssertionError("Expected short stock validation to raise ValueError")


def test_parse_serial_numbers_accepts_commas_and_lines():
	assert parse_serial_numbers("SN-1, SN-2\nSN-3") == ["SN-1", "SN-2", "SN-3"]


def test_validate_serial_number_bundle_accepts_matching_serials():
	validate_serial_number_bundle(
		"ITEM-1",
		2,
		"SN-1\nSN-2",
		{
			"SN-1": {"item_code": "ITEM-1", "warehouse": "Main WH"},
			"SN-2": {"item_code": "ITEM-1", "warehouse": "Main WH"},
		},
		"Main WH",
	)


def test_validate_serial_number_bundle_rejects_missing_or_wrong_serials():
	try:
		validate_serial_number_bundle(
			"ITEM-1",
			2,
			"SN-1",
			{"SN-1": {"item_code": "ITEM-1", "warehouse": "Main WH"}},
			"Main WH",
		)
	except ValueError as exc:
		assert "requires exactly 2 serial number" in str(exc)
	else:
		raise AssertionError("Expected serial count mismatch to raise ValueError")

	try:
		validate_serial_number_bundle(
			"ITEM-1",
			1,
			"SN-1",
			{"SN-1": {"item_code": "ITEM-2", "warehouse": "Main WH"}},
			"Main WH",
		)
	except ValueError as exc:
		assert "does not belong to item ITEM-1" in str(exc)
	else:
		raise AssertionError("Expected mismatched item serial to raise ValueError")


def test_dispatch_type_maps_to_stock_entry_purpose():
	assert get_dispatch_stock_entry_purpose("WAREHOUSE_TO_WAREHOUSE") == "Material Transfer"
	assert get_dispatch_stock_entry_purpose("WAREHOUSE_TO_SITE") == "Material Issue"
	assert get_dispatch_stock_entry_purpose("VENDOR_TO_SITE") is None


def test_build_stock_entry_payload_for_transfer_and_issue():
	transfer = DispatchDoc("WAREHOUSE_TO_WAREHOUSE", "WH-A", "WH-B", linked_project="PROJ-1")
	transfer.items = [Row("ITEM-1", 2, "Cable")]
	transfer_payload = build_stock_entry_payload(transfer, "Test Company", "Material Transfer", "Material Transfer")
	assert transfer_payload["company"] == "Test Company"
	assert transfer_payload["stock_entry_type"] == "Material Transfer"
	assert transfer_payload["items"][0]["s_warehouse"] == "WH-A"
	assert transfer_payload["items"][0]["t_warehouse"] == "WH-B"

	issue = DispatchDoc("WAREHOUSE_TO_SITE", "WH-A", "WH-B", linked_project="PROJ-1", target_site_name="Site 7")
	issue.items = [Row("ITEM-2", 1, "Camera", serial_numbers="SN-1")]
	issue_payload = build_stock_entry_payload(issue, "Test Company", "Material Issue", "Material Issue")
	assert issue_payload["items"][0]["s_warehouse"] == "WH-A"
	assert issue_payload["items"][0]["t_warehouse"] is None
	assert issue_payload["items"][0]["serial_no"] == "SN-1"


def test_normalize_dispatch_challan_payload_accepts_out_sheet_aliases():
	values = _normalize_dispatch_challan_payload(
		{
			"Send Date": "2026-04-06",
			"challan no.": "DC-2026-001",
			"Issued location /project": "Technosys HO to Site-17",
			"Name of person issued": "Rakesh Sharma",
			"Remark": "Urgent dispatch",
			"items": [
				{
					"item_code": "ITEM-1",
					"ITEM OF DESCRIPTION": "Camera",
					"MAKE": "Hikvision",
					"MODEL NO.": "DS-2CD",
					"SERIAL NO.": "SN-1001",
					"QTY": 2,
					"UOM": "Nos",
					"Remark": "Box sealed",
				}
			],
		}
	)

	assert values["dispatch_date"] == "2026-04-06"
	assert values["challan_reference"] == "DC-2026-001"
	assert values["tracking_reference"] == "DC-2026-001"
	assert values["target_site_name"] == "Technosys HO to Site-17"
	assert values["issued_to_name"] == "Rakesh Sharma"
	assert values["remarks"] == "Urgent dispatch"
	assert values["items"][0]["item_link"] == "ITEM-1"
	assert values["items"][0]["description"] == "Camera"
	assert values["items"][0]["make"] == "Hikvision"
	assert values["items"][0]["model_no"] == "DS-2CD"
	assert values["items"][0]["serial_numbers"] == "SN-1001"
	assert values["items"][0]["qty"] == 2
