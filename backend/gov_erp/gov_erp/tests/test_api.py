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


def test_bookkeeping_demo_seed_requires_dev_environment():
	finance_api = (APP_ROOT / "finance_api.py").read_text()

	assert "def _assert_dev_demo_seed_environment():" in finance_api
	assert re.search(
		r"def seed_bookkeeping_demo\([^\)]*\):.*?_assert_dev_demo_seed_environment\(\).*?_require_billing_write_access\(\)",
		finance_api,
		re.S,
	), "seed_bookkeeping_demo must require the dev demo guard before billing write access"


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
	assert "def _run_bootstrap_step(step_label, phase, fn):" in install_text
	assert 'frappe.log_error(frappe.get_traceback(), f"gov_erp: {step_label} failed on {phase}")' in install_text
	assert re.search(r"def _run_bootstrap_step\(step_label, phase, fn\):.*?raise", install_text, re.S)


def test_medium_priority_backend_hardening_is_present():
	presales_text = (APP_ROOT / "presales_api.py").read_text()
	accountability_text = (APP_ROOT / "accountability_api.py").read_text()
	reporting_text = (APP_ROOT / "reporting_api.py").read_text()

	assert 'presales_api._sync_result_tracker failed for tender' in presales_text
	assert 'presales_api._get_color_config fallback defaults used' in presales_text
	assert "def _append_category(category, count_loader, sample_loader=None):" in accountability_text
	assert 'accountability_api.get_legacy_data_report failed for' in accountability_text
	assert '"error": "query_failed"' in accountability_text
	assert 'total_project_rows = frappe.db.count("Project")' in reporting_text
	assert 'live_project_total = frappe.db.count("Project", {"total_sites": [">", 0]})' in reporting_text
	assert "empty_shell_projects = max(total_project_rows - live_project_total, 0)" in reporting_text


def test_remaining_backend_hardening_is_present():
	finance_text = (APP_ROOT / "finance_api.py").read_text()
	execution_text = (APP_ROOT / "execution_api.py").read_text()
	reporting_text = (APP_ROOT / "reporting_api.py").read_text()

	assert "_COMMERCIAL_REFERENCE_FIELDS = {" in finance_text
	assert "def _require_commercial_reference(reference_doctype, reference_name):" in finance_text
	assert 'frappe.throw("Reference DocType is not supported for commercial collaboration")' in finance_text
	assert 'frappe.throw("Customer must match the selected commercial reference record")' in finance_text
	assert re.search(
		r"def add_commercial_comment\([^\)]*\):.*?_require_commercial_reference\(reference_doctype, reference_name\)",
		finance_text,
		re.S,
	)
	assert re.search(
		r"def create_commercial_document\([^\)]*\):.*?_require_commercial_reference\(",
		finance_text,
		re.S,
	)
	assert "from gov_erp.dms_api import _is_temp_upload_file_referenced" in execution_text
	assert "if not _is_temp_upload_file_referenced(file_url):" in execution_text
	assert '_apply_project_manager_project_filter(project_filters, project_field="name")' in reporting_text


def test_no_bare_exception_pass_blocks_remain_in_target_backend_modules():
	project_text = (APP_ROOT / "project_api.py").read_text()
	execution_text = (APP_ROOT / "execution_api.py").read_text()
	presales_text = (APP_ROOT / "presales_api.py").read_text()

	for text in [project_text, execution_text, presales_text]:
		assert not re.search(r"except Exception:\n\s+pass", text)

	assert "project_api.get_project_activity workflow_history failed" in project_text
	assert "project_api.get_project_activity alerts failed" in project_text
	assert "project_api.get_project_activity accountability failed" in project_text
	assert 'frappe.log_error(frappe.get_traceback(), "Accountability: approve_dpr")' in execution_text
	assert 'frappe.log_error(frappe.get_traceback(), "Accountability: reject_dpr")' in execution_text
	assert "presales_api.get_funnel_dashboard emd_pending_refund count failed" in presales_text


def test_collaboration_endpoints_are_allowlisted_and_assignment_requires_write_access():
	alerts_text = (APP_ROOT / "alerts_api.py").read_text()

	assert "_COLLABORATION_DOCTYPES = {" in alerts_text
	assert '"Project"' in alerts_text
	assert "def _require_collaboration_reference(reference_doctype=None, reference_name=None, *, require_write=False):" in alerts_text
	assert 'frappe.throw("Reference DocType is not supported for collaboration")' in alerts_text
	assert '_require_collaboration_reference(reference_doctype, reference_name)' in alerts_text
	assert '_require_collaboration_reference(reference_doctype, reference_name, require_write=True)' in alerts_text
	assert 'frappe.throw("Comment type is not supported for collaboration")' in alerts_text


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
