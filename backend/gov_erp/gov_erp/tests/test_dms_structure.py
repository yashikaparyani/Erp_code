"""Source-level checks for the DMS upload flow."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
APP_ROOT = ROOT / "backend" / "gov_erp" / "gov_erp"


def _read(path: Path) -> str:
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
    source = _read(ROOT / "erp_frontend" / "src" / "app" / "api" / "documents" / "upload" / "route.ts")
    for expected in [
        "ALLOWED_EXTENSIONS",
        "MAX_FILE_SIZE_BYTES",
        "Linked project is required",
        "Category is required",
        "Unsupported file type",
        "Max allowed size is 20 MB",
        "delete_uploaded_project_file",
    ]:
        assert expected in source
    assert "uploadBody.append('doctype'" not in source
    assert "uploadBody.append('fieldname'" not in source


def test_documents_ui_uses_real_file_upload_and_preview():
    documents_page = _read(ROOT / "erp_frontend" / "src" / "app" / "documents" / "page.tsx")
    workspace_shell = _read(ROOT / "erp_frontend" / "src" / "components" / "project-workspace" / "WorkspaceShell.tsx")

    for source in [documents_page, workspace_shell]:
        assert 'type="file"' in source
        assert ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg" in source
        assert "Preview" in source
        assert "<iframe" in source
        assert "<img" in source

    assert "Select category" in documents_page


def test_dms_api_hardening_rules_exist():
    source = _read(APP_ROOT / "api.py")
    for expected in [
        "Cannot delete a folder that still contains project documents",
        "cannot be edited directly on an existing document",
        'not frappe.db.exists("GE Project Document", {"file": file_url})',
        'frappe.delete_doc("File", file_name, ignore_permissions=True)',
    ]:
        assert expected in source
