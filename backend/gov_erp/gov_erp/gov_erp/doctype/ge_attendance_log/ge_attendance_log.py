import frappe
from frappe.model.document import Document
from frappe.utils import get_datetime


def validate_attendance_time_window(check_in_time, check_out_time):
	if not check_in_time or not check_out_time:
		return
	if get_datetime(check_out_time) < get_datetime(check_in_time):
		raise ValueError("Check Out Time must be after or equal to Check In Time")


class GEAttendanceLog(Document):
	def validate(self):
		self._validate_unique_employee_date()
		try:
			validate_attendance_time_window(self.check_in_time, self.check_out_time)
		except ValueError as exc:
			frappe.throw(str(exc))

	def _validate_unique_employee_date(self):
		if not self.employee or not self.attendance_date:
			return
		existing = frappe.db.get_value(
			"GE Attendance Log",
			{"employee": self.employee, "attendance_date": self.attendance_date},
			"name",
		)
		if existing and existing != self.name:
			frappe.throw("Attendance log already exists for this employee on the selected date")

