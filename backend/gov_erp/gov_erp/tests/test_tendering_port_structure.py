import ast
import json
from pathlib import Path


APP_ROOT = Path(__file__).resolve().parents[1]
DOCTYPE_ROOT = APP_ROOT / "gov_erp" / "doctype"


def _load_doctype_json(slug):
	path = DOCTYPE_ROOT / slug / f"{slug}.json"
	return json.loads(path.read_text())


def _load_api_whitelist_names():
	from api_test_utils import combined_api_whitelist_names
	return combined_api_whitelist_names(APP_ROOT)


def test_organization_doctype_exists():
	dt = _load_doctype_json("ge_organization")
	field_names = {field["fieldname"] for field in dt["fields"]}
	assert {"organization_name", "gstin", "pan", "city", "state", "active"}.issubset(field_names)


def test_tender_has_organization_field():
	dt = _load_doctype_json("ge_tender")
	field_names = {field["fieldname"] for field in dt["fields"]}
	assert "organization" in field_names


def test_tender_result_doctype_exists():
	dt = _load_doctype_json("ge_tender_result")
	field_names = {field["fieldname"] for field in dt["fields"]}
	assert {"tender", "organization_name", "result_stage", "winning_amount", "bidders"}.issubset(field_names)


def test_tender_result_bidder_is_child_table():
	dt = _load_doctype_json("ge_tender_result_bidder")
	assert dt.get("istable") == 1
	field_names = {field["fieldname"] for field in dt["fields"]}
	assert {"bidder_name", "bid_amount", "is_winner"}.issubset(field_names)


def test_tender_checklist_doctype_exists():
	dt = _load_doctype_json("ge_tender_checklist")
	field_names = {field["fieldname"] for field in dt["fields"]}
	assert {"checklist_name", "checklist_type", "status", "items"}.issubset(field_names)


def test_tender_checklist_item_is_child_table():
	dt = _load_doctype_json("ge_tender_checklist_item")
	assert dt.get("istable") == 1
	field_names = {field["fieldname"] for field in dt["fields"]}
	assert {"item_name", "is_mandatory"}.issubset(field_names)


def test_tender_reminder_doctype_exists():
	dt = _load_doctype_json("ge_tender_reminder")
	field_names = {field["fieldname"] for field in dt["fields"]}
	assert {"tender", "reminder_date", "remind_user", "status", "sent_on"}.issubset(field_names)


def test_competitor_doctype_exists():
	dt = _load_doctype_json("ge_competitor")
	field_names = {field["fieldname"] for field in dt["fields"]}
	assert {"company_name", "organization", "win_count", "loss_count", "win_rate"}.issubset(field_names)


def test_tendering_port_apis_exist():
	names = _load_api_whitelist_names()
	expected = {
		"get_organizations",
		"create_organization",
		"get_tender_results",
		"get_tender_result",
		"create_tender_result",
		"update_tender_result",
		"delete_tender_result",
		"get_tender_result_stats",
		"get_tender_checklists",
		"get_tender_checklist",
		"create_tender_checklist",
		"update_tender_checklist",
		"delete_tender_checklist",
		"get_tender_reminders",
		"get_tender_reminder",
		"create_tender_reminder",
		"update_tender_reminder",
		"delete_tender_reminder",
		"mark_tender_reminder_sent",
		"dismiss_tender_reminder",
		"get_tender_reminder_stats",
		"get_competitors",
		"get_competitor",
		"create_competitor",
		"update_competitor",
		"delete_competitor",
		"get_competitor_stats",
	}
	assert expected.issubset(names)
