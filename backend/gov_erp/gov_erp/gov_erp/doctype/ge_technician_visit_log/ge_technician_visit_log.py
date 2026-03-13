import frappe
from frappe.model.document import Document
from frappe.utils import get_datetime


def validate_visit_time_window(check_in_time, check_out_time):
	if not check_in_time or not check_out_time:
		return
	if get_datetime(check_out_time) < get_datetime(check_in_time):
		raise ValueError("Visit check out time must be after or equal to check in time")


class GETechnicianVisitLog(Document):
	def validate(self):
		try:
			validate_visit_time_window(self.check_in_time, self.check_out_time)
		except ValueError as exc:
			frappe.throw(str(exc))

