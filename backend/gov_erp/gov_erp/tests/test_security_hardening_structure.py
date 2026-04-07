"""Source-level structural tests for security hardening:
 - Workflow-protected fields are stripped from generic create AND update endpoints.
 - Non-draft records are blocked from deletion.
 - Project/site scope is threaded into execution, document, and procurement write guards.
 - Admin API role-creation and user-creation restricted to Director only.
 - Vendor comparison CRUD is workflow-hardened.
"""

import ast
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"


def _read(path: Path) -> str:
    if path.name == "api.py":
        from api_test_utils import combined_api_source
        return combined_api_source(path.parent)
    return path.read_text()


# ── 1. Workflow-protected field registry exists in api_utils ────────────

def test_workflow_protected_fields_registry_exists():
    src = _read(APP_ROOT / "api_utils.py")
    assert "WORKFLOW_PROTECTED_FIELDS" in src
    for doctype in ["GE Drawing", "GE Change Request", "GE Test Report", "GE Tender", "GE BOQ"]:
        assert f'"{doctype}"' in src or f"'{doctype}'" in src, f"Missing {doctype} in WORKFLOW_PROTECTED_FIELDS"


def test_strip_workflow_fields_helper_exists():
    src = _read(APP_ROOT / "api_utils.py")
    assert "def _strip_workflow_fields(doctype, values):" in src


def test_block_delete_if_workflow_active_helper_exists():
    src = _read(APP_ROOT / "api_utils.py")
    assert "def _block_delete_if_workflow_active(doctype, name):" in src
    assert "_NON_DELETABLE_STATUSES" in src


# ── 2. Generic _update_generic_doc strips workflow fields ───────────────

def test_update_generic_doc_strips_workflow_fields():
    src = _read(APP_ROOT / "api_utils.py")
    # Extract the function body
    idx = src.index("def _update_generic_doc(")
    body = src[idx:idx + 300]
    assert "_strip_workflow_fields" in body, "_update_generic_doc must call _strip_workflow_fields"


def test_delete_generic_doc_blocks_workflow_active():
    src = _read(APP_ROOT / "api_utils.py")
    idx = src.index("def _delete_generic_doc(")
    body = src[idx:idx + 300]
    assert "_block_delete_if_workflow_active" in body, "_delete_generic_doc must call _block_delete_if_workflow_active"


# ── 3. Tender & BOQ non-generic update/delete also protected ───────────

def test_tender_update_strips_workflow_fields():
    src = _read(APP_ROOT / "tender_api.py")
    idx = src.index("def update_tender(")
    body = src[idx:idx + 400]
    assert '_strip_workflow_fields("GE Tender"' in body or "_strip_workflow_fields" in body


def test_tender_delete_blocks_non_draft():
    src = _read(APP_ROOT / "tender_api.py")
    idx = src.index("def delete_tender(")
    body = src[idx:idx + 300]
    assert "_block_delete_if_workflow_active" in body


def test_boq_update_strips_workflow_fields():
    src = _read(APP_ROOT / "procurement_api.py")
    idx = src.index("def update_boq(")
    body = src[idx:idx + 400]
    assert '_strip_workflow_fields("GE BOQ"' in body or "_strip_workflow_fields" in body


def test_boq_delete_blocks_non_draft():
    src = _read(APP_ROOT / "procurement_api.py")
    idx = src.index("def delete_boq(")
    body = src[idx:idx + 300]
    assert "_block_delete_if_workflow_active" in body


# ── 4. Execution write guards thread project/site scope ─────────────────

def test_execution_write_access_accepts_project_site():
    src = _read(APP_ROOT / "api_utils.py")
    assert "def _require_execution_write_access(project=None, site=None)" in src


