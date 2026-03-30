import frappe
from frappe.model.document import Document


class GEProjectStaffingRequirement(Document):
    def before_save(self):
        self._compute_fulfillment()

    def _compute_fulfillment(self):
        """Count active assignments matching this requirement's project + position."""
        if not self.linked_project or not self.position:
            return
        filters = {
            "linked_project": self.linked_project,
            "position": self.position,
            "is_active": 1,
        }
        count = frappe.db.count("GE Project Staffing Assignment", filters)
        self.fulfilled_count = count
        self.fulfillment_pct = (
            round((count / self.required_count) * 100, 1)
            if self.required_count
            else 0
        )
