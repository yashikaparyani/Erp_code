import frappe
from frappe.model.document import Document


class GEDeviceUptimeLog(Document):
	def before_save(self):
		uptime = self.uptime_hours or 0.0
		downtime = self.downtime_hours or 0.0
		total = uptime + downtime

		if total > 0:
			self.actual_uptime_pct = round((uptime / total) * 100, 2)
		else:
			self.actual_uptime_pct = None

		target = self.sla_target_uptime_pct
		if self.actual_uptime_pct is not None and target:
			self.sla_status = "Compliant" if self.actual_uptime_pct >= target else "Non-Compliant"
		else:
			self.sla_status = "Pending"
