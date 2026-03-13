import frappe
from frappe.model.document import Document


VALID_TRANSITIONS = {
	"PENDING": ["APPROVED", "REJECTED"],
	"APPROVED": ["IN_TRANSIT"],
	"IN_TRANSIT": ["RECEIVED_AT_SERVICE_CENTER"],
	"RECEIVED_AT_SERVICE_CENTER": ["UNDER_REPAIR"],
	"UNDER_REPAIR": ["REPAIRED", "REPLACED"],
}


class GERMATracker(Document):
	pass
