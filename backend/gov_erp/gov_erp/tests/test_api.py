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

	assert 'after_install = "gov_erp.install.after_install"' in hooks_text
	assert 'after_migrate = ["gov_erp.install.after_migrate"]' in hooks_text
	assert "guest_rw_doctypes" not in hooks_text


def test_business_role_list_matches_backend_plan():
	assert BUSINESS_ROLES == [
		"Presales Tendering Head",
		"Presales Executive",
		"Engineering Head",
		"Engineer",
		"Department Head",
		"Accounts",
		"HR Manager",
		"Procurement Manager",
		"Purchase",
		"Project Manager",
		"Store Manager",
		"Stores Logistics Head",
		"Top Management",
	]
