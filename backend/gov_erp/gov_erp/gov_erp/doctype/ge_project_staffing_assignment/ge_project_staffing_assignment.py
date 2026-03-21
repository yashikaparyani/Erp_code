import frappe
from frappe.model.document import Document
from frappe.utils import date_diff, today


class GEProjectStaffingAssignment(Document):
    def before_save(self):
        self._compute_total_days()
        self._auto_deactivate_on_leave()

    def _compute_total_days(self):
        if self.join_date:
            end = self.leave_date or today()
            diff = date_diff(end, self.join_date)
            self.total_days_on_project = max(diff, 0)
        else:
            self.total_days_on_project = 0

    def _auto_deactivate_on_leave(self):
        if self.leave_date and str(self.leave_date) <= today():
            self.is_active = 0
