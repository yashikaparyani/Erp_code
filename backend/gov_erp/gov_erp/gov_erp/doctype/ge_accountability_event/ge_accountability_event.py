# Copyright (c) 2026, Technosys and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class GEAccountabilityEvent(Document):
    """
    GE Accountability Event — immutable append-only audit row.

    Rules:
    - Once inserted, no field may be updated.
    - The record may not be deleted except by System Manager (emergency only).
    - Reason is enforced by the accountability helper before insert.
    """

    def before_save(self):
        """Block any update after initial creation."""
        if not self.is_new():
            frappe.throw(
                "Accountability events are immutable. No updates are permitted.",
                frappe.PermissionError,
            )

    def before_delete(self):
        """Only System Manager may delete an accountability event (for data-fix emergency use only)."""
        if "System Manager" not in frappe.get_roles(frappe.session.user):
            frappe.throw(
                "Accountability events cannot be deleted. Contact the system administrator.",
                frappe.PermissionError,
            )
