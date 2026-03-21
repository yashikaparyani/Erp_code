import frappe
from frappe.model.document import Document


class GEPaymentReceipt(Document):
	def validate(self):
		self._validate_amount_against_invoice()

	def on_update(self):
		self._refresh_invoice_totals()

	def on_trash(self):
		self._refresh_invoice_totals()

	def _validate_amount_against_invoice(self):
		if not self.linked_invoice or not self.amount_received:
			return

		invoice = frappe.get_doc("GE Invoice", self.linked_invoice)
		prior_paid = frappe.db.sql(
			"""SELECT COALESCE(SUM(amount_received), 0) as total
			   FROM `tabGE Payment Receipt`
			   WHERE linked_invoice = %s AND name != %s""",
			(self.linked_invoice, self.name or ""),
			as_dict=True,
		)
		already_paid = prior_paid[0].total if prior_paid else 0
		remaining = (invoice.net_receivable or 0) - already_paid

		if self.amount_received > remaining:
			frappe.throw(
				f"Payment of {self.amount_received} exceeds outstanding amount of {remaining} "
				f"for invoice {self.linked_invoice}"
			)

	def _refresh_invoice_totals(self):
		if not self.linked_invoice:
			return
		try:
			invoice = frappe.get_doc("GE Invoice", self.linked_invoice)
			invoice.sync_payment_totals()
			invoice.db_update()
		except frappe.DoesNotExistError:
			pass
