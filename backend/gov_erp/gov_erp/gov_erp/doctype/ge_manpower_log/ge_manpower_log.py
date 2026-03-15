import frappe
from frappe.model.document import Document


class GEManpowerLog(Document):
	def before_save(self):
		man_days = self.man_days or 0.0
		daily_rate = self.daily_rate or 0.0
		self.total_cost = man_days * daily_rate

		overtime_hours = self.overtime_hours or 0.0
		overtime_rate = self.overtime_rate or 0.0
		self.overtime_cost = overtime_hours * overtime_rate
