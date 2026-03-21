import frappe
from frappe.model.document import Document


ALLOWED_DMS_EXTENSIONS = {"pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg"}
ALLOWED_DMS_CATEGORIES = {"Survey", "Engineering", "Procurement", "Execution", "O&M", "Finance", "HR", "Other"}


def _get_file_extension(file_url):
	file_url = (file_url or "").split("?", 1)[0].strip().lower()
	if "." not in file_url:
		return ""
	return file_url.rsplit(".", 1)[1]


def _get_latest_version(document_name, linked_project, linked_site=None):
	return (
		frappe.db.sql(
			"""
			select coalesce(max(version), 0)
			from `tabGE Project Document`
			where document_name = %s
			  and linked_project = %s
			  and coalesce(linked_site, '') = %s
			""",
			(document_name, linked_project, linked_site or ""),
		)[0][0]
		or 0
	)


class GEProjectDocument(Document):
	def validate(self):
		self._validate_required_fields()
		self._validate_linked_project()
		self._validate_category()
		self._validate_file_reference()
		self._validate_linked_site_scope()
		self._validate_folder_scope()
		self._validate_supported_extension()

	def before_insert(self):
		if not self.uploaded_by:
			self.uploaded_by = frappe.session.user
		if not self.uploaded_on:
			self.uploaded_on = frappe.utils.now_datetime()
		# Auto-increment version for the same logical document within the same
		# project/site context so similarly named docs across sites do not collide.
		if not self.version:
			self.version = int(_get_latest_version(self.document_name, self.linked_project, self.linked_site)) + 1

	def _validate_supported_extension(self):
		ext = _get_file_extension(self.file)
		if ext not in ALLOWED_DMS_EXTENSIONS:
			allowed = ", ".join(sorted(ALLOWED_DMS_EXTENSIONS))
			frappe.throw(f"Unsupported file type. Allowed: {allowed}")

	def _validate_required_fields(self):
		if not self.document_name:
			frappe.throw("Document name is required")
		if not self.linked_project:
			frappe.throw("Linked project is required")
		if not self.category:
			frappe.throw("Category is required")
		if not self.file:
			frappe.throw("File is required")

	def _validate_linked_project(self):
		if self.linked_project and not frappe.db.exists("Project", self.linked_project):
			frappe.throw(f"Linked project {self.linked_project} does not exist")

	def _validate_category(self):
		if self.category not in ALLOWED_DMS_CATEGORIES:
			allowed = ", ".join(sorted(ALLOWED_DMS_CATEGORIES))
			frappe.throw(f"Category must be one of: {allowed}")

	def _validate_file_reference(self):
		if self.file and not frappe.db.exists("File", {"file_url": self.file}):
			frappe.throw("Uploaded file reference does not exist")

	def _validate_linked_site_scope(self):
		if not self.linked_site:
			return
		if not frappe.db.exists("GE Site", self.linked_site):
			frappe.throw(f"Linked site {self.linked_site} does not exist")
		site_project = frappe.db.get_value("GE Site", self.linked_site, "linked_project")
		if site_project and site_project != self.linked_project:
			frappe.throw("Linked site does not belong to the selected project")

	def _validate_folder_scope(self):
		if not self.folder:
			return
		if not frappe.db.exists("GE Document Folder", self.folder):
			frappe.throw(f"Folder {self.folder} does not exist")
		folder_project = frappe.db.get_value("GE Document Folder", self.folder, "linked_project")
		if folder_project and folder_project != self.linked_project:
			frappe.throw("Selected folder belongs to a different project")
