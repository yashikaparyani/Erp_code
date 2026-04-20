import frappe
from frappe.model.document import Document


VALID_STATUS_TRANSITIONS = {
	"DRAFT": {"PENDING_APPROVAL"},
	"PENDING_APPROVAL": {"APPROVED", "REJECTED", "DRAFT"},
	"REJECTED": {"DRAFT"},
	"APPROVED": {"DISPATCHED", "CANCELLED"},
	"DISPATCHED": set(),
	"CANCELLED": set(),
}


def calculate_dispatch_totals(items):
	total_qty = 0
	for item in items:
		total_qty += getattr(item, "qty", 0) or 0
	return {"total_items": len(items), "total_qty": total_qty}


def parse_serial_numbers(serial_numbers):
	if not serial_numbers:
		return []

	tokens = []
	for chunk in str(serial_numbers).replace("\r", "\n").replace(",", "\n").split("\n"):
		value = chunk.strip()
		if value:
			tokens.append(value)
	return tokens


def validate_dispatch_status_transition(old_status, new_status):
	if not old_status or old_status == new_status:
		return

	allowed = VALID_STATUS_TRANSITIONS.get(old_status, set())
	if new_status not in allowed:
		raise ValueError(f"Cannot change Dispatch Challan status from {old_status} to {new_status}")


def group_requested_qty_by_item(items):
	grouped = {}
	for item in items:
		item_code = getattr(item, "item_link", None)
		qty = getattr(item, "qty", 0) or 0
		if not item_code:
			continue
		grouped[item_code] = grouped.get(item_code, 0) + qty
	return grouped


def validate_dispatch_availability(requested_by_item, available_by_item):
	for item_code, requested_qty in requested_by_item.items():
		available_qty = available_by_item.get(item_code, 0)
		if requested_qty > available_qty:
			raise ValueError(
				f"Insufficient stock for item {item_code}. "
				f"Requested {requested_qty}, available {available_qty}"
			)


def get_dispatch_stock_entry_purpose(dispatch_type):
	if dispatch_type == "WAREHOUSE_TO_WAREHOUSE":
		return "Material Transfer"
	if dispatch_type == "WAREHOUSE_TO_SITE":
		return "Material Issue"
	return None


def validate_serial_number_bundle(item_code, qty, serial_numbers, serial_details, expected_warehouse):
	serials = parse_serial_numbers(serial_numbers)
	if len(serials) != int(qty or 0):
		raise ValueError(
			f"Serialized item {item_code} requires exactly {int(qty or 0)} serial number(s), "
			f"but received {len(serials)}"
		)

	if len(serials) != len(set(serials)):
		raise ValueError(f"Duplicate serial numbers found for item {item_code}")

	for serial in serials:
		details = serial_details.get(serial)
		if not details:
			raise ValueError(f"Serial number {serial} was not found for item {item_code}")
		if details.get("item_code") != item_code:
			raise ValueError(f"Serial number {serial} does not belong to item {item_code}")
		if expected_warehouse and details.get("warehouse") != expected_warehouse:
			raise ValueError(
				f"Serial number {serial} is in warehouse {details.get('warehouse') or 'N/A'}, "
				f"expected {expected_warehouse}"
			)


def build_stock_entry_payload(dispatch_doc, company, stock_entry_type, purpose):
	items = []
	for row in dispatch_doc.items:
		item_row = {
			"item_code": row.item_link,
			"qty": row.qty,
			"uom": row.uom or None,
			"s_warehouse": dispatch_doc.from_warehouse or None,
			"t_warehouse": dispatch_doc.to_warehouse or None,
			"description": row.description,
			"serial_no": "\n".join(parse_serial_numbers(getattr(row, "serial_numbers", None))) or None,
			"project": dispatch_doc.linked_project or None,
		}
		if purpose == "Material Issue":
			item_row["t_warehouse"] = None
		items.append(item_row)

	return {
		"doctype": "Stock Entry",
		"stock_entry_type": stock_entry_type,
		"company": company,
		"posting_date": dispatch_doc.dispatch_date,
		"project": dispatch_doc.linked_project or None,
		"remarks": (
			f"Created from Dispatch Challan {dispatch_doc.name}"
			f"{' for site ' + dispatch_doc.target_site_name if dispatch_doc.target_site_name else ''}"
		),
		"items": items,
	}


