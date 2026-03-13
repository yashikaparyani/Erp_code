import frappe
from frappe.model.document import Document


VALID_STATUS_TRANSITIONS = {
	"DRAFT": {"PENDING_APPROVAL"},
	"PENDING_APPROVAL": {"APPROVED", "REJECTED", "DRAFT"},
	"REJECTED": {"DRAFT"},
	"APPROVED": set(),
}


def calculate_cost_amount(qty, base_rate):
	return (qty or 0) * (base_rate or 0)


def calculate_cost_sheet_totals(items, margin_percent):
	base_cost = 0
	for item in items:
		base_cost += calculate_cost_amount(getattr(item, "qty", 0), getattr(item, "base_rate", 0))

	sell_value = base_cost + (base_cost * ((margin_percent or 0) / 100))
	return {
		"base_cost": base_cost,
		"sell_value": sell_value,
		"total_items": len(items),
	}


def validate_cost_status_transition(old_status, new_status):
	if not old_status or old_status == new_status:
		return

	allowed = VALID_STATUS_TRANSITIONS.get(old_status, set())
	if new_status not in allowed:
		raise ValueError(f"Cannot change Cost Sheet status from {old_status} to {new_status}")


def map_boq_items_to_cost_sheet_items(boq_items):
	"""Map GE BOQ Item rows to GE Cost Sheet Item dicts (pure, no DB access)."""
	result = []
	for item in boq_items:
		result.append({
			"site_name": getattr(item, "site_name", None) or "",
			"item_link": getattr(item, "item_link", None) or "",
			"description": getattr(item, "description", "") or "",
			"cost_type": "Material",
			"qty": getattr(item, "qty", 0) or 0,
			"unit": getattr(item, "unit", "Nos") or "Nos",
			"base_rate": getattr(item, "rate", 0) or 0,
		})
	return result


class GECostSheet(Document):
	def before_insert(self):
		if not self.created_by_user:
			self.created_by_user = frappe.session.user

	def validate(self):
		self._calculate_totals()
		self._validate_status_transition()

	def _calculate_totals(self):
		for item in self.items:
			item.base_amount = calculate_cost_amount(item.qty, item.base_rate)

		totals = calculate_cost_sheet_totals(self.items, self.margin_percent)
		self.base_cost = totals["base_cost"]
		self.sell_value = totals["sell_value"]
		self.total_items = totals["total_items"]

	def _validate_status_transition(self):
		if not self.has_value_changed("status"):
			return

		old_status = self.get_doc_before_save()
		if not old_status:
			return

		try:
			validate_cost_status_transition(old_status.status, self.status)
		except ValueError as exc:
			frappe.throw(str(exc))

	def on_update(self):
		if self.has_value_changed("status") and self.status == "APPROVED":
			self.approved_at = frappe.utils.now()
			self.approved_by = frappe.session.user
			frappe.db.set_value(
				"GE Cost Sheet",
				self.name,
				{"approved_at": self.approved_at, "approved_by": self.approved_by},
				update_modified=False,
			)
