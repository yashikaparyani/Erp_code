import ast
import json
import re
from pathlib import Path

from gov_erp.api import get_health_payload
from gov_erp.role_utils import BUSINESS_ROLES


APP_ROOT = Path(__file__).resolve().parents[1]
API_PATH = APP_ROOT / "api.py"
DOCTYPE_ROOT = APP_ROOT / "gov_erp" / "doctype"


def _load_api_tree():
	from api_test_utils import combined_api_source
	return ast.parse(combined_api_source(APP_ROOT))


def _iter_doctype_json():
	return sorted(DOCTYPE_ROOT.glob("*/*.json"))


def test_health_check_shape():
	result = get_health_payload()

	assert result["success"] is True
	assert result["app"] == "gov_erp"
	assert "message" in result


def test_health_check_guest_payload_is_lightweight():
	api_utils = (APP_ROOT / "api_utils.py").read_text()
	assert '"message": "Gov ERP backend is reachable"' in api_utils


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


def test_project_workspace_mutations_require_spine_write_access():
	project_api = (APP_ROOT / "project_api.py").read_text()

	for func_name in [
		"create_project_note",
		"update_project_note",
		"delete_project_note",
		"create_project_task",
		"update_project_task",
		"delete_project_task",
	]:
		pattern = rf"def {func_name}\([^\)]*\):.*?_require_spine_write_access\(\)"
		assert re.search(pattern, project_api, re.S), f"{func_name} must require spine write access"


def test_scheduler_endpoints_require_scheduler_admin_access():
	system_api = (APP_ROOT / "system_api.py").read_text()

	assert "def _require_scheduler_admin_access():" in system_api
	for func_name in ["generate_system_reminders", "process_due_reminders"]:
		pattern = rf"def {func_name}\([^\)]*\):.*?_require_scheduler_admin_access\(\)"
		assert re.search(pattern, system_api, re.S), f"{func_name} must require scheduler admin access"


def test_health_check_keeps_guest_response_lightweight():
	api_utils = (APP_ROOT / "api_utils.py").read_text()
	assert '"message": "Gov ERP backend is reachable"' in api_utils
	assert re.search(
		r"def health_check\(\):.*?session.*?Guest.*?return \{.*?Gov ERP backend is reachable.*?\}.*?return get_health_payload\(\)",
		api_utils,
		re.S,
	)


def test_business_doctypes_do_not_grant_guest_permissions():
	guest_roles = {}

	for path in _iter_doctype_json():
		data = json.loads(path.read_text())
		permissions = data.get("permissions", [])
		roles = [perm.get("role") for perm in permissions]
		if "Guest" in roles:
			guest_roles[data["name"]] = roles

	assert guest_roles == {}


def test_dispatch_and_project_inventory_doctypes_capture_workbook_reference_fields():
	dispatch_json = json.loads((DOCTYPE_ROOT / "ge_dispatch_challan" / "ge_dispatch_challan.json").read_text())
	dispatch_item_json = json.loads((DOCTYPE_ROOT / "ge_dispatch_challan_item" / "ge_dispatch_challan_item.json").read_text())
	project_inventory_json = json.loads((DOCTYPE_ROOT / "ge_project_inventory" / "ge_project_inventory.json").read_text())

	dispatch_fields = {field.get("fieldname") for field in dispatch_json.get("fields", [])}
	dispatch_item_fields = {field.get("fieldname") for field in dispatch_item_json.get("fields", [])}
	project_inventory_fields = {field.get("fieldname") for field in project_inventory_json.get("fields", [])}

	assert {"challan_reference", "issued_to_name"}.issubset(dispatch_fields)
	assert {"make", "model_no"}.issubset(dispatch_item_fields)
	assert {
		"hsn_code",
		"make",
		"model_no",
		"serial_no",
		"last_received_on",
		"source_reference",
		"invoice_no",
		"purchase_order",
		"purchase_cost",
	}.issubset(project_inventory_fields)


