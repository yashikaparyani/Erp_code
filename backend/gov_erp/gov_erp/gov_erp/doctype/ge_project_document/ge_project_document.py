import frappe
from frappe.model.document import Document


ALLOWED_DMS_EXTENSIONS = {"pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"}
ALLOWED_DMS_CATEGORIES = {
	"Survey", "Engineering", "Procurement", "Execution", "Commissioning",
	"O&M", "Finance", "HR", "Dispatch", "GRN_Inventory", "SLA", "RMA",
	"Commercial", "Approvals", "Other",
}
ALLOWED_DMS_STAGES = {
	"", "Survey", "BOM_BOQ", "Drawing", "Indent", "Quotation_Vendor_Comparison",
	"PO", "Dispatch", "GRN_Inventory", "Execution", "Commissioning",
	"O_M", "SLA", "RMA", "Commercial", "Closure",
}
ALLOWED_DMS_SUBCATEGORIES = {
	"", "survey_form", "site_photos", "measurements", "coordinates", "survey_notes",
	"bom_draft", "boq_draft", "boq_approved", "calculation_sheet",
	"site_drawing", "layout_drawing", "issued_for_review", "issued_for_execution", "revised_drawing",
	"indent_support", "item_requirement",
	"vendor_quotation", "comparison_sheet", "purchase_order", "approval_note",
	"dispatch_challan", "lr_proof", "packing_list",
	"grn", "receipt_proof",
	"dpr", "installation_checklist", "test_report",
	"commissioning_report", "signoff",
	"sla_profile", "maintenance_report",
	"rma_proof", "other",
}
ALLOWED_DMS_STATUSES = {
	"Draft",
	"Submitted",
	"Assigned",
	"Accepted",
	"In Review",
	"Blocked",
	"Escalated",
	"Approved",
	"Rejected",
	"Closed",
}


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
		self._validate_status()
		self._validate_file_reference()
		self._validate_linked_site_scope()
		self._validate_folder_scope()
		self._validate_supported_extension()
		self._validate_linked_stage()
		self._validate_subcategory()
		self._validate_supersedes_scope()
		self._validate_date_range()
		self._apply_workflow_defaults()

	def before_insert(self):
		if not self.uploaded_by:
			self.uploaded_by = frappe.session.user
		if not self.uploaded_on:
			self.uploaded_on = frappe.utils.now_datetime()
		if not self.submitted_by:
			self.submitted_by = frappe.session.user
		if not self.submitted_on:
			self.submitted_on = frappe.utils.now_datetime()
		if not self.status:
			self.status = "Submitted"
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

	def _validate_status(self):
		if not self.status:
			self.status = "Submitted"
		if self.status not in ALLOWED_DMS_STATUSES:
			allowed = ", ".join(sorted(ALLOWED_DMS_STATUSES))
			frappe.throw(f"Status must be one of: {allowed}")
		if self.status == "Blocked" and not self.blocker_reason:
			frappe.throw("Blocker reason is required when status is Blocked")
		if self.status == "Closed" and not self.closure_note:
			frappe.throw("Closure note is required when status is Closed")

	def _apply_workflow_defaults(self):
		if self.status in {"Approved", "Rejected"} and not self.approved_rejected_by:
			self.approved_rejected_by = frappe.session.user
		if self.status == "Approved" and not self.approved_by:
			self.approved_by = frappe.session.user
		if self.status == "In Review" and not self.reviewed_by:
			self.reviewed_by = frappe.session.user

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

	def _validate_linked_stage(self):
		stage = self.linked_stage or ""
		if stage and stage not in ALLOWED_DMS_STAGES:
			allowed = ", ".join(sorted(s for s in ALLOWED_DMS_STAGES if s))
			frappe.throw(f"Linked stage must be one of: {allowed}")

	def _validate_subcategory(self):
		sub = self.document_subcategory or ""
		if sub and sub not in ALLOWED_DMS_SUBCATEGORIES:
			allowed = ", ".join(sorted(s for s in ALLOWED_DMS_SUBCATEGORIES if s))
			frappe.throw(f"Document subcategory must be one of: {allowed}")

	def _validate_supersedes_scope(self):
		if not self.supersedes_document:
			return
		if not frappe.db.exists("GE Project Document", self.supersedes_document):
			frappe.throw("Superseded document does not exist")
		sup = frappe.db.get_value(
			"GE Project Document", self.supersedes_document,
			["document_name", "linked_project"], as_dict=True,
		)
		if sup and sup.linked_project != self.linked_project:
			frappe.throw("Superseded document must belong to the same project")

	def _validate_date_range(self):
		if self.valid_from and self.valid_till:
			if frappe.utils.getdate(self.valid_from) > frappe.utils.getdate(self.valid_till):
				frappe.throw("Valid From date cannot be after Valid Till date")
