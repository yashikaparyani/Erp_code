import frappe
from frappe.model.document import Document


class GEInvoice(Document):
	def before_save(self):
		self.calculate_totals()

	def calculate_totals(self):
		"""Auto-calculate amount, GST, TDS, and net receivable from line items."""
		base_amount = 0
		for item in self.items:
			item.amount = (item.qty or 0) * (item.rate or 0)
			base_amount += item.amount
		self.amount = base_amount
		self.gst_amount = base_amount * (self.gst_percent or 0) / 100
		self.tds_amount = base_amount * (self.tds_percent or 0) / 100
		self.net_receivable = self.amount + self.gst_amount - self.tds_amount


def calculate_invoice_totals(items, gst_percent=0, tds_percent=0):
	"""Pure function for testing invoice calculations."""
	base = sum((i.get("qty", 0) * i.get("rate", 0)) for i in items)
	gst = base * gst_percent / 100
	tds = base * tds_percent / 100
	return {"amount": base, "gst_amount": gst, "tds_amount": tds, "net_receivable": base + gst - tds}
