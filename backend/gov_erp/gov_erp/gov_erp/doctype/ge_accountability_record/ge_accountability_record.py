# Copyright (c) 2026, Technosys and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class GEAccountabilityRecord(Document):
    """
    GE Accountability Record — live ownership snapshot for any tracked business object.

    One record exists per (subject_doctype, subject_name) pair.
    All history is in GE Accountability Event — this record holds current state only.
    """

    def validate(self):
        self._enforce_unique_subject()

    def _enforce_unique_subject(self):
        """Ensure only one record exists per subject_doctype + subject_name."""
        if self.is_new():
            existing = frappe.db.get_value(
                "GE Accountability Record",
                {
                    "subject_doctype": self.subject_doctype,
                    "subject_name": self.subject_name,
                },
                "name",
            )
            if existing and existing != self.name:
                frappe.throw(
                    f"An accountability record already exists for "
                    f"{self.subject_doctype}: {self.subject_name} ({existing})",
                    frappe.DuplicateEntryError,
                )

    def before_save(self):
        """Enforce blocker_reason is present when is_blocked is set."""
        if self.is_blocked and not (self.blocking_reason or "").strip():
            frappe.throw("A blocking reason is required when marking a record as blocked.")
