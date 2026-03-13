import frappe
from frappe.model.document import Document


def validate_coordinates(latitude, longitude):
	if latitude is not None and not (-90 <= float(latitude) <= 90):
		raise ValueError("Latitude must be between -90 and 90")
	if longitude is not None and not (-180 <= float(longitude) <= 180):
		raise ValueError("Longitude must be between -180 and 180")


class GESite(Document):
	def validate(self):
		try:
			validate_coordinates(self.latitude, self.longitude)
		except ValueError as exc:
			frappe.throw(str(exc))
