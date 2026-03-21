# Copyright (c) 2026, Technosys and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import add_days, add_months, add_to_date, now_datetime, get_datetime


def _is_reminder_admin(user: str | None = None) -> bool:
    user = user or frappe.session.user
    return "System Manager" in frappe.get_roles(user)


class GEUserReminder(Document):
    """
    GE User Reminder - User-created private reminders.

    Reminders are:
    - user-created
    - private by default
    - contextual to project/site/stage/document
    - not broadcast to the team
    """

    def before_insert(self):
        """Set user to current user if not provided."""
        if not self.user:
            self.user = frappe.session.user
        if self.user != frappe.session.user and not _is_reminder_admin():
            frappe.throw("You can only create reminders for yourself", frappe.PermissionError)
        self._compute_next_reminder()

    def before_save(self):
        """Update next_reminder_at when repeat_rule changes."""
        if self.user != frappe.session.user and not _is_reminder_admin():
            frappe.throw("You can only modify your own reminders", frappe.PermissionError)
        self._compute_next_reminder()

    def _compute_next_reminder(self):
        """Compute next_reminder_at based on reminder_datetime and repeat_rule."""
        if self.status in ("Dismissed", "Completed"):
            self.next_reminder_at = None
            return

        if not self.repeat_rule or self.repeat_rule == "None":
            self.next_reminder_at = self.reminder_datetime
        else:
            # For repeating reminders, next_reminder_at is set after each send
            if not self.next_reminder_at:
                self.next_reminder_at = self.reminder_datetime

    def mark_as_sent(self):
        """Mark this reminder as sent and compute next occurrence."""
        self.is_sent = 1
        self.sent_at = now_datetime()

        if self.repeat_rule and self.repeat_rule != "None":
            # Compute next occurrence
            current = get_datetime(self.next_reminder_at or self.reminder_datetime)
            if self.repeat_rule == "Daily":
                next_dt = add_days(current, 1)
            elif self.repeat_rule == "Weekly":
                next_dt = add_days(current, 7)
            elif self.repeat_rule == "Monthly":
                next_dt = add_months(current, 1)
            else:
                next_dt = None

            if next_dt:
                self.next_reminder_at = next_dt
                self.is_sent = 0  # Reset for next occurrence
        else:
            self.status = "Completed"

        self.save(ignore_permissions=True)

    def snooze(self, minutes: int = 15):
        """Snooze this reminder by the given number of minutes."""
        self.status = "Snoozed"
        self.next_reminder_at = add_to_date(now_datetime(), minutes=minutes)
        self.is_sent = 0
        self.save(ignore_permissions=True)

    def dismiss(self):
        """Dismiss this reminder."""
        self.status = "Dismissed"
        self.next_reminder_at = None
        self.save(ignore_permissions=True)


def create_reminder(
    title: str,
    reminder_datetime,
    *,
    user: str = None,
    repeat_rule: str = None,
    linked_project: str = None,
    linked_site: str = None,
    linked_stage: str = None,
    linked_department: str = None,
    reference_doctype: str = None,
    reference_name: str = None,
    notes: str = None,
) -> str:
    """
    Create a new reminder for a user.

    Args:
        title: Reminder title
        reminder_datetime: When to remind
        user: User who owns this reminder (defaults to session user)
        repeat_rule: None, Daily, Weekly, or Monthly
        linked_project: Related project name
        linked_site: Related site name
        linked_stage: Related stage/phase
        linked_department: Related department
        reference_doctype: DocType of related document
        reference_name: Name of related document
        notes: Additional notes

    Returns:
        Name of created reminder document
    """
    target_user = user or frappe.session.user
    if target_user != frappe.session.user and not _is_reminder_admin():
        frappe.throw("You can only create reminders for yourself", frappe.PermissionError)

    doc = frappe.get_doc({
        "doctype": "GE User Reminder",
        "title": title,
        "reminder_datetime": reminder_datetime,
        "user": target_user,
        "repeat_rule": repeat_rule or "None",
        "linked_project": linked_project,
        "linked_site": linked_site,
        "linked_stage": linked_stage,
        "linked_department": linked_department,
        "reference_doctype": reference_doctype,
        "reference_name": reference_name,
        "notes": notes,
    })
    doc.insert()
    return doc.name


def get_user_reminders(
    user: str = None,
    project: str = None,
    active_only: bool = True,
    limit: int = 50,
) -> list:
    """
    Get reminders for a user.

    Args:
        user: User to get reminders for (defaults to session user)
        project: Filter by project
        active_only: Only return active/snoozed reminders
        limit: Maximum number to return

    Returns:
        List of reminder dicts
    """
    user = user or frappe.session.user
    if user != frappe.session.user and not _is_reminder_admin():
        frappe.throw("You can only view your own reminders", frappe.PermissionError)

    filters = {"user": user}
    if active_only:
        filters["status"] = ["in", ["Active", "Snoozed"]]
    if project:
        filters["linked_project"] = project

    return frappe.get_all(
        "GE User Reminder",
        filters=filters,
        fields=[
            "name",
            "title",
            "reminder_datetime",
            "next_reminder_at",
            "repeat_rule",
            "status",
            "linked_project",
            "linked_site",
            "linked_stage",
            "linked_department",
            "reference_doctype",
            "reference_name",
            "notes",
            "is_sent",
            "sent_at",
            "creation",
        ],
        order_by="next_reminder_at asc",
        limit_page_length=limit,
    )


def get_due_reminders() -> list:
    """
    Get all reminders that are due now (for scheduler).

    Returns:
        List of reminder docs that need to be sent
    """
    now = now_datetime()
    return frappe.get_all(
        "GE User Reminder",
        filters={
            "status": ["in", ["Active", "Snoozed"]],
            "is_sent": 0,
            "next_reminder_at": ["<=", now],
        },
        fields=["name"],
    )


def process_due_reminders():
    """
    Process all due reminders - called by scheduler.

    For each due reminder:
    1. Create an alert for the user
    2. Push realtime event
    3. Mark reminder as sent
    """
    from gov_erp.gov_erp.doctype.ge_alert.ge_alert import create_alert

    due = get_due_reminders()

    for row in due:
        try:
            reminder = frappe.get_doc("GE User Reminder", row.name)

            # Create alert for the reminder
            create_alert(
                event_type="general",
                recipient_user=reminder.user,
                summary=f"Reminder: {reminder.title}",
                detail=reminder.notes,
                linked_project=reminder.linked_project,
                linked_site=reminder.linked_site,
                linked_stage=reminder.linked_stage,
                linked_department=reminder.linked_department,
                reference_doctype=reminder.reference_doctype,
                reference_name=reminder.reference_name,
            )

            # Push realtime event
            frappe.publish_realtime(
                event="ge_reminder_due",
                message={
                    "reminder_name": reminder.name,
                    "title": reminder.title,
                    "project": reminder.linked_project,
                },
                user=reminder.user,
            )

            # Mark as sent
            reminder.mark_as_sent()

            frappe.db.commit()
        except Exception as e:
            frappe.log_error(
                f"Failed to process reminder {row.name}: {str(e)}",
                "Reminder Processing Error"
            )
