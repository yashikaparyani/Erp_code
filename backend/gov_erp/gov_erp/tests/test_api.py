import ast
import json
from pathlib import Path

from gov_erp.api import get_health_payload
from gov_erp.role_utils import BUSINESS_ROLES


APP_ROOT = Path(__file__).resolve().parents[1]
API_PATH = APP_ROOT / "api.py"
DOCTYPE_ROOT = APP_ROOT / "gov_erp" / "doctype"


def _load_api_tree():
	return ast.parse(API_PATH.read_text())


def _iter_doctype_json():
	return sorted(DOCTYPE_ROOT.glob("*/*.json"))


def test_health_check_shape():
	result = get_health_payload()

	assert result["success"] is True
	assert result["app"] == "gov_erp"
	assert "message" in result


def test_only_health_check_allows_guest():
	tree = _load_api_tree()
	guest_enabled = []

	for node in tree.body:
		if not isinstance(node, ast.FunctionDef):
			continue
		for decorator in node.decorator_list:
			if not isinstance(decorator, ast.Call):
				continue
			func = decorator.func
			if not isinstance(func, ast.Attribute):
				continue
			if func.attr != "whitelist":
				continue
			for keyword in decorator.keywords:
				if keyword.arg == "allow_guest" and isinstance(keyword.value, ast.Constant) and keyword.value.value is True:
					guest_enabled.append(node.name)

	assert guest_enabled == ["health_check"]


def test_business_doctypes_do_not_grant_guest_permissions():
	guest_roles = {}

	for path in _iter_doctype_json():
		data = json.loads(path.read_text())
		permissions = data.get("permissions", [])
		roles = [perm.get("role") for perm in permissions]
		if "Guest" in roles:
			guest_roles[data["name"]] = roles

	assert guest_roles == {}


def test_hooks_enable_role_bootstrap_and_remove_guest_rw_config():
	hooks_path = APP_ROOT / "hooks.py"
	hooks_text = hooks_path.read_text()
	install_text = (APP_ROOT / "install.py").read_text()

	assert 'after_install = "gov_erp.install.after_install"' in hooks_text
	assert 'after_migrate = ["gov_erp.install.after_migrate"]' in hooks_text
	assert "guest_rw_doctypes" not in hooks_text
	assert "grant_director_full_access" in install_text
	assert "grant_presales_head_project_flow_access" in install_text


def test_business_role_list_matches_backend_plan():
	assert BUSINESS_ROLES == [
		"Presales Tendering Head",
		"Presales Executive",
		"Engineering Head",
		"Engineer",
		"Department Head",
		"Project Head",
		"Accounts",
		"HR Manager",
		"Procurement Manager",
		"Purchase",
		"Project Manager",
		"Store Manager",
		"Stores Logistics Head",
		"Director",
		"Field Technician",
		"OM Operator",
		"RMA Manager",
	]


def test_priority9_doctypes_drop_generic_department_head_permissions():
	expected_role_sets = {
		"GE Survey": {"System Manager", "Project Manager", "Project Head", "Engineering Head", "Engineer", "Director"},
		"GE Milestone": {"System Manager", "Project Manager", "Project Head", "Engineering Head", "Director"},
		"GE Vendor Comparison": {"System Manager", "Procurement Manager", "Purchase", "Project Head", "Engineering Head", "Director"},
		"GE Dispatch Challan": {"System Manager", "Store Manager", "Stores Logistics Head", "Purchase", "Procurement Manager", "Project Manager", "Project Head", "Director"},
		"GE Invoice": {"System Manager", "Accounts", "Project Manager", "Project Head", "Director"},
		"GE Project Communication Log": {"System Manager", "Project Head", "Project Manager", "Engineering Head", "Director"},
		"GE Project Asset": {"System Manager", "Project Head", "Project Manager"},
		"GE Petty Cash": {"System Manager", "Project Head", "Project Manager", "Accounts", "Director"},
		"GE Manpower Log": {"System Manager", "Project Head", "Project Manager", "HR Manager", "Director"},
		"GE RMA Tracker": {"System Manager", "Project Head", "Project Manager", "RMA Manager", "Procurement Manager", "Director"},
		"GE Device Uptime Log": {"System Manager", "Project Head", "Project Manager", "RMA Manager", "Engineering Head", "Director"},
	}

	for path in _iter_doctype_json():
		data = json.loads(path.read_text())
		doctype_name = data["name"]
		if doctype_name not in expected_role_sets:
			continue

		roles = {perm.get("role") for perm in data.get("permissions", [])}
		assert "Department Head" not in roles
		assert roles == expected_role_sets[doctype_name]


def test_project_workspace_crud_apis_exist():
	tree = _load_api_tree()
	functions = {node.name for node in tree.body if isinstance(node, ast.FunctionDef)}

	assert {"get_project", "create_project", "update_project", "delete_project"}.issubset(functions)


def test_project_workflow_apis_exist():
	tree = _load_api_tree()
	functions = {node.name for node in tree.body if isinstance(node, ast.FunctionDef)}

	assert {
		"get_project_workflow_state",
		"submit_project_stage_for_approval",
		"approve_project_stage",
		"reject_project_stage",
		"restart_project_stage",
		"override_project_stage",
	}.issubset(functions)


def test_project_spine_setup_includes_workflow_fields():
	spine_text = (APP_ROOT / "spine_setup.py").read_text()

	for fieldname in [
		"current_stage_status",
		"current_stage_owner_department",
		"stage_submitted_by",
		"stage_submitted_at",
		"workflow_last_action",
		"workflow_last_actor",
		"workflow_last_action_at",
		"workflow_history_json",
	]:
		assert fieldname in spine_text