def test_hooks_enable_role_bootstrap_and_remove_guest_rw_config():
	hooks_path = APP_ROOT / "hooks.py"
	hooks_text = hooks_path.read_text()
	install_text = (APP_ROOT / "install.py").read_text()

	assert 'after_install = "gov_erp.install.after_install"' in hooks_text
	assert 'after_migrate = ["gov_erp.install.after_migrate"]' in hooks_text
	assert "guest_rw_doctypes" not in hooks_text
	assert "seed_rbac" in install_text
	assert "sync_rbac_doc_permissions" in install_text


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
		"GE Device Uptime Log": {"System Manager", "Project Head", "Project Manager", "RMA Manager", "Engineering Head", "Director", "OM Operator"},
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
		"get_engineering_head_dashboard",
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


def test_rbac_phase1_artifacts_exist_and_seed_flow_is_hooked():
	required_doctypes = [
		DOCTYPE_ROOT / "ge_permission_capability" / "ge_permission_capability.json",
		DOCTYPE_ROOT / "ge_permission_pack" / "ge_permission_pack.json",
		DOCTYPE_ROOT / "ge_permission_pack_item" / "ge_permission_pack_item.json",
		DOCTYPE_ROOT / "ge_role_pack_mapping" / "ge_role_pack_mapping.json",
		DOCTYPE_ROOT / "ge_user_pack_override" / "ge_user_pack_override.json",
		DOCTYPE_ROOT / "ge_user_context" / "ge_user_context.json",
	]

	for path in required_doctypes:
		assert path.exists(), f"Missing RBAC Phase 1 DocType: {path.name}"

	rbac_seed_text = (APP_ROOT / "rbac_seed.py").read_text()
	install_text = (APP_ROOT / "install.py").read_text()

	assert "def seed_capabilities" in rbac_seed_text
	assert "def seed_packs" in rbac_seed_text
	assert "def seed_role_pack_mappings" in rbac_seed_text
	assert "def seed_user_contexts" in rbac_seed_text
	assert "seed_user_contexts()" in rbac_seed_text
	assert "from gov_erp.rbac_seed import seed_rbac" in install_text
	assert 'frappe.log_error(frappe.get_traceback(), "gov_erp: rbac seed failed on install")' in install_text
	assert 'frappe.log_error(frappe.get_traceback(), "gov_erp: rbac seed failed on migrate")' in install_text


def test_rbac_phase2_permission_engine_surface_exists():
	engine_text = (APP_ROOT / "permission_engine.py").read_text()
	from api_test_utils import combined_api_source
	api_text = combined_api_source(APP_ROOT)

	for snippet in [
		"class PermissionEngine",
		"def _resolve_effective_capabilities",
		"def can_access_module",
		"def can_access_route",
		"def can_view_project",
		"def can_update_site",
		"def can_submit_stage",
		"def can_approve_stage",
		"def can_override_dependency",
		"def get_visible_tabs",
		"def get_effective_summary",
	]:
		assert snippet in engine_text

	for snippet in [
		"def _get_permission_engine",
		"def _require_capability",
		"def _require_any_capability",
		"def _require_module_access",
		"from gov_erp.permission_engine import PermissionEngine",
	]:
		assert snippet in api_text


def test_rbac_phase2_user_context_seed_covers_department_and_assignment_fields():
	rbac_seed_text = (APP_ROOT / "rbac_seed.py").read_text()

	for snippet in [
		"ROLE_DEPARTMENT_DEFAULTS",
		"GE Project Team Member",
		"assigned_projects =",
		"assigned_sites =",
		'ROLE_DEPARTMENT_DEFAULTS.get(primary_role)',
	]:
		assert snippet in rbac_seed_text


def test_rbac_phase3_api_contract_exists_and_is_admin_guarded():
	rbac_api_text = (APP_ROOT / "rbac_api.py").read_text()

	for snippet in [
		"def get_permission_packs",
		"def get_role_pack_matrix",
		"def get_user_effective_permissions",
		"def assign_role_packs",
		"def assign_user_override",
		"def get_user_context",
		"def update_user_context",
		"def get_rbac_users",
	]:
		assert snippet in rbac_api_text

	assert '_require_settings_capability("settings.pack.manage")' in rbac_api_text
	assert '_require_settings_capability("settings.role.manage")' in rbac_api_text
	assert '_require_settings_capability("settings.user_role.manage")' in rbac_api_text
	assert '_validate_link_targets("Project", project_values, "assigned projects")' in rbac_api_text
	assert '_validate_link_targets("GE Site", site_values, "assigned sites")' in rbac_api_text
