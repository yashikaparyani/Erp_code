from gov_erp.finance_api import _normalize_project_inventory_receipt_values


def test_normalize_project_inventory_receipt_values_accepts_in_sheet_aliases():
	values = _normalize_project_inventory_receipt_values(
		{
			"linked_project": "PROJ-001",
			"linked_site": "SITE-001",
			"Received Date": "2026-04-06",
			"HSN CODE": "8525",
			"item": "Camera",
			"Make": "Hikvision",
			"Model No..": "DS-2CD",
			"Serial No.": "SN-1001",
			"QTY": 4,
			"UOM": "Nos",
			"From Vendor's/Project Received": "Technosys HO",
			"Invoice no.": "INV-2026-1001",
			"Purchase Order": "PO-2026-1001",
			"purchase cost.": 12500,
			"REMARK": "Initial inward",
		}
	)

	assert values["linked_project"] == "PROJ-001"
	assert values["linked_site"] == "SITE-001"
	assert values["item_name"] == "Camera"
	assert values["item_code"] == "Camera"
	assert values["last_received_on"] == "2026-04-06"
	assert values["hsn_code"] == "8525"
	assert values["make"] == "Hikvision"
	assert values["model_no"] == "DS-2CD"
	assert values["serial_no"] == "SN-1001"
	assert values["received_qty"] == 4
	assert values["unit"] == "Nos"
	assert values["source_reference"] == "Technosys HO"
	assert values["invoice_no"] == "INV-2026-1001"
	assert values["purchase_order"] == "PO-2026-1001"
	assert values["purchase_cost"] == 12500
	assert values["last_receipt_note"] == "Initial inward"
