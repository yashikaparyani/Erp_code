import frappe
from frappe.model.document import Document
from frappe.utils import flt


class GEPOExtension(Document):
	def validate(self):
		self._recalculate_totals()

	def _recalculate_totals(self):
		"""Recalculate amount on each term and total percentage."""
		po_total = flt(
			frappe.db.get_value("Purchase Order", self.purchase_order, "grand_total")
		) if self.purchase_order else 0

		total_pct = 0
		for term in self.payment_terms or []:
			term.amount = flt(term.percentage or 0) / 100 * po_total
			total_pct += flt(term.percentage or 0)
		self.total_payment_terms_pct = total_pct