class GEDispatchChallan(Document):
	def before_insert(self):
		if not self.created_by_user:
			self.created_by_user = frappe.session.user

	def validate(self):
		self._calculate_totals()
		self._validate_status_transition()
		self._validate_destinations()
		self._validate_against_purchase_order()

	def before_save(self):
		if self.has_value_changed("status") and self.status == "DISPATCHED":
			self._validate_serial_numbers()
			self._enforce_stock_availability()

	def _calculate_totals(self):
		totals = calculate_dispatch_totals(self.items)
		self.total_items = totals["total_items"]
		self.total_qty = totals["total_qty"]

	def _validate_status_transition(self):
		if not self.has_value_changed("status"):
			return

		old_status = self.get_doc_before_save()
		if not old_status:
			return

		try:
			validate_dispatch_status_transition(old_status.status, self.status)
		except ValueError as exc:
			frappe.throw(str(exc))

	def _validate_destinations(self):
		if self.dispatch_type == "WAREHOUSE_TO_WAREHOUSE":
			if not self.from_warehouse or not self.to_warehouse:
				frappe.throw("Warehouse-to-warehouse dispatch requires both From Warehouse and To Warehouse")
		elif self.dispatch_type == "WAREHOUSE_TO_SITE":
			if not self.from_warehouse:
				frappe.throw("Warehouse-to-site dispatch requires From Warehouse")
			if not self.target_site_name:
				frappe.throw("Warehouse-to-site dispatch requires Target Site Name")
		elif self.dispatch_type == "VENDOR_TO_SITE":
			if not self.target_site_name:
				frappe.throw("Vendor-to-site dispatch requires Target Site Name")

		if self.to_warehouse and self.from_warehouse and self.to_warehouse == self.from_warehouse:
			frappe.throw("From Warehouse and To Warehouse cannot be the same")

	def _enforce_stock_availability(self):
		if self.dispatch_type == "VENDOR_TO_SITE":
			return

		if not self.from_warehouse:
			frappe.throw("From Warehouse is required before marking a dispatch challan as DISPATCHED")

		requested_by_item = group_requested_qty_by_item(self.items)
		available_by_item = {}
		for item_code in requested_by_item:
			available_by_item[item_code] = (
				frappe.db.get_value(
					"Bin",
					{"item_code": item_code, "warehouse": self.from_warehouse},
					"actual_qty",
				)
				or 0
			)

		try:
			validate_dispatch_availability(requested_by_item, available_by_item)
		except ValueError as exc:
			frappe.throw(str(exc))

	def _validate_serial_numbers(self):
		if self.dispatch_type == "VENDOR_TO_SITE" and not self.from_warehouse:
			expected_warehouse = None
		else:
			expected_warehouse = self.from_warehouse

		for item in self.items:
			if not item.item_link:
				continue

			has_serial_no = frappe.db.get_value("Item", item.item_link, "has_serial_no")
			if not has_serial_no:
				continue

			serials = parse_serial_numbers(getattr(item, "serial_numbers", None))
			serial_details = {}
			if serials:
				for row in frappe.get_all(
					"Serial No",
					filters={"name": ["in", serials]},
					fields=["name", "item_code", "warehouse"],
				):
					serial_details[row.name] = {"item_code": row.item_code, "warehouse": row.warehouse}

			try:
				validate_serial_number_bundle(
					item.item_link,
					item.qty,
					item.serial_numbers,
					serial_details,
					expected_warehouse,
				)
			except ValueError as exc:
				frappe.throw(str(exc))

	def _create_linked_stock_entry(self):
		if self.linked_stock_entry:
			return

		purpose = get_dispatch_stock_entry_purpose(self.dispatch_type)
		if not purpose:
			return

		stock_entry_type = frappe.db.get_value("Stock Entry Type", {"purpose": purpose}, "name")
		if not stock_entry_type:
			frappe.throw(f"No Stock Entry Type found for purpose {purpose}")

		company = frappe.db.get_value("Warehouse", self.from_warehouse, "company")
		if not company:
			frappe.throw("Unable to determine Company from From Warehouse")

		payload = build_stock_entry_payload(self, company, stock_entry_type, purpose)
		stock_entry = frappe.get_doc(payload)
		stock_entry.insert()
		stock_entry.submit()
		self.linked_stock_entry = stock_entry.name
		frappe.db.set_value(
			"GE Dispatch Challan",
			self.name,
			{"linked_stock_entry": stock_entry.name},
			update_modified=False,
		)

	def on_update(self):
		if self.has_value_changed("status") and self.status == "APPROVED":
			self.approved_at = frappe.utils.now()
			self.approved_by = frappe.session.user
			frappe.db.set_value(
				"GE Dispatch Challan",
				self.name,
				{"approved_at": self.approved_at, "approved_by": self.approved_by},
				update_modified=False,
			)
		if self.has_value_changed("status") and self.status == "DISPATCHED":
			self._create_linked_stock_entry()

	def _validate_against_purchase_order(self):
		if not self.linked_purchase_order:
			return

		po = frappe.get_doc("Purchase Order", self.linked_purchase_order, ignore_permissions=True)
		po_items = {}
		for item in po.items:
			po_items[item.item_code] = po_items.get(item.item_code, 0) + (item.qty or 0)

		for item in self.items:
			if not item.item_link:
				continue
			if item.item_link not in po_items:
				frappe.throw(
					f"Item {item.item_link} is not in linked Purchase Order {self.linked_purchase_order}"
				)
			if (item.qty or 0) > po_items[item.item_link]:
				frappe.throw(
					f"Dispatch qty ({item.qty}) for {item.item_link} exceeds PO qty ({po_items[item.item_link]})"
				)