def test_drawing_update_passes_project_scope():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def update_drawing(")
    body = src[idx:idx + 500]
    assert "_require_execution_write_access(project=" in body


def test_drawing_delete_passes_project_scope():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def delete_drawing(")
    body = src[idx:idx + 500]
    assert "_require_execution_write_access(project=" in body


def test_change_request_update_passes_project_scope():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def update_change_request(")
    body = src[idx:idx + 500]
    assert "_require_execution_write_access(project=" in body


def test_test_report_update_passes_project_scope():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def update_test_report(")
    body = src[idx:idx + 500]
    assert "_require_execution_write_access(project=" in body


def test_drawing_update_strips_workflow_fields():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def update_drawing(")
    body = src[idx:idx + 500]
    assert '_strip_workflow_fields("GE Drawing"' in body


def test_change_request_update_strips_workflow_fields():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def update_change_request(")
    body = src[idx:idx + 500]
    assert '_strip_workflow_fields("GE Change Request"' in body


def test_test_report_update_strips_workflow_fields():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def update_test_report(")
    body = src[idx:idx + 500]
    assert '_strip_workflow_fields("GE Test Report"' in body


# ── 5. Admin API: role & user creation restricted to Director ───────────

def test_create_role_restricted_to_director():
    src = _read(APP_ROOT / "admin_api.py")
    idx = src.index("def create_role(")
    body = src[idx:idx + 300]
    assert "ROLE_DIRECTOR" in body
    assert "ROLE_HR_MANAGER" not in body, "HR Manager should not be able to create roles"
    assert "ROLE_DEPARTMENT_HEAD" not in body, "Department Head should not be able to create roles"


def test_create_user_restricted_to_director():
    src = _read(APP_ROOT / "admin_api.py")
    idx = src.index("def create_user(")
    body = src[idx:idx + 300]
    assert "ROLE_DIRECTOR" in body
    assert "ROLE_PRESALES_HEAD" not in body, "Presales Head should not be able to create users"
    assert "ROLE_HR_MANAGER" not in body, "HR Manager should not be able to create users"


def test_toggle_role_restricted_to_director():
    src = _read(APP_ROOT / "admin_api.py")
    idx = src.index("def toggle_role(")
    body = src[idx:idx + 300]
    assert "ROLE_DIRECTOR" in body
    assert "ROLE_HR_MANAGER" not in body


# ── 6. Protected fields are correct per doctype ─────────────────────────

def test_drawing_protected_fields_include_status_and_approved_by():
    src = _read(APP_ROOT / "api_utils.py")
    start = src.index("WORKFLOW_PROTECTED_FIELDS = {")
    block = src[start:start + 1200]
    drawing_idx = block.index('"GE Drawing"')
    drawing_block = block[drawing_idx:drawing_idx + 200]
    for field in ["status", "approved_by"]:
        assert f'"{field}"' in drawing_block, f"GE Drawing should protect '{field}'"


def test_tender_protected_fields_include_approval_status():
    src = _read(APP_ROOT / "api_utils.py")
    start = src.index("WORKFLOW_PROTECTED_FIELDS = {")
    block = src[start:start + 1200]
    tender_idx = block.index('"GE Tender"')
    tender_block = block[tender_idx:tender_idx + 400]
    for field in ["status", "approval_status", "go_no_go_status"]:
        assert f'"{ field }"' in tender_block, f"GE Tender should protect '{field}'"


def test_boq_protected_fields_include_status_and_approved_by():
    src = _read(APP_ROOT / "api_utils.py")
    start = src.index("WORKFLOW_PROTECTED_FIELDS = {")
    block = src[start:start + 1200]
    boq_idx = block.index('"GE BOQ"')
    boq_block = block[boq_idx:boq_idx + 200]
    for field in ["status", "approved_by"]:
        assert f'"{ field }"' in boq_block, f"GE BOQ should protect '{field}'"


# ── 7. Create-time state injection blocked ──────────────────────────────

def test_create_generic_doc_strips_workflow_fields():
    src = _read(APP_ROOT / "api_utils.py")
    idx = src.index("def _create_generic_doc(")
    body = src[idx:idx + 300]
    assert "_strip_workflow_fields" in body, "_create_generic_doc must strip workflow fields before insert"


def test_create_test_report_strips_workflow_fields():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def create_test_report(")
    body = src[idx:idx + 500]
    assert '_strip_workflow_fields("GE Test Report"' in body


def test_create_tender_strips_workflow_fields():
    src = _read(APP_ROOT / "tender_api.py")
    idx = src.index("def create_tender(")
    body = src[idx:idx + 400]
    assert '_strip_workflow_fields("GE Tender"' in body


def test_create_boq_strips_workflow_fields():
    src = _read(APP_ROOT / "procurement_api.py")
    idx = src.index("def create_boq(")
    body = src[idx:idx + 400]
    assert '_strip_workflow_fields("GE BOQ"' in body


def test_create_vendor_comparison_strips_workflow_fields():
    src = _read(APP_ROOT / "procurement_api.py")
    idx = src.index("def create_vendor_comparison(")
    body = src[idx:idx + 400]
    assert '_strip_workflow_fields("GE Vendor Comparison"' in body


# ── 8. Vendor comparison workflow hardening ──────────────────────────────

def test_vendor_comparison_in_protected_fields_registry():
    src = _read(APP_ROOT / "api_utils.py")
    start = src.index("WORKFLOW_PROTECTED_FIELDS = {")
    block = src[start:start + 1200]
    assert '"GE Vendor Comparison"' in block


def test_vendor_comparison_in_non_deletable_statuses():
    src = _read(APP_ROOT / "api_utils.py")
    start = src.index("_NON_DELETABLE_STATUSES = {")
    block = src[start:start + 800]
    assert '"GE Vendor Comparison"' in block


def test_vendor_comparison_update_strips_workflow_fields():
    src = _read(APP_ROOT / "procurement_api.py")
    idx = src.index("def update_vendor_comparison(")
    body = src[idx:idx + 500]
    assert '_strip_workflow_fields("GE Vendor Comparison"' in body


def test_vendor_comparison_delete_blocks_non_draft():
    src = _read(APP_ROOT / "procurement_api.py")
    idx = src.index("def delete_vendor_comparison(")
    body = src[idx:idx + 400]
    assert "_block_delete_if_workflow_active" in body


# ── 9. Document & procurement scope enforcement ─────────────────────────

def test_document_write_access_accepts_project_site():
    src = _read(APP_ROOT / "api_utils.py")
    assert "def _require_document_write_access(project=None, site=None)" in src


def test_procurement_write_access_accepts_project_site():
    src = _read(APP_ROOT / "api_utils.py")
    assert "def _require_procurement_write_access(project=None, site=None)" in src


def test_update_project_document_passes_project_scope():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def update_project_document(")
    body = src[idx:idx + 500]
    assert "_require_document_write_access(project=" in body


def test_delete_project_document_passes_project_scope():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def delete_project_document(")
    body = src[idx:idx + 500]
    assert "_require_document_write_access(project=" in body


def test_update_document_folder_passes_project_scope():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def update_document_folder(")
    body = src[idx:idx + 500]
    assert "_require_document_write_access(project=" in body


def test_delete_document_folder_passes_project_scope():
    src = _read(APP_ROOT / "execution_api.py")
    idx = src.index("def delete_document_folder(")
    body = src[idx:idx + 500]
    assert "_require_document_write_access(project=" in body


def test_vendor_comparison_create_passes_project_scope():
    src = _read(APP_ROOT / "procurement_api.py")
    idx = src.index("def create_vendor_comparison(")
    body = src[idx:idx + 500]
    assert "_require_procurement_write_access(project=" in body


def test_vendor_comparison_update_passes_project_scope():
    src = _read(APP_ROOT / "procurement_api.py")
    idx = src.index("def update_vendor_comparison(")
    body = src[idx:idx + 500]
    assert "_require_procurement_write_access(project=" in body


def test_vendor_comparison_delete_passes_project_scope():
    src = _read(APP_ROOT / "procurement_api.py")
    idx = src.index("def delete_vendor_comparison(")
    body = src[idx:idx + 500]
    assert "_require_procurement_write_access(project=" in body
