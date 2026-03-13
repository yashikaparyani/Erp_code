import frappe
from frappe.model.document import Document


class GEDependencyOverride(Document):
	def before_insert(self):
		if not self.requested_by:
			self.requested_by = frappe.session.user

	def validate(self):
		if self.status in {"APPROVED", "REJECTED"} and not self.reason:
			frappe.throw("Reason is required when approving or rejecting a dependency override")
		if self.status == "APPROVED" and not self.approved_by:
			frappe.throw("Approved By is required when approving a dependency override")

	def on_update(self):
		if self.has_value_changed("status") and self.status in {"APPROVED", "REJECTED"}:
			if self.status == "APPROVED" and not self.approved_by:
				self.approved_by = frappe.session.user
			self.actioned_at = frappe.utils.now()
			frappe.db.set_value(
				"GE Dependency Override",
				self.name,
				{"approved_by": self.approved_by, "actioned_at": self.actioned_at},
				update_modified=False,
			)
