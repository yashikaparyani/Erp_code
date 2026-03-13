import frappe
from frappe.model.document import Document
from frappe.utils import getdate


def validate_statutory_period(period_start, period_end):
	if not period_start or not period_end:
		return
	if getdate(period_end) < getdate(period_start):
		raise ValueError("Period End cannot be before Period Start")


def validate_contribution_amount(amount, label):
	if amount in (None, ""):
		return
	if float(amount) < 0:
		raise ValueError(f"{label} cannot be negative")


class GEStatutoryLedger(Document):
	def validate(self):
		try:
			validate_statutory_period(self.period_start, self.period_end)
			validate_contribution_amount(self.employer_contribution, "Employer contribution")
			validate_contribution_amount(self.employee_contribution, "Employee contribution")
		except ValueError as exc:
			frappe.throw(str(exc))

