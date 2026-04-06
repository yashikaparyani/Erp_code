"""Source checks for PM project-linked inventory and petty cash surfaces."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"


def _read(path: Path) -> str:
    if path.name == "api.py":
        from api_test_utils import combined_api_source
        return combined_api_source(path.parent)
    return path.read_text()


def test_project_inventory_doctype_and_consumption_report_exist():
    inventory_json = _read(APP_ROOT / "gov_erp" / "doctype" / "ge_project_inventory" / "ge_project_inventory.json")
    consumption_json = _read(
        APP_ROOT / "gov_erp" / "doctype" / "ge_material_consumption_report" / "ge_material_consumption_report.json"
    )
    assert '"name": "GE Project Inventory"' in inventory_json
    assert '"fieldname": "linked_project"' in inventory_json
    assert '"fieldname": "balance_qty"' in inventory_json
    assert '"fieldname": "hsn_code"' in inventory_json
    assert '"fieldname": "make"' in inventory_json
    assert '"fieldname": "model_no"' in inventory_json
    assert '"fieldname": "serial_no"' in inventory_json
    assert '"fieldname": "last_received_on"' in inventory_json
    assert '"fieldname": "invoice_no"' in inventory_json
    assert '"fieldname": "purchase_order"' in inventory_json
    assert '"name": "GE Material Consumption Report"' in consumption_json
    assert '"fieldname": "consumed_qty"' in consumption_json


def test_api_exposes_project_scoped_inventory_methods():
    source = _read(APP_ROOT / "api.py")
    for expected in [
        "def get_inventory_reference_schema(",
        "def get_project_inventory_records(",
        "def record_project_inventory_receipt(",
        "def get_material_consumption_reports(",
        "def create_material_consumption_report(",
        "def get_project_receiving_summary(",
        "_normalize_project_inventory_receipt_values(",
        "INVENTORY_IN_REFERENCE_HEADERS = [",
        "DISPATCH_OUT_REFERENCE_HEADERS = [",
        "_apply_project_manager_project_filter(filters, project=project, project_field=\"linked_project\")",
    ]:
        assert expected in source


def test_pm_frontend_pages_exist():
    inventory_page = _read(ROOT / "erp_frontend" / "src" / "app" / "project-manager" / "inventory" / "page.tsx")
    petty_cash_page = _read(ROOT / "erp_frontend" / "src" / "app" / "project-manager" / "petty-cash" / "page.tsx")
    dpr_page = _read(ROOT / "erp_frontend" / "src" / "app" / "project-manager" / "dpr" / "page.tsx")
    assert "Project Inventory" in inventory_page
    assert "get_project_inventory_records" in inventory_page
    assert "create_material_consumption_report" in inventory_page
    assert "Project Petty Cash" in petty_cash_page
    assert "/api/petty-cash?project=" in petty_cash_page
    assert "Project DPR" in dpr_page
    assert "/api/dprs?project=" in dpr_page
