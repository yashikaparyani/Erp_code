# Copyright (c) 2026, Technosys and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


def _is_alert_admin(user: str | None = None) -> bool:
    user = user or frappe.session.user
    return "System Manager" in frappe.get_roles(user)


class GEAlert(Document):
    """
    GE Alert - System-generated alerts/notifications.

    Alerts are:
    - system-generated
    - event-driven
    - filtered by RBAC before delivery
    - tied to project/site/stage context
    """

    def before_insert(self):
        """Set actor_name from actor if not provided."""
        if self.actor and not self.actor_name:
            self.actor_name = frappe.db.get_value("User", self.actor, "full_name") or self.actor

    def mark_as_read(self):
        """Mark this alert as read."""
        if not self.is_read:
            self.is_read = 1
            self.read_at = frappe.utils.now_datetime()
            self.save(ignore_permissions=True)


def create_alert(
    event_type: str,
    recipient_user: str,
    summary: str,
    *,
    actor: str = None,
    linked_project: str = None,
    linked_site: str = None,
    linked_stage: str = None,
    linked_department: str = None,
    reference_doctype: str = None,
    reference_name: str = None,
    detail: str = None,
    route_path: str = None,
) -> str:
    """
    Create a new alert for a user.

    Args:
        event_type: Type of event (must match DocType select options)
        recipient_user: User who should receive this alert
        summary: Short summary text
        actor: User who triggered this event (defaults to session user)
        linked_project: Related project name
        linked_site: Related site name
        linked_stage: Related stage/phase
        linked_department: Related department
        reference_doctype: DocType of related document
        reference_name: Name of related document
        detail: Longer detail text
        route_path: Frontend route for deep-linking

    Returns:
        Name of created alert document
    """
    doc = frappe.get_doc({
        "doctype": "GE Alert",
        "event_type": event_type,
        "actor": actor or frappe.session.user,
        "recipient_user": recipient_user,
        "summary": summary,
        "linked_project": linked_project,
        "linked_site": linked_site,
        "linked_stage": linked_stage,
        "linked_department": linked_department,
        "reference_doctype": reference_doctype,
        "reference_name": reference_name,
        "detail": detail,
        "route_path": route_path,
    })
    doc.insert(ignore_permissions=True)
    return doc.name


def get_user_alerts(
    user: str = None,
    unread_only: bool = False,
    limit: int = 50,
    project: str = None,
) -> list:
    """
    Get alerts for a user.

    Args:
        user: User to get alerts for (defaults to session user)
        unread_only: Only return unread alerts
        limit: Maximum number of alerts to return
        project: Filter by project

    Returns:
        List of alert dicts
    """
    user = user or frappe.session.user
    if user != frappe.session.user and not _is_alert_admin():
        frappe.throw("You can only view your own alerts", frappe.PermissionError)

    filters = {"recipient_user": user}
    if unread_only:
        filters["is_read"] = 0
    if project:
        filters["linked_project"] = project

    return frappe.get_all(
        "GE Alert",
        filters=filters,
        fields=[
            "name",
            "event_type",
            "actor",
            "actor_name",
            "summary",
            "detail",
            "linked_project",
            "linked_site",
            "linked_stage",
            "linked_department",
            "reference_doctype",
            "reference_name",
            "route_path",
            "is_read",
            "read_at",
            "creation",
        ],
        order_by="creation desc",
        limit_page_length=limit,
    )


def get_unread_count(user: str = None) -> int:
    """Get count of unread alerts for a user."""
    user = user or frappe.session.user
    if user != frappe.session.user and not _is_alert_admin():
        frappe.throw("You can only view your own alerts", frappe.PermissionError)
    return frappe.db.count("GE Alert", {"recipient_user": user, "is_read": 0})


def mark_alert_read(alert_name: str):
    """Mark a single alert as read."""
    doc = frappe.get_doc("GE Alert", alert_name)
    if doc.recipient_user != frappe.session.user and not _is_alert_admin():
        frappe.throw("You can only modify your own alerts", frappe.PermissionError)
    doc.mark_as_read()
    return doc.name


def mark_all_read(user: str = None):
    """Mark all alerts as read for a user."""
    user = user or frappe.session.user
    if user != frappe.session.user and not _is_alert_admin():
        frappe.throw("You can only modify your own alerts", frappe.PermissionError)
    now = frappe.utils.now_datetime()
    frappe.db.sql(
        """
        UPDATE `tabGE Alert`
        SET is_read = 1, read_at = %s
        WHERE recipient_user = %s AND is_read = 0
        """,
        (now, user),
    )
    return user
