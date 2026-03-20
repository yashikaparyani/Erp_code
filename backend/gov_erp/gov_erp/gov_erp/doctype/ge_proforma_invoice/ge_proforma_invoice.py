from frappe.model.document import Document


class GEProformaInvoice(Document):
	def before_save(self):
		base_amount = 0
		for item in self.items or []:
			item.amount = (item.qty or 0) * (item.rate or 0)
			base_amount += item.amount or 0

		self.subtotal = base_amount
		self.gst_amount = base_amount * (self.gst_percent or 0) / 100
		self.tds_amount = base_amount * (self.tds_percent or 0) / 100
		self.retention_amount = base_amount * (self.retention_percent or 0) / 100
		self.net_amount = self.subtotal + self.gst_amount - self.tds_amount - self.retention_amount

