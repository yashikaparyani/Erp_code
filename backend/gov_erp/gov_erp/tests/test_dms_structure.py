"""Source-level checks for the DMS upload flow."""

import pytest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"


def _read(path: Path) -> str:
    if path.name == "api.py":
        from api_test_utils import combined_api_source
        return combined_api_source(path.parent)
    return path.read_text()


def test_project_document_controller_validates_supported_extensions():
    source = _read(
        APP_ROOT / "gov_erp" / "doctype" / "ge_project_document" / "ge_project_document.py"
    )
    for expected in [
        "ALLOWED_DMS_EXTENSIONS",
        '"pdf"',
        '"docx"',
        '"xlsx"',
        '"jpeg"',
        "def _validate_supported_extension",
        "Unsupported file type",
        "ALLOWED_DMS_CATEGORIES",
        "Linked site does not belong to the selected project",
        "Selected folder belongs to a different project",
        "Uploaded file reference does not exist",
    ]:
        assert expected in source


def test_documents_upload_route_validates_metadata_and_file_constraints():
    pytest.skip("frontend-scope: tracked in frontend test suite")


def test_documents_ui_uses_real_file_upload_and_preview():
    pytest.skip("frontend-scope: tracked in frontend test suite")


def test_dms_api_hardening_rules_exist():
    source = _read(APP_ROOT / "api.py")
    for expected in [
        "Cannot delete a folder that still contains project documents",
        "cannot be edited directly on an existing document",
        'def _is_temp_upload_file_referenced(file_url):',
        '("GE Test Report", "file")',
        '("GE Employee Document", "file")',
        '("GE Commercial Document", "file_url")',
        'You can only clean up files that you uploaded',
        'file_doc.attached_to_doctype or file_doc.attached_to_name or file_doc.attached_to_field',
        'File is already linked from a business record and cannot be cleaned up',
        'file_age_seconds > 3600',
        "from gov_erp.dms_api import _is_temp_upload_file_referenced",
        "if not _is_temp_upload_file_referenced(file_url):",
        'frappe.delete_doc("File", file_name, ignore_permissions=True)',
    ]:
        assert expected in source
